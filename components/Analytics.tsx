'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
  summary: {
    totalRequests: number;
    rateLimitedRequests: number;
    successfulRequests: number;
    rateLimitRate: number;
  };
  requestsByDay: Array<{ date: string; count: number }>;
  topApis: Array<{ apiUrl: string; count: number }>;
  topIps: Array<{ ipAddress: string; count: number }>;
}

export default function Analytics({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?tenantId=${tenantId}&days=${days}`);
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Requests
            </h3>
            <Activity className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data.summary.totalRequests.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Successful
            </h3>
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data.summary.successfulRequests.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Rate Limited
            </h3>
            <AlertTriangle className="text-orange-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data.summary.rateLimitedRequests.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Rate Limit %
            </h3>
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {data.summary.rateLimitRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Requests Over Time Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Requests Over Time
        </h3>
        {data.requestsByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.requestsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-600 dark:text-slate-400 py-12">
            No data available for the selected time range
          </p>
        )}
      </div>

      {/* Top APIs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Top API Endpoints
        </h3>
        {data.topApis.length > 0 ? (
          <div className="space-y-3">
            {data.topApis.map((api, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {api.apiUrl}
                  </p>
                </div>
                <span className="ml-4 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                  {api.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-600 dark:text-slate-400 py-8">
            No API requests recorded
          </p>
        )}
      </div>

      {/* Top IPs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Top IP Addresses
        </h3>
        {data.topIps.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topIps.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="ipAddress" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#3B82F6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-600 dark:text-slate-400 py-8">
            No IP data available
          </p>
        )}
      </div>
    </div>
  );
}
