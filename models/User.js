import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const documentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  size: Number,
  mimeType: String,
  uploadedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['store', 'worker', 'admin', 'super_admin', 'verifier'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  
  // Worker specific fields
  aadhaarNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return this.userType !== 'worker' || (v && /^\d{12}$/.test(v));
      },
      message: 'Aadhaar number must be 12 digits'
    }
  },
  panNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return this.userType !== 'worker' || (v && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v));
      },
      message: 'Invalid PAN number format'
    }
  },
  licenseNumber: {
    type: String
  },
  vehicleNumber: {
    type: String
  },
  
  // Store specific fields
  gstNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return this.userType !== 'store' || v;
      },
      message: 'GST number is required for stores'
    }
  },
  shopLicense: {
    type: String
  },
  businessName: {
    type: String
  },
  businessAddress: {
    type: String
  },
  pincode: {
    type: String
  },
  city: {
    type: String
  },
  
  // Documents
  documents: {
    aadhaarDocument: documentSchema,
    panDocument: documentSchema,
    gstDocument: documentSchema,
    shopLicenseDocument: documentSchema,
    drivingLicenseDocument: documentSchema,
    vehicleDocument: documentSchema
  },
  
  // Common fields
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  const self = this;
  try {
    return await bcrypt.compare(candidatePassword, self.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Generate OTP method
userSchema.methods.generateOTP = function() {
  // Always use fixed OTP 123456
  const otp = '123456';
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  };
  return otp;
};

// Verify OTP method
userSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otp.code) {
    return { valid: false, message: 'No OTP generated' };
  }
  
  if (this.otp.expiresAt < new Date()) {
    return { valid: false, message: 'OTP expired' };
  }
  
  if (this.otp.attempts >= 3) {
    return { valid: false, message: 'Too many attempts' };
  }
  
  this.otp.attempts += 1;
  
  if (this.otp.code !== candidateOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // Clear OTP after successful verification
  this.otp = undefined;
  return { valid: true, message: 'OTP verified successfully' };
};

export default mongoose.model('User', userSchema);
