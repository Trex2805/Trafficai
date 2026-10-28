import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard, LoadingState } from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { DailyAnalytics, ViolationByType } from '../../types';

export const TrafficAnalytics: React.FC = () => {
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [violationsByType, setViolationsByType] = useState<ViolationByType[]>([]);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('7days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [daily, byType] = await Promise.all([
          apiService.getDailyAnalytics(),
          apiService.getViolationsByType(),
        ]);
        setDailyAnalytics(daily);
        setViolationsByType(byType);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <LoadingState message="Loading Analytics..." />;

  const chartData = dailyAnalytics.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    total: d.totalViolations,
    verified: d.verifiedViolations,
    rejected: d.rejectedViolations,
    fines: d.finesGenerated,
    amount: d.fineAmount / 100000, // Convert to lakhs
  }));

  const violationData = violationsByType.map((v) => ({
    name: v.type.replace(/_/g, ' ').toUpperCase(),
    value: v.count,
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

  const totalViolations = dailyAnalytics.reduce((sum, d) => sum + d.totalViolations, 0);
  const totalFines = dailyAnalytics.reduce((sum, d) => sum + d.finesGenerated, 0);
  const totalRevenue = dailyAnalytics.reduce((sum, d) => sum + d.fineAmount, 0);
  const avgVerificationRate =
    (
      (dailyAnalytics.reduce((sum, d) => sum + d.verifiedViolations, 0) /
        totalViolations) *
      100
    ).toFixed(1) || '0.0';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Traffic Analytics</h1>
          <p className="text-slate-400">
            Comprehensive traffic violation and enforcement analytics
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(['today', '7days', '30days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-accent-blue text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-400 mb-2">Total Violations</p>
          <p className="text-3xl font-bold text-white">
            {totalViolations.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Avg: {Math.round(totalViolations / dailyAnalytics.length)}/day
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-2">Fines Generated</p>
          <p className="text-3xl font-bold text-accent-blue">
            {totalFines.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {((totalFines / totalViolations) * 100).toFixed(1)}% of violations
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-green-400">
            ₹{(totalRevenue / 100000).toFixed(1)}L
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Avg: ₹{Math.round(totalRevenue / totalFines)}/fine
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-2">Verification Rate</p>
          <p className="text-3xl font-bold text-green-400">{avgVerificationRate}%</p>
          <p className="text-xs text-slate-500 mt-2">Human verified</p>
        </div>
      </div>

      {/* Violations Trend */}
      <ChartCard title="Violations Trend">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
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
              dataKey="total"
              stroke="#06b6d4"
              dot={false}
              strokeWidth={2}
              name="Total Violations"
            />
            <Line
              type="monotone"
              dataKey="verified"
              stroke="#10b981"
              dot={false}
              strokeWidth={2}
              name="Verified"
            />
            <Line
              type="monotone"
              dataKey="fines"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="Fines Generated"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Fines & Revenue */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Fines Generated">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                }}
              />
              <Bar dataKey="fines" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Revenue">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: '₹ in Lakhs', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                }}
              />
              <Bar dataKey="amount" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Violations by Type */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Violations by Type (Distribution)">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={violationData}
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

        <ChartCard title="Violation Type Details">
          <div className="space-y-3">
            {violationsByType
              .sort((a, b) => b.count - a.count)
              .map((violation, idx) => (
                <div key={idx} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {violation.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-accent-blue">
                      {violation.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-accent-blue to-cyan-500 h-full"
                      style={{ width: `${violation.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {violation.percentage.toFixed(1)}% of total
                  </p>
                </div>
              ))}
          </div>
        </ChartCard>
      </div>

      {/* Verification Analytics */}
      <ChartCard title="Verification & Rejection Analysis">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Daily Breakdown</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
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
                <Bar dataKey="verified" stackId="a" fill="#10b981" name="Verified" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Summary Statistics</h4>
            <div className="space-y-3">
              {[
                {
                  label: 'Total Verified',
                  value: dailyAnalytics.reduce((sum, d) => sum + d.verifiedViolations, 0),
                  color: 'text-green-400',
                },
                {
                  label: 'Total Rejected',
                  value: dailyAnalytics.reduce((sum, d) => sum + d.rejectedViolations, 0),
                  color: 'text-red-400',
                },
                {
                  label: 'Verification Rate',
                  value: `${avgVerificationRate}%`,
                  color: 'text-accent-blue',
                },
                {
                  label: 'False Positive Rate',
                  value: `${(100 - parseFloat(avgVerificationRate)).toFixed(1)}%`,
                  color: 'text-amber-400',
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{stat.label}</span>
                  <span className={`text-lg font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};
