import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { ChartCard } from '../../components/common/CommonComponents';

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    detectionThreshold: 0.75,
    ocrConfidence: 0.85,
    nmsThreshold: 0.4,
    inferenceTimeout: 5000,
    batchSize: 32,
    maxQueueSize: 1000,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const systemConfig = [
    {
      name: 'Detection Engine',
      status: 'operational',
      version: '3.2.1',
      uptime: '99.88%',
      lastUpdate: '2026-09-13 10:30 AM',
    },
    {
      name: 'OCR Service',
      status: 'operational',
      version: '2.1.5',
      uptime: '99.92%',
      lastUpdate: '2026-09-12 02:15 AM',
    },
    {
      name: 'PostgreSQL Database',
      status: 'operational',
      version: '14.5',
      uptime: '99.95%',
      lastUpdate: '2026-09-10 11:45 PM',
    },
    {
      name: 'Vector Database (Milvus)',
      status: 'operational',
      version: '2.3.0',
      uptime: '99.92%',
      lastUpdate: '2026-09-11 06:20 AM',
    },
    {
      name: 'API Gateway',
      status: 'operational',
      version: '1.5.2',
      uptime: '99.98%',
      lastUpdate: '2026-09-13 08:00 AM',
    },
    {
      name: 'Training Service',
      status: 'operational',
      version: '2.0.1',
      uptime: '98.50%',
      lastUpdate: '2026-09-12 04:30 PM',
    },
  ];

  const apiEndpoints = [
    {
      endpoint: '/api/detect',
      method: 'POST',
      status: 'active',
      latency: '125ms',
      requests: '1.2M/day',
    },
    {
      endpoint: '/api/verify',
      method: 'POST',
      status: 'active',
      latency: '89ms',
      requests: '340K/day',
    },
    {
      endpoint: '/api/fine',
      method: 'POST',
      status: 'active',
      latency: '156ms',
      requests: '280K/day',
    },
    {
      endpoint: '/api/search',
      method: 'GET',
      status: 'active',
      latency: '234ms',
      requests: '890K/day',
    },
    {
      endpoint: '/api/analytics',
      method: 'GET',
      status: 'active',
      latency: '445ms',
      requests: '120K/day',
    },
    {
      endpoint: '/api/models',
      method: 'GET',
      status: 'active',
      latency: '67ms',
      requests: '45K/day',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-slate-400">
          Configure AI models, detection parameters, and system thresholds
        </p>
      </div>

      {/* Detection Configuration */}
      <ChartCard title="AI Detection Configuration">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Detection Confidence Threshold
              </label>
              <span className="text-sm font-bold text-accent-blue">
                {(settings.detectionThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.detectionThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  detectionThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-2">
              Minimum confidence score for AI-detected violations
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                OCR Confidence Threshold
              </label>
              <span className="text-sm font-bold text-accent-blue">
                {(settings.ocrConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.ocrConfidence}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ocrConfidence: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-2">
              Minimum confidence for number plate recognition
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                NMS Threshold (Non-Maximum Suppression)
              </label>
              <span className="text-sm font-bold text-accent-blue">
                {(settings.nmsThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.nmsThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  nmsThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-2">
              Filter overlapping detections
            </p>
          </div>
        </div>
      </ChartCard>

      {/* Performance Settings */}
      <ChartCard title="Performance Settings">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Inference Timeout (ms)
            </label>
            <input
              type="number"
              value={settings.inferenceTimeout}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  inferenceTimeout: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            />
            <p className="text-xs text-slate-400 mt-2">
              Maximum time for model inference per frame
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              value={settings.batchSize}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  batchSize: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            />
            <p className="text-xs text-slate-400 mt-2">
              Number of frames per batch for processing
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Queue Size
            </label>
            <input
              type="number"
              value={settings.maxQueueSize}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxQueueSize: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-blue"
            />
            <p className="text-xs text-slate-400 mt-2">
              Maximum processing queue size
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Save size={18} />
            Save Settings
          </button>

          {saved && (
            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-green-400">Settings saved successfully</span>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Service Status */}
      <ChartCard title="Service Status & Configuration">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Service
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Version
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Uptime
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody>
              {systemConfig.map((service, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{service.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-400 text-xs font-semibold">
                        {service.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{service.version}</td>
                  <td className="px-4 py-3 text-slate-400">{service.uptime}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {service.lastUpdate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* API Endpoints */}
      <ChartCard title="API Endpoints Status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Method
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Latency
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Requests/Day
                </th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map((api, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-slate-700/50 px-2 py-1 rounded text-accent-blue">
                      {api.endpoint}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-slate-300">
                      {api.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                      {api.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{api.latency}</td>
                  <td className="px-4 py-3 text-slate-400">{api.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Important Notes */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
        <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-blue-300 mb-1">Configuration Notes:</p>
          <ul className="text-sm text-blue-300/80 space-y-1">
            <li>• Changes to detection thresholds will affect all active cameras immediately</li>
            <li>• Reducing thresholds increases detection sensitivity but may increase false positives</li>
            <li>• Performance settings affect processing throughput and system resource usage</li>
            <li>• All changes are logged and can be reverted from the audit trail</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
