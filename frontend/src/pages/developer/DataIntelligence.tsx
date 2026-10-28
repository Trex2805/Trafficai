import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ChartCard } from '../../components/common/CommonComponents';

export const DataIntelligence: React.FC = () => {
  const dataLayers = [
    {
      layer: 'Layer 1',
      name: 'Visual Intelligence Database',
      icon: '🖼️',
      color: 'from-blue-600 to-cyan-600',
      contents: [
        'Images & Video Frames',
        'Feature Embeddings',
        'Vehicle Re-identification',
        'Similarity Search',
      ],
      details: 'Raw visual data processed and indexed for efficient retrieval and analysis',
    },
    {
      layer: 'Layer 2',
      name: 'Traffic Enforcement Database',
      icon: '📋',
      color: 'from-green-600 to-emerald-600',
      contents: [
        'Vehicle Records',
        'Number Plates',
        'Violations',
        'Evidence',
        'Verification',
        'Fines',
      ],
      details: 'Structured enforcement data linking violations to vehicles and outcomes',
    },
    {
      layer: 'Layer 3',
      name: 'Continual Learning & Analytics',
      icon: '🔄',
      color: 'from-purple-600 to-pink-600',
      contents: [
        'Historical Detections',
        'Verified Samples',
        'Hard Samples',
        'Human Feedback',
        'Training Datasets',
        'Model Performance',
      ],
      details: 'Learning data that improves models through human-verified feedback loops',
    },
  ];

  const dataflow = [
    { step: '1. Observe', icon: '📹', desc: 'Capture traffic video' },
    { step: '2. Detect', icon: '🤖', desc: 'AI processes frames' },
    { step: '3. Analyze', icon: '🔍', desc: 'Extract violations' },
    { step: '4. Verify', icon: '✓', desc: 'Human verification' },
    { step: '5. Enforce', icon: '📋', desc: 'Generate fines' },
    { step: '6. Learn', icon: '📈', desc: 'Update models' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Data Intelligence</h1>
        <p className="text-slate-400">
          Three-layer architecture integrating visual intelligence, enforcement operations, and
          continual learning
        </p>
      </div>

      {/* Data Layers */}
      <div className="space-y-4">
        {dataLayers.map((layer, idx) => (
          <div key={idx}>
            <ChartCard title={`${layer.layer}: ${layer.name}`}>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Visual */}
                <div
                  className={`bg-gradient-to-br ${layer.color} rounded-lg p-6 text-white border border-white/10`}
                >
                  <p className="text-4xl mb-4">{layer.icon}</p>
                  <h3 className="text-lg font-bold mb-3">{layer.name}</h3>
                  <ul className="space-y-2">
                    {layer.contents.map((content, contentIdx) => (
                      <li key={contentIdx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                        {content}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                  <h4 className="text-lg font-semibold text-white mb-4">Purpose</h4>
                  <p className="text-slate-300 mb-4">{layer.details}</p>

                  <h4 className="text-lg font-semibold text-white mb-3">Key Features</h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {layer.layer === 'Layer 1' && (
                      <>
                        <li>✓ Efficient image indexing with embeddings</li>
                        <li>✓ Vector similarity search for re-identification</li>
                        <li>✓ Multi-modal feature extraction</li>
                      </>
                    )}
                    {layer.layer === 'Layer 2' && (
                      <>
                        <li>✓ Real-time violation logging</li>
                        <li>✓ Evidence chain of custody</li>
                        <li>✓ Fine lifecycle management</li>
                      </>
                    )}
                    {layer.layer === 'Layer 3' && (
                      <>
                        <li>✓ Feedback loop automation</li>
                        <li>✓ Hard sample prioritization</li>
                        <li>✓ Model performance tracking</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </ChartCard>
          </div>
        ))}
      </div>

      {/* Data Flow Visualization */}
      <ChartCard title="Complete Data Flow Pipeline">
        <div className="space-y-6">
          {/* Flowchart */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {dataflow.map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border border-slate-600 text-center hover:border-slate-500 transition-colors cursor-pointer">
                  <p className="text-3xl mb-2">{item.icon}</p>
                  <p className="text-xs font-bold text-accent-blue mb-1">{item.step}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                {idx < dataflow.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 transform -translate-y-1/2 text-slate-600">
                    <ArrowRight size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Flow Description */}
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <h4 className="text-sm font-semibold text-white mb-2">Data Journey:</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Raw traffic footage enters the system → AI models detect violations in real-time →
              Evidence is extracted and analyzed → Human officers verify each detection →
              Verified violations generate enforcement actions → All verified data feeds back into
              the continual learning pipeline → Models improve with each cycle
            </p>
          </div>
        </div>
      </ChartCard>

      {/* Integration Points */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Sources */}
        <ChartCard title="Data Input Sources">
          <div className="space-y-3">
            {[
              { name: 'Traffic Cameras', count: 14, status: 'active' },
              { name: 'Mobile Units', count: 5, status: 'active' },
              { name: 'Traffic Signals', count: 8, status: 'active' },
              { name: 'Vehicle Sensors', count: 2340, status: 'processing' },
            ].map((source, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-white">{source.name}</p>
                  <p className="text-xs text-slate-400">{source.count} sources</p>
                </div>
                <div
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    source.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {source.status}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Output & Actions */}
        <ChartCard title="Data Output & Actions">
          <div className="space-y-3">
            {[
              { name: 'Fine Generation', count: 973, status: 'success' },
              { name: 'Violation Reports', count: 1284, status: 'success' },
              { name: 'Analytics Reports', count: 47, status: 'success' },
              { name: 'Model Updates', count: 6, status: 'processing' },
            ].map((output, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-white">{output.name}</p>
                  <p className="text-xs text-slate-400">{output.count} today</p>
                </div>
                <div
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    output.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {output.status}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Architecture Stats */}
      <ChartCard title="Data Architecture Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Records', value: '2.4M', unit: 'violations' },
            { label: 'Storage Used', value: '847', unit: 'GB' },
            { label: 'Query Speed', value: '<100', unit: 'ms' },
            { label: 'Data Integrity', value: '99.99%', unit: 'verified' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
              <p className="text-2xl font-bold text-accent-blue">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              <p className="text-xs text-slate-500">{stat.unit}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
