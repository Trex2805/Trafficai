import React, { useState, useEffect } from 'react';
import { DollarSign, Eye, Check, X } from 'lucide-react';
import {
  DataTable,
  LoadingState,
  Modal,
  ChartCard,
  StatusBadge,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { PlateReviewPanel } from '../../components/authority/PlateReviewPanel';
import { HelmetReviewPanel } from '../../components/authority/HelmetReviewPanel';
import { Violation, VerificationStatus } from '../../types';

export const ViolationsAndReviews: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '' as VerificationStatus | '',
  });

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const data = await apiService.getAllViolations(
          filters.type || filters.status
            ? {
                type: filters.type || undefined,
                status: filters.status || undefined,
              }
            : undefined
        );
        setViolations(data);
        setFilteredViolations(data);
      } catch (error) {
        console.error('Error fetching violations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, [filters]);

  const handleViewDetails = (violation: Violation) => {
    setSelectedViolation(violation);
    setShowModal(true);
  };

  const handleVerify = async (violation: Violation, verified: boolean) => {
    const result = await apiService.verifyViolation(
      violation.id,
      verified,
      verified ? 'Confirmed by officer' : 'False detection'
    );
    if (result) {
      setViolations(violations.map((v) => (v.id === violation.id ? result : v)));
      setSelectedViolation(result);
    }
  };

  const handleGenerateFine = async (violation: Violation) => {
    if (violation.humanVerification?.verified) {
      const result = await apiService.generateFine(violation.id);
      if (result) {
        setViolations(violations.map((v) => (v.id === violation.id ? result : v)));
        setSelectedViolation(result);
      }
    }
  };

  const violationTypes = [
    'no_helmet',
    'triple_riding',
    'seatbelt_violation',
    'signal_jumping',
    'other',
  ];
  const statuses: VerificationStatus[] = [
    'ai_detected',
    'pending_review',
    'verified',
    'rejected',
    'fine_generated',
  ];

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'ai_detected':
        return 'bg-blue-500/20 text-blue-400';
      case 'pending_review':
        return 'bg-amber-500/20 text-amber-400';
      case 'verified':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'fine_generated':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Map domain verification statuses onto the StatusBadge palette
  const getBadgeStatus = (
    status: VerificationStatus
  ): 'pending' | 'verified' | 'rejected' | 'success' => {
    switch (status) {
      case 'verified':
        return 'verified';
      case 'rejected':
        return 'rejected';
      case 'fine_generated':
        return 'success';
      default:
        return 'pending';
    }
  };

  if (loading) return <LoadingState message="Loading Violations..." />;

  const stats = {
    total: violations.length,
    aiDetected: violations.filter((v) => v.status === 'ai_detected').length,
    pendingReview: violations.filter((v) => v.status === 'pending_review').length,
    verified: violations.filter((v) => v.status === 'verified').length,
    rejected: violations.filter((v) => v.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Violations & Reviews</h1>
        <p className="text-slate-400">
          Review and verify detected traffic violations before enforcement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <p className="text-sm text-slate-400">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">AI Detected</p>
          <p className="text-2xl font-bold text-blue-400">{stats.aiDetected}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pendingReview}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Verified</p>
          <p className="text-2xl font-bold text-green-400">{stats.verified}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <ChartCard title="Filters">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Violation Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            >
              <option value="">All Types</option>
              {violationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as VerificationStatus | '',
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ChartCard>

      {/* Real plate review queue backed by the FastAPI/MongoDB API */}
      <PlateReviewPanel />

      <HelmetReviewPanel />

      {/* Violations Table */}
      <ChartCard title="Violation Review Queue">
        <DataTable
          columns={[
            {
              key: 'id',
              label: 'Violation ID',
              width: '12%',
              render: (value) => <span className="text-accent-blue font-semibold">{value}</span>,
            },
            {
              key: 'timestamp',
              label: 'Time',
              width: '12%',
              render: (value) =>
                new Date(value).toLocaleTimeString(),
            },
            {
              key: 'cameraId',
              label: 'Camera',
              width: '10%',
            },
            {
              key: 'numberPlate',
              label: 'Vehicle',
              width: '12%',
              render: (value) => (
                <span className="font-semibold text-amber-400">{value}</span>
              ),
            },
            {
              key: 'type',
              label: 'Violation',
              width: '15%',
              render: (value) =>
                value.replace(/_/g, ' ').toUpperCase(),
            },
            {
              key: 'aiAnalysis',
              label: 'Confidence',
              width: '10%',
              render: (value) => (
                <span className="text-accent-blue font-semibold">
                  {value.confidence.toFixed(1)}%
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '15%',
              render: (value: VerificationStatus) => (
                <StatusBadge status={getBadgeStatus(value)} className={getStatusColor(value)}>
                  {value.replace(/_/g, ' ').toUpperCase()}
                </StatusBadge>
              ),
            },
            {
              key: 'id',
              label: 'Action',
              width: '14%',
              render: (_value, row) => (
                <button
                  onClick={() => handleViewDetails(row)}
                  className="flex items-center gap-1 px-3 py-1 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded text-sm font-medium transition-colors"
                >
                  <Eye size={14} />
                  Review
                </button>
              ),
            },
          ]}
          data={filteredViolations}
          rowKey="id"
          onRowClick={handleViewDetails}
        />
      </ChartCard>

      {/* Violation Details Modal */}
      {selectedViolation && (
        <Modal
          isOpen={showModal}
          title="Violation Details & Verification"
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            selectedViolation.status === 'verified' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleGenerateFine(selectedViolation)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium"
                >
                  <DollarSign size={18} />
                  Generate Fine
                </button>
              </div>
            ) : selectedViolation.status !== 'rejected' &&
              selectedViolation.status !== 'fine_generated' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleVerify(selectedViolation, false);
                    setShowModal(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  <X size={18} />
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleVerify(selectedViolation, true);
                    setShowModal(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  <Check size={18} />
                  Verify
                </button>
              </div>
            ) : null
          }
        >
          <div className="space-y-6">
            {/* Evidence Image */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-3">Evidence</p>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center border border-slate-700">
                <div className="text-center">
                  <div className="text-6xl mb-3">📷</div>
                  <p className="text-slate-400">Evidence Image</p>
                </div>
                {/* Mock bounding boxes overlay */}
                <div className="absolute inset-4 border-2 border-red-500/50 rounded-lg"></div>
                <div className="absolute top-6 left-6 px-2 py-1 bg-red-600/80 text-white text-xs font-bold rounded">
                  Vehicle
                </div>
                <div className="absolute bottom-6 left-6 px-2 py-1 bg-amber-600/80 text-white text-xs font-bold rounded">
                  Plate: {selectedViolation.numberPlate}
                </div>
              </div>
            </div>

            {/* Violation Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Violation Type</p>
                <p className="text-sm font-semibold text-white">
                  {selectedViolation.type.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Number Plate</p>
                <p className="text-sm font-semibold text-amber-400">
                  {selectedViolation.numberPlate}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Location</p>
                <p className="text-sm font-semibold text-white">
                  {selectedViolation.location.address}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Timestamp</p>
                <p className="text-sm font-semibold text-white">
                  {new Date(selectedViolation.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-300 mb-3">AI Analysis</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Confidence:</span>
                  <span className="text-sm font-bold text-accent-blue">
                    {selectedViolation.aiAnalysis.confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Recommendation:</span>
                  <span className="text-sm font-bold text-amber-400">
                    {selectedViolation.aiAnalysis.recommendation}
                  </span>
                </div>
              </div>
            </div>

            {/* Human Verification */}
            {selectedViolation.humanVerification ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-300 mb-3">Human Verification</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Status:</span>
                    <span
                      className={`text-sm font-bold ${
                        selectedViolation.humanVerification.verified
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedViolation.humanVerification.verified
                        ? 'VERIFIED'
                        : 'REJECTED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-300">Officer Notes:</span>
                    <p className="text-sm text-slate-300 mt-1">
                      {selectedViolation.humanVerification.notes}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-300">
                  Pending human verification
                </p>
              </div>
            )}

            {/* Fine Status */}
            {selectedViolation.fine && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-300 mb-3">Fine Generated</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Fine Amount:</span>
                    <span className="text-sm font-bold text-purple-400">
                      ₹{selectedViolation.fine.amount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Status:</span>
                    <span className="text-sm font-bold text-purple-400">
                      {selectedViolation.fine.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
