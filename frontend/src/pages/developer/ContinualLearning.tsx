import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Database, CheckCircle, AlertCircle } from 'lucide-react';
import {
  KpiCard,
  ChartCard,
  LoadingState,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import {
  ContinualLearningStats,
  TrainingHistory,
  Model,
} from '../../types';

export const ContinualLearning: React.FC = () => {
  const [stats, setStats] = useState<ContinualLearningStats | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, historyData, modelData] = await Promise.all([
          apiService.getContinualLearningStats(),
          apiService.getTrainingHistory(),
          apiService.getActiveModel(),
        ]);
        setStats(statsData);
        setTrainingHistory(historyData);
        setActiveModel(modelData);
      } catch (error) {
        console.error('Error fetching continual learning data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return <LoadingState message="Loading Continual Learning Data..." />;
  if (!stats)
    return (
      <div className="text-center text-slate-400">Failed to load data</div>
    );

  const trainingData = trainingHistory.map((h) => ({
    date: new Date(h.date).toLocaleDateString(),
    accuracy: h.accuracy,
    precision: h.precision,
    recall: h.recall,
    f1: h.f1,
  }));

  const pipelineStages = [
    {
      name: 'New Data',
      value: stats.newSamples,
      icon: '📥',
      color: 'from-blue-600 to-blue-700',
    },
    {
      name: 'AI Detection',
      value: 'Processing',
      icon: '🤖',
      color: 'from-cyan-600 to-cyan-700',
    },
    {
      name: 'Human Verification',
      value: stats.verifiedSamples,
      icon: '✓',
      color: 'from-green-600 to-green-700',
    },
    {
      name: 'Hard Samples',
      value: stats.hardSamples,
      icon: '⚠️',
      color: 'from-amber-600 to-amber-700',
    },
    {
      name: 'Training Dataset',
      value: stats.trainingDataset,
      icon: '📊',
      color: 'from-purple-600 to-purple-700',
    },
    {
      name: 'Model Update',
      value: '+2.3%',
      icon: '📈',
      color: 'from-pink-600 to-pink-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Continual Learning Pipeline
        </h1>
        <p className="text-slate-400">
          Monitor the continuous improvement cycle of AI models through verified
          data feedback
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="New Samples"
          value={stats.newSamples.toLocaleString()}
          subtitle="This cycle"
          icon={<Database />}
        />
        <KpiCard
          title="Verified Samples"
          value={stats.verifiedSamples.toLocaleString()}
          subtitle="Ready for training"
          icon={<CheckCircle />}
          trend={{ value: 15.2, isPositive: true }}
        />
        <KpiCard
          title="Hard Samples"
          value={stats.hardSamples.toLocaleString()}
          subtitle="Need attention"
          icon={<AlertCircle />}
        />
        <KpiCard
          title="Model Improvement"
          value={`+${stats.modelImprovement}%`}
          subtitle="Last training run"
          icon={<TrendingUp />}
          trend={{ value: 0.8, isPositive: true }}
        />
      </div>

      {/* Pipeline Visualization */}
      <ChartCard title="Learning Pipeline Flow">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {pipelineStages.map((stage, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`bg-gradient-to-br ${stage.color} rounded-lg p-4 text-center border border-white/10 hover:border-white/30 transition-colors`}
                >
                  <p className="text-2xl mb-2">{stage.icon}</p>
                  <p className="text-xs text-white/80 mb-1 font-medium">
                    {stage.name}
                  </p>
                  <p className="text-lg font-bold text-white">
                    {typeof stage.value === 'number'
                      ? stage.value.toLocaleString()
                      : stage.value}
                  </p>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 transform -translate-y-1/2 text-white/40 text-2xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline Description */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-300">
              <strong>Workflow:</strong> Raw traffic data → AI Detection → Human
              Verification → Hard Sample Analysis → Training Dataset Compilation
              → Model Retraining → Performance Validation → Live Deployment
            </p>
          </div>
        </div>
      </ChartCard>

      {/* Training History Chart */}
      <ChartCard title="Model Performance Over Time">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={trainingData}>
            <defs>
              <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="#06b6d4"
              fillOpacity={1}
              fill="url(#colorAccuracy)"
            />
            <Line
              type="monotone"
              dataKey="precision"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="recall"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="f1"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Learning Cycle Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Cycle Stats */}
        <ChartCard title="Current Learning Cycle">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Verification Rate</span>
                <span className="text-sm font-bold text-accent-blue">
                  {(
                    (stats.verifiedSamples / stats.newSamples) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                  style={{
                    width: `${(stats.verifiedSamples / stats.newSamples) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Hard Sample Ratio</span>
                <span className="text-sm font-bold text-amber-400">
                  {(
                    (stats.hardSamples / stats.verifiedSamples) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all"
                  style={{
                    width: `${(stats.hardSamples / stats.verifiedSamples) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <p className="text-xs text-slate-400 mb-2">Training Dataset</p>
              <p className="text-2xl font-bold text-accent-blue">
                {stats.trainingDataset.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                samples ready for model training
              </p>
            </div>
          </div>
        </ChartCard>

        {/* Active Model Info */}
        {activeModel && (
          <ChartCard title="Active Model Details">
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Model Name</p>
                <p className="text-lg font-bold text-white">
                  {activeModel.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Accuracy</p>
                  <p className="text-xl font-bold text-accent-blue">
                    {activeModel.metrics.accuracy.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">F1 Score</p>
                  <p className="text-xl font-bold text-green-400">
                    {activeModel.metrics.f1.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-white">
                  {new Date(activeModel.updatedAt).toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/50">
                <p className="text-xs text-green-400 font-semibold">
                  ✓ Live in Production
                </p>
              </div>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Improvement Timeline */}
      <ChartCard title="Model Improvement Timeline">
        <div className="space-y-3">
          {trainingHistory.slice().reverse().map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-accent-blue/20 rounded-full flex items-center justify-center">
                  <span className="text-accent-blue text-lg">📊</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {new Date(entry.date).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-400">
                  Accuracy: {entry.accuracy.toFixed(1)}% • F1: {entry.f1.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                {idx > 0 && (
                  <p
                    className={`text-sm font-semibold ${
                      entry.accuracy >
                      trainingHistory[trainingHistory.length - 1 - idx].accuracy
                        ? 'text-green-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {(
                      entry.accuracy -
                      trainingHistory[trainingHistory.length - 1 - idx].accuracy
                    ).toFixed(2)}
                    %
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
