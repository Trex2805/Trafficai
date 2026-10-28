import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Award, Zap } from 'lucide-react';
import {
  KpiCard,
  ChartCard,
  DataTable,
  LoadingState,
  StatusBadge,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { Model, ModelPerformanceClass } from '../../types';

export const ModelsAndPerformance: React.FC = () => {
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [performanceClasses, setPerformanceClasses] =
    useState<ModelPerformanceClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [model, models, classes] = await Promise.all([
          apiService.getActiveModel(),
          apiService.getAllModels(),
          apiService.getModelPerformanceClasses(),
        ]);
        setActiveModel(model);
        setAllModels(models);
        setPerformanceClasses(classes);
      } catch (error) {
        console.error('Error fetching model data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading Models..." />;
  if (!activeModel) return <div className="text-center text-slate-400">Failed to load models</div>;

  const metricsData = [
    { label: 'Accuracy', value: activeModel.metrics.accuracy },
    { label: 'Precision', value: activeModel.metrics.precision },
    { label: 'Recall', value: activeModel.metrics.recall },
    { label: 'F1 Score', value: activeModel.metrics.f1 },
    { label: 'mAP', value: activeModel.metrics.mAP },
    { label: 'Avg Confidence', value: activeModel.metrics.avgConfidence },
  ];

  const classPerformanceData = performanceClasses.map((c) => ({
    class: c.className,
    Precision: c.precision,
    Recall: c.recall,
    F1: c.f1,
    mAP: c.mAP,
  }));

  return (
    <div className="space-y-6">
      {/* Active Model Info */}
      <div className="card border-accent-blue/30">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {activeModel.name}
            </h2>
            <p className="text-slate-400">
              Version {activeModel.version} • Last Updated:{' '}
              {new Date(activeModel.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status="verified" className="capitalize">
            {activeModel.status}
          </StatusBadge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metricsData.map((metric) => (
            <div
              key={metric.label}
              className="bg-slate-700/50 rounded-lg p-4 text-center"
            >
              <p className="text-xs text-slate-400 mb-2">{metric.label}</p>
              <p className="text-2xl font-bold text-accent-blue">
                {metric.value.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Overall Accuracy"
          value={`${activeModel.metrics.accuracy.toFixed(1)}%`}
          icon={<TrendingUp />}
          trend={{ value: 1.5, isPositive: true }}
        />
        <KpiCard
          title="Precision"
          value={`${activeModel.metrics.precision.toFixed(1)}%`}
          icon={<Award />}
        />
        <KpiCard
          title="Model F1 Score"
          value={`${activeModel.metrics.f1.toFixed(1)}%`}
          icon={<Zap />}
        />
      </div>

      {/* Per-Class Performance */}
      <ChartCard title="Performance by Violation Class">
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={classPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="class" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                }}
              />
              <Legend />
              <Bar dataKey="Precision" fill="#06b6d4" />
              <Bar dataKey="Recall" fill="#10b981" />
              <Bar dataKey="F1" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>

          {/* Detailed Table */}
          <DataTable
            columns={[
              { key: 'className', label: 'Class', width: '25%' },
              {
                key: 'precision',
                label: 'Precision',
                render: (value) => `${value.toFixed(1)}%`,
              },
              {
                key: 'recall',
                label: 'Recall',
                render: (value) => `${value.toFixed(1)}%`,
              },
              { key: 'f1', label: 'F1', render: (value) => `${value.toFixed(1)}%` },
              { key: 'mAP', label: 'mAP', render: (value) => `${value.toFixed(1)}%` },
              { key: 'samples', label: 'Samples' },
            ]}
            data={performanceClasses}
            rowKey="className"
          />
        </div>
      </ChartCard>

      {/* Model Version History */}
      <ChartCard title="Model Version History">
        <div className="space-y-3">
          {allModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-white">{model.name}</p>
                  <StatusBadge status={model.status === 'active' ? 'verified' : 'pending'}>
                    {model.status}
                  </StatusBadge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Created:{' '}
                  {new Date(model.createdAt).toLocaleDateString()} • Training Time:{' '}
                  {model.trainingTime}s
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-accent-blue">
                  {model.metrics.accuracy.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">accuracy</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Model Deployment Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Deployment Status">
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Current Deployment</p>
              <p className="text-lg font-bold text-accent-blue mb-2">
                {activeModel.name} v{activeModel.version}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Live in Production</span>
              </div>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Last Update</p>
              <p className="text-lg font-bold text-white">
                {new Date(activeModel.updatedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {Math.floor(
                  (Date.now() - new Date(activeModel.updatedAt).getTime()) /
                    (1000 * 60 * 60)
                )}{' '}
                hours ago
              </p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Model Statistics">
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Total Classes</p>
              <p className="text-2xl font-bold text-accent-blue">
                {performanceClasses.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">violation types</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Total Training Samples</p>
              <p className="text-2xl font-bold text-accent-blue">
                {performanceClasses
                  .reduce((sum, c) => sum + c.samples, 0)
                  .toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">across all classes</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
