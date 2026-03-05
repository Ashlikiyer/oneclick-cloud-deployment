/**
 * Deployment Utility Functions
 * 
 * Pure business logic functions for deployment operations.
 * No side effects, no async, no framework dependencies.
 */

import type { InstanceState, Deployment } from './deployment.types';

/** Instance states that indicate the instance is usable */
const ACTIVE_STATES: InstanceState[] = ['pending', 'running', 'stopping'];

/** Instance states that indicate the instance can be started */
const STARTABLE_STATES: InstanceState[] = ['stopped'];

/** Instance states that indicate the instance can be stopped */
const STOPPABLE_STATES: InstanceState[] = ['running'];

/** Instance states that allow termination */
const TERMINABLE_STATES: InstanceState[] = ['pending', 'running', 'stopping', 'stopped'];

/**
 * Check if an instance is in an active (non-terminated) state
 */
export function isInstanceActive(state: InstanceState): boolean {
  return ACTIVE_STATES.includes(state);
}

/**
 * Check if an instance can be started
 */
export function canStartInstance(state: InstanceState): boolean {
  return STARTABLE_STATES.includes(state);
}

/**
 * Check if an instance can be stopped
 */
export function canStopInstance(state: InstanceState): boolean {
  return STOPPABLE_STATES.includes(state);
}

/**
 * Check if an instance can be terminated
 */
export function canTerminateInstance(state: InstanceState): boolean {
  return TERMINABLE_STATES.includes(state);
}

/**
 * Check if instance has a public IP available
 */
export function hasPublicIp(deployment: Deployment): boolean {
  return deployment.state === 'running' && !!deployment.publicIp;
}

/**
 * Generate the application URL from deployment info
 */
export function getAppUrl(deployment: Deployment, port: number = 3000): string | null {
  if (!hasPublicIp(deployment)) return null;
  return `http://${deployment.publicIp}:${port}`;
}

/**
 * Get color class for status badge based on instance state
 */
export function getStateColor(state: InstanceState): string {
  const colors: Record<InstanceState, string> = {
    pending: 'yellow',
    running: 'green',
    stopping: 'orange',
    stopped: 'gray',
    'shutting-down': 'red',
    terminated: 'red',
  };
  return colors[state];
}

/**
 * Get human-readable label for instance state
 */
export function getStateLabel(state: InstanceState): string {
  const labels: Record<InstanceState, string> = {
    pending: 'Pending',
    running: 'Running',
    stopping: 'Stopping',
    stopped: 'Stopped',
    'shutting-down': 'Shutting Down',
    terminated: 'Terminated',
  };
  return labels[state];
}

/**
 * Extract repository name from GitHub URL
 */
export function extractRepoName(githubUrl: string): string {
  const match = githubUrl.match(/github\.com\/[\w-]+\/([\w.-]+)/);
  return match ? match[1].replace(/\.git$/, '') : 'unknown';
}

/**
 * Extract owner/repo from GitHub URL
 */
export function extractOwnerRepo(githubUrl: string): string {
  const match = githubUrl.match(/github\.com\/([\w-]+\/[\w.-]+)/);
  return match ? match[1].replace(/\.git$/, '') : 'unknown/unknown';
}

/**
 * Format instance type for display
 */
export function formatInstanceType(type: string): string {
  const descriptions: Record<string, string> = {
    't2.micro': 't2.micro (1 vCPU, 1 GB RAM) - Free Tier',
    't2.small': 't2.small (1 vCPU, 2 GB RAM)',
    't2.medium': 't2.medium (2 vCPU, 4 GB RAM)',
  };
  return descriptions[type] || type;
}

/**
 * Sort deployments by launch time (newest first)
 */
export function sortByLaunchTime(deployments: Deployment[]): Deployment[] {
  return [...deployments].sort(
    (a, b) => new Date(b.launchTime).getTime() - new Date(a.launchTime).getTime()
  );
}

/**
 * Filter deployments by state
 */
export function filterByState(
  deployments: Deployment[],
  states: InstanceState[]
): Deployment[] {
  return deployments.filter((d) => states.includes(d.state));
}

/**
 * Get active (non-terminated) deployments
 */
export function getActiveDeployments(deployments: Deployment[]): Deployment[] {
  return filterByState(deployments, ['pending', 'running', 'stopping', 'stopped']);
}
