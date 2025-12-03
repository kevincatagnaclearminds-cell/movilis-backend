/**
 * Helper para respuestas estandarizadas de la API
 */

/**
 * Respuesta exitosa
 * @param {Object} res - Objeto response de Express
 * @param {*} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 * @param {number} statusCode - Código de estado HTTP
 */
function successResponse(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP
 * @param {*} errors - Errores adicionales
 */
function errorResponse(res, message, statusCode = 400, errors = null) {
  const response = {
    success: false,
    error: { message }
  };

  if (errors) {
    response.error.errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error de validación
 * @param {Object} res - Objeto response de Express
 * @param {Array} validationErrors - Errores de validación
 */
function validationErrorResponse(res, validationErrors) {
  return errorResponse(
    res,
    'Errores de validación',
    400,
    validationErrors
  );
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse
};

