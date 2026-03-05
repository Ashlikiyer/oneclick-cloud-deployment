/**
 * Deployment Repository
 * 
 * Layer 2 (Data) - Handles all API calls for deployment operations.
 * This is the ONLY place where fetch/API calls should be made.
 */

import type { 
  Deployment, 
  DeployConfig, 
  ApiResponse, 
  DeploymentListResponse,
  DeploymentResponse,
} from '@/domain/deployment';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Deploy a GitHub repository to a new EC2 instance
 */
async function deploy(config: DeployConfig): Promise<ApiResponse<DeploymentResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      githubUrl: config.githubUrl,
      instanceType: config.instanceType,
      name: config.name,
      branch: config.branch,
      envVars: config.envVars,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to deploy',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Get all managed deployments/instances
 */
async function getAll(): Promise<ApiResponse<DeploymentListResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/instances`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to fetch instances',
    };
  }

  return {
    success: true,
    data: {
      instances: data.data,
      count: data.count,
    },
  };
}

/**
 * Get a single deployment by instance ID
 */
async function getById(instanceId: string): Promise<ApiResponse<Deployment>> {
  const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to fetch instance',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Stop a running instance
 */
async function stop(instanceId: string): Promise<ApiResponse<{ previousState: string; currentState: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}/stop`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to stop instance',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Start a stopped instance
 */
async function start(instanceId: string): Promise<ApiResponse<{ previousState: string; currentState: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}/start`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to start instance',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Terminate an instance
 */
async function terminate(instanceId: string): Promise<ApiResponse<{ previousState: string; currentState: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to terminate instance',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Get console logs for an instance
 */
async function getLogs(instanceId: string): Promise<ApiResponse<{
  instanceId: string;
  timestamp: string;
  raw: string;
  parsed: {
    hasOutput: boolean;
    deploymentStarted: boolean;
    deploymentComplete: boolean;
    errors: string[];
    progress: string[];
  };
}>> {
  const response = await fetch(`${API_BASE_URL}/api/instances/${instanceId}/logs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to fetch logs',
    };
  }

  return {
    success: true,
    data: data.data,
  };
}

/**
 * Check API health
 */
async function checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return {
      success: true,
      data,
    };
  } catch {
    return {
      success: false,
      error: 'API is not reachable',
    };
  }
}

export const deploymentRepository = {
  deploy,
  getAll,
  getById,
  stop,
  start,
  terminate,
  getLogs,
  checkHealth,
};
