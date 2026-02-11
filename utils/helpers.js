const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format phone number
const formatPhoneNumber = (phoneNumber) => {
  return phoneNumber.replace(/\D/g, '');
};

// Calculate distance between two coordinates (in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// Format date for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Pagination helper
const getPagination = (page, limit) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Format pagination response
const formatPaginationResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

// Error response helper
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || error;
  }

  return res.status(statusCode).json(response);
};

// Success response helper
const sendSuccessResponse = (res, statusCode = 200, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// Validate file upload
const validateFile = (file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSize = 5 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, message: 'No file provided' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, message: 'File type not allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, message: 'File size too large' };
  }

  return { valid: true };
};

// Generate unique filename
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalname.split('.').pop();
  return `${timestamp}_${random}.${extension}`;
};

// Calculate gig duration in hours
const calculateGigDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  return durationMs / (1000 * 60 * 60); // Convert to hours
};

// Check if gig time is valid
const isValidGigTime = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  // End time must be after start time
  if (end <= start) {
    return false;
  }

  // Start time must be in the future
  if (start <= now) {
    return false;
  }

  // Gig duration must be reasonable (between 1 hour and 24 hours)
  const duration = calculateGigDuration(startTime, endTime);
  if (duration < 1 || duration > 24) {
    return false;
  }

  return true;
};

module.exports = {
  generateRandomString,
  formatPhoneNumber,
  calculateDistance,
  formatDate,
  getPagination,
  formatPaginationResponse,
  sendErrorResponse,
  sendSuccessResponse,
  validateFile,
  generateUniqueFilename,
  calculateGigDuration,
  isValidGigTime
};
