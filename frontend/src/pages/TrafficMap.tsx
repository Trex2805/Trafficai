import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChartCard, LoadingState } from '../components/common/CommonComponents';
import { apiService } from '../services/api';
import { Camera, Violation } from '../types';

// Custom marker icons
const cameraIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const violationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const TrafficMap: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapView, setMapView] = useState<'cameras' | 'violations' | 'heatmap'>('cameras');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [camerasData, violationsData] = await Promise.all([
          apiService.getAllCameras(),
          apiService.getAllViolations(),
        ]);
        setCameras(camerasData);
        setViolations(violationsData);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading map data..." />;

  // Center point (Gwalior, Madhya Pradesh)
  const center: [number, number] = [26.2183, 78.1629];

  // Heatmap zones (traffic hotspots in Gwalior)
  const heatmapZones = [
    { lat: 26.2183, lng: 78.1629, intensity: 9, name: 'Gwalior Railway Station' },
    { lat: 26.2241, lng: 78.1656, intensity: 8, name: 'Laxmi Vilas Palace Road' },
    { lat: 26.2142, lng: 78.1745, intensity: 7, name: 'Moti Mahal Junction' },
    { lat: 26.2267, lng: 78.1543, intensity: 8, name: 'City Center' },
    { lat: 26.2089, lng: 78.1812, intensity: 6, name: 'Gandhi Road' },
  ];

  const getHeatmapColor = (intensity: number) => {
    if (intensity >= 8) return '#ef4444'; // Red
    if (intensity >= 6) return '#f59e0b'; // Amber
    if (intensity >= 4) return '#fbbf24'; // Yellow
    return '#10b981'; // Green
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Traffic Surveillance Map</h1>
        <p className="text-slate-400">
          Real-time camera locations, violations, and traffic heatmap
        </p>
      </div>

      {/* View Controls */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setMapView('cameras')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mapView === 'cameras'
              ? 'bg-accent-blue text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          📹 Camera Locations
        </button>
        <button
          onClick={() => setMapView('violations')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mapView === 'violations'
              ? 'bg-accent-blue text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          🚨 Violations
        </button>
        <button
          onClick={() => setMapView('heatmap')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mapView === 'heatmap'
              ? 'bg-accent-blue text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          🔥 Traffic Heatmap
        </button>
      </div>

      {/* Map Container */}
      <ChartCard title={`Map View: ${mapView === 'cameras' ? 'Cameras' : mapView === 'violations' ? 'Violations' : 'Heatmap'}`}>
        <div style={{ height: '600px', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Camera Markers */}
            {(mapView === 'cameras' || mapView === 'heatmap') &&
              cameras.map((camera) => (
                <Marker key={camera.id} position={[camera.location.lat, camera.location.lng]} icon={cameraIcon}>
                  <Popup>
                    <div className="w-48">
                      <p className="font-bold text-sm">{camera.id}</p>
                      <p className="text-xs text-slate-600">{camera.name}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Status: <span className={camera.status === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {camera.status.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">
                        FPS: {camera.fps} | Violations: {camera.violationCount}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Violation Markers */}
            {(mapView === 'violations' || mapView === 'heatmap') &&
              violations.map((violation) => (
                <Marker
                  key={violation.id}
                  position={[violation.location.lat, violation.location.lng]}
                  icon={violationIcon}
                >
                  <Popup>
                    <div className="w-48">
                      <p className="font-bold text-sm">{violation.id}</p>
                      <p className="text-xs text-slate-600">{violation.numberPlate}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {violation.type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-600">
                        Confidence: {violation.aiAnalysis.confidence.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-600">
                        Status: <span className={violation.status === 'verified' ? 'text-green-600' : 'text-orange-600'}>
                          {violation.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Heatmap Zones */}
            {mapView === 'heatmap' &&
              heatmapZones.map((zone, idx) => (
                <CircleMarker
                  key={idx}
                  center={[zone.lat, zone.lng]}
                  radius={zone.intensity * 3}
                  fillColor={getHeatmapColor(zone.intensity)}
                  fillOpacity={0.6}
                  weight={2}
                  color={getHeatmapColor(zone.intensity)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{zone.name}</p>
                      <p className="text-xs">Intensity: {zone.intensity}/10</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        </div>
      </ChartCard>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-slate-400">Total Cameras</p>
          <p className="text-2xl font-bold text-accent-blue">{cameras.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Online Cameras</p>
          <p className="text-2xl font-bold text-green-400">
            {cameras.filter((c) => c.status !== 'offline').length}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Total Violations</p>
          <p className="text-2xl font-bold text-red-400">{violations.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-400">Verified</p>
          <p className="text-2xl font-bold text-green-400">
            {violations.filter((v) => v.status === 'verified').length}
          </p>
        </div>
      </div>

      {/* Legend */}
      <ChartCard title="Map Legend">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-white mb-3">Markers</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Camera Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Violation Location</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Heatmap Intensity</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Very High (8-10)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-slate-300">High (6-7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Medium (4-5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Low (0-3)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Info</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Click markers for details</li>
              <li>• Drag to pan the map</li>
              <li>• Scroll to zoom</li>
              <li>• Use view buttons to switch</li>
            </ul>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};
