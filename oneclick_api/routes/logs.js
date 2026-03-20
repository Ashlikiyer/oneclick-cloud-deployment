/**
 * Logs Routes
 * 
 * GET /api/instances/:id/logs - Get console output from an EC2 instance
 */

const express = require('express');
const router = express.Router();
const { getConsoleLogs } = require('../services/ec2Service');

/**
 * @route   GET /api/instances/:id/logs
 * @desc    Get console output (system logs) from an EC2 instance
 * @param   id - Instance ID
 * @returns { success: boolean, data?: object, error?: string }
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate instance ID format
    if (!id || !id.startsWith('i-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid instance ID format',
        code: 'INVALID_INSTANCE_ID',
      });
    }

    console.log(`[Logs] Fetching console output for instance: ${id}`);
    
    const logs = await getConsoleLogs(id);
    
    // Parse the output to extract meaningful sections
    const parsedLogs = parseLogOutput(logs.output);
    
    return res.json({
      success: true,
      data: {
        instanceId: logs.instanceId,
        timestamp: logs.timestamp,
        raw: logs.output,
        parsed: parsedLogs,
      },
    });

  } catch (error) {
    console.error(`[Logs] Error fetching logs for ${req.params.id}:`, error);
    
    // Handle specific AWS errors
    if (error.name === 'InvalidInstanceID.NotFound') {
      return res.status(404).json({
        success: false,
        error: 'Instance not found',
        code: 'INSTANCE_NOT_FOUND',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch instance logs',
      code: 'GET_LOGS_FAILED',
    });
  }
});

/**
 * Parse raw console output to extract meaningful sections
 * @param {string} output - Raw console output
 * @returns {Object} - Parsed log sections
 */
function parseLogOutput(output) {
  if (!output) {
    return {
      hasOutput: false,
      deploymentStarted: false,
      deploymentComplete: false,
      errors: [],
      warnings: [],
      progress: [],
    };
  }

  const lines = output.split('\n');
  const errors = [];
  const warnings = [];
  const progress = [];
  
  let deploymentStarted = false;
  let deploymentComplete = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for OneClick deploy markers
    if (trimmedLine.includes('OneClick Deploy Bootstrap Script')) {
      deploymentStarted = true;
    }
    if (trimmedLine.includes('Bootstrap Complete')) {
      deploymentComplete = true;
    }
    
    // Extract errors
    if (trimmedLine.toLowerCase().includes('error') || 
        trimmedLine.toLowerCase().includes('failed') ||
        trimmedLine.toLowerCase().includes('fatal')) {
      errors.push(trimmedLine);
    }
    
    // Extract warnings
    if (trimmedLine.toLowerCase().includes('warning') ||
        trimmedLine.toLowerCase().includes('warn')) {
      warnings.push(trimmedLine);
    }
    
    // Extract progress markers (lines starting with >>>)
    if (trimmedLine.startsWith('>>>')) {
      progress.push(trimmedLine.replace('>>>', '').trim());
    }
  }
  
  return {
    hasOutput: true,
    deploymentStarted,
    deploymentComplete,
    errors: errors.slice(0, 50), // Limit to last 50 errors
    warnings: warnings.slice(0, 20), // Limit to last 20 warnings
    progress,
    lineCount: lines.length,
  };
}

module.exports = router;
