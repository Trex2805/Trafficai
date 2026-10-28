
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  BarChart3,
  Cpu,
  TrendingUp,
  Database,
  ActivitySquare,
  Settings,
  ShieldCheck,
  Navigation,
  Camera,
  AlertCircle,
  DollarSign,
  LineChart,
  Map,
} from 'lucide-react';

import './index.css';

import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { PasswordRecoveryPage } from './pages/auth/PasswordRecoveryPage';

import { DeveloperOverview } from './pages/developer/DeveloperOverview';
import { ModelsAndPerformance } from './pages/developer/ModelsAndPerformance';
import { ContinualLearning } from './pages/developer/ContinualLearning';
import { DataIntelligence } from './pages/developer/DataIntelligence';
import { SystemLogs } from './pages/developer/SystemLogs';
import { SystemSettings } from './pages/developer/SystemSettings';
import { AuthorityAccessManagement } from './pages/developer/AuthorityAccessManagement';

import { TrafficOverview } from './pages/authority/TrafficOverview';
import { CameraSurveillance } from './pages/authority/CameraSurveillance';
import VideoInference from './pages/authority/VideoInference';
import { ViolationsAndReviews } from './pages/authority/ViolationsAndReviews';
import { FineIntelligence } from './pages/authority/FineIntelligence';
import { TrafficAnalytics } from './pages/authority/TrafficAnalytics';

import { TrafficMap } from './pages/TrafficMap';
import { User, UserRole } from './types';
import {
  clearSession,
  getAccessToken,
  getCurrentUser,
} from './services/authService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Restore a session only after the backend validates its bearer token.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getAccessToken()) {
        clearSession();
        if (!cancelled) setIsRestoringSession(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
          setIsAuthenticated(currentUser.status === 'active');
        }
      } catch {
        clearSession();
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (authenticatedUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: 'active' | 'pending' | 'disabled';
    requested_role: UserRole;
  }) => {
    const userData: User = authenticatedUser;
    setUser(userData);
    setIsAuthenticated(userData.status === 'active');
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleSearch = (query: string) => {
    // Search integration will be connected to the real backend later.
    console.log('Searching for:', query);
  };

  // Developer navigation.
  const developerNavItems = [
    {
      label: 'Overview',
      path: '/developer/dashboard',
      icon: <BarChart3 size={20} />,
    },
    {
      label: 'Traffic Map',
      path: '/traffic-map',
      icon: <Map size={20} />,
    },
    {
      label: 'Video Inference',
      path: '/developer/inference',
      icon: <ActivitySquare size={20} />,
    },
    {
      label: 'Models & Performance',
      path: '/developer/models',
      icon: <Cpu size={20} />,
    },
    {
      label: 'Continual Learning',
      path: '/developer/learning',
      icon: <TrendingUp size={20} />,
    },
    {
      label: 'Data Intelligence',
      path: '/developer/data',
      icon: <Database size={20} />,
    },
    {
      label: 'System Logs',
      path: '/developer/logs',
      icon: <ActivitySquare size={20} />,
    },
    {
      label: 'Settings',
      path: '/developer/settings',
      icon: <Settings size={20} />,
    },
    {
      label: 'Access Management',
      path: '/developer/access-management',
      icon: <ShieldCheck size={20} />,
    },
  ];

  // Authority navigation.
  const authorityNavItems = [
    {
      label: 'Traffic Overview',
      path: '/authority/dashboard',
      icon: <Navigation size={20} />,
    },
    {
      label: 'Traffic Map',
      path: '/traffic-map',
      icon: <Map size={20} />,
    },
    {
      label: 'Camera Surveillance',
      path: '/authority/cameras',
      icon: <Camera size={20} />,
    },
    {
      label: 'Video Inference',
      path: '/authority/inference',
      icon: <ActivitySquare size={20} />,
    },
    {
      label: 'Violations & Reviews',
      path: '/authority/violations',
      icon: <AlertCircle size={20} />,
    },
    {
      label: 'Fine Intelligence',
      path: '/authority/fines',
      icon: <DollarSign size={20} />,
    },
    {
      label: 'Traffic Analytics',
      path: '/authority/analytics',
      icon: <LineChart size={20} />,
    },
  ];

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center text-white">
        Validating TrafficAI session...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage onLogin={handleLogin} />
            ) : (
              <Navigate
                to={
                  user?.role === 'developer'
                    ? '/developer/dashboard'
                    : user?.role === 'authority'
                      ? '/authority/dashboard'
                      : '/account'
                }
                replace
              />
            )
          }
        />

        <Route
          path="/forgot-password"
          element={!isAuthenticated ? <PasswordRecoveryPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reset-password"
          element={!isAuthenticated ? <PasswordRecoveryPage /> : <Navigate to="/" replace />}
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated && user ? (
              <Navigate
                to={
                  user.role === 'developer'
                    ? '/developer/dashboard'
                    : user.role === 'authority'
                      ? '/authority/dashboard'
                      : '/account'
                }
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Standard account landing page */}
        <Route
          path="/account"
          element={
            isAuthenticated && user?.role === 'user' ? (
              <main className="min-h-screen bg-slate-950 p-6 text-white">
                <section className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8">
                  <h1 className="text-2xl font-bold">TrafficAI Account</h1>
                  <p className="mt-3 text-slate-300">Welcome, {user.name}.</p>
                  <p className="mt-2 text-sm text-slate-400">{user.email}</p>
                  <p className="mt-5 rounded-lg bg-slate-800 p-3 text-sm">
                    Account type: Standard user. Developer and authority tools require separately approved access.
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-6 rounded-lg bg-cyan-700 px-4 py-2 font-medium hover:bg-cyan-600"
                  >
                    Sign out
                  </button>
                </section>
              </main>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Shared traffic map */}
        <Route
          path="/traffic-map"
          element={
            isAuthenticated && user ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                navItems={
                  user.role === 'developer'
                    ? developerNavItems
                    : authorityNavItems
                }
                pageTitle="Traffic Surveillance Map"
                onSearch={handleSearch}
              >
                <TrafficMap />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Developer routes */}
        <Route
          path="/developer/*"
          element={
            isAuthenticated && user?.role === 'developer' ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                navItems={developerNavItems}
                pageTitle="Developer Control Center"
                onSearch={handleSearch}
              >
                <Routes>
                  <Route
                    path="dashboard"
                    element={<DeveloperOverview />}
                  />

                  <Route
                    path="inference"
                    element={<VideoInference />}
                  />

                  <Route
                    path="models"
                    element={<ModelsAndPerformance />}
                  />

                  <Route
                    path="learning"
                    element={<ContinualLearning />}
                  />

                  <Route
                    path="data"
                    element={<DataIntelligence />}
                  />

                  <Route
                    path="logs"
                    element={<SystemLogs />}
                  />

                  <Route
                    path="settings"
                    element={<SystemSettings />}
                  />
                  <Route
                    path="access-management"
                    element={<AuthorityAccessManagement />}
                  />

                  <Route
                    path="*"
                    element={
                      <Navigate
                        to="/developer/dashboard"
                        replace
                      />
                    }
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Authority routes */}
        <Route
          path="/authority/*"
          element={
            isAuthenticated && user?.role === 'authority' ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                navItems={authorityNavItems}
                pageTitle="Traffic Intelligence Dashboard"
                onSearch={handleSearch}
              >
                <Routes>
                  <Route
                    path="dashboard"
                    element={<TrafficOverview />}
                  />

                  <Route
                    path="cameras"
                    element={<CameraSurveillance />}
                  />

                  <Route
                    path="inference"
                    element={<VideoInference />}
                  />

                  <Route
                    path="violations"
                    element={<ViolationsAndReviews />}
                  />

                  <Route
                    path="fines"
                    element={<FineIntelligence />}
                  />

                  <Route
                    path="analytics"
                    element={<TrafficAnalytics />}
                  />

                  <Route
                    path="*"
                    element={
                      <Navigate
                        to="/authority/dashboard"
                        replace
                      />
                    }
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
