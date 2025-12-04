-- Script para crear la tabla de firmas electrónicas
-- Ejecutar este script en PostgreSQL

-- Crear tabla de firmas
CREATE TABLE IF NOT EXISTS firmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre_certificado VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'configurada' CHECK (estado IN ('sin_configurar', 'configurada', 'expirada', 'error')),
    emisor VARCHAR(255),
    serial_number VARCHAR(255),
    archivo_encriptado TEXT NOT NULL,
    archivo_iv VARCHAR(64) NOT NULL,
    password_encriptado TEXT NOT NULL,
    password_iv VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas por cédula
CREATE INDEX IF NOT EXISTS idx_firmas_usuario_cedula ON firmas(usuario_cedula);

-- Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_firmas_estado ON firmas(estado);

-- Comentarios de las columnas
COMMENT ON TABLE firmas IS 'Tabla para almacenar firmas electrónicas de usuarios';
COMMENT ON COLUMN firmas.id IS 'Identificador único de la firma';
COMMENT ON COLUMN firmas.usuario_cedula IS 'Cédula del usuario propietario de la firma';
COMMENT ON COLUMN firmas.nombre_certificado IS 'Nombre extraído del certificado (CN)';
COMMENT ON COLUMN firmas.fecha_subida IS 'Fecha en que se subió el certificado';
COMMENT ON COLUMN firmas.fecha_expiracion IS 'Fecha de expiración del certificado';
COMMENT ON COLUMN firmas.estado IS 'Estado actual de la firma: sin_configurar, configurada, expirada, error';
COMMENT ON COLUMN firmas.emisor IS 'Entidad emisora del certificado';
COMMENT ON COLUMN firmas.serial_number IS 'Número de serie del certificado';
COMMENT ON COLUMN firmas.archivo_encriptado IS 'Archivo .p12 encriptado con AES-256-CBC (hex)';
COMMENT ON COLUMN firmas.archivo_iv IS 'Vector de inicialización para desencriptar el archivo';
COMMENT ON COLUMN firmas.password_encriptado IS 'Contraseña del certificado encriptada con AES-256-CBC (hex)';
COMMENT ON COLUMN firmas.password_iv IS 'Vector de inicialización para desencriptar la contraseña';

