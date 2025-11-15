'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Activity, TestTube } from 'lucide-react';
import TenantList from '@/components/TenantList';
import TenantForm from '@/components/TenantForm';
import RateLimitConfig from '@/components/RateLimitConfig';
import ApiTester from '@/components/ApiTester';
import Analytics from '@/components/Analytics';

type View = 'tenants' | 'config' | 'test' | 'analytics';

export default function Home() {
  const [view, setView] = useState<View>('tenants');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showTenantForm, setShowTenantForm] = useState(false);

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setView('config');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                API Rate Limiter
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Advanced rate limiting with multi-tenant support
              </p>
            </div>
            <button
              onClick={() => setShowTenantForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              New Tenant
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setView('tenants')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 transition-colors ${
                view === 'tenants'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Settings size={18} />
              Tenants
            </button>
            <button
              onClick={() => setView('config')}
              disabled={!selectedTenantId}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 transition-colors ${
                view === 'config'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Settings size={18} />
              Rate Limits
            </button>
            <button
              onClick={() => setView('test')}
              disabled={!selectedTenantId}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 transition-colors ${
                view === 'test'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <TestTube size={18} />
              API Tester
            </button>
            <button
              onClick={() => setView('analytics')}
              disabled={!selectedTenantId}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 transition-colors ${
                view === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Activity size={18} />
              Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'tenants' && (
          <TenantList
            onSelectTenant={handleTenantSelect}
            selectedTenantId={selectedTenantId}
          />
        )}
        {view === 'config' && selectedTenantId && (
          <RateLimitConfig tenantId={selectedTenantId} />
        )}
        {view === 'test' && selectedTenantId && (
          <ApiTester tenantId={selectedTenantId} />
        )}
        {view === 'analytics' && selectedTenantId && (
          <Analytics tenantId={selectedTenantId} />
        )}
      </main>

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <TenantForm
          onClose={() => setShowTenantForm(false)}
          onSuccess={(tenantId) => {
            setShowTenantForm(false);
            setSelectedTenantId(tenantId);
            setView('config');
          }}
        />
      )}
    </div>
  );
}
