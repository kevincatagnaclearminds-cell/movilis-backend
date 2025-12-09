import { Response } from 'express';

/**
 * Helper para respuestas estandarizadas de la API
 */

/**
 * Respuesta exitosa
 */
export function successResponse(res: Response, data: unknown, message: string | null = null, statusCode: number = 200): Response {
  const response: Record<string, unknown> = {
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
 */
export function errorResponse(res: Response, message: string, statusCode: number = 400, errors: unknown = null): Response {
  const response: Record<string, unknown> = {
    success: false,
    error: { message }
  };

  if (errors) {
    (response.error as Record<string, unknown>).errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error de validación
 */
export function validationErrorResponse(res: Response, validationErrors: unknown[]): Response {
  return errorResponse(
    res,
    'Errores de validación',
    400,
    validationErrors
  );
}


