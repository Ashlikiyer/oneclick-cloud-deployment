/**
 * Status Poller Service
 * 
 * Polls EC2 instance status at intervals and emits updates via Socket.io.
 * Used for real-time status updates in the frontend dashboard.
 */

const { describeInstances } = require('./ec2Service');

/** @type {Map<string, NodeJS.Timeout>} */
const activePollers = new Map();

/** Default polling interval in milliseconds */
const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds

/**
 * Start polling status for a specific instance
 * @param {string} instanceId - EC2 instance ID to poll
 * @param {Object} io - Socket.io server instance
 * @param {number} [interval=10000] - Polling interval in ms
 */
function startPolling(instanceId, io, interval = DEFAULT_POLL_INTERVAL) {
  // Don't start if already polling this instance
  if (activePollers.has(instanceId)) {
    console.log(`[StatusPoller] Already polling instance: ${instanceId}`);
    return;
  }

  console.log(`[StatusPoller] Starting poll for instance: ${instanceId}`);

  const pollFn = async () => {
    try {
      const instances = await describeInstances([instanceId]);
      
      if (instances.length > 0) {
        const instance = instances[0];
        
        // Emit to the specific instance room
        io.to(`instance:${instanceId}`).emit('instance:status', {
          instanceId,
          state: instance.state,
          publicIp: instance.publicIp,
          timestamp: new Date().toISOString(),
        });

        // Also emit to general room
        io.emit('instance:updated', {
          instanceId,
          state: instance.state,
          publicIp: instance.publicIp,
          timestamp: new Date().toISOString(),
        });

        // Stop polling if instance is terminated
        if (instance.state === 'terminated') {
          console.log(`[StatusPoller] Instance ${instanceId} terminated, stopping poll`);
          stopPolling(instanceId);
        }
      }
    } catch (error) {
      console.error(`[StatusPoller] Error polling ${instanceId}:`, error.message);
      
      // Stop polling if instance not found
      if (error.name === 'InvalidInstanceID.NotFound') {
        stopPolling(instanceId);
      }
    }
  };

  // Run immediately, then on interval
  pollFn();
  const timerId = setInterval(pollFn, interval);
  activePollers.set(instanceId, timerId);
}

/**
 * Stop polling status for a specific instance
 * @param {string} instanceId - EC2 instance ID to stop polling
 */
function stopPolling(instanceId) {
  const timerId = activePollers.get(instanceId);
  
  if (timerId) {
    clearInterval(timerId);
    activePollers.delete(instanceId);
    console.log(`[StatusPoller] Stopped polling instance: ${instanceId}`);
  }
}

/**
 * Stop all active pollers
 */
function stopAllPolling() {
  console.log(`[StatusPoller] Stopping all pollers (${activePollers.size} active)`);
  
  for (const [instanceId, timerId] of activePollers) {
    clearInterval(timerId);
    console.log(`[StatusPoller] Stopped: ${instanceId}`);
  }
  
  activePollers.clear();
}

/**
 * Get list of currently polled instance IDs
 * @returns {string[]} - Array of instance IDs being polled
 */
function getActivePollers() {
  return Array.from(activePollers.keys());
}

/**
 * Check if an instance is being polled
 * @param {string} instanceId - Instance ID to check
 * @returns {boolean} - True if polling
 */
function isPolling(instanceId) {
  return activePollers.has(instanceId);
}

/**
 * Poll all managed instances once (used for initial load)
 * @param {Object} io - Socket.io server instance
 */
async function pollAllInstances(io) {
  try {
    const instances = await describeInstances();
    
    io.emit('instances:all', {
      instances,
      timestamp: new Date().toISOString(),
    });
    
    return instances;
  } catch (error) {
    console.error('[StatusPoller] Error polling all instances:', error.message);
    return [];
  }
}

module.exports = {
  startPolling,
  stopPolling,
  stopAllPolling,
  getActivePollers,
  isPolling,
  pollAllInstances,
  DEFAULT_POLL_INTERVAL,
};
