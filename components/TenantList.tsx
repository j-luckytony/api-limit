'use client';

import { useState, useEffect } from 'react';
import { Trash2, Key, CheckCircle, XCircle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  description?: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  rateLimits: any[];
  _count: {
    apiLogs: number;
  };
}

interface TenantListProps {
  onSelectTenant: (tenantId: string) => void;
  selectedTenantId: string | null;
}

export default function TenantList({ onSelectTenant, selectedTenantId }: TenantListProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      setTenants(data.tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const deleteTenant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;

    try {
      await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
      fetchTenants();
      if (selectedTenantId === id) {
        onSelectTenant('');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    alert('API Key copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          No tenants yet. Create your first tenant to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tenants.map((tenant) => (
        <div
          key={tenant.id}
          className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-2 transition-all cursor-pointer hover:shadow-lg ${
            selectedTenantId === tenant.id
              ? 'border-blue-600'
              : 'border-transparent'
          }`}
          onClick={() => onSelectTenant(tenant.id)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                {tenant.name}
              </h3>
              {tenant.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {tenant.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {tenant.isActive ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : (
                <XCircle size={20} className="text-red-500" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTenant(tenant.id);
                }}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Rate Limits:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {tenant.rateLimits.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">API Calls:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {tenant._count.apiLogs}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-slate-400" />
                <code className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                  {tenant.apiKey}
                </code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyApiKey(tenant.apiKey);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
