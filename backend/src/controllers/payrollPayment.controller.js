// backend/src/controllers/payrollPayment.controller.js
const db = require("../models");
const PayrollPayment = db.PayrollPayment;

exports.getAll = async (req, res) => {
  try {
    const { payrollId, paymentMethod, startDate, endDate } = req.query;
    const where = {};
    if (payrollId) where.payrollId = payrollId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate && endDate) {
      where.paymentDate = { [db.Sequelize.Op.between]: [startDate, endDate] };
    }

    const payments = await PayrollPayment.findAll({
      where,
      include: [
        { model: db.Payroll, as: 'payroll', attributes: ['id', 'userId', 'month', 'year'] },
        { model: db.User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ],
      order: [['paymentDate', 'DESC']]
    });

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const payment = await PayrollPayment.findByPk(req.params.id, {
      include: [
        { model: db.Payroll, as: 'payroll' },
        { model: db.User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!payment) return res.status(404).json({ success: false, message: "Pago no encontrado" });
    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { payrollId, amount, paymentDate, paymentMethod, paymentReference, notes, createdBy } = req.body;

    if (!payrollId || !amount || !paymentDate || !paymentMethod) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "payrollId, amount, paymentDate y paymentMethod son obligatorios" });
    }

    // Verificar que la nómina existe
    const payroll = await db.Payroll.findByPk(payrollId);
    if (!payroll) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Nómina no encontrada" });
    }

    const payment = await PayrollPayment.create({
      payrollId, amount, paymentDate, paymentMethod, paymentReference, notes, createdBy
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({ success: true, message: "Pago registrado exitosamente", data: payment });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payment = await PayrollPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Pago no encontrado" });

    const { amount, paymentDate, paymentMethod, paymentReference, notes } = req.body;
    await payment.update({
      amount: amount !== undefined ? amount : payment.amount,
      paymentDate: paymentDate || payment.paymentDate,
      paymentMethod: paymentMethod || payment.paymentMethod,
      paymentReference: paymentReference !== undefined ? paymentReference : payment.paymentReference,
      notes: notes !== undefined ? notes : payment.notes
    });

    return res.status(200).json({ success: true, message: "Pago actualizado exitosamente", data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const payment = await PayrollPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Pago no encontrado" });

    await payment.destroy();
    return res.status(200).json({ success: true, message: "Pago eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
