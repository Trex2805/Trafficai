import React from 'react';
import clsx from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}) => {
  return (
    <div className={clsx('card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
        {icon && <div className="text-accent-blue text-2xl">{icon}</div>}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={clsx(
              'text-xs font-semibold',
              trend.isPositive ? 'text-status-success' : 'text-status-error'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">vs yesterday</span>
        </div>
      )}
    </div>
  );
};

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'pending' | 'verified' | 'rejected' | 'success' | 'error';
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className,
}) => {
  const statusClasses = {
    online: 'status-online',
    offline: 'bg-red-500/20 text-red-400',
    warning: 'status-warning',
    pending: 'status-pending',
    verified: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    success: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={clsx('status-badge', statusClasses[status], className)}>
      {children}
    </span>
  );
};

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-accent-blue rounded-full"></div>
        </div>
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        {icon && <div className="text-4xl text-slate-600 mb-4">{icon}</div>}
        <p className="text-slate-300 font-medium mb-1">{title}</p>
        {description && <p className="text-slate-500 text-sm">{description}</p>}
      </div>
    </div>
  );
};

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-4xl text-status-error mb-4">⚠️</div>
        <p className="text-slate-300 font-medium mb-1">{title}</p>
        {message && <p className="text-slate-500 text-sm mb-4">{message}</p>}
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

interface DataTableProps {
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  data: any[];
  rowKey: string;
  onRowClick?: (row: any) => void;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  rowKey,
  onRowClick,
  className,
}) => {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-semibold text-slate-300"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <EmptyState title="No data available" />
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row[rowKey]}
                className={clsx(
                  'border-b border-slate-700 hover:bg-slate-700/50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <div className={clsx('card', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={clsx(
          'bg-slate-800 border border-slate-700 rounded-lg p-6 w-full',
          sizeClasses[size]
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="mb-6">{children}</div>
        {footer && <div className="flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={clsx(
            'px-3 py-2 rounded text-sm',
            page === currentPage
              ? 'bg-primary-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600'
          )}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm"
      >
        Next
      </button>
    </div>
  );
};
