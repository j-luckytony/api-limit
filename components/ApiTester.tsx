'use client';

import { useState, useEffect } from 'react';
import { Play, Copy, AlertCircle, CheckCircle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  apiKey: string;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  retryAfter?: number;
}

export default function ApiTester({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // Form state
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [userId, setUserId] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [useApiKey, setUseApiKey] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}`);
        const data = await response.json();
        setTenant(data.tenant);
      } catch (error) {
        console.error('Error fetching tenant:', error);
      }
    };
    fetchTenant();
  }, [tenantId]);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const payload: any = {
        apiUrl,
        method,
        userId: userId || undefined,
      };

      if (useApiKey) {
        payload.apiKey = tenant?.apiKey;
      } else {
        payload.tenantId = tenantId;
      }

      if (requestBody && method !== 'GET') {
        try {
          payload.body = JSON.parse(requestBody);
        } catch {
          setResult({
            success: false,
            error: 'Invalid JSON in request body',
          });
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 429) {
        setResult({
          success: false,
          error: data.error,
          statusCode: 429,
          rateLimit: {
            limit: data.limit,
            remaining: data.remaining,
            reset: data.reset,
          },
          retryAfter: data.retryAfter,
        });
      } else if (!response.ok) {
        setResult({
          success: false,
          error: data.error || 'Request failed',
          statusCode: response.status,
        });
      } else {
        setResult({
          success: true,
          data: data.data,
          statusCode: data.statusCode,
          rateLimit: data.rateLimit,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Request failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAsCurl = () => {
    const payload: any = {
      apiUrl,
      method,
      userId: userId || undefined,
    };

    if (useApiKey) {
      payload.apiKey = tenant?.apiKey;
    } else {
      payload.tenantId = tenantId;
    }

    if (requestBody && method !== 'GET') {
      try {
        payload.body = JSON.parse(requestBody);
      } catch {}
    }

    const curl = `curl -X POST ${window.location.origin}/api/proxy \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;

    navigator.clipboard.writeText(curl);
    alert('cURL command copied to clipboard!');
  };

  const formatResetTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              API Testing Tool
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Test your rate-limited API proxy. All requests go through <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/api/proxy</code> and are subject to the configured rate limits.
            </p>
          </div>
        </div>
      </div>

      {/* Test Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Configure Test Request
          </h3>
          <button
            onClick={copyAsCurl}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Copy size={16} />
            Copy as cURL
          </button>
        </div>

        <div className="space-y-4">
          {/* Authentication Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Authentication Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useApiKey}
                  onChange={() => setUseApiKey(true)}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Use API Key</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useApiKey}
                  onChange={() => setUseApiKey(false)}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Use Tenant ID</span>
              </label>
            </div>
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Target API URL *
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              HTTP Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* User ID (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              User ID (Optional)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-123"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Used for USER type rate limiting
            </p>
          </div>

          {/* Request Body */}
          {method !== 'GET' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Request Body (JSON)
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={6}
                placeholder='{"key": "value"}'
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white font-mono text-sm"
              />
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={loading || !apiUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Play size={18} />
            {loading ? 'Testing...' : 'Send Test Request'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Test Results
          </h3>

          {/* Status */}
          <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">
              {result.success ? 'Request Successful' : result.error}
            </span>
            {result.statusCode && (
              <span className="ml-auto font-mono text-sm">
                Status: {result.statusCode}
              </span>
            )}
          </div>

          {/* Rate Limit Info */}
          {result.rateLimit && (
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Rate Limit Status
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Limit:</span>
                  <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                    {result.rateLimit.limit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Remaining:</span>
                  <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                    {result.rateLimit.remaining}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Reset:</span>
                  <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                    {formatResetTime(result.rateLimit.reset)}
                  </span>
                </div>
              </div>
              {result.retryAfter && (
                <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
                  Retry after {result.retryAfter} seconds
                </p>
              )}
            </div>
          )}

          {/* Response Data */}
          {result.data && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Response Data
              </h4>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
