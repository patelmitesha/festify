const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'hetarth@123',
  database: 'festify'
};

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login attempt started');
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log('🔐 Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      'SELECT user_id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
      [email]
    );

    await connection.end();

    if (rows.length === 0) {
      console.log('🔐 User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log(`🔐 User found: ${user.name} (ID: ${user.user_id})`);
    console.log(`🔐 Password hash exists: ${user.password_hash ? 'Yes' : 'No'}`);

    if (!user.password_hash) {
      console.log('🔐 No password hash found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log(`🔐 Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('🔐 Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id },
      'fallback-secret-key',
      { expiresIn: '7d' }
    );

    console.log('🔐 Login successful, sending response');
    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token
    });

  } catch (error) {
    console.error('🔐 Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Check if user exists
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [name, email, password_hash]
    );

    const userId = result.insertId;

    // Get created user
    const [newUser] = await connection.execute(
      'SELECT user_id, name, email, created_at, updated_at FROM users WHERE user_id = ?',
      [userId]
    );

    await connection.end();

    const user = newUser[0];
    const token = jwt.sign(
      { userId: user.user_id },
      'fallback-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, 'fallback-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Events endpoints
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Getting events for user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // Get events for the authenticated user
    const [events] = await connection.execute(
      'SELECT event_id, name, description, venue, start_date, end_date, created_at, updated_at FROM events WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );

    await connection.end();

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { name, description, venue, start_date, end_date } = req.body;

    if (!name || !venue || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, venue, start_date, and end_date are required' });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Create event
    const [result] = await connection.execute(
      'INSERT INTO events (name, description, venue, start_date, end_date, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [name, description || '', venue, start_date, end_date, req.user.userId]
    );

    const eventId = result.insertId;

    // Get created event
    const [newEvent] = await connection.execute(
      'SELECT event_id, name, description, venue, start_date, end_date, created_at, updated_at FROM events WHERE event_id = ?',
      [eventId]
    );

    await connection.end();

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single event
app.get('/api/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('📋 Getting event details for:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    const [events] = await connection.execute(
      'SELECT event_id, name, description, venue, start_date, end_date, created_at, updated_at FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    await connection.end();

    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(events[0]);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
app.delete('/api/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('🗑️ Deleting event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(
      'DELETE FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get participants for an event
app.get('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('👥 Getting participants for event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT event_id FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    const [participants] = await connection.execute(
      'SELECT participant_id, event_id, name, address, contact_number FROM participants WHERE event_id = ?',
      [eventId]
    );

    await connection.end();

    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add participant to event
app.post('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, address, contact_number } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    console.log('➕ Adding participant to event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT event_id FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    // Add participant
    const [result] = await connection.execute(
      'INSERT INTO participants (event_id, name, address, contact_number) VALUES (?, ?, ?, ?)',
      [eventId, name, address || null, contact_number || null]
    );

    const participantId = result.insertId;

    // Get created participant
    const [newParticipant] = await connection.execute(
      'SELECT participant_id, event_id, name, address, contact_number FROM participants WHERE participant_id = ?',
      [participantId]
    );

    await connection.end();

    res.status(201).json(newParticipant[0]);
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete participant
app.delete('/api/events/:eventId/participants/:participantId', authenticateToken, async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    console.log('🗑️ Deleting participant:', participantId, 'from event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT event_id FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    const [result] = await connection.execute(
      'DELETE FROM participants WHERE participant_id = ? AND event_id = ?',
      [participantId, eventId]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json({ message: 'Participant deleted successfully' });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coupons for an event
app.get('/api/events/:eventId/coupons', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('🎫 Getting coupons for event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT event_id FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    const [coupons] = await connection.execute(
      'SELECT coupon_id, event_id, participant_id, qr_code_value, total_count, consumed_count, status, created_at FROM coupons WHERE event_id = ?',
      [eventId]
    );

    await connection.end();

    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate coupons for an event
app.post('/api/events/:eventId/coupons/generate', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('🎫 Generating coupons for event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT event_id FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get participants for this event
    const [participants] = await connection.execute(
      'SELECT participant_id FROM participants WHERE event_id = ?',
      [eventId]
    );

    if (participants.length === 0) {
      await connection.end();
      return res.status(400).json({ error: 'No participants found for this event. Add participants first.' });
    }

    const generatedCoupons = [];

    // Generate a coupon for each participant
    for (const participant of participants) {
      // Check if coupon already exists for this participant
      const [existingCoupons] = await connection.execute(
        'SELECT coupon_id FROM coupons WHERE event_id = ? AND participant_id = ?',
        [eventId, participant.participant_id]
      );

      if (existingCoupons.length === 0) {
        // Generate unique QR code value
        const qrCodeValue = `EVENT_${eventId}_PARTICIPANT_${participant.participant_id}_${Date.now()}`;

        // Insert coupon
        const [result] = await connection.execute(
          'INSERT INTO coupons (event_id, participant_id, qr_code_value, total_count, consumed_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [eventId, participant.participant_id, qrCodeValue, 1, 0, 'Booked']
        );

        generatedCoupons.push({
          coupon_id: result.insertId,
          event_id: parseInt(eventId),
          participant_id: participant.participant_id,
          qr_code_value: qrCodeValue,
          total_count: 1,
          consumed_count: 0,
          status: 'Booked',
          created_at: new Date()
        });
      }
    }

    // Get all coupons for the event to return
    const [allCoupons] = await connection.execute(
      'SELECT coupon_id, event_id, participant_id, qr_code_value, total_count, consumed_count, status, created_at FROM coupons WHERE event_id = ?',
      [eventId]
    );

    await connection.end();

    res.json({
      message: `Generated ${generatedCoupons.length} new coupons`,
      coupons: allCoupons
    });
  } catch (error) {
    console.error('Generate coupons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download coupon PDF
app.get('/api/coupons/:couponId/pdf', authenticateToken, async (req, res) => {
  try {
    const { couponId } = req.params;
    console.log('📄 Downloading PDF for coupon:', couponId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // Get coupon details and verify ownership
    const [coupons] = await connection.execute(`
      SELECT c.coupon_id, c.qr_code_value, c.total_count, c.consumed_count, c.status,
             e.name as event_name, e.venue, e.start_date, e.end_date,
             p.name as participant_name
      FROM coupons c
      JOIN events e ON c.event_id = e.event_id
      JOIN participants p ON c.participant_id = p.participant_id
      WHERE c.coupon_id = ? AND e.user_id = ?
    `, [couponId, req.user.userId]);

    await connection.end();

    if (coupons.length === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // For now, return a simple PDF-like response
    // In a real app, you'd generate actual PDF using libraries like puppeteer or pdfkit
    const coupon = coupons[0];
    const pdfContent = `
Festify Event Coupon
====================

Event: ${coupon.event_name}
Venue: ${coupon.venue}
Participant: ${coupon.participant_name}
QR Code: ${coupon.qr_code_value}
Status: ${coupon.status}
Total Count: ${coupon.total_count}
Consumed: ${coupon.consumed_count}
Remaining: ${coupon.total_count - coupon.consumed_count}

Valid from: ${new Date(coupon.start_date).toLocaleDateString()}
Valid until: ${new Date(coupon.end_date).toLocaleDateString()}

Present this coupon at the event for entry.
    `;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=coupon-${couponId}.pdf`);
    res.send(Buffer.from(pdfContent));

  } catch (error) {
    console.error('Download coupon PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event reports/summary
app.get('/api/reports/:eventId/summary', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('📊 Getting reports for event:', eventId, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT * FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = events[0];

    // Get participants count
    const [participantCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM participants WHERE event_id = ?',
      [eventId]
    );

    // Get coupons statistics
    const [couponStats] = await connection.execute(
      'SELECT COUNT(*) as total_coupons, SUM(total_count) as total_count, SUM(consumed_count) as consumed_count FROM coupons WHERE event_id = ?',
      [eventId]
    );

    // Get status breakdown
    const [statusBreakdown] = await connection.execute(
      'SELECT status, COUNT(*) as count FROM coupons WHERE event_id = ? GROUP BY status',
      [eventId]
    );

    await connection.end();

    const stats = couponStats[0];
    const summary = {
      total_participants: participantCount[0].count,
      total_coupons_booked: stats.total_count || 0,
      total_coupons_redeemed: stats.consumed_count || 0,
      pending_coupons: (stats.total_count || 0) - (stats.consumed_count || 0),
      breakdown: statusBreakdown.map(item => ({
        category: item.status,
        count: item.count
      }))
    };

    res.json({
      event,
      summary
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export event reports
app.get('/api/reports/:eventId/export', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { format } = req.query;
    console.log('📋 Exporting report for event:', eventId, 'format:', format, 'user:', req.user.userId);

    const connection = await mysql.createConnection(dbConfig);

    // First verify the event belongs to the user
    const [events] = await connection.execute(
      'SELECT * FROM events WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );

    if (events.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get detailed data for export
    const [reportData] = await connection.execute(`
      SELECT
        p.name as participant_name,
        p.address as participant_address,
        p.contact_number as participant_contact,
        c.qr_code_value,
        c.total_count,
        c.consumed_count,
        c.status,
        c.created_at as coupon_created
      FROM participants p
      LEFT JOIN coupons c ON p.participant_id = c.participant_id
      WHERE p.event_id = ?
      ORDER BY p.name
    `, [eventId]);

    await connection.end();

    const event = events[0];

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Participant Name,Address,Contact,QR Code,Total Count,Consumed Count,Status,Coupon Created\n';
      const csvRows = reportData.map(row => [
        row.participant_name,
        row.participant_address || '',
        row.participant_contact || '',
        row.qr_code_value || 'No coupon',
        row.total_count || 0,
        row.consumed_count || 0,
        row.status || 'No coupon',
        row.coupon_created ? new Date(row.coupon_created).toLocaleDateString() : 'N/A'
      ].join(',')).join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=event-${eventId}-report.csv`);
      res.send(csvContent);

    } else {
      // Generate PDF-like content
      const pdfContent = `
Festify Event Report
===================

Event: ${event.name}
Venue: ${event.venue}
Start Date: ${new Date(event.start_date).toLocaleDateString()}
End Date: ${new Date(event.end_date).toLocaleDateString()}

Participants and Coupons:
------------------------
${reportData.map((row, index) => `
${index + 1}. ${row.participant_name}
   Address: ${row.participant_address || 'Not provided'}
   Contact: ${row.participant_contact || 'Not provided'}
   QR Code: ${row.qr_code_value || 'No coupon generated'}
   Status: ${row.status || 'No coupon'}
   Coupon Usage: ${row.consumed_count || 0}/${row.total_count || 0}
`).join('')}

Generated on: ${new Date().toLocaleDateString()}
      `;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=event-${eventId}-report.pdf`);
      res.send(Buffer.from(pdfContent));
    }

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    message: 'Festify API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Ready to test login: curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"patelmitesha@gmail.com","password":"miteshpatel"}'`);
});