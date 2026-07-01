/**
 * UniSphere Backend Server
 * Academic Resource Sharing & Student Community Platform
 *
 * Entry point for the Express application.
 * Sets up middleware, routes, error handling, and database connection.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const queryRoutes = require('./routes/queryRoutes');
const questionRoutes = require('./routes/questionRoutes');
const discussionRoutes = require('./routes/discussionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// CORS Configuration
// Allow requests from frontend dev servers (React, Vite, etc.)
// ---------------------------------------------------------------------------
const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Postman, mobile apps, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
      }
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body Parsing Middleware
// Parse incoming JSON and URL-encoded request bodies
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health Check Route
// Used to verify the API is running (Postman, load balancers, monitoring)
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UniSphere Backend Running',
  });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);

// POST /api/resources/:resourceId/questions - Create a query for a resource
// GET  /api/resources/:resourceId/questions - List queries for a resource
app.use('/api/resources', queryRoutes);
 
// GET   /api/questions/:id           - Fetch single query with answers
// POST  /api/questions/:id/answers   - Post an answer
// PATCH /api/questions/:id/resolve   - Resolve a query
app.use('/api/questions', questionRoutes);

// POST /api/discussions              - Create a discussion post
// GET  /api/discussions              - List discussions (optional category filter)
// GET  /api/discussions/:id          - Fetch single discussion with comments
// POST /api/discussions/:id/comments - Comment on a discussion
// POST /api/discussions/:id/upvote   - Upvote a discussion
app.use('/api/discussions', discussionRoutes);

// ---------------------------------------------------------------------------
// Global Error Handling Middleware
// Catches errors passed via next(err) and unhandled route errors
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // CORS errors
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ---------------------------------------------------------------------------
// 404 Handler - Route not found
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ---------------------------------------------------------------------------
// Start Server
// Verify database connection, then listen on configured PORT
// ---------------------------------------------------------------------------
const startServer = async () => {
  await testConnection();

  const server = app.listen(PORT, () => {
    console.log(`UniSphere server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set a different PORT in .env`);
    } else {
      console.error('Server failed to start:', error.message);
    }
    process.exit(1);
  });
};

startServer();
