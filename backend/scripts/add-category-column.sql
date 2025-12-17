-- Agregar columnas a SystemPlugins
ALTER TABLE "SystemPlugins" ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(255);
ALTER TABLE "SystemPlugins" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SystemPlugins" ADD COLUMN IF NOT EXISTS "category" VARCHAR(255) DEFAULT 'other';

-- Actualizar categorías de plugins existentes
UPDATE "SystemPlugins" SET category = 'payment' WHERE name IN ('mercadopago', 'openpay', 'paypal', 'stripe');
UPDATE "SystemPlugins" SET category = 'communication' WHERE name IN ('email', 'telegram', 'whatsapp');
UPDATE "SystemPlugins" SET category = 'automation' WHERE name = 'n8n';
UPDATE "SystemPlugins" SET category = 'other' WHERE category IS NULL;
