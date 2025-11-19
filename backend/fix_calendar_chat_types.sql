-- Script para corregir tipos de datos en tablas Calendar y Chat
-- Las columnas createdBy y senderId deben ser INTEGER para coincidir con Users.id

-- 1. Eliminar tabla CalendarEvents (se recreará con tipo correcto)
DROP TABLE IF EXISTS "CalendarEvents" CASCADE;

-- 2. Eliminar tabla CalendarIntegrations (depende de Users)
DROP TABLE IF EXISTS "CalendarIntegrations" CASCADE;

-- 3. Eliminar tabla ChatMessages (se recreará con tipo correcto)
DROP TABLE IF EXISTS "ChatMessages" CASCADE;

-- 4. Eliminar tabla ChatConversations
DROP TABLE IF EXISTS "ChatConversations" CASCADE;

-- Las tablas se recrearán automáticamente cuando reinicies el backend
-- con los tipos de datos correctos (INTEGER para createdBy y senderId)
