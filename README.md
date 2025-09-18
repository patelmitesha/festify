# Festify - Event Coupon Management Platform

Festify is a comprehensive web-based event coupon management platform that enables communities, organizations, and residential colonies to manage food coupon-based events efficiently.

## Features

- **User & Role Management**: Anyone can register and create events, becoming the admin for their events
- **Event Management**: Create and manage events with customizable coupon rates and meal choices
- **Participant Management**: Add participants with detailed information and coupon bookings
- **QR Code Coupons**: Generate QR-enabled PDF coupons and shareable links
- **Coupon Redemption**: Scan and redeem coupons with partial redemption support
- **Reporting**: Real-time event summaries and export capabilities (PDF/CSV)
- **Responsive Design**: Mobile-first UI for seamless management and scanning

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript
- MySQL with Sequelize ORM
- JWT Authentication
- QR Code generation with `qrcode`
- PDF generation with `pdfkit`

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- Context API for state management

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd festify
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
npm run install:backend

# Install frontend dependencies
npm run install:frontend
```

### 3. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE festify;
EXIT;

# Run the database schema
mysql -u root -p festify < database/schema.sql
```

### 4. Environment Configuration

#### Backend Environment
Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=festify

JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment
Create `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode
```bash
# Start backend server (in one terminal)
npm run dev:backend

# Start frontend development server (in another terminal)
npm run dev:frontend
```

### Production Mode
```bash
# Build both frontend and backend
npm run build:frontend
npm run build:backend

# Start production servers
npm run start:backend
npm run start:frontend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Events
- `GET /api/events` - Get user events
- `POST /api/events` - Create new event
- `GET /api/events/:eventId` - Get event details
- `PUT /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event

### Participants
- `GET /api/events/:eventId/participants` - Get event participants
- `POST /api/events/:eventId/participants` - Add participant
- `PUT /api/events/:eventId/participants/:participantId` - Update participant
- `DELETE /api/events/:eventId/participants/:participantId` - Delete participant

### Coupons
- `GET /api/coupons/qr/:qrCode` - Get coupon by QR code
- `POST /api/coupons/redeem/:qrCode` - Redeem coupon
- `GET /api/coupons/events/:eventId` - Get event coupons
- `GET /api/coupons/events/:eventId/pdf/:participantId` - Generate coupon PDF
- `GET /api/coupons/events/:eventId/redemptions` - Get redemption history

### Reports
- `GET /api/reports/:eventId/summary` - Get event summary
- `GET /api/reports/:eventId/export?format=pdf|csv` - Export event report

## Usage

### Creating an Event
1. Register/Login to the platform
2. Click "Create New Event" from the dashboard
3. Fill in event details including:
   - Event name, description, venue
   - Start and end dates
   - Coupon rates (Member/Guest pricing)
   - Meal choices (Regular, Jain, Vegan, etc.)

### Adding Participants
1. Navigate to your event
2. Click "Manage Participants"
3. Add participant details and specify their coupon bookings
4. Coupons are automatically generated with unique QR codes

### Redemption Process
1. During the event, scan participant QR codes
2. System validates coupon and shows details
3. Specify how many coupons to redeem
4. System prevents double redemption

### Reporting
1. Access real-time event summary from event dashboard
2. Export detailed reports in PDF or CSV format
3. View breakdown by meal type and rate category

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Protected API endpoints
- Unique QR codes with backend validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please create an issue in the repository.