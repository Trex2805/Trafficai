import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Shield, Lock, Mail } from 'lucide-react';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLogin: (email: string, role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'developer' as UserRole,
      title: 'Developer',
      description: 'Access models, datasets, APIs, databases, logs and continual learning.',
      icon: Code,
      color: 'from-blue-600 to-cyan-600',
      demoEmail: 'developer@traffic.ai',
    },
    {
      id: 'authority' as UserRole,
      title: 'RTO Authority',
      description: 'Cameras, violations, maps, surveillance and enforcement operations.',
      icon: Shield,
      color: 'from-green-600 to-emerald-600',
      demoEmail: 'authority@rto.gov.in',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    // Simulate authentication delay
    setTimeout(() => {
      // Mock authentication
      if (
        (selectedRole === 'developer' && email === 'developer@traffic.ai') ||
        (selectedRole === 'authority' && email === 'authority@rto.gov.in')
      ) {
        if (password === 'password') {
          onLogin(email, selectedRole);
          navigate(selectedRole === 'developer' ? '/developer/dashboard' : '/authority/dashboard');
        } else {
          setError('Invalid password');
        }
      } else {
        setError('Invalid email for selected role');
      }
      setLoading(false);
    }, 500);
  };

  const handleDemoLogin = (role: UserRole, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('password');
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-accent-blue rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <h1 className="text-4xl font-bold text-white">Traffic Intelligence System</h1>
          </div>
          <p className="text-slate-300 text-lg">
            AI-Powered Traffic Violation Detection & Enforcement
          </p>
        </div>

        {/* Role Selection */}
        {!selectedRole ? (
          <div>
            <h2 className="text-2xl font-semibold text-white mb-8 text-center">
              Select Your Role
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50"
                  >
                    {/* Background gradient */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-20 group-hover:opacity-30 transition-opacity`}
                    ></div>

                    {/* Border */}
                    <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded-2xl transition-colors"></div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors">
                        <Icon size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">{role.title}</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {role.description}
                      </p>
                      <div className="mt-6 text-xs text-slate-400">
                        Demo: {role.demoEmail}
                      </div>
                    </div>

                    {/* Hover arrow */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xl">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="max-w-md mx-auto">
            <div className="card border-blue-500/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {selectedRole === 'developer' ? 'Developer' : 'RTO Authority'} Login
                </h2>
                <button
                  onClick={() => {
                    setSelectedRole(null);
                    setEmail('');
                    setPassword('');
                    setError('');
                  }}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-3 text-slate-500"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        selectedRole === 'developer'
                          ? 'developer@traffic.ai'
                          : 'authority@rto.gov.in'
                      }
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-3 text-slate-500"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-accent-blue hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors mt-6"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Demo Credentials Hint */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-3">Demo Credentials:</p>
                <button
                  type="button"
                  onClick={() =>
                    handleDemoLogin(
                      selectedRole,
                      selectedRole === 'developer'
                        ? 'developer@traffic.ai'
                        : 'authority@rto.gov.in'
                    )
                  }
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
                >
                  Use Demo Account
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-xs leading-relaxed">
                <strong>Demo Mode:</strong> This is a demonstration interface. Use the demo
                credentials provided above to explore the application.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
