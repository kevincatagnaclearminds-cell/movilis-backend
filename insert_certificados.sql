-- ============================================
-- INSERTAR 3 CERTIFICADOS DE EJEMPLO
-- ============================================
-- Este script obtiene automáticamente los IDs de usuarios
-- Solo ejecuta este script completo, no necesitas cambiar nada

-- ============================================
-- CERTIFICADO 1
-- ============================================
INSERT INTO certificados (
    numero_certificado,
    codigo_verificacion,
    nombre_curso,
    institucion,
    fecha_emision,
    destinatario_id,
    emisor_id,
    fecha_expiracion,
    estado
) VALUES (
    'CERT-001',
    'verify-' || gen_random_uuid()::text,
    'Curso de Programación en JavaScript',
    'Movilis',
    CURRENT_DATE,
    (SELECT id FROM users WHERE role = 'user' LIMIT 1),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    CURRENT_DATE + INTERVAL '1 year',
    'draft'
);

-- ============================================
-- CERTIFICADO 2
-- ============================================
INSERT INTO certificados (
    numero_certificado,
    codigo_verificacion,
    nombre_curso,
    institucion,
    fecha_emision,
    destinatario_id,
    emisor_id,
    fecha_expiracion,
    estado
) VALUES (
    'CERT-002',
    'verify-' || gen_random_uuid()::text,
    'Curso de Base de Datos PostgreSQL',
    'Movilis',
    CURRENT_DATE - INTERVAL '30 days',
    (SELECT id FROM users WHERE role = 'user' LIMIT 1 OFFSET 1),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    CURRENT_DATE + INTERVAL '6 months',
    'issued'
);

-- ============================================
-- CERTIFICADO 3
-- ============================================
INSERT INTO certificados (
    numero_certificado,
    codigo_verificacion,
    nombre_curso,
    institucion,
    fecha_emision,
    destinatario_id,
    emisor_id,
    fecha_expiracion,
    estado
) VALUES (
    'CERT-003',
    'verify-' || gen_random_uuid()::text,
    'Curso de Desarrollo Web Full Stack',
    'Movilis',
    CURRENT_DATE - INTERVAL '7 days',
    (SELECT id FROM users WHERE role = 'user' LIMIT 1 OFFSET 2),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    NULL,
    'issued'
);

-- ============================================
-- VERIFICAR QUE SE INSERTARON
-- ============================================
SELECT 
    c.numero_certificado,
    c.nombre_curso,
    c.estado,
    u1.name as destinatario,
    u2.name as emisor
FROM certificados c
INNER JOIN users u1 ON c.destinatario_id = u1.id
INNER JOIN users u2 ON c.emisor_id = u2.id
WHERE c.numero_certificado IN ('CERT-001', 'CERT-002', 'CERT-003')
ORDER BY c.numero_certificado;
