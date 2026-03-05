/**
 * One-Click AWS Deployer - Backend Server
 * 
 * Express server with Socket.io for real-time updates.
 * Manages EC2 deployments via REST API.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server: SocketServer } = require('socket.io');

// Import routes
const deployRoutes = require('./routes/deploy');
const instancesRoutes = require('./routes/instances');
const logsRoutes = require('./routes/logs');

// Import services
const { startPolling, stopPolling, stopAllPolling, pollAllInstances } = require('./services/statusPoller');

// Environment variables
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Validate required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'EC2_KEY_PAIR_NAME',
  'EC2_SECURITY_GROUP_ID',
  'EC2_AMI_ID',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/deploy', deployRoutes);
app.use('/api/instances', instancesRoutes);
app.use('/api/instances', logsRoutes); // Mounts /:id/logs under /api/instances

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Send initial connection confirmation
  socket.emit('connected', {
    message: 'Connected to OneClick Deploy server',
    timestamp: new Date().toISOString(),
  });

  // Send current instances list on connection
  pollAllInstances(io).then(instances => {
    socket.emit('instances:all', {
      instances,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Handle subscription to specific instance updates
  socket.on('subscribe:instance', (instanceId) => {
    console.log(`[Socket] ${socket.id} subscribed to instance: ${instanceId}`);
    socket.join(`instance:${instanceId}`);
    // Start polling this instance for updates
    startPolling(instanceId, io);
  });
  
  socket.on('unsubscribe:instance', (instanceId) => {
    console.log(`[Socket] ${socket.id} unsubscribed from instance: ${instanceId}`);
    socket.leave(`instance:${instanceId}`);
    // Check if any clients still in the room before stopping poll
    const room = io.sockets.adapter.rooms.get(`instance:${instanceId}`);
    if (!room || room.size === 0) {
      stopPolling(instanceId);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  🚀 OneClick Deploy Server Started');
  console.log('========================================');
  console.log(`  📡 REST API:     http://localhost:${PORT}/api`);
  console.log(`  🔌 WebSocket:    ws://localhost:${PORT}`);
  console.log(`  🌍 Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`  🔗 CORS Origin:  ${CORS_ORIGIN}`);
  console.log(`  🌏 AWS Region:   ${process.env.AWS_REGION || 'ap-southeast-1'}`);
  console.log('========================================\n');
  console.log('Endpoints:');
  console.log('  POST   /api/deploy           - Deploy a GitHub repo');
  console.log('  GET    /api/instances        - List all instances');
  console.log('  GET    /api/instances/:id    - Get instance details');
  console.log('  PUT    /api/instances/:id/stop   - Stop instance');
  console.log('  PUT    /api/instances/:id/start  - Start instance');
  console.log('  DELETE /api/instances/:id    - Terminate instance');
  console.log('  GET    /api/instances/:id/logs   - Get console logs');
  console.log('  GET    /api/health           - Health check');
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  stopAllPolling();
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  stopAllPolling();
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
