/**
 * Vercel API Service
 * 
 * Handles all interactions with the Vercel REST API v9.
 * Documentation: https://vercel.com/docs/rest-api
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Make a request to the Vercel API
 */
async function vercelRequest(endpoint, token, options = {}) {
  const url = `${VERCEL_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Vercel API error');
    error.status = response.status;
    error.code = data.error?.code;
    throw error;
  }

  return data;
}

/**
 * Get current user info (validates token)
 */
async function getUser(token) {
  return vercelRequest('/v2/user', token);
}

/**
 * List all projects
 */
async function listProjects(token, options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit);
  if (options.from) params.set('from', options.from);
  
  const query = params.toString();
  const endpoint = `/v9/projects${query ? `?${query}` : ''}`;
  
  return vercelRequest(endpoint, token);
}

/**
 * Get a project by ID or name
 */
async function getProject(token, projectId) {
  return vercelRequest(`/v9/projects/${projectId}`, token);
}

/**
 * Create a new project
 */
async function createProject(token, config) {
  return vercelRequest('/v9/projects', token, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      framework: config.framework || null,
      gitRepository: config.gitRepository,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      installCommand: config.installCommand,
      rootDirectory: config.rootDirectory,
      environmentVariables: config.envVars 
        ? Object.entries(config.envVars).map(([key, value]) => ({
            key,
            value,
            target: ['production', 'preview', 'development'],
          }))
        : undefined,
    }),
  });
}

/**
 * Create a deployment from a Git repository
 */
async function createDeployment(token, config) {
  const body = {
    name: config.name,
    gitSource: {
      type: 'github',
      repoId: config.repoId,
      ref: config.branch || 'main',
    },
  };

  // If project doesn't exist, set creation options
  if (config.isNewProject) {
    body.project = config.name;
    body.target = 'production';
  } else {
    body.project = config.projectId;
  }

  return vercelRequest('/v13/deployments', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Create a deployment from GitHub URL
 * This is a more user-friendly version that handles project creation
 */
async function deployFromGitHub(token, config) {
  const { owner, repo } = parseGitHubUrl(config.githubUrl);
  
  // First, check if we need to create a project
  let project;
  const projectName = config.name || repo;
  
  try {
    project = await getProject(token, projectName);
  } catch (err) {
    // Project doesn't exist, create it
    if (err.status === 404) {
      project = await createProject(token, {
        name: projectName,
        framework: config.framework,
        gitRepository: {
          type: 'github',
          repo: `${owner}/${repo}`,
        },
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDirectory,
        installCommand: config.installCommand,
        rootDirectory: config.rootDirectory,
        envVars: config.envVars,
      });
    } else {
      throw err;
    }
  }

  // Create deployment
  const deployment = await vercelRequest('/v13/deployments', token, {
    method: 'POST',
    body: JSON.stringify({
      name: projectName,
      project: project.id,
      gitSource: {
        type: 'github',
        ref: config.branch || 'main',
        repoId: project.link?.repoId,
      },
      target: 'production',
    }),
  });

  return {
    project,
    deployment,
  };
}

/**
 * List deployments for a project
 */
async function listDeployments(token, projectId, options = {}) {
  const params = new URLSearchParams();
  params.set('projectId', projectId);
  if (options.limit) params.set('limit', options.limit);
  if (options.from) params.set('from', options.from);
  if (options.target) params.set('target', options.target);
  
  return vercelRequest(`/v6/deployments?${params.toString()}`, token);
}

/**
 * Get a deployment by ID
 */
async function getDeployment(token, deploymentId) {
  return vercelRequest(`/v13/deployments/${deploymentId}`, token);
}

/**
 * Cancel a deployment
 */
async function cancelDeployment(token, deploymentId) {
  return vercelRequest(`/v12/deployments/${deploymentId}/cancel`, token, {
    method: 'PATCH',
  });
}

/**
 * Get deployment build logs
 */
async function getDeploymentEvents(token, deploymentId) {
  // Vercel uses Server-Sent Events for logs, but we'll fetch available logs
  return vercelRequest(`/v2/deployments/${deploymentId}/events`, token);
}

/**
 * Delete a project
 */
async function deleteProject(token, projectId) {
  return vercelRequest(`/v9/projects/${projectId}`, token, {
    method: 'DELETE',
  });
}

/**
 * Set environment variables for a project
 */
async function setEnvVars(token, projectId, envVars) {
  const variables = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    target: ['production', 'preview', 'development'],
    type: 'encrypted',
  }));

  return vercelRequest(`/v10/projects/${projectId}/env`, token, {
    method: 'POST',
    body: JSON.stringify(variables),
  });
}

/**
 * Get environment variables for a project
 */
async function getEnvVars(token, projectId) {
  return vercelRequest(`/v9/projects/${projectId}/env`, token);
}

/**
 * Parse GitHub URL to extract owner and repo
 */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Map Vercel deployment state to unified status
 */
function mapDeploymentStatus(state) {
  const mapping = {
    'QUEUED': 'queued',
    'BUILDING': 'building',
    'READY': 'ready',
    'ERROR': 'error',
    'CANCELED': 'canceled',
    'INITIALIZING': 'queued',
  };
  return mapping[state] || 'error';
}

/**
 * Transform Vercel project to unified format
 */
function transformProject(project) {
  return {
    id: project.id,
    name: project.name,
    accountId: project.accountId,
    framework: project.framework,
    link: project.link ? {
      type: 'github',
      org: project.link.org || project.link.repoOwner,
      repo: project.link.repo,
    } : undefined,
    productionUrl: project.targets?.production?.url 
      ? `https://${project.targets.production.url}` 
      : null,
    domains: project.alias?.map(a => a.domain) || [],
    createdAt: new Date(project.createdAt).toISOString(),
    updatedAt: new Date(project.updatedAt).toISOString(),
  };
}

/**
 * Transform Vercel deployment to unified format
 */
function transformDeployment(deployment, project) {
  return {
    id: deployment.uid,
    name: deployment.name,
    platform: 'vercel',
    status: mapDeploymentStatus(deployment.state || deployment.readyState),
    githubUrl: project?.link 
      ? `https://github.com/${project.link.org || project.link.repoOwner}/${project.link.repo}`
      : '',
    branch: deployment.gitSource?.ref || 'main',
    url: deployment.url ? `https://${deployment.url}` : null,
    error: deployment.errorMessage,
    createdAt: new Date(deployment.createdAt).toISOString(),
    updatedAt: new Date(deployment.buildingAt || deployment.createdAt).toISOString(),
    projectId: deployment.projectId || project?.id,
    uid: deployment.uid,
    inspectorUrl: deployment.inspectorUrl,
    buildLogsUrl: `https://vercel.com/${deployment.name}/${deployment.uid}`,
    aliases: deployment.alias || [],
  };
}

module.exports = {
  getUser,
  listProjects,
  getProject,
  createProject,
  createDeployment,
  deployFromGitHub,
  listDeployments,
  getDeployment,
  cancelDeployment,
  getDeploymentEvents,
  deleteProject,
  setEnvVars,
  getEnvVars,
  parseGitHubUrl,
  mapDeploymentStatus,
  transformProject,
  transformDeployment,
};
