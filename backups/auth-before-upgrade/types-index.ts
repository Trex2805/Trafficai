// User & Auth Types
export type UserRole = 'developer' | 'authority';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Vehicle & Detection Types
export interface Vehicle {
  id: string;
  numberPlate: string;
  type: 'motorcycle' | 'car' | 'truck' | 'bus' | 'auto' | 'other';
  color: string;
  lastSeen: Date;
  violationCount: number;
}

export interface Detection {
  id: string;
  objectType: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Violation Types
export type ViolationType =
  | 'no_helmet'
  | 'triple_riding'
  | 'seatbelt_violation'
  | 'signal_jumping'
  | 'other';

export type VerificationStatus =
  | 'ai_detected'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'fine_generated';

export interface Violation {
  id: string;
  cameraId: string;
  vehicleId: string;
  numberPlate: string;
  type: ViolationType;
  confidence: number;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  evidenceUrl: string;
  status: VerificationStatus;
  aiAnalysis: {
    violated: boolean;
    confidence: number;
    recommendation: string;
  };
  humanVerification?: {
    verified: boolean;
    verifiedAt: Date;
    officerId: string;
    notes: string;
  };
  fine?: Fine;
}

// Camera Types
export type CameraStatus = 'online' | 'offline' | 'warning';

export interface Camera {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: CameraStatus;
  fps: number;
  resolution: string;
  lastUpdate: Date;
  violationCount: number;
  isActive?: boolean;
}

// Fine Types
export type FineStatus = 'generated' | 'pending' | 'paid' | 'disputed';

export interface Fine {
  id: string;
  violationId: string;
  vehicleId: string;
  numberPlate: string;
  amount: number;
  status: FineStatus;
  generatedAt: Date;
  dueDate: Date;
  paidAt?: Date;
}

// Model Types
export type ModelStatus = 'active' | 'stable' | 'archived';

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  mAP: number;
  avgConfidence: number;
}

export interface Model {
  id: string;
  name: string;
  version: string;
  status: ModelStatus;
  metrics: ModelMetrics;
  createdAt: Date;
  updatedAt: Date;
  trainingTime: number;
}

export interface ModelPerformanceClass {
  className: string;
  precision: number;
  recall: number;
  f1: number;
  mAP: number;
  samples: number;
}

// Continual Learning Types
export interface ContinualLearningStats {
  newSamples: number;
  verifiedSamples: number;
  hardSamples: number;
  trainingDataset: number;
  modelImprovement: number;
  lastTrainingRun: Date;
}

export interface TrainingHistory {
  date: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

// System Health Types
export type ServiceStatus = 'operational' | 'warning' | 'critical';

export interface SystemService {
  name: string;
  status: ServiceStatus;
  uptime: number;
  lastCheck: Date;
}

// Analytics Types
export interface DailyAnalytics {
  date: Date;
  totalViolations: number;
  verifiedViolations: number;
  rejectedViolations: number;
  finesGenerated: number;
  fineAmount: number;
}

export interface ViolationByType {
  type: ViolationType;
  count: number;
  percentage: number;
}

export interface ViolationByLocation {
  location: string;
  count: number;
  lat: number;
  lng: number;
}

// Log Types
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SystemLog {
  id: string;
  timestamp: Date;
  service: string;
  event: string;
  severity: LogSeverity;
  status: 'success' | 'failed';
  details?: string;
}

// Dashboard Types
export interface DeveloperDashboardData {
  modelAccuracy: number;
  activeModel: string;
  learningSamples: number;
  apiHealth: number;
  modelPerformanceHistory: Array<{
    date: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
  systemHealth: SystemService[];
  recentLogs: SystemLog[];
}

export interface AuthorityDashboardData {
  liveCameras: number;
  totalCameras: number;
  violationsToday: number;
  pendingReviews: number;
  finesGenerated: number;
  fineAmount: number;
  recentViolations: Violation[];
  cameras: Camera[];
}
