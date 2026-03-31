/**
 * Deployment Domain - Barrel Export
 * 
 * Re-exports all types, schemas, and utilities for the deployment feature.
 */

// Types
export type {
  InstanceState,
  InstanceType,
  DeployConfig,
  Deployment,
  ApiResponse,
  DeploymentResponse,
  DeploymentListResponse,
  InstanceActionResponse,
  LogsResponse,
  ApiError,
} from './deployment.types';

// Schemas
export {
  instanceStateSchema,
  instanceTypeSchema,
  deployConfigSchema,
  deploymentSchema,
  deployResponseSchema,
  instanceActionSchema,
  logsRequestSchema,
} from './deployment.schema';

export type {
  DeployConfigInput,
  DeploymentData,
  InstanceStateValue,
  InstanceTypeValue,
} from './deployment.schema';

// Utils
export {
  isInstanceActive,
  canStartInstance,
  canStopInstance,
  canTerminateInstance,
  hasPublicIp,
  getAppUrl,
  getStateColor,
  getStateLabel,
  extractRepoName,
  extractOwnerRepo,
  formatInstanceType,
  sortByLaunchTime,
  filterByState,
  getActiveDeployments,
} from './deployment.utils';
