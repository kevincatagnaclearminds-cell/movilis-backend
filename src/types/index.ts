import { Request } from 'express';

// Tipos de usuario
export interface User {
  _id: string;
  id?: string;
  cedula: string;
  name: string;
  email?: string;
  role?: 'admin' | 'user' | 'issuer';
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Extender Request de Express para incluir user
export interface AuthRequest extends Request {
  user?: User;
}

// Tipos de certificado
export interface Certificate {
  id: string | number;
  _id?: string | number;
  certificateNumber: string;
  numeroCertificado?: string;
  verificationCode: string;
  codigoVerificacion?: string;
  courseName: string;
  nombreCurso?: string;
  institucion: string;
  issueDate: Date | string;
  fechaEmision?: Date | string;
  expirationDate?: Date | string | null;
  fechaExpiracion?: Date | string | null;
  status: 'draft' | 'issued' | 'revoked' | 'expired';
  estado?: 'draft' | 'issued' | 'revoked' | 'expired';
  googleDriveFileId?: string | null;
  driveFileId?: string | null;
  createdAt?: Date | string;
  creadoEn?: Date | string;
  issuerId: string | { _id: string; id?: string; name?: string; email?: string };
  emisorId?: string;
  recipientId?: string | { _id: string; id?: string; name?: string; email?: string } | null;
  destinatarioId?: string | null;
  recipientName?: string;
  destinatarioNombre?: string;
  recipientEmail?: string;
  destinatarioEmail?: string;
  assignedUsers?: Array<{
    _id: string;
    id: string;
    name: string;
    email?: string;
    cedula?: string;
  }>;
  usuariosAsignados?: Array<{
    _id: string;
    id: string;
    name: string;
    email?: string;
    cedula?: string;
  }>;
  issuerName?: string;
  issuerEmail?: string;
  courseDescription?: string;
  descripcion?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  isVerified?: boolean;
}

// Tipos para respuestas de API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    errors?: Array<{ msg: string; param?: string }>;
  };
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

