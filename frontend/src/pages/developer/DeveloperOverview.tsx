import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { KpiCard, ChartCard, LoadingState } from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { DeveloperDashboardData } from '../../types';

export const DeveloperOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DeveloperDashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiService.getDeveloperDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Developer Dashboard..." />;
  if (!dashboardData) return <div className="text-center text-slate-400">Failed to load data</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Model Accuracy"
          value={`${dashboardData.modelAccuracy}%`}
          icon={<TrendingUp />}
          trend={{ value: 2.3, isPositive: true }}
        />
        <KpiCard
          title="Active Model"
          value={dashboardData.activeModel}
          subtitle="v2.4 deployed"
          icon={<Zap />}
        />
        <KpiCard
          title="Learning Samples"
          value={dashboardData.learningSamples.toLocaleString()}
          subtitle="Training dataset"
          icon={<Database />}
        />
        <KpiCard
          title="API Health"
          value={`${dashboardData.apiHealth}%`}
          icon={<Activity />}
          trend={{ value: 0.02, isPositive: true }}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Trend */}
        <ChartCard title="Model Performance Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.modelPerformanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="precision"
                stroke="#10b981"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="recall"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="f1"
                stroke="#8b5cf6"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* System Health */}
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold text-white">System Health</h3>
          <div className="space-y-3">
            {dashboardData.systemHealth.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getStatusColor(service.status),
                    }}
                  ></div>
                  <div>
                    <p className="text-sm font-medium text-white">{service.name}</p>
                    <p className="text-xs text-slate-400">
                      {service.uptime.toFixed(2)}% uptime
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded capitalize"
                  style={{
                    backgroundColor:
                      service.status === 'operational'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : service.status === 'warning'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                    color:
                      service.status === 'operational'
                        ? '#10b981'
                        : service.status === 'warning'
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continual Learning Pipeline */}
      <ChartCard title="Continual Learning Pipeline">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'New Data', status: 'active', value: '2,840' },
            { label: 'Detection', status: 'active', value: 'Processing' },
            { label: 'Verification', status: 'active', value: '2,210' },
            { label: 'Training', status: 'active', value: '18,420' },
            { label: 'Deployment', status: 'active', value: 'v2.4' },
          ].map((stage, idx) => (
            <div key={idx} className="relative">
              <div className="bg-slate-700 rounded-lg p-4 text-center border border-slate-600">
                <p className="text-xs text-slate-400 mb-2">{stage.label}</p>
                <p className="text-lg font-bold text-accent-blue">{stage.value}</p>
                <div className="mt-2">
                  {stage.status === 'active' && (
                    <div className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              {idx < 4 && (
                <div className="hidden md:block absolute -right-2 top-1/2 transform -translate-y-1/2 text-accent-blue">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Recent Events */}
      <ChartCard title="Recent Technical Events">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dashboardData.recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <div>
                {log.severity === 'critical' ? (
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                ) : log.severity === 'warning' ? (
                  <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                ) : (
                  <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{log.event}</p>
                    <p className="text-xs text-slate-400">
                      {log.service} •{' '}
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      log.status === 'success'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
