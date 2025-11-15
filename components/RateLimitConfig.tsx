'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface RateLimit {
  id: string;
  type: 'GENERAL' | 'IP' | 'API' | 'USER';
  maxRequests: number;
  windowMs: number;
  apiPath?: string;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  apiKey: string;
}

export default function RateLimitConfig({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'GENERAL' as RateLimit['type'],
    maxRequests: 100,
    windowValue: 1,
    windowUnit: 'minutes' as 'seconds' | 'minutes' | 'hours' | 'days',
    apiPath: '',
  });

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      const data = await response.json();
      setTenant(data.tenant);
      setRateLimits(data.tenant.rateLimits);
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const convertToMs = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return value * 1000;
      case 'minutes': return value * 60 * 1000;
      case 'hours': return value * 60 * 60 * 1000;
      case 'days': return value * 24 * 60 * 60 * 1000;
      default: return value * 60 * 1000;
    }
  };

  const convertFromMs = (ms: number): { value: number; unit: string } => {
    if (ms % (24 * 60 * 60 * 1000) === 0) {
      return { value: ms / (24 * 60 * 60 * 1000), unit: 'days' };
    }
    if (ms % (60 * 60 * 1000) === 0) {
      return { value: ms / (60 * 60 * 1000), unit: 'hours' };
    }
    if (ms % (60 * 1000) === 0) {
      return { value: ms / (60 * 1000), unit: 'minutes' };
    }
    return { value: ms / 1000, unit: 'seconds' };
  };

  const formatWindow = (ms: number): string => {
    const { value, unit } = convertFromMs(ms);
    return `${value} ${unit}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const windowMs = convertToMs(formData.windowValue, formData.windowUnit);

    try {
      const response = await fetch('/api/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          type: formData.type,
          maxRequests: formData.maxRequests,
          windowMs,
          apiPath: formData.type === 'API' ? formData.apiPath : undefined,
        }),
      });

      if (response.ok) {
        setShowForm(false);
        resetForm();
        fetchTenant();
      }
    } catch (error) {
      console.error('Error creating rate limit:', error);
    }
  };

  const deleteRateLimit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate limit?')) return;

    try {
      await fetch(`/api/rate-limits/${id}`, { method: 'DELETE' });
      fetchTenant();
    } catch (error) {
      console.error('Error deleting rate limit:', error);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/rate-limits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchTenant();
    } catch (error) {
      console.error('Error updating rate limit:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'GENERAL',
      maxRequests: 100,
      windowValue: 1,
      windowUnit: 'minutes',
      apiPath: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant Info */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {tenant?.name}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">API Key:</span>
          <code className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded text-slate-900 dark:text-white">
            {tenant?.apiKey}
          </code>
        </div>
      </div>

      {/* Rate Limits List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Rate Limit Configurations
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Add Rate Limit'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rate Limit Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as RateLimit['type'] })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white"
                >
                  <option value="GENERAL">General (All Requests)</option>
                  <option value="IP">Per IP Address</option>
                  <option value="API">Per API Endpoint</option>
                  <option value="USER">Per User ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Requests *
                </label>
                <input
                  type="number"
                  value={formData.maxRequests}
                  onChange={(e) => setFormData({ ...formData, maxRequests: parseInt(e.target.value) })}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Time Window Value *
                </label>
                <input
                  type="number"
                  value={formData.windowValue}
                  onChange={(e) => setFormData({ ...formData, windowValue: parseInt(e.target.value) })}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Time Window Unit *
                </label>
                <select
                  value={formData.windowUnit}
                  onChange={(e) => setFormData({ ...formData, windowUnit: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>

              {formData.type === 'API' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    API Path *
                  </label>
                  <input
                    type="text"
                    value={formData.apiPath}
                    onChange={(e) => setFormData({ ...formData, apiPath: e.target.value })}
                    placeholder="/api/users"
                    required
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-600 dark:text-white"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Rate Limit
            </button>
          </form>
        )}

        {/* Rate Limits Table */}
        {rateLimits.length === 0 ? (
          <p className="text-center text-slate-600 dark:text-slate-400 py-8">
            No rate limits configured. Add one to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Limit</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Window</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">API Path</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rateLimits.map((limit) => (
                  <tr key={limit.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {limit.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white">
                      {limit.maxRequests} requests
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white">
                      {formatWindow(limit.windowMs)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {limit.apiPath || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(limit.id, limit.isActive)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          limit.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {limit.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteRateLimit(limit.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
