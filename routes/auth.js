import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { comparePassword } from '../utils/passwordUtils.js';
const router = express.Router();

// Admin Login (Phone/OTP)
router.post('/admin-login', [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;

    // Find admin user by phone
    const user = await User.findOne({ phoneNumber: phone, userType: { $in: ['admin', 'verifier'] } });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // For admin users, use fixed OTP for development
    if (otp !== '123456') {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          userType: user.userType,
          role: user.userType, // Add role field for frontend compatibility
          isVerified: user.isVerified,
          isPhoneVerified: user.isPhoneVerified,
          rating: user.rating,
          profileImage: user.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed'
    });
  }
});

// Traditional Login (Email/Password)
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          userType: user.userType,
          isVerified: user.isVerified,
          isPhoneVerified: user.isPhoneVerified,
          rating: user.rating,
          profileImage: user.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Send OTP
router.post('/send-otp', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Invalid phone number format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;
    const cleanedPhone = phoneNumber.replace(/\D/g, '');

    let user = await User.findOne({ phoneNumber: cleanedPhone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please register first.'
      });
    }

    // Generate and save OTP
    const otp = user.generateOTP();
    await user.save();

    // TODO: Send OTP via SMS (using Twilio)
    console.log(`OTP for ${cleanedPhone}: ${otp}`); // For development

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phoneNumber: cleanedPhone,
        // otp: otp // Only for development
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// Verify OTP and Login
router.post('/verify-otp', [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { phoneNumber, otp } = req.body;
    const cleanedPhone = phoneNumber.replace(/\D/g, '');

    const user = await User.findOne({ phoneNumber: cleanedPhone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const verification = user.verifyOTP(otp);
    
    if (!verification.valid) {
      await user.save(); // Save attempts
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Update user verification status
    user.isPhoneVerified = true;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          userType: user.userType,
          isVerified: user.isVerified,
          rating: user.rating
        }
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

// Register User
router.post('/register', [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('userType')
    .isIn(['store', 'worker'])
    .withMessage('User type must be either store or worker'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  // Store specific validations
  body('storeName')
    .optional()
    .notEmpty()
    .withMessage('Store name is required for store users'),
  body('address')
    .optional()
    .notEmpty()
    .withMessage('Address is required for store users'),
  body('pincode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('Pincode must be 6 digits'),
  body('city')
    .optional()
    .notEmpty()
    .withMessage('City is required for gig workers'),
  body('vehicleNumber')
    .optional()
    .notEmpty()
    .withMessage('Vehicle number is required for gig workers')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { fullName, phoneNumber, email, userType, password, storeName, address, pincode, city, vehicleNumber, ...additionalFields } = req.body;
    const cleanedPhone = phoneNumber.replace(/\D/g, '');

    // Map frontend field names to backend schema
    const mappedData = {
      fullName,
      phoneNumber: cleanedPhone,
      email,
      userType,
      password,
      businessName: storeName,
      businessAddress: address,
      pincode,
      city,
      vehicleNumber,
      ...additionalFields
    };

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phoneNumber: cleanedPhone }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number or email already exists'
      });
    }

    // Create new user
    const user = new User(mappedData);
    await user.save();

    // Generate OTP for phone verification
    const otp = user.generateOTP();
    await user.save();

    // TODO: Send OTP via SMS
    console.log(`Registration OTP for ${cleanedPhone}: ${otp}`); // For development

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your phone number.',
      data: {
        userId: user._id,
        phoneNumber: cleanedPhone,
        // otp: otp // Only for development
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          fullName: req.user.fullName,
          phoneNumber: req.user.phoneNumber,
          email: req.user.email,
          userType: req.user.userType,
          isVerified: req.user.isVerified,
          rating: req.user.rating,
          profileImage: req.user.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

export default router;
