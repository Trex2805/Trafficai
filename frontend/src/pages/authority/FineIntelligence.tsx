import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import {
  DataTable,
  LoadingState,
  ChartCard,
  KpiCard,
  StatusBadge,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { Violation } from '../../types';

export const FineIntelligence: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const data = await apiService.getAllViolations();
        setViolations(data);
      } catch (error) {
        console.error('Error fetching violations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  if (loading) return <LoadingState message="Loading Fine Intelligence..." />;

  // Calculate statistics
  const finesGenerated = violations.filter((v) => v.fine).length;
  const totalAmount = violations
    .filter((v) => v.fine)
    .reduce((sum, v) => sum + (v.fine?.amount || 0), 0);
  const pendingFines = violations.filter((v) => v.fine?.status === 'pending').length;
  const paidFines = violations.filter((v) => v.fine?.status === 'paid').length;

  // Fine status data
  const finesByStatus = [
    {
      status: 'Generated',
      count: violations.filter((v) => v.fine?.status === 'generated').length,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      status: 'Pending',
      count: pendingFines,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
    {
      status: 'Paid',
      count: paidFines,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      status: 'Disputed',
      count: violations.filter((v) => v.fine?.status === 'disputed').length,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
  ];

  const fineData = violations
    .filter((v) => v.fine)
    .map((v) => ({
      fineId: v.fine!.id,
      violationId: v.id,
      numberPlate: v.numberPlate,
      violationType: v.type,
      amount: v.fine!.amount,
      status: v.fine!.status,
      generatedAt: v.fine!.generatedAt,
      dueDate: v.fine!.dueDate,
    }))
    .sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );

  const getStatusBadgeType = (status: string) => {
    switch (status) {
      case 'generated':
        return 'pending' as const;
      case 'pending':
        return 'pending' as const;
      case 'paid':
        return 'verified' as const;
      case 'disputed':
        return 'rejected' as const;
      default:
        return 'pending' as const;
    }
  };

  const averageFineAmount =
    finesGenerated > 0 ? Math.round(totalAmount / finesGenerated) : 0;
  const collectionRate =
    finesGenerated > 0
      ? ((paidFines / finesGenerated) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Fine Intelligence</h1>
        <p className="text-slate-400">
          Monitor fine generation, collection, and payment status
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Fines"
          value={finesGenerated.toLocaleString()}
          icon={<DollarSign />}
          trend={{ value: 12.5, isPositive: true }}
        />
        <KpiCard
          title="Total Revenue"
          value={`₹${(totalAmount / 100000).toFixed(1)}L`}
          subtitle="Generated today"
          icon={<TrendingUp />}
        />
        <KpiCard
          title="Avg Fine Amount"
          value={`₹${averageFineAmount}`}
          icon={<DollarSign />}
        />
        <KpiCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          subtitle={`${paidFines} paid`}
          icon={<TrendingUp />}
          trend={{ value: 3.2, isPositive: true }}
        />
      </div>

      {/* Fine Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {finesByStatus.map((item) => (
          <div
            key={item.status}
            className={`card text-center ${item.bgColor} border border-white/10`}
          >
            <p className="text-sm text-slate-300 mb-2">{item.status}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Fine Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Fine Distribution by Status */}
        <ChartCard title="Fines by Status">
          <div className="space-y-3">
            {finesByStatus.map((item) => {
              const percentage =
                finesGenerated > 0 ? ((item.count / finesGenerated) * 100).toFixed(1) : '0.0';
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{item.status}</span>
                    <span className={`text-sm font-bold ${item.color}`}>
                      {item.count}
                      <span className="text-xs text-slate-400 ml-1">
                        ({percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${item.color.replace('text-', 'bg-')} h-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Revenue Summary */}
        <ChartCard title="Revenue Summary">
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400">
                ₹{(totalAmount / 100000).toFixed(1)}L
              </p>
              <p className="text-xs text-slate-500 mt-2">
                From {finesGenerated} fines generated
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Collected</p>
                <p className="text-lg font-bold text-green-400">
                  ₹{((paidFines * averageFineAmount) / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Pending</p>
                <p className="text-lg font-bold text-amber-400">
                  ₹{((pendingFines * averageFineAmount) / 100000).toFixed(1)}L
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Fine Table */}
      <ChartCard title="Fine Records">
        <DataTable
          columns={[
            {
              key: 'fineId',
              label: 'Fine ID',
              width: '12%',
              render: (value) => (
                <span className="text-accent-blue font-semibold">{value}</span>
              ),
            },
            {
              key: 'numberPlate',
              label: 'Vehicle',
              width: '12%',
              render: (value) => <span className="text-amber-400 font-semibold">{value}</span>,
            },
            {
              key: 'violationType',
              label: 'Violation',
              width: '18%',
              render: (value) =>
                value.replace(/_/g, ' ').toUpperCase(),
            },
            {
              key: 'amount',
              label: 'Amount',
              width: '10%',
              render: (value) => (
                <span className="font-semibold text-green-400">₹{value}</span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '12%',
              render: (value) => (
                <StatusBadge status={getStatusBadgeType(value)}>
                  {value.toUpperCase()}
                </StatusBadge>
              ),
            },
            {
              key: 'generatedAt',
              label: 'Generated',
              width: '14%',
              render: (value) =>
                new Date(value).toLocaleDateString(),
            },
            {
              key: 'dueDate',
              label: 'Due Date',
              width: '14%',
              render: (value) =>
                new Date(value).toLocaleDateString(),
            },
            {
              key: 'fineId',
              label: 'Action',
              width: '8%',
              render: () => (
                <button className="text-accent-blue hover:text-primary-400 text-sm font-semibold">
                  Details
                </button>
              ),
            },
          ]}
          data={fineData}
          rowKey="fineId"
        />
      </ChartCard>

      {/* Important Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
          <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">Fine Generation:</p>
            <p className="text-sm text-blue-300/80">
              Fines can only be generated after human verification of violations. All fines are
              logged with timestamps and officer IDs for accountability.
            </p>
          </div>
        </div>

        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-3">
          <AlertCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-green-300 mb-1">Payment Tracking:</p>
            <p className="text-sm text-green-300/80">
              Monitor payment status and follow up on pending fines. Disputed fines require
              review and officer approval before closure.
            </p>
          </div>
        </div>
      </div>

      {/* Collection Analytics */}
      <ChartCard title="Collection Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Avg Days to Collect',
              value: '8.5',
              unit: 'days',
            },
            {
              label: 'Overdue Fines',
              value: Math.floor(pendingFines * 0.15),
              unit: 'fines',
            },
            {
              label: 'Disputed Cases',
              value: violations.filter((v) => v.fine?.status === 'disputed')
                .length,
              unit: 'cases',
            },
            {
              label: 'Collection Efficiency',
              value: collectionRate,
              unit: '%',
            },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600"
            >
              <p className="text-2xl font-bold text-accent-blue">{metric.value}</p>
              <p className="text-xs text-slate-400 mt-1">{metric.label}</p>
              <p className="text-xs text-slate-500">{metric.unit}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
