/**
 * Deployment Zod Schemas
 * 
 * Validation schemas for deployment-related data.
 * Used for validating API inputs and responses.
 */

import { z } from 'zod';

/** Valid EC2 instance states */
export const instanceStateSchema = z.enum([
  'pending',
  'running',
  'stopping',
  'stopped',
  'shutting-down',
  'terminated',
]);

/** Supported instance types */
export const instanceTypeSchema = z.enum(['t2.micro', 't2.small', 't2.medium']);

/** GitHub URL validation pattern */
const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/;

/** Deploy request validation schema */
export const deployConfigSchema = z.object({
  githubUrl: z
    .string()
    .min(1, 'GitHub URL is required')
    .regex(GITHUB_URL_REGEX, 'Must be a valid GitHub repository URL (e.g., https://github.com/user/repo)'),
  appName: z
    .string()
    .min(1, 'App name is required')
    .max(50, 'App name must be 50 characters or less')
    .regex(/^[\w-]+$/, 'App name can only contain letters, numbers, hyphens, and underscores'),
  instanceType: instanceTypeSchema.default('t2.micro'),
  envVars: z.record(z.string(), z.string()).optional(),
});

/** IPv4 regex pattern */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

/** Deployment object schema */
export const deploymentSchema = z.object({
  instanceId: z.string().regex(/^i-[a-f0-9]+$/, 'Invalid EC2 instance ID'),
  appName: z.string(),
  githubUrl: z.string().url(),
  instanceType: instanceTypeSchema,
  state: instanceStateSchema,
  publicIp: z.string().regex(IPV4_REGEX, 'Invalid IPv4 address').optional().nullable(),
  launchTime: z.string(),
  updatedAt: z.string().optional(),
});

/** Deploy API response schema */
export const deployResponseSchema = z.object({
  success: z.boolean(),
  deployment: deploymentSchema.optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

/** Instance action request schema */
export const instanceActionSchema = z.object({
  instanceId: z.string().regex(/^i-[a-f0-9]+$/, 'Invalid EC2 instance ID'),
});

/** Logs request schema */
export const logsRequestSchema = z.object({
  instanceId: z.string().regex(/^i-[a-f0-9]+$/, 'Invalid EC2 instance ID'),
});

/** Type exports inferred from schemas */
export type DeployConfigInput = z.infer<typeof deployConfigSchema>;
export type DeploymentData = z.infer<typeof deploymentSchema>;
export type InstanceStateValue = z.infer<typeof instanceStateSchema>;
export type InstanceTypeValue = z.infer<typeof instanceTypeSchema>;
