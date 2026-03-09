/**
 * Projects Routes
 * 
 * Handles project listing for Vercel and Railway platforms.
 */

const express = require('express');
const router = express.Router();
const vercelService = require('../services/vercelService');
const railwayService = require('../services/railwayService');

/**
 * Extract token from request headers
 */
function getVercelToken(req) {
  return req.headers['x-vercel-token'];
}

function getRailwayToken(req) {
  return req.headers['x-railway-token'];
}

// =============================================================================
// VERCEL PROJECTS
// =============================================================================

/**
 * GET /api/projects/vercel
 * List all Vercel projects
 */
router.get('/vercel', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    const result = await vercelService.listProjects(token);
    const projects = (result.projects || []).map(vercelService.transformProject);

    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error listing Vercel projects:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to list Vercel projects',
    });
  }
});

/**
 * GET /api/projects/vercel/:id
 * Get a specific Vercel project
 */
router.get('/vercel/:id', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    const result = await vercelService.getProject(token, req.params.id);
    const project = vercelService.transformProject(result);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error getting Vercel project:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to get Vercel project',
    });
  }
});

/**
 * DELETE /api/projects/vercel/:id
 * Delete a Vercel project
 */
router.delete('/vercel/:id', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    await vercelService.deleteProject(token, req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting Vercel project:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to delete Vercel project',
    });
  }
});

// =============================================================================
// RAILWAY PROJECTS
// =============================================================================

/**
 * GET /api/projects/railway
 * List all Railway projects
 */
router.get('/railway', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const result = await railwayService.listProjects(token);
    const projects = (result.projects?.edges || []).map(edge => 
      railwayService.transformProject(edge.node)
    );

    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error listing Railway projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list Railway projects',
    });
  }
});

/**
 * GET /api/projects/railway/:id
 * Get a specific Railway project
 */
router.get('/railway/:id', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const result = await railwayService.getProject(token, req.params.id);
    const project = railwayService.transformProject(result.project);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error getting Railway project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Railway project',
    });
  }
});

/**
 * DELETE /api/projects/railway/:id
 * Delete a Railway project
 */
router.delete('/railway/:id', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    await railwayService.deleteProject(token, req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting Railway project:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete Railway project',
    });
  }
});

module.exports = router;
