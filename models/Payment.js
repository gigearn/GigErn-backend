import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  workerAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'wallet'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentGatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  processedAt: Date,
  refundedAt: Date,
  refundReason: String
}, {
  timestamps: true
});

// Pre-save middleware to calculate platform fee and worker amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount')) {
    this.platformFee = this.amount * 0.1; // 10% platform fee
    this.workerAmount = this.amount - this.platformFee;
  }
  next();
});

// Generate unique transaction ID
paymentSchema.methods.generateTransactionId = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  this.transactionId = `TXN${timestamp}${random}`.toUpperCase();
  return this.transactionId;
};

export default mongoose.model('Payment', paymentSchema);
