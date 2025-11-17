const Currency = require('../models/currency.model');
const ExchangeRate = require('../models/exchangeRate.model');
const { Op } = require('sequelize');
const axios = require('axios');

// ========== CRUD DE MONEDAS ==========

// Crear moneda
exports.createCurrency = async (req, res) => {
  try {
    const { code, name, symbol, country, isBaseCurrency, isActive, decimalPlaces, notes } = req.body;

    // Si se marca como moneda base, desmarcar las demás
    if (isBaseCurrency) {
      await Currency.update(
        { isBaseCurrency: false },
        { where: { isBaseCurrency: true } }
      );
    }

    const currency = await Currency.create({
      code: code.toUpperCase(),
      name,
      symbol,
      country,
      isBaseCurrency: isBaseCurrency || false,
      isActive: isActive !== undefined ? isActive : true,
      decimalPlaces: decimalPlaces || 2,
      notes
    });

    res.status(201).json({
      message: 'Moneda creada exitosamente',
      currency
    });
  } catch (error) {
    console.error('Error al crear moneda:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una moneda con ese código' });
    }
    res.status(500).json({ error: 'Error al crear moneda' });
  }
};

// Listar monedas
exports.getCurrencies = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const currencies = await Currency.findAll({
      where,
      order: [['isBaseCurrency', 'DESC'], ['code', 'ASC']]
    });

    res.json(currencies);
  } catch (error) {
    console.error('Error al obtener monedas:', error);
    res.status(500).json({ error: 'Error al obtener monedas' });
  }
};

// Obtener moneda por ID
exports.getCurrencyById = async (req, res) => {
  try {
    const { id } = req.params;

    const currency = await Currency.findByPk(id);
    if (!currency) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }

    // Obtener las tasas de cambio más recientes
    const exchangeRates = await ExchangeRate.findAll({
      where: {
        [Op.or]: [
          { fromCurrencyId: id },
          { toCurrencyId: id }
        ]
      },
      include: [
        {
          model: Currency,
          as: 'fromCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        },
        {
          model: Currency,
          as: 'toCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        }
      ],
      order: [['rateDate', 'DESC']],
      limit: 10
    });

    res.json({
      currency,
      recentExchangeRates: exchangeRates
    });
  } catch (error) {
    console.error('Error al obtener moneda:', error);
    res.status(500).json({ error: 'Error al obtener moneda' });
  }
};

// Actualizar moneda
exports.updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const currency = await Currency.findByPk(id);
    if (!currency) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }

    // Si se marca como moneda base, desmarcar las demás
    if (updateData.isBaseCurrency && !currency.isBaseCurrency) {
      await Currency.update(
        { isBaseCurrency: false },
        { where: { isBaseCurrency: true } }
      );
    }

    await currency.update(updateData);

    res.json({
      message: 'Moneda actualizada exitosamente',
      currency
    });
  } catch (error) {
    console.error('Error al actualizar moneda:', error);
    res.status(500).json({ error: 'Error al actualizar moneda' });
  }
};

// Eliminar moneda
exports.deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;

    const currency = await Currency.findByPk(id);
    if (!currency) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }

    if (currency.isBaseCurrency) {
      return res.status(400).json({ error: 'No se puede eliminar la moneda base del sistema' });
    }

    // Verificar si hay tasas de cambio asociadas
    const rateCount = await ExchangeRate.count({
      where: {
        [Op.or]: [
          { fromCurrencyId: id },
          { toCurrencyId: id }
        ]
      }
    });

    if (rateCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la moneda porque tiene ${rateCount} tasas de cambio asociadas`
      });
    }

    await currency.destroy();

    res.json({ message: 'Moneda eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar moneda:', error);
    res.status(500).json({ error: 'Error al eliminar moneda' });
  }
};

// Establecer moneda base
exports.setBaseCurrency = async (req, res) => {
  try {
    const { id } = req.params;

    const currency = await Currency.findByPk(id);
    if (!currency) {
      return res.status(404).json({ error: 'Moneda no encontrada' });
    }

    // Desmarcar todas las monedas base
    await Currency.update(
      { isBaseCurrency: false },
      { where: { isBaseCurrency: true } }
    );

    // Marcar esta como base
    await currency.update({ isBaseCurrency: true });

    res.json({
      message: 'Moneda base actualizada exitosamente',
      currency
    });
  } catch (error) {
    console.error('Error al establecer moneda base:', error);
    res.status(500).json({ error: 'Error al establecer moneda base' });
  }
};

// ========== TASAS DE CAMBIO ==========

// Crear/actualizar tasa de cambio manualmente
exports.setExchangeRate = async (req, res) => {
  try {
    const { fromCurrencyId, toCurrencyId, rate, rateDate, notes } = req.body;

    if (!fromCurrencyId || !toCurrencyId || !rate || !rateDate) {
      return res.status(400).json({ error: 'fromCurrencyId, toCurrencyId, rate y rateDate son requeridos' });
    }

    // Verificar que las monedas existan
    const fromCurrency = await Currency.findByPk(fromCurrencyId);
    const toCurrency = await Currency.findByPk(toCurrencyId);

    if (!fromCurrency || !toCurrency) {
      return res.status(404).json({ error: 'Una o ambas monedas no fueron encontradas' });
    }

    // Buscar o crear la tasa de cambio
    const [exchangeRate, created] = await ExchangeRate.findOrCreate({
      where: {
        fromCurrencyId,
        toCurrencyId,
        rateDate
      },
      defaults: {
        rate,
        source: 'manual',
        isManual: true,
        notes
      }
    });

    if (!created) {
      // Actualizar la tasa existente
      await exchangeRate.update({
        rate,
        source: 'manual',
        isManual: true,
        notes
      });
    }

    const result = await ExchangeRate.findByPk(exchangeRate.id, {
      include: [
        {
          model: Currency,
          as: 'fromCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        },
        {
          model: Currency,
          as: 'toCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        }
      ]
    });

    res.status(created ? 201 : 200).json({
      message: created ? 'Tasa de cambio creada exitosamente' : 'Tasa de cambio actualizada exitosamente',
      exchangeRate: result
    });
  } catch (error) {
    console.error('Error al establecer tasa de cambio:', error);
    res.status(500).json({ error: 'Error al establecer tasa de cambio' });
  }
};

// Obtener tasas de cambio
exports.getExchangeRates = async (req, res) => {
  try {
    const { fromCurrencyId, toCurrencyId, startDate, endDate } = req.query;

    const where = {};

    if (fromCurrencyId) {
      where.fromCurrencyId = fromCurrencyId;
    }

    if (toCurrencyId) {
      where.toCurrencyId = toCurrencyId;
    }

    if (startDate && endDate) {
      where.rateDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.rateDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.rateDate = {
        [Op.lte]: endDate
      };
    }

    const exchangeRates = await ExchangeRate.findAll({
      where,
      include: [
        {
          model: Currency,
          as: 'fromCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        },
        {
          model: Currency,
          as: 'toCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        }
      ],
      order: [['rateDate', 'DESC'], ['id', 'DESC']]
    });

    res.json(exchangeRates);
  } catch (error) {
    console.error('Error al obtener tasas de cambio:', error);
    res.status(500).json({ error: 'Error al obtener tasas de cambio' });
  }
};

// Obtener tasa de cambio actual entre dos monedas
exports.getCurrentRate = async (req, res) => {
  try {
    const { fromCode, toCode } = req.params;

    const fromCurrency = await Currency.findOne({ where: { code: fromCode.toUpperCase() } });
    const toCurrency = await Currency.findOne({ where: { code: toCode.toUpperCase() } });

    if (!fromCurrency || !toCurrency) {
      return res.status(404).json({ error: 'Una o ambas monedas no fueron encontradas' });
    }

    // Buscar la tasa más reciente
    const exchangeRate = await ExchangeRate.findOne({
      where: {
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id
      },
      order: [['rateDate', 'DESC']],
      include: [
        {
          model: Currency,
          as: 'fromCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        },
        {
          model: Currency,
          as: 'toCurrency',
          attributes: ['id', 'code', 'name', 'symbol']
        }
      ]
    });

    if (!exchangeRate) {
      return res.status(404).json({
        error: `No se encontró tasa de cambio de ${fromCode} a ${toCode}`
      });
    }

    res.json(exchangeRate);
  } catch (error) {
    console.error('Error al obtener tasa actual:', error);
    res.status(500).json({ error: 'Error al obtener tasa actual' });
  }
};

// Convertir monto entre monedas
exports.convertCurrency = async (req, res) => {
  try {
    const { amount, fromCode, toCode, date } = req.query;

    if (!amount || !fromCode || !toCode) {
      return res.status(400).json({ error: 'amount, fromCode y toCode son requeridos' });
    }

    const fromCurrency = await Currency.findOne({ where: { code: fromCode.toUpperCase() } });
    const toCurrency = await Currency.findOne({ where: { code: toCode.toUpperCase() } });

    if (!fromCurrency || !toCurrency) {
      return res.status(404).json({ error: 'Una o ambas monedas no fueron encontradas' });
    }

    // Si son la misma moneda, retornar el mismo monto
    if (fromCurrency.id === toCurrency.id) {
      return res.json({
        amount: parseFloat(amount),
        convertedAmount: parseFloat(amount),
        rate: 1,
        fromCurrency,
        toCurrency,
        date: date || new Date().toISOString().split('T')[0]
      });
    }

    // Buscar tasa de cambio
    const where = {
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id
    };

    if (date) {
      where.rateDate = {
        [Op.lte]: date
      };
    }

    const exchangeRate = await ExchangeRate.findOne({
      where,
      order: [['rateDate', 'DESC']]
    });

    if (!exchangeRate) {
      return res.status(404).json({
        error: `No se encontró tasa de cambio de ${fromCode} a ${toCode}`
      });
    }

    const convertedAmount = parseFloat(amount) * parseFloat(exchangeRate.rate);

    res.json({
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount.toFixed(toCurrency.decimalPlaces)),
      rate: parseFloat(exchangeRate.rate),
      rateDate: exchangeRate.rateDate,
      fromCurrency: {
        code: fromCurrency.code,
        name: fromCurrency.name,
        symbol: fromCurrency.symbol
      },
      toCurrency: {
        code: toCurrency.code,
        name: toCurrency.name,
        symbol: toCurrency.symbol
      }
    });
  } catch (error) {
    console.error('Error al convertir moneda:', error);
    res.status(500).json({ error: 'Error al convertir moneda' });
  }
};

// Actualizar tasas de cambio automáticamente desde API externa
exports.updateExchangeRatesFromAPI = async (req, res) => {
  try {
    // Usar exchangerate-api.io (gratis, hasta 1500 requests/mes)
    // Obtener moneda base (generalmente USD)
    const baseCurrency = await Currency.findOne({
      where: { isBaseCurrency: true }
    });

    if (!baseCurrency) {
      return res.status(400).json({ error: 'No hay moneda base configurada' });
    }

    // Obtener todas las monedas activas
    const currencies = await Currency.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: baseCurrency.id }
      }
    });

    if (currencies.length === 0) {
      return res.json({ message: 'No hay otras monedas activas para actualizar' });
    }

    // Llamar a la API (gratis)
    const apiUrl = `https://open.er-api.com/v6/latest/${baseCurrency.code}`;

    try {
      const response = await axios.get(apiUrl);

      if (response.data && response.data.rates) {
        const rates = response.data.rates;
        const today = new Date().toISOString().split('T')[0];
        const updated = [];

        for (const currency of currencies) {
          if (rates[currency.code]) {
            const [exchangeRate, created] = await ExchangeRate.findOrCreate({
              where: {
                fromCurrencyId: baseCurrency.id,
                toCurrencyId: currency.id,
                rateDate: today
              },
              defaults: {
                rate: rates[currency.code],
                source: 'open.er-api.com',
                isManual: false,
                notes: 'Actualización automática'
              }
            });

            if (!created) {
              await exchangeRate.update({
                rate: rates[currency.code],
                source: 'open.er-api.com',
                isManual: false,
                notes: 'Actualización automática'
              });
            }

            updated.push({
              currency: currency.code,
              rate: rates[currency.code],
              action: created ? 'created' : 'updated'
            });
          }
        }

        res.json({
          message: 'Tasas de cambio actualizadas exitosamente',
          baseCurrency: baseCurrency.code,
          updated,
          source: 'open.er-api.com',
          date: today
        });
      } else {
        throw new Error('Respuesta inválida de la API');
      }
    } catch (apiError) {
      console.error('Error al obtener tasas de API externa:', apiError);
      return res.status(500).json({
        error: 'Error al obtener tasas de cambio desde la API externa',
        details: apiError.message
      });
    }
  } catch (error) {
    console.error('Error al actualizar tasas de cambio:', error);
    res.status(500).json({ error: 'Error al actualizar tasas de cambio' });
  }
};

// Inicializar monedas predefinidas
exports.initializeCurrencies = async (req, res) => {
  try {
    const defaultCurrencies = [
      { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', country: 'Estados Unidos', isBaseCurrency: true },
      { code: 'MXN', name: 'Peso Mexicano', symbol: '$', country: 'México' },
      { code: 'CLP', name: 'Peso Chileno', symbol: '$', country: 'Chile' },
      { code: 'ARS', name: 'Peso Argentino', symbol: '$', country: 'Argentina' },
      { code: 'COP', name: 'Peso Colombiano', symbol: '$', country: 'Colombia' },
      { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', country: 'Perú' },
      { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', country: 'Brasil' },
      { code: 'EUR', name: 'Euro', symbol: '€', country: 'Unión Europea' },
      { code: 'GBP', name: 'Libra Esterlina', symbol: '£', country: 'Reino Unido' }
    ];

    const created = [];
    for (const curr of defaultCurrencies) {
      const [currency, isNew] = await Currency.findOrCreate({
        where: { code: curr.code },
        defaults: curr
      });
      if (isNew) {
        created.push(currency);
      }
    }

    res.json({
      message: `${created.length} monedas inicializadas`,
      currencies: created
    });
  } catch (error) {
    console.error('Error al inicializar monedas:', error);
    res.status(500).json({ error: 'Error al inicializar monedas' });
  }
};
