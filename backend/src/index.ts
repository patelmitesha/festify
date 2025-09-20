import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
// Disabled Sequelize for raw SQL approach
// import sequelize from './config/database';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import participantRoutes from './routes/participants';
import participationRequestRoutes from './routes/participationRequests';
import couponRoutes from './routes/coupons';
import reportRoutes from './routes/reports';
import userManagementRoutes from './routes/userManagement';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Changed from 5001 to 5000

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', participantRoutes);
app.use('/api/events', participationRequestRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userManagementRoutes);

app.get('/health', (req, res) => {
  res.json({ message: 'Festify API is running', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  console.log('Starting server without Sequelize - using raw SQL for auth.');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

startServer();