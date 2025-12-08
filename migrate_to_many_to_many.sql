-- ============================================
-- MIGRACIÓN: De uno-a-uno a muchos-a-muchos
-- ============================================
-- Este script:
-- 1. Crea la tabla intermedia certificados_usuarios
-- 2. Migra los datos existentes de certificados.destinatario_id a certificados_usuarios
-- 3. Hace destinatario_id opcional en certificados (para mantener compatibilidad)

-- PASO 1: Crear la tabla intermedia
CREATE TABLE IF NOT EXISTS certificados_usuarios (
    id SERIAL PRIMARY KEY,
    certificado_id INTEGER NOT NULL,
    usuario_id UUID NOT NULL,
    asignado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    asignado_por UUID,
    
    CONSTRAINT fk_certificado 
        FOREIGN KEY (certificado_id) 
        REFERENCES certificados(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_usuario 
        FOREIGN KEY (usuario_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT uq_certificado_usuario 
        UNIQUE (certificado_id, usuario_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_certificados_usuarios_certificado_id 
    ON certificados_usuarios(certificado_id);

CREATE INDEX IF NOT EXISTS idx_certificados_usuarios_usuario_id 
    ON certificados_usuarios(usuario_id);

-- PASO 2: Migrar datos existentes
-- Insertar todos los certificados existentes en la tabla intermedia
INSERT INTO certificados_usuarios (certificado_id, usuario_id, asignado_en)
SELECT id, destinatario_id, creado_en
FROM certificados
WHERE destinatario_id IS NOT NULL
ON CONFLICT (certificado_id, usuario_id) DO NOTHING;

-- PASO 3: Hacer destinatario_id opcional (mantener para compatibilidad)
-- Nota: Esto requiere que la columna ya no tenga NOT NULL
-- Si da error, primero ejecuta: ALTER TABLE certificados ALTER COLUMN destinatario_id DROP NOT NULL;
ALTER TABLE certificados ALTER COLUMN destinatario_id DROP NOT NULL;

-- Comentarios
COMMENT ON TABLE certificados_usuarios IS 'Tabla intermedia para asignar certificados a múltiples usuarios';
COMMENT ON COLUMN certificados_usuarios.asignado_por IS 'ID del admin que hizo la asignación';

