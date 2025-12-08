-- ============================================
-- TABLA DE CERTIFICADOS PARA POSTGRESQL
-- ============================================
-- Tabla optimizada para el sistema de certificados Movilis
-- Ejecuta este script en pgAdmin para crear la tabla

CREATE TABLE IF NOT EXISTS certificados (
    -- IDENTIFICADOR PRINCIPAL
    id SERIAL PRIMARY KEY,
    
    -- IDENTIFICADORES ÚNICOS
    numero_certificado VARCHAR(50) UNIQUE NOT NULL,
    codigo_verificacion VARCHAR(100) UNIQUE NOT NULL,
    
    -- INFORMACIÓN DEL CERTIFICADO (solo lo esencial)
    nombre_curso VARCHAR(255) NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- INFORMACIÓN DEL DESTINATARIO (usuario de la BD)
    destinatario_id UUID NOT NULL,
    
    -- INFORMACIÓN DEL EMISOR
    emisor_id UUID NOT NULL,
    
    -- FECHA DE EXPIRACIÓN (opcional)
    fecha_expiracion DATE,
    
    -- ESTADO DEL CERTIFICADO
    estado VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (estado IN ('draft', 'issued', 'revoked', 'expired')),
    
    -- GOOGLE DRIVE
    drive_file_id VARCHAR(255) UNIQUE,
    
    -- METADATOS
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- FOREIGN KEYS
    CONSTRAINT fk_emisor 
        FOREIGN KEY (emisor_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_destinatario 
        FOREIGN KEY (destinatario_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT
);

-- ============================================
-- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================

-- Índice en ID del destinatario (búsqueda principal)
CREATE INDEX IF NOT EXISTS idx_certificados_destinatario_id 
    ON certificados(destinatario_id);

-- Índice en ID del emisor
CREATE INDEX IF NOT EXISTS idx_certificados_emisor_id 
    ON certificados(emisor_id);

-- Índice en estado (para filtros)
CREATE INDEX IF NOT EXISTS idx_certificados_estado 
    ON certificados(estado);

-- Índice en fecha de emisión (para ordenamiento)
CREATE INDEX IF NOT EXISTS idx_certificados_fecha_emision 
    ON certificados(fecha_emision DESC);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_certificados_destinatario_estado 
    ON certificados(destinatario_id, estado);

-- ============================================
-- TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger para actualizar estado a 'expired' automáticamente
CREATE OR REPLACE FUNCTION check_certificado_expiration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_expiracion IS NOT NULL 
       AND NEW.fecha_expiracion < CURRENT_DATE 
       AND NEW.estado = 'issued' THEN
        NEW.estado = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_certificado_expiration
    BEFORE INSERT OR UPDATE ON certificados
    FOR EACH ROW
    EXECUTE FUNCTION check_certificado_expiration();

-- ============================================
-- COMENTARIOS EN LA TABLA Y COLUMNAS
-- ============================================

COMMENT ON TABLE certificados IS 'Tabla para almacenar los certificados emitidos a usuarios del sistema';
COMMENT ON COLUMN certificados.numero_certificado IS 'Número único del certificado (ej: CERT-ABC12345)';
COMMENT ON COLUMN certificados.codigo_verificacion IS 'Código único para verificación pública del certificado';
COMMENT ON COLUMN certificados.nombre_curso IS 'Nombre del curso o certificación';
COMMENT ON COLUMN certificados.institucion IS 'Nombre de la institución que emite el certificado';
COMMENT ON COLUMN certificados.fecha_emision IS 'Fecha de emisión del certificado';
COMMENT ON COLUMN certificados.destinatario_id IS 'ID del usuario destinatario (FK a users) - Los datos se obtienen desde la tabla users';
COMMENT ON COLUMN certificados.emisor_id IS 'ID del usuario que emitió el certificado (FK a users) - Los datos se obtienen desde la tabla users';
COMMENT ON COLUMN certificados.fecha_expiracion IS 'Fecha de expiración (NULL si no expira)';
COMMENT ON COLUMN certificados.estado IS 'Estado: draft (borrador), issued (emitido), revoked (revocado), expired (expirado)';
COMMENT ON COLUMN certificados.drive_file_id IS 'ID del archivo PDF en Google Drive';

