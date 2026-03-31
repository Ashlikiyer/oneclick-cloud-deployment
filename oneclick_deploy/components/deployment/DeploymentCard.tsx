/**
 * DeploymentCard Component
 * 
 * Displays a single deployment with status and controls.
 */

'use client';

import { ExternalLink, Play, Square, Trash2, Terminal, Github, Server, Clock, Globe } from 'lucide-react';
import { Button, Card, CardContent, CardFooter, StatusBadge } from '@/components/shared';
import { useStartDeployment, useStopDeployment, useTerminateDeployment } from '@/application/deployment';
import { canStartInstance, canStopInstance, getAppUrl } from '@/domain/deployment';
import type { Deployment } from '@/domain/deployment';

interface DeploymentCardProps {
  deployment: Deployment;
  onViewLogs?: (instanceId: string) => void;
}

export function DeploymentCard({ deployment, onViewLogs }: DeploymentCardProps) {
  const { mutate: startInstance, isPending: isStarting } = useStartDeployment();
  const { mutate: stopInstance, isPending: isStopping } = useStopDeployment();
  const { mutate: terminateInstance, isPending: isTerminating } = useTerminateDeployment();

  const isLoading = isStarting || isStopping || isTerminating;
  const appUrl = getAppUrl(deployment);

  const handleStart = () => {
    if (canStartInstance(deployment.state)) {
      startInstance(deployment.instanceId);
    }
  };

  const handleStop = () => {
    if (canStopInstance(deployment.state)) {
      stopInstance(deployment.instanceId);
    }
  };

  const handleTerminate = () => {
    if (confirm('Are you sure you want to terminate this instance? This cannot be undone.')) {
      terminateInstance(deployment.instanceId);
    }
  };

  return (
    <Card className="group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:border-slate-300 overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{deployment.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{deployment.instanceId}</p>
          </div>
          <StatusBadge state={deployment.state} />
        </div>

        {/* Info Grid */}
        <div className="space-y-3 text-sm">
          {deployment.githubUrl && (
            <div className="flex items-center gap-3 text-slate-600">
              <Github className="h-4 w-4 text-slate-400 shrink-0" />
              <a
                href={deployment.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline truncate font-medium"
              >
                {deployment.githubUrl.replace('https://github.com/', '')}
              </a>
            </div>
          )}

          <div className="flex items-center gap-3 text-slate-600">
            <Server className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-700 font-medium">{deployment.instanceType}</span>
          </div>

          {deployment.publicIp && (
            <div className="flex items-center gap-3 text-slate-600">
              <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {deployment.publicIp}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-slate-600">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 text-xs">
              {new Date(deployment.launchTime).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 bg-slate-50/50 border-t border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          {canStartInstance(deployment.state) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStart}
              disabled={isLoading}
              isLoading={isStarting}
              className="hover:bg-green-100 hover:text-green-700 hover:border-green-200"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
          )}

          {canStopInstance(deployment.state) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStop}
              disabled={isLoading}
              isLoading={isStopping}
              className="hover:bg-amber-100 hover:text-amber-700 hover:border-amber-200"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
          )}

          {onViewLogs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewLogs(deployment.instanceId)}
              disabled={isLoading}
              className="hover:bg-slate-200"
            >
              <Terminal className="h-3.5 w-3.5 mr-1" />
              Logs
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {appUrl && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(appUrl, '_blank')}
              className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={handleTerminate}
            disabled={isLoading || deployment.state === 'terminated'}
            isLoading={isTerminating}
            className="hover:bg-red-600"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Terminate
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
