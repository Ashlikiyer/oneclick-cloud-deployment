/**
 * Deployment Hooks
 * 
 * Layer 3 (Application) - React Query hooks for deployment operations.
 * Orchestrates data fetching and state management.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentRepository } from '@/data/deployment';
import type { DeployConfig, Deployment } from '@/domain/deployment';

/** Query keys for cache management */
export const deploymentKeys = {
  all: ['deployments'] as const,
  lists: () => [...deploymentKeys.all, 'list'] as const,
  list: () => [...deploymentKeys.lists()] as const,
  details: () => [...deploymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...deploymentKeys.details(), id] as const,
  logs: (id: string) => [...deploymentKeys.all, 'logs', id] as const,
};

/**
 * Hook to fetch all deployments
 */
export function useDeployments() {
  return useQuery({
    queryKey: deploymentKeys.list(),
    queryFn: async () => {
      const result = await deploymentRepository.getAll();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Hook to fetch a single deployment by ID
 */
export function useDeployment(instanceId: string) {
  return useQuery({
    queryKey: deploymentKeys.detail(instanceId),
    queryFn: async () => {
      const result = await deploymentRepository.getById(instanceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    enabled: !!instanceId,
    refetchInterval: 5000, // More frequent updates for single instance
  });
}

/**
 * Hook to fetch deployment logs
 */
export function useDeploymentLogs(instanceId: string, enabled = true) {
  return useQuery({
    queryKey: deploymentKeys.logs(instanceId),
    queryFn: async () => {
      const result = await deploymentRepository.getLogs(instanceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    enabled: enabled && !!instanceId,
    refetchInterval: 5000, // Poll logs every 5 seconds
  });
}

/**
 * Hook to deploy a new application
 */
export function useDeploy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: DeployConfig) => {
      const result = await deploymentRepository.deploy(config);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate deployments list to refetch
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() });
    },
  });
}

/**
 * Hook to stop a deployment
 */
export function useStopDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const result = await deploymentRepository.stop(instanceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() });
    },
  });
}

/**
 * Hook to start a deployment
 */
export function useStartDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const result = await deploymentRepository.start(instanceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() });
    },
  });
}

/**
 * Hook to terminate a deployment
 */
export function useTerminateDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const result = await deploymentRepository.terminate(instanceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.detail(instanceId) });
      queryClient.invalidateQueries({ queryKey: deploymentKeys.lists() });
    },
  });
}

/**
 * Hook to check API health
 */
export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const result = await deploymentRepository.checkHealth();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}
