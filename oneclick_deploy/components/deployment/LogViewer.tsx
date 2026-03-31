/**
 * LogViewer Component
 * 
 * Displays real-time console output from an EC2 instance.
 */

'use client';

import { X, RefreshCw, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Spinner } from '@/components/shared';
import { useDeploymentLogs, useInstanceSubscription } from '@/application/deployment';

interface LogViewerProps {
  instanceId: string;
  onClose: () => void;
}

export function LogViewer({ instanceId, onClose }: LogViewerProps) {
  const { data: logs, isLoading, error, refetch, isRefetching } = useDeploymentLogs(instanceId);
  
  // Subscribe to real-time updates for this instance
  useInstanceSubscription(instanceId);

  return (
    <Card className="h-full flex flex-col shadow-xl shadow-slate-200/50 border-slate-200 overflow-hidden">
      <CardHeader className="shrink-0 bg-linear-to-r from-slate-800 to-slate-900 text-white border-none py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-green-400" />
            <CardTitle className="text-sm font-semibold text-white">
              Console Output
            </CardTitle>
            <span className="font-mono text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
              {instanceId.slice(0, 12)}...
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="text-center">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Loading logs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-6 bg-red-50">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-red-700 text-sm font-medium">{error.message}</p>
            </div>
          </div>
        ) : logs ? (
          <div className="h-full flex flex-col">
            {/* Status indicators */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 border-b border-slate-200 text-sm">
              <StatusIndicator
                active={logs.parsed.deploymentStarted}
                label="Bootstrap Started"
              />
              <StatusIndicator
                active={logs.parsed.deploymentComplete}
                label="Bootstrap Complete"
              />
              {logs.parsed.errors.length > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  {logs.parsed.errors.length} error(s)
                </span>
              )}
            </div>

            {/* Progress steps */}
            {logs.parsed.progress.length > 0 && (
              <div className="p-3 bg-linear-to-r from-blue-50 to-cyan-50 border-b border-blue-100 text-sm">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Last step:</span>
                  <span>{logs.parsed.progress[logs.parsed.progress.length - 1]}</span>
                </div>
              </div>
            )}

            {/* Log output */}
            <div className="flex-1 overflow-auto p-4 bg-slate-900">
              {logs.raw ? (
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {logs.raw}
                </pre>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-4">
                    <Terminal className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm mb-1">
                    No console output available yet.
                  </p>
                  <p className="text-slate-500 text-xs">
                    Logs appear after the instance starts booting (usually 1-2 minutes).
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-4 bg-slate-50">
            <p className="text-slate-500 text-sm">No logs available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <CheckCircle className="h-4 w-4 text-emerald-600" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
      )}
      <span className={active ? 'text-emerald-700 font-medium' : 'text-slate-500'}>{label}</span>
    </div>
  );
}
