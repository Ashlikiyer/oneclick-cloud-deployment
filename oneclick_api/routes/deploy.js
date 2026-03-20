/**
 * Deploy Routes
 * 
 * POST /api/deploy - Launch a new EC2 instance with a GitHub repo
 */

const express = require('express');
const router = express.Router();
const { launchInstance } = require('../services/ec2Service');
const { generateUserData } = require('../services/userDataScript');
const { startPolling } = require('../services/statusPoller');

/**
 * @route   POST /api/deploy
 * @desc    Deploy a GitHub repository to a new EC2 instance
 * @body    { githubUrl: string, instanceType?: string, name?: string, envVars?: object, branch?: string }
 * @returns { success: boolean, data?: object, error?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { 
      githubUrl, 
      instanceType = 't2.micro', 
      name,
      envVars = {},
      branch = 'main',
    } = req.body;

    // Validate required fields
    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        error: 'githubUrl is required',
        code: 'MISSING_GITHUB_URL',
      });
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\.git)?$/;
    if (!githubUrlPattern.test(githubUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo',
        code: 'INVALID_GITHUB_URL',
      });
    }

    // Validate instance type
    const allowedInstanceTypes = ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium'];
    if (!allowedInstanceTypes.includes(instanceType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid instanceType. Allowed: ${allowedInstanceTypes.join(', ')}`,
        code: 'INVALID_INSTANCE_TYPE',
      });
    }

    // Generate instance name if not provided
    const repoName = githubUrl.split('/').pop().replace('.git', '');
    const instanceName = name || `oneclick-${repoName}-${Date.now()}`;

    console.log(`[Deploy] Starting deployment for: ${githubUrl}`);

    // Generate UserData bootstrap script
    const userData = generateUserData({
      githubUrl,
      envVars,
      branch,
      appPort: 3000,
    });

    // Launch EC2 instance
    const instance = await launchInstance({
      name: instanceName,
      instanceType,
      userData,
    });

    console.log(`[Deploy] Instance launched: ${instance.instanceId}`);

    // Start polling the new instance for status updates
    const io = req.app.get('io');
    if (io) {
      startPolling(instance.instanceId, io);
      
      // Emit socket event for real-time updates
      io.emit('deployment:started', {
        instanceId: instance.instanceId,
        name: instanceName,
        githubUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...instance,
        name: instanceName,
        githubUrl,
        branch,
        message: 'Instance launched. It may take 3-5 minutes to fully initialize.',
      },
    });

  } catch (error) {
    console.error('[Deploy] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to launch instance',
      code: 'DEPLOY_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
