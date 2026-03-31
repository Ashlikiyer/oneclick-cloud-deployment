/**
 * DeploymentList Component
 * 
 * Displays a list of all deployments with loading and empty states.
 */

'use client';

import { Server, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Button, Card, CardContent, Spinner } from '@/components/shared';
import { DeploymentCard } from './DeploymentCard';
import { useDeployments } from '@/application/deployment';
import type { Deployment } from '@/domain/deployment';

interface DeploymentListProps {
  onViewLogs?: (instanceId: string) => void;
}

export function DeploymentList({ onViewLogs }: DeploymentListProps) {
  const { data, isLoading, error, refetch, isRefetching } = useDeployments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-500">Loading deployments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Failed to load deployments
            </h3>
            <p className="text-slate-500 mb-5">{error.message}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const instances: Deployment[] = data?.instances || [];

  if (instances.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-5">
              <Server className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No deployments yet
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Deploy your first application using the form above. Your EC2 instances will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Layers className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Your Deployments
            </h2>
            <p className="text-sm text-slate-500">{instances.length} active instance{instances.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Deployment Cards */}
      <div className="grid gap-4">
        {instances.map((deployment) => (
          <DeploymentCard
            key={deployment.instanceId}
            deployment={deployment}
            onViewLogs={onViewLogs}
          />
        ))}
      </div>
    </div>
  );
}
