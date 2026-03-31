"use client";

import { useState, useEffect } from "react";

type ViewMode = "wizard" | "deployments";
type Deployment = { name: string; id: string; status: string; ip: string; created: string };

interface EC2Instance {
  instanceId: string;
  name: string;
  state: string;
  publicIp?: string | null;
  privateIp?: string | null;
  instanceType: string;
  launchTime?: string;
  tags?: Array<{ Key: string; Value: string }>;
}

interface DeployResponse {
  name?: string;
  instanceId?: string;
  error?: string;
}

export default function Home() {
  const [view, setView] = useState<ViewMode>("wizard");
  const [step, setStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [instanceType, setInstanceType] = useState("t2.micro - Free Tier (1 vCPU, 1 GiB RAM)");
  const [branch, setBranch] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedLogsId, setSelectedLogsId] = useState<string | null>(null);
  const [logsContent, setLogsContent] = useState<string>("");

  // Fetch deployments on component mount
  const fetchDeployments = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/instances");
      if (!response.ok) throw new Error("Failed to fetch deployments");
      const result = await response.json();
      const data: EC2Instance[] = result.data || [];
      const formatted: Deployment[] = data.map((instance: EC2Instance) => ({
        name: instance.name || instance.instanceId,
        id: instance.instanceId,
        status: instance.state || "unknown",
        ip: instance.publicIp || "—",
        created: instance.launchTime ? new Date(instance.launchTime).toLocaleDateString() : "—"
      }));
      setDeployments(formatted);
    } catch (err) {
      console.error("Error fetching deployments:", err);
    }
  };

  useEffect(() => {
    fetchDeployments();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDeployments, 10000);
    return () => clearInterval(interval);
  }, []);

  const onDeploy = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a repository URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:4000/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: repoUrl,
          branch: branch || "main",
          instanceType: instanceType.split(" -")[0].trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Deployment failed");
      }

      const result: DeployResponse = await response.json();

      // Add the new deployment immediately
      const newDeployment: Deployment = {
        name: result.name || `oneclick-${Date.now()}`,
        id: result.instanceId || "pending",
        status: "pending",
        ip: "—",
        created: new Date().toLocaleDateString()
      };

      setDeployments((prev) => [newDeployment, ...prev]);
      setView("deployments");
      setRepoUrl("");
      setBranch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstanceAction = async (instanceId: string, action: "stop" | "start" | "terminate") => {
    setActionLoading(instanceId);
    try {
      const method = action === "terminate" ? "DELETE" : "PUT";
      const endpoint = action === "terminate" 
        ? `http://localhost:4000/api/instances/${instanceId}`
        : `http://localhost:4000/api/instances/${instanceId}/${action}`;

      const response = await fetch(endpoint, { method });
      if (!response.ok) throw new Error(`Failed to ${action} instance`);

      setError(null);
      // Refresh deployments to get updated state
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} instance`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async (instanceId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/instances/${instanceId}/logs`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      const result = await response.json();
      setLogsContent(result.data?.raw || "No logs available");
      setSelectedLogsId(instanceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <button onClick={() => { setView("wizard"); setStep(0); }} className="flex items-center gap-2 text-lg font-semibold hover:opacity-90">
            <span className="text-cyan-400 text-xl">◌</span>
            <span>OneClick Deploy</span>
          </button>
          <button
            onClick={() => setView("deployments")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
          >
            <span>Deployments</span>
            <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-xs text-slate-950 font-semibold">
              {deployments.length}
            </span>
          </button>
        </div>
      </header>

      {view === "wizard" && (
        <main className="mx-auto max-w-7xl px-8 py-8 min-h-[calc(100vh-80px)] flex flex-col">
          {/* Step Tabs */}
          <div className="mb-8 flex gap-8 pb-3 border-b border-slate-700/50 flex-shrink-0">
            {["Connect", "Configure", "Review"].map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`text-sm font-medium transition-all duration-200 pb-1.5 ${
                  i === step
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-slate-500 hover:text-slate-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Step Content Container */}
          <div className="flex-1 flex flex-col overflow-hidden">

          {/* Connect Step */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] h-full overflow-hidden">
              {/* Main Content */}
              <section className="flex flex-col justify-between overflow-hidden">
                <div className="mb-6">
                  <h1 className="mb-2 text-4xl font-semibold">Connect Repository</h1>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Paste your public GitHub repository URL to deploy your Node.js or Next.js application.
                  </p>
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {error && (
                      <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-400">
                        {error}
                      </div>
                    )}
                    <label className="mb-2 block text-sm font-medium text-slate-300">GitHub Repository URL</label>
                    <input
                      className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 mb-3"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repo.git"
                    />
                    <label className="mb-2 block text-sm font-medium text-slate-300">Branch (optional)</label>
                    <input
                      className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 mb-6"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                    />
                  </div>
                  
                  <button
                    onClick={() => setStep(1)}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2.5 font-semibold text-white transition-all duration-200 transform hover:scale-105 text-base flex-shrink-0"
                  >
                    Continue to Configuration →
                  </button>
                </div>
              </section>

              {/* Sidebar */}
              <aside className="flex flex-col overflow-y-auto pr-2">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  How it works
                </h3>
                
                <ul className="space-y-3 flex-1">
                  <li className="flex gap-2.5 items-start flex-shrink-0">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-xs">Clone Repository</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">We clone your GitHub repository to a new EC2 instance.</p>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start flex-shrink-0">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.26 2.37 1.805a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.26 3.31-1.805 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.26-2.37-1.805a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.26-3.31 1.805-2.37a1.724 1.724 0 002.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-xs">Install Dependencies</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">Automatically install Node.js 20, PM2, and npm.</p>
                    </div>
                  </li>
                  <li className="flex gap-2.5 items-start flex-shrink-0">
                    <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-xs">Start Application</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">Your app starts with PM2 & Nginx.</p>
                    </div>
                  </li>
                </ul>

                <div className="pt-3 border-t border-slate-700/50 flex-shrink-0 mt-3">
                  <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-white text-xs">
                    <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    Auto-configured for:
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                      <span className="text-cyan-400 font-medium">Node.js</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                      <span className="text-cyan-400 font-medium">Next.js</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-slate-600 text-xs">React</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-slate-600 text-xs">TypeScript</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-tight">
                    Requires public GitHub repo with package.json and start script.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {/* Configure Step */}
          {step === 1 && (
            <section className="max-w-2xl">
              <h1 className="mb-3 text-5xl font-semibold">Configure Instance</h1>
              <p className="mb-10 text-lg text-slate-400">
                Choose your EC2 instance type and Git branch to deploy.
              </p>

              <label className="mb-3 block text-sm font-medium text-slate-300">Instance Type</label>
              <select
                className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 mb-8"
                value={instanceType}
                onChange={(e) => setInstanceType(e.target.value)}
              >
                <option>t2.micro - Free Tier (1 vCPU, 1 GiB RAM)</option>
                <option>t3.micro - 2 vCPU, 1 GiB RAM</option>
                <option>t3.small - 2 vCPU, 2 GiB RAM</option>
              </select>

              <label className="mb-3 block text-sm font-medium text-slate-300">Deployment Branch</label>
              <input
                className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 mb-8"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />

              <div className="mb-8 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-300">
                <span className="text-slate-500">ℹ</span> Your instance will be provisioned in ap-southeast-1 (Singapore) region with Ubuntu 22.04 LTS.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-lg border border-slate-700 hover:bg-slate-800/50 px-4 py-3 font-semibold text-slate-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 font-semibold text-white transition-colors"
                >
                  Continue to Review →
                </button>
              </div>
            </section>
          )}

          {/* Review Step */}
          {step === 2 && (
            <section className="max-w-2xl">
              <h1 className="mb-3 text-5xl font-semibold">Review & Deploy</h1>
              <p className="mb-10 text-lg text-slate-400">
                Verify your configuration before launching the EC2 instance.
              </p>

              <div className="mb-8">
                <h3 className="mb-4 text-sm font-semibold text-slate-400">DEPLOYMENT SUMMARY</h3>
                <div className="space-y-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-6">
                  <div className="border-b border-slate-700/30 pb-4">
                    <p className="text-sm text-slate-500">Repository URL</p>
                    <p className="font-semibold text-cyan-400 mt-1 break-all">{repoUrl}</p>
                  </div>
                  <div className="border-b border-slate-700/30 pb-4">
                    <p className="text-sm text-slate-500">Instance Type</p>
                    <p className="font-semibold text-cyan-400 mt-1">{instanceType}</p>
                  </div>
                  <div className="border-b border-slate-700/30 pb-4">
                    <p className="text-sm text-slate-500">Branch</p>
                    <p className="font-semibold text-cyan-400 mt-1">{branch}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Region</p>
                    <p className="font-semibold text-cyan-400 mt-1">ap-southeast-1 (Singapore)</p>
                  </div>
                </div>
              </div>

              <div className="mb-8 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-400">
                <p>After clicking Deploy: a new EC2 instance will be created (~30 seconds), Node.js, PM2, and Nginx will be installed (~2-3 minutes), and your app will auto-start.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-slate-700 hover:bg-slate-800/50 disabled:opacity-50 px-4 py-3 font-semibold text-slate-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(0)}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-slate-700 hover:bg-slate-800/50 disabled:opacity-50 px-4 py-3 font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeploy}
                  disabled={isLoading}
                  className="ml-auto rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 font-semibold text-white transition-colors"
                >
                  {isLoading ? "Deploying..." : "Deploy Now →"}
                </button>
              </div>
            </section>
          )}
          </div>
        </main>
      )}

      {view === "deployments" && (
        <main className="mx-auto max-w-7xl px-8 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold">Deployments</h1>
              <p className="mt-2 text-slate-400">Manage your deployed EC2 instances</p>
            </div>
            <button
              onClick={() => { setView("wizard"); setStep(0); }}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 font-semibold text-white transition-colors"
            >
              + New Deployment
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-700/50">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    APPLICATION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    IP ADDRESS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    CREATED
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.name} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-sm text-slate-500">{d.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50">
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">{d.ip}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{d.created}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {d.status === "running" && (
                          <>
                            <button
                              onClick={() => handleInstanceAction(d.id, "stop")}
                              disabled={actionLoading === d.id}
                              className="px-3 py-1 text-xs font-medium rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionLoading === d.id ? "..." : "Stop"}
                            </button>
                          </>
                        )}
                        {d.status === "stopped" && (
                          <>
                            <button
                              onClick={() => handleInstanceAction(d.id, "start")}
                              disabled={actionLoading === d.id}
                              className="px-3 py-1 text-xs font-medium rounded bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionLoading === d.id ? "..." : "Start"}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewLogs(d.id)}
                          className="px-3 py-1 text-xs font-medium rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
                        >
                          Logs
                        </button>
                        <button
                          onClick={() => handleInstanceAction(d.id, "terminate")}
                          disabled={actionLoading === d.id}
                          className="px-3 py-1 text-xs font-medium rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === d.id ? "..." : "Terminate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Logs Modal */}
          {selectedLogsId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-2xl rounded-lg bg-slate-900 border border-slate-700 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">Instance Logs</h2>
                  <button
                    onClick={() => setSelectedLogsId(null)}
                    className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto bg-slate-950 rounded">
                  <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-words bg-slate-950 p-4 rounded border border-slate-800">
                    {logsContent || "Loading logs..."}
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-700/50 px-6 py-4">
                  <button
                    onClick={() => setSelectedLogsId(null)}
                    className="px-4 py-2 text-sm font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleViewLogs(selectedLogsId)}
                    className="px-4 py-2 text-sm font-medium rounded bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 rounded-lg border border-slate-700/50 bg-slate-800/30 p-5">
            <h3 className="mb-2 font-semibold text-white">Managing Costs</h3>
            <p className="text-sm text-slate-400">
              Terminate instances you&apos;re not using to avoid charges. t2.micro is free for 750 hours/month on new AWS accounts.
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
