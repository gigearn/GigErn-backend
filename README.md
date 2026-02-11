# GigErn Backend

Backend API for GigErn - A gig platform connecting stores with workers.

## Features

- **Authentication**: Phone-based login with OTP verification
- **User Management**: Support for both stores and workers
- **Gig Management**: Create, apply, and manage gigs
- **Document Upload**: Secure file upload for verification
- **Payment Processing**: Handle gig payments with platform fees
- **Notifications**: Real-time notification system
- **Rating System**: User ratings and reviews

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Twilio** - SMS service (for OTP)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration time
- `FRONTEND_URL` - Frontend application URL
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

## API Endpoints

### Authentication

- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile

### Users

- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-documents` - Upload verification documents
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/workers/list` - Get list of workers (stores only)

### Gigs

- `POST /api/gigs` - Create new gig (stores only)
- `GET /api/gigs` - Get all gigs with filters
- `GET /api/gigs/:id` - Get gig by ID
- `POST /api/gigs/:id/apply` - Apply for gig (workers only)
- `PUT /api/gigs/:id/applications/:applicationId` - Accept/reject application (stores only)
- `PUT /api/gigs/:id/start` - Start gig (workers only)
- `PUT /api/gigs/:id/complete` - Complete gig (workers only)
- `GET /api/gigs/my/gigs` - Get user's gigs

## Database Schema

### Users

- **Store users**: Business information, GST number, shop license
- **Worker users**: Personal information, Aadhaar, PAN, vehicle details
- Common fields: Name, phone, email, rating, verification status

### Gigs

- Title, description, category
- Location details
- Schedule (start/end times)
- Payment information
- Status tracking
- Applications and reviews

### Payments

- Gig payment tracking
- Platform fee calculation
- Payment status management

### Notifications

- Real-time notifications
- Multiple notification types
- User-specific messaging

## File Upload

- Supported formats: JPEG, PNG, PDF
- Maximum file size: 5MB
- Upload location: `/uploads/documents`
- Secure file naming with timestamps

## Security Features

- JWT-based authentication
- Rate limiting
- Input validation
- File upload validation
- CORS configuration
- Helmet.js for security headers

## Error Handling

- Consistent error response format
- Development vs production error details
- Proper HTTP status codes
- Validation error handling

## Development

- Use `npm run dev` for development with nodemon
- Use `npm test` to run tests
- Check `npm start` for production

## License

MIT