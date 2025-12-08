-- ============================================
-- TABLA INTERMEDIA: certificados_usuarios
-- ============================================
-- Esta tabla permite que un certificado pueda asignarse a múltiples usuarios
-- Relación muchos-a-muchos entre certificados y users

CREATE TABLE IF NOT EXISTS certificados_usuarios (
    -- IDENTIFICADOR PRINCIPAL
    id SERIAL PRIMARY KEY,
    
    -- RELACIONES
    certificado_id INTEGER NOT NULL,
    usuario_id UUID NOT NULL,
    
    -- METADATOS
    asignado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    asignado_por UUID, -- ID del admin que hizo la asignación
    
    -- CONSTRAINTS
    CONSTRAINT fk_certificado 
        FOREIGN KEY (certificado_id) 
        REFERENCES certificados(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_usuario 
        FOREIGN KEY (usuario_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Un usuario no puede tener el mismo certificado asignado dos veces
    CONSTRAINT uq_certificado_usuario 
        UNIQUE (certificado_id, usuario_id)
);

-- ============================================
-- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================

-- Índice en certificado_id (búsqueda de usuarios de un certificado)
CREATE INDEX IF NOT EXISTS idx_certificados_usuarios_certificado_id 
    ON certificados_usuarios(certificado_id);

-- Índice en usuario_id (búsqueda de certificados de un usuario)
CREATE INDEX IF NOT EXISTS idx_certificados_usuarios_usuario_id 
    ON certificados_usuarios(usuario_id);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_certificados_usuarios_compuesto 
    ON certificados_usuarios(certificado_id, usuario_id);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE certificados_usuarios IS 'Tabla intermedia para asignar certificados a múltiples usuarios';
COMMENT ON COLUMN certificados_usuarios.certificado_id IS 'ID del certificado';
COMMENT ON COLUMN certificados_usuarios.usuario_id IS 'ID del usuario destinatario';
COMMENT ON COLUMN certificados_usuarios.asignado_en IS 'Fecha y hora de asignación';
COMMENT ON COLUMN certificados_usuarios.asignado_por IS 'ID del admin que hizo la asignación';

