import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG and PDF files are allowed'));
    }
  }
});

// Update user profile
router.put('/profile', auth, [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
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

    const { fullName, email, businessName, businessAddress } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      updateData.email = email;
    }

    // Store-specific fields
    if (req.user.userType === 'store') {
      if (businessName) updateData.businessName = businessName;
      if (businessAddress) updateData.businessAddress = businessAddress;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Upload documents
router.post('/upload-documents', auth, upload.fields([
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'panDocument', maxCount: 1 },
  { name: 'gstDocument', maxCount: 1 },
  { name: 'shopLicenseDocument', maxCount: 1 },
  { name: 'drivingLicenseDocument', maxCount: 1 },
  { name: 'vehicleDocument', maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const documents = {};

    // Process uploaded files
    Object.keys(req.files).forEach(field => {
      if (req.files[field] && req.files[field][0]) {
        const file = req.files[field][0];
        documents[field] = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };
      }
    });

    // Update user documents
    user.documents = { ...user.documents, ...documents };
    await user.save();

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { documents: user.documents }
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents'
    });
  }
});

// Get user by ID (public profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('fullName userType rating totalRatings profileImage businessName')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// Get workers for stores
router.get('/workers/list', auth, authorize('store'), async (req, res) => {
  try {
    const { page = 1, limit = 10, skill, city } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userType: 'worker', isActive: true };
    
    if (skill) {
      filter.skills = { $in: [skill] };
    }
    
    if (city) {
      filter['location.city'] = city;
    }

    const workers = await User.find(filter)
      .select('fullName rating totalRatings profileImage skills location')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        workers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workers'
    });
  }
});

export default router;
