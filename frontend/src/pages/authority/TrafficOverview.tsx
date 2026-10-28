import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, Camera, CheckCircle, Clock } from 'lucide-react';
import {
  KpiCard,
  ChartCard,
  LoadingState,
  StatusBadge,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { AuthorityDashboardData, ViolationByType } from '../../types';

export const TrafficOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AuthorityDashboardData | null>(
    null
  );
  const [violationsByType, setViolationsByType] = useState<ViolationByType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboard, violations] = await Promise.all([
          apiService.getAuthorityDashboard(),
          apiService.getViolationsByType(),
        ]);
        setDashboardData(dashboard);
        setViolationsByType(violations);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Traffic Dashboard..." />;
  if (!dashboardData)
    return <div className="text-center text-slate-400">Failed to load data</div>;

  const violationPieData = violationsByType.map((v) => ({
    name: v.type
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    value: v.count,
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

  const statusStats = [
    {
      label: 'Verified Violations',
      count: Math.floor(dashboardData.violationsToday * 0.85),
      icon: <CheckCircle />,
      color: 'from-green-600 to-emerald-600',
    },
    {
      label: 'Pending Review',
      count: dashboardData.pendingReviews,
      icon: <Clock />,
      color: 'from-amber-600 to-orange-600',
    },
    {
      label: 'Rejected',
      count: Math.floor(dashboardData.violationsToday * 0.15),
      icon: <AlertCircle />,
      color: 'from-red-600 to-rose-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Live Cameras"
          value={`${dashboardData.liveCameras}/${dashboardData.totalCameras}`}
          icon={<Camera />}
          trend={{ value: 0, isPositive: true }}
        />
        <KpiCard
          title="Violations Today"
          value={dashboardData.violationsToday.toLocaleString()}
          icon={<AlertCircle />}
          trend={{ value: 8.5, isPositive: false }}
        />
        <KpiCard
          title="Pending Reviews"
          value={dashboardData.pendingReviews.toLocaleString()}
          icon={<Clock />}
        />
        <KpiCard
          title="Fines Generated"
          value={`₹${(dashboardData.fineAmount / 100000).toFixed(1)}L`}
          subtitle={`${dashboardData.finesGenerated} fines`}
          icon={<CheckCircle />}
          trend={{ value: 12.3, isPositive: true }}
        />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusStats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white border border-white/10`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.count.toLocaleString()}</p>
              </div>
              <div className="text-3xl opacity-50">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violations by Type */}
        <ChartCard title="Violations by Type">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={violationPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Recent Violations */}
        <ChartCard title="Recent Violations">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dashboardData.recentViolations.map((violation) => (
              <div
                key={violation.id}
                className="p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {violation.numberPlate}
                    </p>
                    <p className="text-xs text-slate-400">
                      {violation.type.replace(/_/g, ' ')} •{' '}
                      {new Date(violation.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={violation.status === 'verified' ? 'verified' : 'pending'}>
                      {violation.status === 'verified' ? 'Verified' : 'Pending'}
                    </StatusBadge>
                    <p className="text-xs text-slate-400 mt-1">
                      {violation.aiAnalysis.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Violations Summary Table */}
      <ChartCard title="Violation Summary by Type">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Violation Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Count
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Percentage
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {violationsByType.map((violation) => (
                <tr key={violation.type} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <span className="capitalize text-white font-medium">
                      {violation.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-accent-blue font-semibold">
                    {violation.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-accent-blue to-cyan-500 h-full"
                          style={{ width: `${violation.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-400">
                        {violation.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-green-400">↑ 5.2%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Avg Confidence',
            value: '94.2%',
            color: 'text-accent-blue',
          },
          {
            label: 'False Positives',
            value: '2.8%',
            color: 'text-amber-400',
          },
          {
            label: 'Resolution Rate',
            value: '87.3%',
            color: 'text-green-400',
          },
          {
            label: 'Processing Time',
            value: '156ms',
            color: 'text-slate-400',
          },
        ].map((stat, idx) => (
          <div key={idx} className="card text-center">
            <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
