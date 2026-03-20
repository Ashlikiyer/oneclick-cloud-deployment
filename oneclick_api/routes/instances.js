/**
 * Instances Routes
 * 
 * GET    /api/instances        - List all managed instances
 * GET    /api/instances/:id    - Get single instance details
 * PUT    /api/instances/:id/stop   - Stop an instance
 * PUT    /api/instances/:id/start  - Start an instance
 * DELETE /api/instances/:id    - Terminate an instance
 */

const express = require('express');
const router = express.Router();
const { 
  describeInstances, 
  stopInstance, 
  startInstance, 
  terminateInstance,
} = require('../services/ec2Service');

/**
 * @route   GET /api/instances
 * @desc    Get all managed EC2 instances
 * @returns { success: boolean, data: object[] }
 */
router.get('/', async (req, res) => {
  try {
    const instances = await describeInstances();
    
    return res.json({
      success: true,
      data: instances,
      count: instances.length,
    });

  } catch (error) {
    console.error('[Instances] Error listing instances:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch instances',
      code: 'LIST_INSTANCES_FAILED',
    });
  }
});

/**
 * @route   GET /api/instances/:id
 * @desc    Get details of a specific instance
 * @param   id - Instance ID
 * @returns { success: boolean, data?: object, error?: string }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.startsWith('i-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        code: 'INVALID_INSTANCE_ID',
      });
    }

    const instances = await describeInstances([id]);
    
    if (instances.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found',
        code: 'INSTANCE_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: instances[0],
    });

  } catch (error) {
    console.error(`[Instances] Error fetching instance ${req.params.id}:`, error);
    
    // Handle AWS not found error
    if (error.name === 'InvalidInstanceID.NotFound') {
      return res.status(404).json({
        success: false,
        error: 'Instance not found',
        code: 'INSTANCE_NOT_FOUND',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch instance details',
      code: 'GET_INSTANCE_FAILED',
    });
  }
});

/**
 * @route   PUT /api/instances/:id/stop
 * @desc    Stop a running instance
 * @param   id - Instance ID
 * @returns { success: boolean, data?: object, error?: string }
 */
router.put('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.startsWith('i-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        code: 'INVALID_INSTANCE_ID',
      });
    }

    console.log(`[Instances] Stopping instance: ${id}`);
    
    const result = await stopInstance(id);
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('instance:stopped', {
        instanceId: id,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: result,
      message: 'Instance stop initiated',
    });

  } catch (error) {
    console.error(`[Instances] Error stopping instance ${req.params.id}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to stop instance',
      code: 'STOP_INSTANCE_FAILED',
    });
  }
});

/**
 * @route   PUT /api/instances/:id/start
 * @desc    Start a stopped instance
 * @param   id - Instance ID
 * @returns { success: boolean, data?: object, error?: string }
 */
router.put('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.startsWith('i-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        code: 'INVALID_INSTANCE_ID',
      });
    }

    console.log(`[Instances] Starting instance: ${id}`);
    
    const result = await startInstance(id);
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('instance:started', {
        instanceId: id,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: result,
      message: 'Instance start initiated',
    });

  } catch (error) {
    console.error(`[Instances] Error starting instance ${req.params.id}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to start instance',
      code: 'START_INSTANCE_FAILED',
    });
  }
});

/**
 * @route   DELETE /api/instances/:id
 * @desc    Terminate an instance
 * @param   id - Instance ID
 * @returns { success: boolean, data?: object, error?: string }
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.startsWith('i-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        code: 'INVALID_INSTANCE_ID',
      });
    }

    console.log(`[Instances] Terminating instance: ${id}`);
    
    const result = await terminateInstance(id);
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('instance:terminated', {
        instanceId: id,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: result,
      message: 'Instance termination initiated',
    });

  } catch (error) {
    console.error(`[Instances] Error terminating instance ${req.params.id}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to terminate instance',
      code: 'TERMINATE_INSTANCE_FAILED',
    });
  }
});

module.exports = router;
