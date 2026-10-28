import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  DataTable,
  LoadingState,
  ChartCard,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { SystemLog, LogSeverity } from '../../types';

export const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    service: '',
    severity: '' as LogSeverity | '',
  });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiService.getSystemLogs(
          filters.service || filters.severity
            ? {
                service: filters.service || undefined,
                severity: filters.severity || undefined,
              }
            : undefined
        );
        setLogs(data);
        setFilteredLogs(data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-red-400" size={16} />;
      case 'error':
        return <AlertTriangle className="text-orange-400" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-amber-400" size={16} />;
      default:
        return <Info className="text-blue-400" size={16} />;
    }
  };

  const getSeverityColor = (severity: LogSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'error':
        return 'bg-orange-500/20 text-orange-400';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'bg-green-500/20 text-green-400'
      : 'bg-red-500/20 text-red-400';
  };

  const services = Array.from(new Set(logs.map((l) => l.service)));
  const severities: LogSeverity[] = ['info', 'warning', 'error', 'critical'];

  if (loading) return <LoadingState message="Loading System Logs..." />;

  const logStats = {
    total: logs.length,
    critical: logs.filter((l) => l.severity === 'critical').length,
    errors: logs.filter((l) => l.severity === 'error').length,
    warnings: logs.filter((l) => l.severity === 'warning').length,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Logs</h1>
        <p className="text-slate-400">
          Monitor system events, errors, and operational status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-accent-blue">{logStats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{logStats.critical}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Errors</p>
          <p className="text-2xl font-bold text-orange-400">{logStats.errors}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-amber-400">{logStats.warnings}</p>
        </div>
      </div>

      {/* Filters */}
      <ChartCard title="Filters">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Service
            </label>
            <select
              value={filters.service}
              onChange={(e) =>
                setFilters({ ...filters, service: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  severity: e.target.value as LogSeverity | '',
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            >
              <option value="">All Severities</option>
              {severities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ChartCard>

      {/* Logs Table */}
      <ChartCard title="Event Log">
        <DataTable
          columns={[
            {
              key: 'timestamp',
              label: 'Timestamp',
              width: '18%',
              render: (value) =>
                new Date(value).toLocaleString(),
            },
            {
              key: 'service',
              label: 'Service',
              width: '18%',
            },
            {
              key: 'event',
              label: 'Event',
              width: '28%',
            },
            {
              key: 'severity',
              label: 'Severity',
              width: '12%',
              render: (value: LogSeverity) => (
                <div className="flex items-center gap-2">
                  {getSeverityIcon(value)}
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(
                      value
                    )}`}
                  >
                    {value.toUpperCase()}
                  </span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '12%',
              render: (value) => (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded capitalize ${getStatusColor(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: 'details',
              label: 'Details',
              width: '12%',
              render: (value) => (
                <span className="text-xs text-slate-400">
                  {value ? value.substring(0, 30) + '...' : '-'}
                </span>
              ),
            },
          ]}
          data={filteredLogs}
          rowKey="id"
        />
      </ChartCard>

      {/* Log Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Events by Severity">
          <div className="space-y-3">
            {[
              {
                severity: 'Info',
                count: logs.filter((l) => l.severity === 'info').length,
                color: 'bg-blue-500',
              },
              {
                severity: 'Warning',
                count: logs.filter((l) => l.severity === 'warning').length,
                color: 'bg-amber-500',
              },
              {
                severity: 'Error',
                count: logs.filter((l) => l.severity === 'error').length,
                color: 'bg-orange-500',
              },
              {
                severity: 'Critical',
                count: logs.filter((l) => l.severity === 'critical').length,
                color: 'bg-red-500',
              },
            ].map((item) => {
              const percentage = logs.length > 0 ? (item.count / logs.length) * 100 : 0;
              return (
                <div key={item.severity}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{item.severity}</span>
                    <span className="text-sm font-bold text-white">
                      {item.count}
                      <span className="text-xs text-slate-400 ml-1">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${item.color} h-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Events by Service">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {services
              .map((service) => ({
                service,
                count: logs.filter((l) => l.service === service).length,
              }))
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <div
                  key={item.service}
                  className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                >
                  <span className="text-sm text-slate-300">{item.service}</span>
                  <span className="text-sm font-bold text-accent-blue">
                    {item.count}
                  </span>
                </div>
              ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Critical Events */}
      {logStats.critical > 0 && (
        <ChartCard title="Recent Critical Events">
          <div className="space-y-2">
            {logs
              .filter((l) => l.severity === 'critical')
              .slice(0, 5)
              .map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={16} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{log.event}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {log.service} •{' '}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.details && (
                        <p className="text-xs text-red-400 mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};
