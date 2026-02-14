# GigErn Backend

Backend API for GigErn - A gig platform connecting stores with workers.

## 🏗️ Project Structure

### 📁 Root Files
- **`package.json`** - Project dependencies, scripts, and metadata
- **`server.js`** - Main server entry point and Express app setup
- **`.env`** - Environment variables (database URLs, JWT secrets, API keys)
- **`.gitignore`** - Git ignore patterns
- **`README.md`** - This documentation file

### 📁 src/ Directory Structure

#### 🛣️ routes/ (API Routes)
- **`auth.js`** - Authentication endpoints (login, register, OTP verification)
  - `POST /api/auth/admin-login` - Admin authentication
  - `POST /api/auth/login` - Traditional email/password login
  - `POST /api/auth/send-otp` - Send OTP to phone
  - `POST /api/auth/verify-otp` - Verify OTP and login
  - `POST /api/auth/register` - User registration
  - `GET /api/auth/me` - Get current user profile
- **`users.js`** - User management endpoints
- **`gigs.js`** - Gig management endpoints

#### 🗄️ models/ (Database Models)
- **`User.js`** - User schema and model
  - Supports multiple user types: admin, verifier, store, worker
  - Document verification status tracking
  - OTP generation and validation methods
  - Password hashing and comparison
- **`Gig.js`** - Gig schema and model
- **`Payment.js`** - Payment schema and model
- **`Notification.js`** - Notification schema and model

#### 🔧 middleware/ (Express Middleware)
- **`auth.js`** - JWT authentication middleware
  - Token verification and user extraction
  - Protects routes requiring authentication

#### 🛠️ utils/ (Utility Functions)
- **`passwordUtils.js`** - Password hashing and comparison utilities
- **`validators.js`** - Input validation utilities
- **`helpers.js`** - General helper functions

#### 📁 uploads/ (File Storage)
- **`documents/`** - User uploaded verification documents
- Organized by user ID for secure file management

## 🎯 User Roles & Permissions

### 👨‍💼 Admin Role (`admin`)
- **Access**: Full system administration
- **Login**: `/api/auth/admin-login`
- **Permissions**: User management, system oversight, all CRUD operations

### ✅ Verifier Role (`verifier`)
- **Access**: Document verification only
- **Login**: `/api/auth/admin-login`
- **Permissions**: Review and approve/reject documents, audit logging

### 🏪 Store Role (`store`)
- **Access**: Store management features
- **Login**: `/api/auth/login` or OTP flow
- **Permissions**: Create gigs, manage workers, view analytics

### 🚴 Gig Worker Role (`worker`)
- **Access**: Gig work opportunities
- **Login**: `/api/auth/login` or OTP flow
- **Permissions**: Apply for gigs, manage profile, track earnings

## 🔐 Authentication System

### Phone-Based Authentication (Primary)
1. **Send OTP**: `POST /api/auth/send-otp`
2. **Verify OTP**: `POST /api/auth/verify-otp`
3. **JWT Token**: Returned on successful verification

### Admin Authentication
1. **Phone + OTP**: `POST /api/auth/admin-login`
2. **Fixed OTP**: `123456` (development)
3. **Role-Based Access**: Different dashboards based on userType

### Traditional Login (Fallback)
1. **Email + Password**: `POST /api/auth/login`
2. **JWT Token**: Standard authentication flow

## 📊 Database Schema

### User Model Structure
```javascript
{
  fullName: String,
  phoneNumber: String,
  email: String,
  userType: String, // 'admin', 'verifier', 'store', 'worker'
  password: String, // Hashed password
  isVerified: Boolean,
  isPhoneVerified: Boolean,
  verificationStatus: String, // 'pending', 'verified', 'rejected'
  documents: Object, // Document upload status
  rating: Number,
  profileImage: String,
  lastLogin: Date,
  // Store-specific fields
  businessName: String,
  businessAddress: String,
  pincode: String,
  // Worker-specific fields
  city: String,
  vehicleNumber: String,
  // OTP fields
  otp: String,
  otpExpires: Date,
  otpAttempts: Number
}
```

## 🚀 Features

### Authentication & Security
- **Multi-Role Authentication**: Different login flows for different user types
- **Phone-Based Login**: Primary authentication method with OTP
- **JWT Tokens**: Secure session management
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Express-validator for data sanitization

### User Management
- **Registration**: Multi-step registration with document requirements
- **Profile Management**: Update user information and preferences
- **Document Verification**: Secure file upload and verification workflow
- **Status Tracking**: Real-time verification status updates

### Admin Features
- **Admin Login**: Separate authentication for admin users
- **User Oversight**: View and manage all user accounts
- **Verification Management**: Override and manage document verifications
- **System Analytics**: User statistics and system health metrics

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation
```bash
# Clone repository
git clone <repository-url>
cd GigErn-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Update .env with your configuration

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

### Environment Variables
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gigern
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

## 📁 File Upload System

### Supported Document Types
- **Store Users**: GST Certificate, PAN Card, Aadhaar Card, Shop License
- **Worker Users**: Aadhaar Card, PAN Card, Driving License, Vehicle RC

### Upload Configuration
- **Max File Size**: 5MB per file
- **Supported Formats**: JPEG, PNG, PDF
- **Storage Location**: `/uploads/documents/`
- **File Naming**: Timestamp + user ID + random string

### Security Features
- **File Type Validation**: MIME type checking
- **Size Limits**: Prevent large file uploads
- **Secure Naming**: Prevent directory traversal attacks
- **Access Control**: Protected file access routes

## 🔧 API Architecture

### RESTful Design
- **Consistent Responses**: Standardized JSON response format
- **HTTP Status Codes**: Proper status code usage
- **Error Handling**: Comprehensive error responses
- **Validation**: Input validation on all endpoints

### Response Format
```javascript
// Success Response
{
  success: true,
  message: "Operation successful",
  data: { ... }
}

// Error Response
{
  success: false,
  message: "Error description",
  error: "Detailed error information"
}
```

## 🛡️ Security Features

### Authentication
- **JWT Tokens**: Secure session management
- **Token Expiration**: Automatic token expiry
- **Role-Based Access**: Middleware for role verification
- **Admin Protection**: Separate admin authentication

### Data Protection
- **Password Hashing**: bcrypt with salt rounds
- **Input Sanitization**: Express-validator integration
- **SQL Injection Prevention**: MongoDB ODM protection
- **XSS Protection**: Input sanitization and output encoding

### File Security
- **Upload Validation**: File type and size checking
- **Secure Storage**: Protected file system access
- **Access Control**: Role-based file access

## 🔄 Development Workflow

### Scripts
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm test         # Run test suite
npm run seed     # Seed database with initial data
```

### Code Organization
- **Modular Structure**: Separated concerns by functionality
- **Reusable Middleware**: Common authentication and validation
- **Utility Functions**: Shared helper functions
- **Consistent Naming**: Clear file and function naming

## 📝 API Documentation

### Authentication Endpoints
- **Admin Login**: `POST /api/auth/admin-login`
  - Body: `{ phone, otp }`
  - Response: JWT token and user data

- **Send OTP**: `POST /api/auth/send-otp`
  - Body: `{ phoneNumber }`
  - Response: OTP sent confirmation

- **Verify OTP**: `POST /api/auth/verify-otp`
  - Body: `{ phoneNumber, otp }`
  - Response: JWT token and user data

- **Register**: `POST /api/auth/register`
  - Body: User registration data
  - Response: User creation confirmation

### Profile Endpoints
- **Get Profile**: `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: Current user profile

## 🚀 Deployment Considerations

### Environment Setup
- **Production Database**: MongoDB Atlas or similar
- **Environment Variables**: Secure configuration management
- **File Storage**: Cloud storage for uploads (AWS S3, etc.)
- **Logging**: Comprehensive error and access logging

### Render Deployment (Recommended)
- **Platform**: Render.com for Node.js backends
- **Service Type**: Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 5000 (Render automatically sets PORT env var)

### Environment Variables for Render
- `MONGO_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secure random string (min 32 chars)
- `FRONTEND_URL` - Your frontend deployment URL
- `NODE_ENV` - Set to `production`
- `PORT` - Render sets this automatically

### Security Hardening
- **HTTPS**: SSL/TLS encryption (automatic on Render)
- **CORS**: Proper cross-origin configuration
- **Rate Limiting**: API abuse prevention
- **Security Headers**: Helmet.js integration
- **Dependency Updates**: Regular security patching

## 📊 Monitoring & Analytics

### Logging Strategy
- **Access Logs**: Request/response logging
- **Error Logs**: Detailed error tracking
- **Audit Logs**: User action tracking
- **Performance Metrics**: Response time monitoring

### Health Checks
- **Database Connectivity**: MongoDB connection status
- **API Endpoints**: Service availability checks
- **File Storage**: Upload system status
- **Memory Usage**: Server resource monitoring

## 🧪 Testing Strategy

### Unit Tests
- **Model Validation**: User model validation tests
- **Utility Functions**: Helper function tests
- **Middleware**: Authentication and validation tests

### Integration Tests
- **API Endpoints**: Full request/response testing
- **Database Operations**: CRUD operation testing
- **File Upload**: Upload and validation testing

### Test Coverage
- **Authentication Flows**: All login methods
- **User Management**: Registration and profile updates
- **Error Scenarios**: Invalid inputs and edge cases

## 🔄 Version Control

### Git Workflow
- **Feature Branches**: Separate branches for new features
- **Code Review**: Pull request review process
- **Testing**: Automated testing on commits
- **Deployment**: Staging and production deployment

### Branching Strategy
- **main**: Production-ready code
- **develop**: Integration branch
- **feature/***: Feature development branches
- **hotfix/***: Critical bug fixes

## 📚 Additional Resources

### Documentation
- **API Documentation**: Detailed endpoint documentation
- **Database Schema**: Complete model documentation
- **Deployment Guide**: Production deployment instructions
- **Contributing Guide**: Development contribution guidelines

### Support
- **Issue Tracking**: GitHub issues for bug reports
- **Wiki**: Additional documentation and guides
- **Code Comments**: Inline code documentation
- **README Updates**: Regular documentation updates