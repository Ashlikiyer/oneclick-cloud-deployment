/**
 * Deployments Routes
 * 
 * Handles deployment operations for Vercel and Railway platforms.
 * Includes creating new deployments, listing, and fetching logs.
 */

const express = require('express');
const router = express.Router();
const vercelService = require('../services/vercelService');
const railwayService = require('../services/railwayService');

/**
 * Extract tokens from request headers
 */
function getVercelToken(req) {
  return req.headers['x-vercel-token'];
}

function getRailwayToken(req) {
  return req.headers['x-railway-token'];
}

// =============================================================================
// DEPLOY TO VERCEL
// =============================================================================

/**
 * POST /api/deploy/vercel
 * Deploy a GitHub repository to Vercel
 */
router.post('/deploy/vercel', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    const { githubUrl, name, branch, framework, buildCommand, outputDirectory, installCommand, rootDirectory, envVars } = req.body;

    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        error: 'GitHub URL is required',
      });
    }

    const result = await vercelService.deployFromGitHub(token, {
      githubUrl,
      name,
      branch: branch || 'main',
      framework,
      buildCommand,
      outputDirectory,
      installCommand,
      rootDirectory,
      envVars,
    });

    const deployment = vercelService.transformDeployment(result.deployment, result.project);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('deployment:created', {
        platform: 'vercel',
        deployment,
      });
    }

    res.json({
      success: true,
      data: {
        deployment,
        message: 'Deployment started successfully',
      },
    });
  } catch (error) {
    console.error('Error deploying to Vercel:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to deploy to Vercel',
    });
  }
});

// =============================================================================
// DEPLOY TO RAILWAY
// =============================================================================

/**
 * POST /api/deploy/railway
 * Deploy a GitHub repository to Railway
 */
router.post('/deploy/railway', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const { githubUrl, name, branch, serviceName, serviceType, startCommand, buildCommand, rootDirectory, port, replicas, envVars } = req.body;

    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        error: 'GitHub URL is required',
      });
    }

    const result = await railwayService.deployFromGitHub(token, {
      githubUrl,
      name,
      branch: branch || 'main',
      serviceName,
      serviceType,
      startCommand,
      buildCommand,
      rootDirectory,
      port,
      replicas,
      envVars,
    });

    // Get latest deployment if available
    const latestDeployment = result.deployments?.deployments?.edges?.[0]?.node;
    const deployment = latestDeployment 
      ? railwayService.transformDeployment(latestDeployment, result.service, result.project)
      : {
          id: 'pending',
          name: result.service.name,
          platform: 'railway',
          status: 'queued',
          githubUrl,
          branch: branch || 'main',
          url: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: result.project.id,
          serviceId: result.service.id,
          environmentId: result.environment.id,
        };

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('deployment:created', {
        platform: 'railway',
        deployment,
      });
    }

    res.json({
      success: true,
      data: {
        deployment,
        message: 'Deployment started successfully',
      },
    });
  } catch (error) {
    console.error('Error deploying to Railway:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy to Railway',
    });
  }
});

// =============================================================================
// VERCEL DEPLOYMENTS
// =============================================================================

/**
 * GET /api/deployments/vercel/:projectId
 * List deployments for a Vercel project
 */
router.get('/deployments/vercel/:projectId', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    const project = await vercelService.getProject(token, req.params.projectId);
    const result = await vercelService.listDeployments(token, req.params.projectId, {
      limit: req.query.limit || 20,
    });

    const deployments = (result.deployments || []).map(d => 
      vercelService.transformDeployment(d, project)
    );

    res.json({
      success: true,
      data: deployments,
      count: deployments.length,
    });
  } catch (error) {
    console.error('Error listing Vercel deployments:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to list deployments',
    });
  }
});

/**
 * GET /api/deployments/vercel/:deploymentId/logs
 * Get logs for a Vercel deployment
 */
router.get('/deployments/vercel/:deploymentId/logs', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    const events = await vercelService.getDeploymentEvents(token, req.params.deploymentId);
    
    // Parse events into a log format
    const buildLogs = (events || [])
      .filter(e => e.type === 'stdout' || e.type === 'stderr')
      .map(e => e.payload?.text || e.text || '')
      .join('\n');

    const errors = (events || [])
      .filter(e => e.type === 'stderr' || e.type === 'error')
      .map(e => e.payload?.text || e.text || '');

    res.json({
      success: true,
      data: {
        deploymentId: req.params.deploymentId,
        platform: 'vercel',
        timestamp: new Date().toISOString(),
        buildLogs,
        parsed: {
          hasOutput: buildLogs.length > 0,
          buildStarted: events?.some(e => e.type === 'command') || false,
          buildComplete: events?.some(e => e.type === 'done') || false,
          deployComplete: events?.some(e => e.type === 'ready') || false,
          errors,
          warnings: [],
          progress: [],
          lineCount: buildLogs.split('\n').length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting Vercel deployment logs:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to get deployment logs',
    });
  }
});

/**
 * POST /api/deployments/vercel/:deploymentId/cancel
 * Cancel a Vercel deployment
 */
router.post('/deployments/vercel/:deploymentId/cancel', async (req, res) => {
  try {
    const token = getVercelToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Vercel token is required',
      });
    }

    await vercelService.cancelDeployment(token, req.params.deploymentId);

    res.json({
      success: true,
      message: 'Deployment canceled successfully',
    });
  } catch (error) {
    console.error('Error canceling Vercel deployment:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to cancel deployment',
    });
  }
});

// =============================================================================
// RAILWAY DEPLOYMENTS
// =============================================================================

/**
 * GET /api/deployments/railway/:serviceId
 * List deployments for a Railway service
 */
router.get('/deployments/railway/:serviceId', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const service = await railwayService.getService(token, req.params.serviceId);
    const result = await railwayService.listDeployments(token, req.params.serviceId);

    const deployments = (result.deployments?.edges || []).map(edge => 
      railwayService.transformDeployment(edge.node, service.service)
    );

    res.json({
      success: true,
      data: deployments,
      count: deployments.length,
    });
  } catch (error) {
    console.error('Error listing Railway deployments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list deployments',
    });
  }
});

/**
 * GET /api/deployments/railway/:deploymentId/logs
 * Get logs for a Railway deployment
 */
router.get('/deployments/railway/:deploymentId/logs', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const result = await railwayService.getDeploymentLogs(token, req.params.deploymentId);
    const logs = result.deploymentLogs || [];

    const buildLogs = logs
      .map(l => `[${l.timestamp}] ${l.message}`)
      .join('\n');

    const errors = logs
      .filter(l => l.severity === 'error')
      .map(l => l.message);

    const warnings = logs
      .filter(l => l.severity === 'warning')
      .map(l => l.message);

    res.json({
      success: true,
      data: {
        deploymentId: req.params.deploymentId,
        platform: 'railway',
        timestamp: new Date().toISOString(),
        buildLogs,
        parsed: {
          hasOutput: logs.length > 0,
          buildStarted: logs.length > 0,
          buildComplete: logs.some(l => l.message?.includes('build') && l.message?.includes('complete')),
          deployComplete: logs.some(l => l.message?.includes('deploy') && l.message?.includes('complete')),
          errors,
          warnings,
          progress: [],
          lineCount: logs.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting Railway deployment logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get deployment logs',
    });
  }
});

/**
 * POST /api/deployments/railway/:serviceId/redeploy
 * Redeploy a Railway service
 */
router.post('/deployments/railway/:serviceId/redeploy', async (req, res) => {
  try {
    const token = getRailwayToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Railway token is required',
      });
    }

    const { environmentId } = req.body;
    if (!environmentId) {
      return res.status(400).json({
        success: false,
        error: 'Environment ID is required',
      });
    }

    await railwayService.redeployService(token, req.params.serviceId, environmentId);

    res.json({
      success: true,
      message: 'Redeployment started successfully',
    });
  } catch (error) {
    console.error('Error redeploying Railway service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to redeploy service',
    });
  }
});

module.exports = router;
