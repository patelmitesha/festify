# Database Structure Updates

This directory contains database schema updates and initialization scripts for the Festify application.

## Recent Updates

### Participation Requests Feature

A new table `participation_requests` has been added to support public participation requests for events.

#### Table Schema

```sql
CREATE TABLE participation_requests (
  request_id int(11) NOT NULL AUTO_INCREMENT,
  event_id int(11) NOT NULL,
  name varchar(100) NOT NULL,
  address varchar(255) DEFAULT NULL,
  contact_number varchar(20) DEFAULT NULL,
  email varchar(100) DEFAULT NULL,
  message text DEFAULT NULL,
  status enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  KEY idx_event_id (event_id),
  KEY idx_status (status),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_participation_requests_event_id FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Features Enabled

1. **Public Participation Requests**: Anyone can submit a request to participate in an event
2. **Event Manager Review**: Event managers and representatives can view and manage requests
3. **Approval Workflow**: Requests can be approved (creating participants) or rejected
4. **Status Tracking**: Requests have status tracking (pending/approved/rejected)

## Database Scripts

### Files in this directory:

- `init_database.sql` - Complete database schema including all tables
- `add_participation_requests_table.sql` - Specific script to add only the participation_requests table

### Running Database Updates

#### Option 1: Using the complete schema
```bash
mysql -u [username] -p [database_name] < database/init_database.sql
```

#### Option 2: Adding only the participation requests table
```bash
mysql -u [username] -p [database_name] < database/add_participation_requests_table.sql
```

#### Option 3: Using the Node.js sync utility (preferred for development)
```bash
cd backend
npm run db:sync
```

## API Endpoints Added

The following new endpoints are available:

### Public Endpoints
- `POST /api/events/:eventId/participation-requests` - Submit participation request

### Authenticated Endpoints (Event Managers/Representatives)
- `GET /api/events/:eventId/participation-requests` - List all requests for an event
- `POST /api/events/:eventId/participation-requests/:requestId/approve` - Approve a request
- `POST /api/events/:eventId/participation-requests/:requestId/reject` - Reject a request
- `DELETE /api/events/:eventId/participation-requests/:requestId` - Delete a request

## Frontend Integration

### New Pages
- `/request-participation` - Public form for submitting participation requests

### Updated Pages
- Participant Management page now shows pending participation requests
- Home page includes "Request to Participate" call-to-action

## Environment Requirements

Make sure your database configuration in `.env` includes:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=festify
```

## Troubleshooting

If you encounter issues with database synchronization:

1. Check that your MySQL server is running
2. Verify database credentials in `.env`
3. Ensure the database exists: `CREATE DATABASE festify;`
4. Run the manual SQL scripts if automatic sync fails

For assistance, check the logs or contact the development team.