// Script to update Payment paymentMethod enum
const db = require('./src/models');

async function updatePaymentEnum() {
  try {
    console.log('🔄 Actualizando enum paymentMethod...');

    // Add new enum values
    const enumValues = ['online', 'mercadopago', 'openpay', 'paypal', 'stripe'];

    for (const value of enumValues) {
      try {
        await db.sequelize.query(`
          ALTER TYPE "enum_Payments_paymentMethod"
          ADD VALUE IF NOT EXISTS '${value}';
        `);
        console.log(`✅ Valor '${value}' agregado al enum`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Valor '${value}' ya existe en el enum`);
        } else {
          console.error(`❌ Error agregando '${value}':`, error.message);
        }
      }
    }

    console.log('✅ Enum paymentMethod actualizado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando enum:', error);
    process.exit(1);
  }
}

updatePaymentEnum();
