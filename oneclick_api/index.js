/**
 * One-Click Deployer - Backend Server
 * 
 * Express server with Socket.io for real-time updates.
 * Manages deployments to Vercel and Railway via REST API.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server: SocketServer } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const deploymentsRoutes = require('./routes/deployments');
const databasesRoutes = require('./routes/databases');

// Environment variables
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Note: Vercel/Railway API tokens are provided by users per-request
// No shared credentials needed at server startup

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
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api', deploymentsRoutes);  // Mounts /deploy/*, /deployments/*
app.use('/api/databases', databasesRoutes);

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

  // Handle subscription to deployment updates
  socket.on('subscribe:deployment', ({ platform, deploymentId }) => {
    console.log(`[Socket] ${socket.id} subscribed to ${platform} deployment: ${deploymentId}`);
    socket.join(`deployment:${platform}:${deploymentId}`);
  });
  
  socket.on('unsubscribe:deployment', ({ platform, deploymentId }) => {
    console.log(`[Socket] ${socket.id} unsubscribed from ${platform} deployment: ${deploymentId}`);
    socket.leave(`deployment:${platform}:${deploymentId}`);
  });

  // Handle subscription to project updates
  socket.on('subscribe:project', ({ platform, projectId }) => {
    console.log(`[Socket] ${socket.id} subscribed to ${platform} project: ${projectId}`);
    socket.join(`project:${platform}:${projectId}`);
  });
  
  socket.on('unsubscribe:project', ({ platform, projectId }) => {
    console.log(`[Socket] ${socket.id} unsubscribed from ${platform} project: ${projectId}`);
    socket.leave(`project:${platform}:${projectId}`);
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
  console.log('========================================\n');
  console.log('Endpoints:');
  console.log('  POST   /api/auth/validate              - Validate platform token');
  console.log('  GET    /api/projects/vercel            - List Vercel projects');
  console.log('  GET    /api/projects/railway           - List Railway projects');
  console.log('  POST   /api/deploy/vercel              - Deploy to Vercel');
  console.log('  POST   /api/deploy/railway             - Deploy to Railway');
  console.log('  GET    /api/deployments/vercel/:id     - Get Vercel deployments');
  console.log('  GET    /api/deployments/railway/:id    - Get Railway deployments');
  console.log('  POST   /api/databases/railway          - Create Railway database');
  console.log('  GET    /api/health                     - Health check');
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
