const { body } = require('express-validator');

// User validation rules
const validateUserRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validateUserLogin = [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

// Gig validation rules
const validateGigCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
  body('category')
    .isIn(['retail', 'delivery', 'warehouse', 'customer-service', 'other'])
    .withMessage('Invalid category'),
  body('hourlyRate')
    .isFloat({ min: 50 })
    .withMessage('Hourly rate must be at least 50'),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
];

// Document validation
const validateDocumentUpload = (req, res, next) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (req.file) {
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, JPG, PNG and PDF files are allowed'
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size must not exceed 5MB'
      });
    }
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateGigCreation,
  validateDocumentUpload
};
