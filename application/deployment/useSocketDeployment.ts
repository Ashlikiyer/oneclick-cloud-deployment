/**
 * Socket Integration Hooks
 * 
 * Integrates Socket.io real-time updates with React Query cache.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers';
import { 
  onInstanceStatus, 
  subscribeToInstance, 
  unsubscribeFromInstance,
  type InstanceStatusEvent 
} from '@/lib/socket';
import { deploymentKeys } from './useDeployment';
import type { Deployment, DeploymentListResponse, InstanceState } from '@/domain/deployment';

/**
 * Hook that syncs Socket.io updates with React Query cache
 * Call this once at the app level to enable real-time updates
 */
export function useRealtimeDeployments() {
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Handle instance status updates
    const cleanup = onInstanceStatus((data: InstanceStatusEvent) => {
      console.log('[Socket] Received status update:', data);

      // Update the deployments list cache
      queryClient.setQueryData<DeploymentListResponse>(
        deploymentKeys.list(),
        (oldData) => {
          if (!oldData) return oldData;

          const updatedInstances = oldData.instances.map((instance: Deployment) =>
            instance.instanceId === data.instanceId
              ? {
                  ...instance,
                  state: data.state as InstanceState,
                  publicIp: data.publicIp,
                }
              : instance
          );

          return {
            ...oldData,
            instances: updatedInstances,
          };
        }
      );

      // Update individual instance cache
      queryClient.setQueryData<Deployment>(
        deploymentKeys.detail(data.instanceId),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            state: data.state as InstanceState,
            publicIp: data.publicIp,
          };
        }
      );
    });

    return cleanup;
  }, [isConnected, queryClient]);

  return { isConnected };
}

/**
 * Hook to subscribe to a specific instance's updates
 * Use this when viewing logs or details of a specific instance
 */
export function useInstanceSubscription(instanceId: string | null) {
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected || !instanceId) return;

    subscribeToInstance(instanceId);
    console.log('[Hook] Subscribed to instance:', instanceId);

    return () => {
      unsubscribeFromInstance(instanceId);
      console.log('[Hook] Unsubscribed from instance:', instanceId);
    };
  }, [instanceId, isConnected]);
}

/**
 * Hook that combines log fetching with Socket.io subscription
 */
export function useRealtimeLogs(instanceId: string | null) {
  const queryClient = useQueryClient();
  
  // Subscribe to instance updates when viewing logs
  useInstanceSubscription(instanceId);

  // Force refresh logs when we receive a status update
  const refreshLogs = useCallback(() => {
    if (instanceId) {
      queryClient.invalidateQueries({ queryKey: deploymentKeys.logs(instanceId) });
    }
  }, [instanceId, queryClient]);

  return { refreshLogs };
}
