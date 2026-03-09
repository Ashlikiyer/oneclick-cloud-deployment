/**
 * Databases Routes
 * 
 * Handles database provisioning for Railway (PostgreSQL, MySQL, Redis, MongoDB).
 */

const express = require('express');
const router = express.Router();
const railwayService = require('../services/railwayService');

/**
 * Extract Railway token from request headers
 */
function getRailwayToken(req) {
  return req.headers['x-railway-token'];
}

/**
 * POST /api/databases/railway
 * Create a new database on Railway
 */
router.post('/railway', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const { projectId, databaseType, name } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required',
      });
    }

    if (!databaseType) {
      return res.status(400).json({
        success: false,
        error: 'Database type is required',
      });
    }

    const validTypes = ['postgresql', 'mysql', 'redis', 'mongodb'];
    if (!validTypes.includes(databaseType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid database type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const result = await railwayService.createDatabase(token, {
      projectId,
      databaseType,
      name: name || `${databaseType}-db`,
    });

    // Transform connection string for security (mask parts)
    let connectionString = result.variables?.DATABASE_URL || result.variables?.REDIS_URL;
    if (connectionString) {
      // Keep protocol and host, mask password
      connectionString = connectionString.replace(/:([^@]+)@/, ':****@');
    }

    res.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        status: result.status || 'provisioning',
        type: databaseType,
        connectionString,
        variables: Object.keys(result.variables || {}),
      },
      message: 'Database created successfully',
    });
  } catch (error) {
    console.error('Error creating Railway database:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create database',
    });
  }
});

/**
 * GET /api/databases/railway/types
 * Get available database types
 */
router.get('/railway/types', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        description: 'Powerful, open source object-relational database',
        version: 'Latest',
      },
      {
        id: 'mysql',
        name: 'MySQL',
        description: 'Popular open source relational database',
        version: 'Latest',
      },
      {
        id: 'redis',
        name: 'Redis',
        description: 'In-memory data structure store',
        version: 'Latest',
      },
      {
        id: 'mongodb',
        name: 'MongoDB',
        description: 'Document-oriented NoSQL database',
        version: 'Latest',
      },
    ],
  });
});

module.exports = router;
