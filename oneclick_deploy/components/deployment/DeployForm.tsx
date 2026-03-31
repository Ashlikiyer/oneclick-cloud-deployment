/**
 * DeployForm Component
 * 
 * Form for deploying a new GitHub repository to EC2.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { Github, Rocket, AlertCircle } from 'lucide-react';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/shared';
import { useDeploy } from '@/application/deployment';
import type { InstanceType } from '@/domain/deployment';

const instanceTypeOptions = [
  { value: 't2.micro', label: 't2.micro (1 vCPU, 1 GB) - Free Tier' },
  { value: 't2.small', label: 't2.small (1 vCPU, 2 GB)' },
  { value: 't2.medium', label: 't2.medium (2 vCPU, 4 GB)' },
  { value: 't3.micro', label: 't3.micro (2 vCPU, 1 GB)' },
  { value: 't3.small', label: 't3.small (2 vCPU, 2 GB)' },
];

export function DeployForm() {
  const [githubUrl, setGithubUrl] = useState('');
  const [instanceType, setInstanceType] = useState<InstanceType>('t2.micro');
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState<string | null>(null);

  const { mutate: deploy, isPending } = useDeploy();

  const validateGitHubUrl = (url: string): boolean => {
    const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\.git)?$/;
    return pattern.test(url);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!githubUrl) {
      setError('GitHub URL is required');
      return;
    }

    if (!validateGitHubUrl(githubUrl)) {
      setError('Invalid GitHub URL. Expected format: https://github.com/owner/repo');
      return;
    }

    deploy(
      {
        githubUrl,
        instanceType,
        branch,
      },
      {
        onSuccess: () => {
          // Reset form on success
          setGithubUrl('');
          setBranch('main');
        },
        onError: (err) => {
          setError(err.message || 'Failed to deploy');
        },
      }
    );
  };

  return (
    <Card className="shadow-xl shadow-slate-200/50 border-slate-200 overflow-hidden">
      <CardHeader className="bg-linear-to-r from-slate-50 to-white border-b border-slate-100">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Rocket className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <span className="text-slate-900">Deploy New Application</span>
            <p className="text-sm font-normal text-slate-500 mt-0.5">Launch your app on AWS EC2</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Input
              label="GitHub Repository URL"
              name="githubUrl"
              type="url"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              helperText="Repository must be public"
              disabled={isPending}
              className="transition-shadow focus:shadow-lg focus:shadow-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Instance Type"
              name="instanceType"
              options={instanceTypeOptions}
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value as InstanceType)}
              disabled={isPending}
            />

            <Input
              label="Branch"
              name="branch"
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="relative w-full group"
          >
            <div className="absolute -inset-0.5 bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
            <div className={`relative flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 ${isPending ? 'opacity-80' : 'hover:from-blue-700 hover:to-blue-800'}`}>
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <Github className="h-5 w-5" />
                  <span>Deploy to AWS</span>
                </>
              )}
            </div>
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
