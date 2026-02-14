import express from 'express';
import { body, validationResult } from 'express-validator';
import Gig from '../models/Gig.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import { auth, authorize } from '../middleware/auth.js';
const router = express.Router();

// Create new gig (store only)
router.post('/', auth, authorize('store'), [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
  body('category')
    .isIn(['retail', 'delivery', 'warehouse', 'customer-service', 'other'])
    .withMessage('Invalid category'),
  body('location.address')
    .notEmpty()
    .withMessage('Address is required'),
  body('location.city')
    .notEmpty()
    .withMessage('City is required'),
  body('location.state')
    .notEmpty()
    .withMessage('State is required'),
  body('location.pincode')
    .notEmpty()
    .withMessage('Pincode is required'),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required'),
  body('hourlyRate')
    .isNumeric()
    .withMessage('Hourly rate must be a number')
    .isFloat({ min: 50 })
    .withMessage('Hourly rate must be at least 50')
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

    const gigData = {
      ...req.body,
      store: req.user._id,
      duration: (new Date(req.body.endTime) - new Date(req.body.startTime)) / (1000 * 60 * 60) // Convert to hours
    };

    const gig = new Gig(gigData);
    await gig.save();

    // Calculate total amount
    gig.calculateTotalAmount();
    await gig.save();

    res.status(201).json({
      success: true,
      message: 'Gig created successfully',
      data: { gig }
    });
  } catch (error) {
    console.error('Create gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create gig'
    });
  }
});

// Get all gigs with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      city,
      status = 'open',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { status };

    if (category) filter.category = category;
    if (city) filter['location.city'] = city;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const gigs = await Gig.find(filter)
      .populate('store', 'fullName businessName rating')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Gig.countDocuments(filter);

    res.json({
      success: true,
      data: {
        gigs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('Get gigs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gigs'
    });
  }
});

// Get gig by ID
router.get('/:id', async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('store', 'fullName businessName rating profileImage')
      .populate('worker', 'fullName rating profileImage')
      .populate('applications.worker', 'fullName rating profileImage');

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    // Increment view count
    gig.views += 1;
    await gig.save();

    res.json({
      success: true,
      data: { gig }
    });
  } catch (error) {
    console.error('Get gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gig'
    });
  }
});

// Apply for gig (worker only)
router.post('/:id/apply', auth, authorize('worker'), [
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters')
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

    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Gig is not open for applications'
      });
    }

    // Check if already applied
    const existingApplication = gig.applications.find(
      app => app.worker.toString() === req.user._id.toString()
    );

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this gig'
      });
    }

    if (gig.applications.length >= gig.maxApplications) {
      return res.status(400).json({
        success: false,
        message: 'Maximum applications reached for this gig'
      });
    }

    // Add application
    gig.applications.push({
      worker: req.user._id,
      message: req.body.message || '',
      status: 'pending'
    });

    await gig.save();

    // Create notification for store
    await Notification.create({
      recipient: gig.store,
      type: 'application_received',
      title: 'New Application Received',
      message: `${req.user.fullName} has applied for your gig: ${gig.title}`,
      data: { gigId: gig._id }
    });

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for gig'
    });
  }
});

// Accept/Reject application (store only)
router.put('/:id/applications/:applicationId', auth, authorize('store'), [
  body('action')
    .isIn(['accept', 'reject'])
    .withMessage('Action must be either accept or reject')
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

    const { action } = req.body;
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.store.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage this gig'
      });
    }

    const application = gig.applications.id(req.params.applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (action === 'accept') {
      // Assign worker to gig
      gig.worker = application.worker;
      gig.status = 'assigned';
      gig.assignedAt = new Date();
      application.status = 'accepted';

      // Reject all other applications
      gig.applications.forEach(app => {
        if (app._id.toString() !== req.params.applicationId) {
          app.status = 'rejected';
        }
      });

      // Create notification for worker
      await Notification.create({
        recipient: application.worker,
        type: 'application_accepted',
        title: 'Application Accepted',
        message: `Your application for ${gig.title} has been accepted!`,
        data: { gigId: gig._id }
      });
    } else {
      application.status = 'rejected';
    }

    await gig.save();

    res.json({
      success: true,
      message: `Application ${action}ed successfully`
    });
  } catch (error) {
    console.error('Manage application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage application'
    });
  }
});

// Start gig (worker only)
router.put('/:id/start', auth, authorize('worker'), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.worker.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this gig'
      });
    }

    if (gig.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: 'Gig must be assigned before starting'
      });
    }

    gig.status = 'in-progress';
    gig.startedAt = new Date();
    await gig.save();

    res.json({
      success: true,
      message: 'Gig started successfully'
    });
  } catch (error) {
    console.error('Start gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start gig'
    });
  }
});

// Complete gig (worker only)
router.put('/:id/complete', auth, authorize('worker'), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    if (gig.worker.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this gig'
      });
    }

    if (gig.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Gig must be in progress to complete'
      });
    }

    gig.status = 'completed';
    gig.completedAt = new Date();
    await gig.save();

    // Create payment record
    const payment = new Payment({
      gig: gig._id,
      store: gig.store,
      worker: gig.worker,
      amount: gig.totalAmount
    });
    await payment.save();

    // Create notification for store
    await Notification.create({
      recipient: gig.store,
      type: 'gig_completed',
      title: 'Gig Completed',
      message: `${req.user.fullName} has completed the gig: ${gig.title}`,
      data: { gigId: gig._id }
    });

    res.json({
      success: true,
      message: 'Gig completed successfully'
    });
  } catch (error) {
    console.error('Complete gig error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete gig'
    });
  }
});

// Get user's gigs
router.get('/my/gigs', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter;
    if (req.user.userType === 'store') {
      filter = { store: req.user._id };
    } else {
      filter = { worker: req.user._id };
    }

    if (status) filter.status = status;

    const gigs = await Gig.find(filter)
      .populate(req.user.userType === 'store' ? 'worker' : 'store', 'fullName rating profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Gig.countDocuments(filter);

    res.json({
      success: true,
      data: {
        gigs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total
        }
      }
    });
  } catch (error) {
    console.error('Get my gigs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gigs'
    });
  }
});

export default router;
