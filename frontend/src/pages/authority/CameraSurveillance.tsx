import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import {
  ChartCard,
  LoadingState,
  StatusBadge,
} from '../../components/common/CommonComponents';
import { apiService } from '../../services/api';
import { Camera } from '../../types';

export const CameraSurveillance: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [surveillanceMode, setSurveillanceMode] = useState(false);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const data = await apiService.getAllCameras();
        setCameras(data);
      } catch (error) {
        console.error('Error fetching cameras:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  const toggleCamera = (cameraId: string) => {
    const newSelected = new Set(selectedCameras);
    if (newSelected.has(cameraId)) {
      newSelected.delete(cameraId);
    } else {
      newSelected.add(cameraId);
    }
    setSelectedCameras(newSelected);
  };

  const selectAll = () => {
    if (selectedCameras.size === cameras.length) {
      setSelectedCameras(new Set());
    } else {
      setSelectedCameras(new Set(cameras.map((c) => c.id)));
    }
  };

  const clearAll = () => {
    setSelectedCameras(new Set());
  };

  if (loading) return <LoadingState message="Loading Cameras..." />;

  const onlineCameras = cameras.filter((c) => c.status !== 'offline').length;
  const selectedCount = selectedCameras.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Camera Surveillance</h1>
        <p className="text-slate-400">
          Monitor live camera feeds and manage surveillance operations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Total Cameras</p>
          <p className="text-2xl font-bold text-white">{cameras.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Online</p>
          <p className="text-2xl font-bold text-green-400">{onlineCameras}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Offline</p>
          <p className="text-2xl font-bold text-red-400">
            {cameras.length - onlineCameras}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400 mb-1">Selected</p>
          <p className="text-2xl font-bold text-accent-blue">{selectedCount}</p>
        </div>
      </div>

      {/* Camera Controls */}
      <ChartCard title="Camera Selection & Controls">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={selectAll}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCameras.size === cameras.length
                  ? 'bg-accent-blue text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setSurveillanceMode(!surveillanceMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                surveillanceMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {surveillanceMode ? <Eye size={18} /> : <EyeOff size={18} />}
              {surveillanceMode ? 'Stop Surveillance' : 'Start Surveillance'}
            </button>
          </div>
        </div>
      </ChartCard>

      {/* Camera Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Available Cameras ({cameras.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((camera) => {
            const isSelected = selectedCameras.has(camera.id);
            const isOnline = camera.status !== 'offline';

            return (
              <div
                key={camera.id}
                className={`rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-accent-blue bg-slate-700/50'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
                onClick={() => toggleCamera(camera.id)}
              >
                {/* Camera Preview */}
                <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
                  {/* Status Indicator */}
                  <div
                    className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold z-10 ${
                      isOnline
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {isOnline ? (
                      <Wifi size={12} />
                    ) : (
                      <WifiOff size={12} />
                    )}
                    {camera.status.toUpperCase()}
                  </div>

                  {/* Live Indicator */}
                  {isOnline && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  )}

                  {/* Camera Feed Placeholder */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">📹</div>
                    <p className="text-slate-400 text-sm">{camera.resolution}</p>
                    {isOnline && (
                      <p className="text-slate-500 text-xs mt-1">
                        {camera.fps} FPS
                      </p>
                    )}
                  </div>

                  {/* Selection Overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-accent-blue/10 border-2 border-accent-blue flex items-center justify-center">
                      <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">✓</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {camera.id}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {camera.name}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCamera(camera.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Violations Today:</span>
                      <span className="text-accent-blue font-semibold">
                        {camera.violationCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Last Update:</span>
                      <span className="text-slate-500">
                        {new Date(camera.lastUpdate).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surveillance Grid */}
      {selectedCount > 0 && (
        <ChartCard
          title={`Multi-Camera Surveillance (${selectedCount} Selected)`}
        >
          <div className="space-y-4">
            {selectedCount <= 6 ? (
              <div
                className={`grid gap-4 ${
                  selectedCount === 1
                    ? 'grid-cols-1'
                    : selectedCount === 2
                      ? 'grid-cols-2'
                      : selectedCount <= 4
                        ? 'grid-cols-2 lg:grid-cols-2'
                        : 'grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {Array.from(selectedCameras).map((cameraId) => {
                  const camera = cameras.find((c) => c.id === cameraId);
                  if (!camera) return null;

                  return (
                    <div
                      key={cameraId}
                      className="rounded-lg border border-slate-600 overflow-hidden bg-slate-800"
                    >
                      {/* Live Feed */}
                      <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                        {/* Status Indicators */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold z-10 bg-red-600 text-white">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          LIVE
                        </div>

                        <div className="absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded bg-slate-700 text-slate-200">
                          {camera.id}
                        </div>

                        {/* FPS Counter */}
                        <div className="absolute bottom-2 right-2 text-xs font-semibold px-2 py-1 rounded bg-slate-900/80 text-slate-300">
                          {camera.fps} FPS
                        </div>

                        {/* Camera Feed Placeholder */}
                        <div className="text-center">
                          <div className="text-3xl mb-1">📹</div>
                          <p className="text-slate-400 text-xs">
                            {camera.resolution}
                          </p>
                        </div>
                      </div>

                      {/* Camera Details */}
                      <div className="p-3 bg-slate-700/50">
                        <p className="text-sm font-semibold text-white">
                          {camera.name}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                          <span>{camera.violationCount} violations</span>
                          <StatusBadge status="online">
                            Online
                          </StatusBadge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-slate-700/50 rounded-lg text-center">
                <p className="text-slate-300 mb-3">
                  {selectedCount} cameras selected
                </p>
                <p className="text-sm text-slate-400">
                  For optimal performance, limit surveillance to 6 cameras
                </p>
              </div>
            )}

            {/* Surveillance Controls */}
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <p className="text-sm font-semibold text-white mb-3">
                Surveillance Controls
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button className="px-3 py-2 bg-accent-blue hover:bg-primary-700 text-white text-xs font-semibold rounded transition-colors">
                  Record All
                </button>
                <button className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors">
                  Snapshot
                </button>
                <button className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors">
                  Zoom
                </button>
                <button className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors">
                  Alert Tone
                </button>
              </div>
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
};
