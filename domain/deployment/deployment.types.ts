/**
 * Deployment Domain Types
 * 
 * Pure TypeScript types for EC2 deployment management.
 * No framework dependencies - importable anywhere.
 */

/** EC2 instance lifecycle states */
export type InstanceState = 
  | 'pending'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'shutting-down'
  | 'terminated';

/** Supported EC2 instance types (Free Tier eligible first) */
export type InstanceType = 't2.micro' | 't2.small' | 't2.medium' | 't3.micro' | 't3.small' | 't3.medium';

/** Configuration for deploying a new application */
export interface DeployConfig {
  /** GitHub repository URL (must be public) */
  githubUrl: string;
  /** Optional display name for the deployment */
  name?: string;
  /** EC2 instance type */
  instanceType?: InstanceType;
  /** Git branch to deploy (default: main) */
  branch?: string;
  /** Optional environment variables to inject */
  envVars?: Record<string, string>;
}

/** Represents a deployed EC2 instance */
export interface Deployment {
  /** EC2 instance ID (i-xxxxxxxxx) */
  instanceId: string;
  /** Instance name (from tags) */
  name: string;
  /** Source GitHub repository URL */
  githubUrl?: string;
  /** EC2 instance type */
  instanceType: InstanceType;
  /** Current instance lifecycle state */
  state: InstanceState;
  /** Public IPv4 address (available when running) */
  publicIp: string | null;
  /** Private IPv4 address */
  privateIp?: string | null;
  /** ISO timestamp when instance was launched */
  launchTime: string;
  /** Instance tags */
  tags?: Array<{ Key: string; Value: string }>;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/** Response data from deploy endpoint */
export interface DeploymentResponse {
  instanceId: string;
  name: string;
  githubUrl: string;
  branch: string;
  state: InstanceState;
  publicIp: string | null;
  instanceType: InstanceType;
  launchTime: string;
  message: string;
}

/** Response data from instances list endpoint */
export interface DeploymentListResponse {
  instances: Deployment[];
  count: number;
}

/** Response from instance action (stop/start/terminate) */
export interface InstanceActionResponse {
  instanceId: string;
  previousState: InstanceState;
  currentState: InstanceState;
}

/** Console logs response */
export interface LogsResponse {
  instanceId: string;
  timestamp: string;
  raw: string;
  parsed: {
    hasOutput: boolean;
    deploymentStarted: boolean;
    deploymentComplete: boolean;
    errors: string[];
    warnings: string[];
    progress: string[];
    lineCount: number;
  };
}

/** API error response shape */
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
