/**
 * DeployWizard Component
 * 
 * Compact multi-step wizard for deploying applications to AWS EC2.
 */

'use client';

import { useState } from 'react';
import { Github, Server, Rocket, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Button, Input, Select, Card, Stepper, type Step } from '@/components/shared';
import { useDeploy } from '@/application/deployment';
import type { InstanceType } from '@/domain/deployment';

const steps: Step[] = [
  { id: 1, title: 'Repository' },
  { id: 2, title: 'Instance' },
  { id: 3, title: 'Deploy' },
];

const instanceTypeOptions = [
  { value: 't2.micro', label: 't2.micro - Free Tier' },
  { value: 't2.small', label: 't2.small (2 GB)' },
  { value: 't2.medium', label: 't2.medium (4 GB)' },
  { value: 't3.micro', label: 't3.micro (1 GB)' },
  { value: 't3.small', label: 't3.small (2 GB)' },
];

export function DeployWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [githubUrl, setGithubUrl] = useState('');
  const [instanceType, setInstanceType] = useState<InstanceType>('t2.micro');
  const [branch, setBranch] = useState('main');
  const [error, setError] = useState<string | null>(null);

  const { mutate: deploy, isPending } = useDeploy();

  const validateGitHubUrl = (url: string): boolean => {
    const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\.git)?$/;
    return pattern.test(url);
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!githubUrl) {
        setError('GitHub URL is required');
        return;
      }
      if (!validateGitHubUrl(githubUrl)) {
        setError('Invalid URL format');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleDeploy = () => {
    setError(null);
    deploy(
      { githubUrl, instanceType, branch },
      {
        onSuccess: () => {
          setGithubUrl('');
          setBranch('main');
          setCurrentStep(1);
        },
        onError: (err) => {
          setError(err.message || 'Failed to deploy');
        },
      }
    );
  };

  const repoName = githubUrl.replace('https://github.com/', '').replace('.git', '');

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/50">
      {/* Compact Header */}
      <div className="bg-linear-to-r from-slate-900 to-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Deploy to AWS</h2>
            <p className="text-xs text-slate-400">Launch your app in minutes</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Step 1: Repository */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Github className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Repository URL</h3>
                <p className="text-xs text-slate-500">Paste your public GitHub repo</p>
              </div>
            </div>

            <Input
              label=""
              name="githubUrl"
              type="url"
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="bg-slate-50"
            />

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Repository must be public
            </p>
          </div>
        )}

        {/* Step 2: Instance */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Server className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Configure Instance</h3>
                <p className="text-xs text-slate-500">Select type and branch</p>
              </div>
            </div>

            <Select
              label="Instance Type"
              name="instanceType"
              options={instanceTypeOptions}
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value as InstanceType)}
            />

            <Input
              label="Branch"
              name="branch"
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />

            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              <Sparkles className="h-3 w-3" />
              t2.micro: 750 hrs/month free
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-violet-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Review & Deploy</h3>
                <p className="text-xs text-slate-500">Confirm your settings</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Repo</span>
                <span className="font-medium text-slate-900 truncate ml-4">{repoName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Instance</span>
                <span className="font-medium text-slate-900">{instanceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch</span>
                <span className="font-medium text-slate-900">{branch}</span>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <Rocket className="h-3 w-3" />
              Installs Node.js, PM2, clones repo & starts app
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1 || isPending}
            className={currentStep === 1 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button size="sm" onClick={handleNext} className="bg-slate-900 hover:bg-slate-800">
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
