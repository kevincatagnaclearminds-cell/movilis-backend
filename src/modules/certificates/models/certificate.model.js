const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const certificateSchema = new mongoose.Schema({
  certificateNumber: {
    type: String,
    unique: true,
    default: () => `CERT-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  recipientName: {
    type: String,
    required: [true, 'El nombre del destinatario es requerido'],
    trim: true
  },
  recipientEmail: {
    type: String,
    required: [true, 'El email del destinatario es requerido'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  courseName: {
    type: String,
    required: [true, 'El nombre del curso es requerido'],
    trim: true
  },
  courseDescription: {
    type: String,
    trim: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    default: null
  },
  issuerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El emisor es requerido']
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'revoked', 'expired'],
    default: 'draft'
  },
  pdfPath: {
    type: String,
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    unique: true,
    sparse: true,
    default: () => uuidv4()
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
// Nota: certificateNumber y verificationCode ya tienen índices únicos por 'unique: true'
certificateSchema.index({ recipientEmail: 1 });
certificateSchema.index({ issuerId: 1 });
certificateSchema.index({ status: 1 });

// Método para verificar si el certificado está expirado
certificateSchema.methods.isExpired = function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
};

// Método para verificar si el certificado es válido
certificateSchema.methods.isValid = function() {
  return this.status === 'issued' && !this.isExpired() && !this.isRevoked();
};

// Método para verificar si está revocado
certificateSchema.methods.isRevoked = function() {
  return this.status === 'revoked';
};

// Pre-save hook para actualizar estado si está expirado
certificateSchema.pre('save', function(next) {
  if (this.expirationDate && new Date() > this.expirationDate && this.status === 'issued') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);


