-- Script para eliminar índices duplicados en GeneratedDocumentHistory
-- Ejecutar antes de reiniciar el backend

\c ispdev

-- Ver los índices actuales de la tabla
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'GeneratedDocumentHistory';

-- Eliminar índices duplicados/problemáticos
DROP INDEX IF EXISTS "generated_document_history_signature_required_signature_complet";
DROP INDEX IF EXISTS "generated_document_history_signature_required_signature_completed";
DROP INDEX IF EXISTS "generated_document_history_signature_required";

-- Verificar que se eliminaron
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'GeneratedDocumentHistory';

-- Mensaje de éxito
SELECT 'Índices duplicados eliminados correctamente. Ahora puedes reiniciar el backend.' AS mensaje;
