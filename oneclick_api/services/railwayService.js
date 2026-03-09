/**
 * Railway API Service
 * 
 * Handles all interactions with the Railway GraphQL API v2.
 * Documentation: https://docs.railway.app/reference/public-api
 */

const RAILWAY_API_BASE = 'https://backboard.railway.app/graphql/v2';

/**
 * Make a GraphQL request to Railway API
 */
async function railwayRequest(query, variables, token) {
  const response = await fetch(RAILWAY_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    const error = new Error(data.errors[0]?.message || 'Railway API error');
    error.code = data.errors[0]?.extensions?.code;
    throw error;
  }

  return data.data;
}

/**
 * Get current user info (validates token)
 */
async function getUser(token) {
  const query = `
    query {
      me {
        id
        email
        name
        avatar
      }
    }
  `;
  return railwayRequest(query, {}, token);
}

/**
 * List all projects for the user
 */
async function listProjects(token) {
  const query = `
    query {
      projects {
        edges {
          node {
            id
            name
            description
            createdAt
            updatedAt
            environments {
              edges {
                node {
                  id
                  name
                }
              }
            }
            services {
              edges {
                node {
                  id
                  name
                  icon
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;
  return railwayRequest(query, {}, token);
}

/**
 * Get a project by ID
 */
async function getProject(token, projectId) {
  const query = `
    query GetProject($id: String!) {
      project(id: $id) {
        id
        name
        description
        createdAt
        updatedAt
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
        services {
          edges {
            node {
              id
              name
              icon
              createdAt
            }
          }
        }
      }
    }
  `;
  return railwayRequest(query, { id: projectId }, token);
}

/**
 * Create a new project
 */
async function createProject(token, config) {
  const query = `
    mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        id
        name
        description
        createdAt
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `;
  
  return railwayRequest(query, {
    input: {
      name: config.name,
      description: config.description,
    },
  }, token);
}

/**
 * Create a service from a GitHub repo
 */
async function createServiceFromRepo(token, config) {
  const query = `
    mutation CreateService($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
        createdAt
      }
    }
  `;
  
  return railwayRequest(query, {
    input: {
      projectId: config.projectId,
      name: config.name,
      source: {
        repo: config.repo,
      },
    },
  }, token);
}

/**
 * Deploy a service from GitHub
 * This creates project + service + deployment in one flow
 */
async function deployFromGitHub(token, config) {
  const { owner, repo } = parseGitHubUrl(config.githubUrl);
  const projectName = config.name || repo;

  // 1. Create project
  const projectResult = await createProject(token, {
    name: projectName,
    description: `Deployed from ${owner}/${repo}`,
  });
  const project = projectResult.projectCreate;

  // Get production environment
  const environments = project.environments?.edges || [];
  const prodEnv = environments.find(e => e.node.name === 'production') || environments[0];
  
  if (!prodEnv) {
    throw new Error('No environment found in project');
  }

  // 2. Create service with GitHub source
  const serviceQuery = `
    mutation CreateService($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
        createdAt
      }
    }
  `;
  
  const serviceResult = await railwayRequest(serviceQuery, {
    input: {
      projectId: project.id,
      name: config.serviceName || repo,
      source: {
        repo: `${owner}/${repo}`,
      },
    },
  }, token);
  const service = serviceResult.serviceCreate;

  // 3. Set environment variables if provided
  if (config.envVars && Object.keys(config.envVars).length > 0) {
    await setServiceVariables(token, {
      projectId: project.id,
      environmentId: prodEnv.node.id,
      serviceId: service.id,
      variables: config.envVars,
    });
  }

  // 4. Connect service to environment and trigger deployment
  const connectQuery = `
    mutation ServiceInstanceConnect($id: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(id: $id, input: $input)
    }
  `;

  // This connects the service to the environment which triggers a deployment
  await railwayRequest(connectQuery, {
    id: service.id,
    input: {
      source: {
        repo: `${owner}/${repo}`,
        branch: config.branch || 'main',
      },
    },
  }, token);

  // 5. Get initial deployment info
  const deploymentsResult = await listDeployments(token, service.id);

  return {
    project,
    service,
    environment: prodEnv.node,
    deployments: deploymentsResult,
  };
}

/**
 * List services in a project
 */
async function listServices(token, projectId) {
  const query = `
    query GetProjectServices($id: String!) {
      project(id: $id) {
        services {
          edges {
            node {
              id
              name
              icon
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  `;
  return railwayRequest(query, { id: projectId }, token);
}

/**
 * Get a service by ID
 */
async function getService(token, serviceId) {
  const query = `
    query GetService($id: String!) {
      service(id: $id) {
        id
        name
        icon
        createdAt
        updatedAt
        projectId
      }
    }
  `;
  return railwayRequest(query, { id: serviceId }, token);
}

/**
 * List deployments for a service
 */
async function listDeployments(token, serviceId) {
  const query = `
    query GetDeployments($serviceId: String!) {
      deployments(first: 20, input: { serviceId: $serviceId }) {
        edges {
          node {
            id
            status
            createdAt
            updatedAt
            environmentId
            serviceId
            staticUrl
          }
        }
      }
    }
  `;
  return railwayRequest(query, { serviceId }, token);
}

/**
 * Get a deployment by ID
 */
async function getDeployment(token, deploymentId) {
  const query = `
    query GetDeployment($id: String!) {
      deployment(id: $id) {
        id
        status
        createdAt
        updatedAt
        environmentId
        serviceId
        staticUrl
      }
    }
  `;
  return railwayRequest(query, { id: deploymentId }, token);
}

/**
 * Get deployment logs
 */
async function getDeploymentLogs(token, deploymentId) {
  const query = `
    query GetDeploymentLogs($deploymentId: String!) {
      deploymentLogs(deploymentId: $deploymentId) {
        message
        timestamp
        severity
      }
    }
  `;
  return railwayRequest(query, { deploymentId }, token);
}

/**
 * Create a database (PostgreSQL, MySQL, Redis, MongoDB)
 */
async function createDatabase(token, config) {
  // Railway uses plugins for databases
  const pluginMap = {
    postgresql: 'postgresql',
    mysql: 'mysql',
    redis: 'redis',
    mongodb: 'mongodb',
  };

  const plugin = pluginMap[config.databaseType];
  if (!plugin) {
    throw new Error(`Unsupported database type: ${config.databaseType}`);
  }

  const query = `
    mutation CreatePlugin($input: PluginCreateInput!) {
      pluginCreate(input: $input) {
        id
        name
        status
      }
    }
  `;

  const result = await railwayRequest(query, {
    input: {
      projectId: config.projectId,
      name: config.name || `${config.databaseType}-db`,
      plugin,
    },
  }, token);

  // Get connection variables
  const varsQuery = `
    query GetPluginVariables($id: String!, $environmentId: String!) {
      variables(pluginId: $id, environmentId: $environmentId)
    }
  `;

  // Need to get environment ID first
  const projectData = await getProject(token, config.projectId);
  const envId = projectData.project.environments?.edges?.[0]?.node?.id;

  if (envId) {
    const varsResult = await railwayRequest(varsQuery, {
      id: result.pluginCreate.id,
      environmentId: envId,
    }, token);

    return {
      ...result.pluginCreate,
      variables: varsResult.variables,
    };
  }

  return result.pluginCreate;
}

/**
 * Set service environment variables
 */
async function setServiceVariables(token, config) {
  const query = `
    mutation SetVariables($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `;

  return railwayRequest(query, {
    input: {
      projectId: config.projectId,
      environmentId: config.environmentId,
      serviceId: config.serviceId,
      variables: config.variables,
    },
  }, token);
}

/**
 * Get service variables
 */
async function getServiceVariables(token, projectId, environmentId, serviceId) {
  const query = `
    query GetVariables($projectId: String!, $environmentId: String!, $serviceId: String!) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `;
  return railwayRequest(query, { projectId, environmentId, serviceId }, token);
}

/**
 * Delete a project
 */
async function deleteProject(token, projectId) {
  const query = `
    mutation DeleteProject($id: String!) {
      projectDelete(id: $id)
    }
  `;
  return railwayRequest(query, { id: projectId }, token);
}

/**
 * Delete a service
 */
async function deleteService(token, serviceId) {
  const query = `
    mutation DeleteService($id: String!) {
      serviceDelete(id: $id)
    }
  `;
  return railwayRequest(query, { id: serviceId }, token);
}

/**
 * Redeploy a service
 */
async function redeployService(token, serviceId, environmentId) {
  const query = `
    mutation RedeployService($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `;
  return railwayRequest(query, { serviceId, environmentId }, token);
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
 * Map Railway deployment status to unified status
 */
function mapDeploymentStatus(status) {
  const mapping = {
    'BUILDING': 'building',
    'DEPLOYING': 'deploying',
    'SUCCESS': 'ready',
    'FAILED': 'error',
    'CRASHED': 'error',
    'REMOVED': 'canceled',
    'QUEUED': 'queued',
    'INITIALIZING': 'queued',
  };
  return mapping[status] || 'error';
}

/**
 * Transform Railway project to unified format
 */
function transformProject(project) {
  const environments = project.environments?.edges?.map(e => ({
    id: e.node.id,
    name: e.node.name,
  })) || [];

  const services = project.services?.edges?.map(s => ({
    id: s.node.id,
    name: s.node.name,
    projectId: project.id,
    serviceType: 'web', // Default, could be inferred
    domains: [],
    status: 'ready',
  })) || [];

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    environments,
    services,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Transform Railway deployment to unified format
 */
function transformDeployment(deployment, service, project) {
  return {
    id: deployment.id,
    name: service?.name || 'Unknown',
    platform: 'railway',
    status: mapDeploymentStatus(deployment.status),
    githubUrl: '', // Would need to fetch from service source
    branch: 'main', // Would need to fetch from service source
    url: deployment.staticUrl ? `https://${deployment.staticUrl}` : null,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    projectId: project?.id || service?.projectId,
    serviceId: deployment.serviceId,
    environmentId: deployment.environmentId,
  };
}

module.exports = {
  getUser,
  listProjects,
  getProject,
  createProject,
  createServiceFromRepo,
  deployFromGitHub,
  listServices,
  getService,
  listDeployments,
  getDeployment,
  getDeploymentLogs,
  createDatabase,
  setServiceVariables,
  getServiceVariables,
  deleteProject,
  deleteService,
  redeployService,
  parseGitHubUrl,
  mapDeploymentStatus,
  transformProject,
  transformDeployment,
};
