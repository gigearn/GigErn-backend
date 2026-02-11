const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['retail', 'delivery', 'warehouse', 'customer-service', 'other']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Location
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Schedule
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  
  // Payment
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  
  // Status
  status: {
    type: String,
    enum: ['open', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  
  // Requirements
  requirements: [{
    type: String
  }],
  skills: [{
    type: String
  }],
  
  // Worker applications
  applications: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Reviews
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  assignedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  
  // Additional fields
  isUrgent: {
    type: Boolean,
    default: false
  },
  maxApplications: {
    type: Number,
    default: 10
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better performance
gigSchema.index({ store: 1, status: 1 });
gigSchema.index({ worker: 1, status: 1 });
gigSchema.index({ status: 1, startTime: 1 });
gigSchema.index({ 'location.city': 1, category: 1 });

// Virtual for checking if gig is active
gigSchema.virtual('isActive').get(function() {
  return ['open', 'assigned', 'in-progress'].includes(this.status) && 
         this.endTime > new Date();
});

// Method to calculate total amount
gigSchema.methods.calculateTotalAmount = function() {
  this.totalAmount = this.hourlyRate * this.duration;
  return this.totalAmount;
};

// Pre-save middleware
gigSchema.pre('save', function(next) {
  if (this.isModified('hourlyRate') || this.isModified('duration')) {
    this.calculateTotalAmount();
  }
  next();
});

module.exports = mongoose.model('Gig', gigSchema);
