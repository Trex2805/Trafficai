import {
  Vehicle,
  Violation,
  Camera,
  Model,
  ModelPerformanceClass,
  SystemService,
  SystemLog,
  DeveloperDashboardData,
  AuthorityDashboardData,
  ContinualLearningStats,
  TrainingHistory,
  DailyAnalytics,
  ViolationByType,
} from '../types';
import {
  mockVehicles,
  mockViolations,
  mockCameras,
  mockModels,
  mockModelPerformanceClasses,
  mockSystemServices,
  mockSystemLogs,
  mockContinualLearningStats,
  mockTrainingHistory,
  mockDailyAnalytics,
  mockViolationByType,
} from '../data/mockData';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  // Developer Dashboard
  getDeveloperDashboard: async (): Promise<DeveloperDashboardData> => {
    await delay(300);
    return {
      modelAccuracy: 94.7,
      activeModel: 'TrafficVision-v2.4',
      learningSamples: 18420,
      apiHealth: 99.98,
      modelPerformanceHistory: mockTrainingHistory.map((h) => ({
        date: h.date.toLocaleDateString(),
        accuracy: h.accuracy,
        precision: h.precision,
        recall: h.recall,
        f1: h.f1,
      })),
      systemHealth: mockSystemServices,
      recentLogs: mockSystemLogs.slice(0, 5),
    };
  },

  // Authority Dashboard
  getAuthorityDashboard: async (): Promise<AuthorityDashboardData> => {
    await delay(300);
    const onlineCameras = mockCameras.filter(c => c.status !== 'offline').length;
    const violationsToday = mockViolations.filter(
      v => new Date(v.timestamp).toDateString() === new Date().toDateString()
    ).length;
    const pendingReviews = mockViolations.filter(
      v => v.status === 'pending_review'
    ).length;
    const finesGenerated = mockViolations.filter(
      v => v.status === 'fine_generated'
    ).length;
    const fineAmount = mockViolations
      .filter(v => v.fine)
      .reduce((sum, v) => sum + (v.fine?.amount || 0), 0);

    return {
      liveCameras: onlineCameras,
      totalCameras: mockCameras.length,
      violationsToday: violationsToday || 1284,
      pendingReviews,
      finesGenerated,
      fineAmount,
      recentViolations: mockViolations.slice(0, 5),
      cameras: mockCameras,
    };
  },

  // Models
  getActiveModel: async (): Promise<Model> => {
    await delay(200);
    return mockModels.find(m => m.status === 'active') || mockModels[0];
  },

  getAllModels: async (): Promise<Model[]> => {
    await delay(200);
    return mockModels;
  },

  getModelPerformanceClasses: async (): Promise<ModelPerformanceClass[]> => {
    await delay(200);
    return mockModelPerformanceClasses;
  },

  getModelPerformanceHistory: async (): Promise<TrainingHistory[]> => {
    await delay(200);
    return mockTrainingHistory;
  },

  // Continual Learning
  getContinualLearningStats: async (): Promise<ContinualLearningStats> => {
    await delay(200);
    return mockContinualLearningStats;
  },

  getTrainingHistory: async (): Promise<TrainingHistory[]> => {
    await delay(200);
    return mockTrainingHistory;
  },

  // System Health
  getSystemServices: async (): Promise<SystemService[]> => {
    await delay(200);
    return mockSystemServices;
  },

  getSystemLogs: async (filters?: {
    service?: string;
    severity?: string;
  }): Promise<SystemLog[]> => {
    await delay(200);
    let logs = mockSystemLogs;

    if (filters?.service) {
      logs = logs.filter(l => l.service.includes(filters.service!));
    }
    if (filters?.severity) {
      logs = logs.filter(l => l.severity === filters.severity);
    }

    return logs;
  },

  // Cameras
  getAllCameras: async (): Promise<Camera[]> => {
    await delay(200);
    return mockCameras;
  },

  getCameraById: async (id: string): Promise<Camera | undefined> => {
    await delay(100);
    return mockCameras.find(c => c.id === id);
  },

  // Violations
  getAllViolations: async (filters?: {
    type?: string;
    status?: string;
    cameraId?: string;
  }): Promise<Violation[]> => {
    await delay(200);
    let violations = mockViolations;

    if (filters?.type) {
      violations = violations.filter(v => v.type === filters.type);
    }
    if (filters?.status) {
      violations = violations.filter(v => v.status === filters.status);
    }
    if (filters?.cameraId) {
      violations = violations.filter(v => v.cameraId === filters.cameraId);
    }

    return violations.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getViolationById: async (id: string): Promise<Violation | undefined> => {
    await delay(100);
    return mockViolations.find(v => v.id === id);
  },

  verifyViolation: async (
    id: string,
    verified: boolean,
    notes: string
  ): Promise<Violation | undefined> => {
    await delay(300);
    const violation = mockViolations.find(v => v.id === id);
    if (violation) {
      violation.status = verified ? 'verified' : 'rejected';
      violation.humanVerification = {
        verified,
        verifiedAt: new Date(),
        officerId: 'OFF001',
        notes,
      };
    }
    return violation;
  },

  generateFine: async (violationId: string): Promise<Violation | undefined> => {
    await delay(300);
    const violation = mockViolations.find(v => v.id === violationId);
    if (violation && violation.humanVerification?.verified) {
      violation.status = 'fine_generated';
      violation.fine = {
        id: `FINE${Date.now()}`,
        violationId,
        vehicleId: violation.vehicleId,
        numberPlate: violation.numberPlate,
        amount: 500,
        status: 'pending',
        generatedAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }
    return violation;
  },

  // Vehicles
  getAllVehicles: async (): Promise<Vehicle[]> => {
    await delay(200);
    return mockVehicles;
  },

  getVehicleByPlate: async (plate: string): Promise<Vehicle | undefined> => {
    await delay(100);
    return mockVehicles.find(v => v.numberPlate === plate);
  },

  // Analytics
  getDailyAnalytics: async (): Promise<DailyAnalytics[]> => {
    await delay(200);
    return mockDailyAnalytics;
  },

  getViolationsByType: async (): Promise<ViolationByType[]> => {
    await delay(200);
    return mockViolationByType;
  },

  // Search
  globalSearch: async (query: string): Promise<{
    vehicles: Vehicle[];
    violations: Violation[];
    cameras: Camera[];
  }> => {
    await delay(300);
    const lowerQuery = query.toLowerCase();

    return {
      vehicles: mockVehicles.filter(
        v =>
          v.numberPlate.toLowerCase().includes(lowerQuery) ||
          v.id.toLowerCase().includes(lowerQuery)
      ),
      violations: mockViolations.filter(
        v =>
          v.id.toLowerCase().includes(lowerQuery) ||
          v.numberPlate.toLowerCase().includes(lowerQuery)
      ),
      cameras: mockCameras.filter(
        c =>
          c.id.toLowerCase().includes(lowerQuery) ||
          c.name.toLowerCase().includes(lowerQuery)
      ),
    };
  },
};
