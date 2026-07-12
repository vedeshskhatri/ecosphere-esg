import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import event bus and cron jobs
import { initSocket } from './socket/eventBus';
import { startSLAWatcher } from './jobs/SLAWatcher';

// Import routes
import authRoutes from './routes/auth.routes';
import environmentalRoutes from './routes/environmental.routes';
import socialRoutes from './routes/social.routes';
import governanceRoutes from './routes/governance.routes';
import gamificationRoutes from './routes/gamification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';
import productsRoutes from './routes/products.routes';
import notificationsRoutes from './routes/notifications.routes';

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173',
];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Initialize socket instance in eventBus
initSocket(io);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads static folder
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'EcoSphere ESG Platform API is running.' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// WebSocket Connection Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Handle joining custom user room for targeted notifications
  socket.on('join:user', (userId: string) => {
    if (userId) {
      const roomName = `user:${userId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${roomName}`);
      socket.emit('connect:success', { message: `Joined room ${roomName}` });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start Background Cron Jobs
startSLAWatcher();

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🌿 EcoSphere server running on port ${PORT}`);
});

export { io };
