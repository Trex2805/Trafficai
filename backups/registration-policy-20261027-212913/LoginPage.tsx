import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Shield, Lock, Mail, User } from 'lucide-react';
import type { UserRole } from '../../types';
import { login, register } from '../../services/authService';

interface LoginPageProps {
  onLogin: (user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: 'active' | 'pending' | 'disabled';
    requested_role: UserRole;
  }) => void;
}

type ScreenMode = 'login' | 'register';

const roleOptions: {
  id: UserRole;
  title: string;
  description: string;
  icon: typeof Code;
  color: string;
}[] = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'Models, datasets, APIs, databases and continual learning.',
    icon: Code,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'authority',
    title: 'RTO Authority',
    description: 'Traffic monitoring, violation reviews and enforcement operations.',
    icon: Shield,
    color: 'from-green-600 to-emerald-600',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [mode, setMode] = useState<ScreenMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setMessage('');
  };

  const openRole = (role: UserRole) => {
    setSelectedRole(role);
    setMode('login');
    resetMessages();
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!selectedRole) {
      setError('Select an account type first.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);

      if (user.status !== 'active') {
        setError('This account is not active. Contact the administrator.');
        return;
      }

      if (user.role !== selectedRole) {
        setError(
          user.role === 'user'
            ? 'This is a standard account. It cannot access the developer or authority dashboard.'
            : 'Your account role does not match the selected account type.',
        );
        return;
      }

      onLogin(user);
      navigate(
        user.role === 'developer'
          ? '/developer/dashboard'
          : user.role === 'authority'
            ? '/authority/dashboard'
            : '/account',
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }

    if (password.length < 12) {
      setError('Password must contain at least 12 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        requested_role: selectedRole || 'user',
      });

      setMessage(result.message);
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 bg-accent-blue rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Traffic Intelligence System
            </h1>
          </div>
          <p className="text-slate-300 text-lg">
            AI-Powered Traffic Violation Detection &amp; Enforcement
          </p>
        </header>

        {!selectedRole ? (
          <section>
            <h2 className="text-2xl font-semibold text-white mb-8 text-center">
              Choose a sign-in area
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {roleOptions.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => openRole(role.id)}
                    className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-20 group-hover:opacity-30 transition-opacity`}
                    />
                    <div className="absolute inset-0 border border-white/10 group-hover:border-white/30 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                        <Icon size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {role.title}
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setMode('register');
                  resetMessages();
                }}
                className="text-blue-300 hover:text-white underline"
              >
                Create a standard account
              </button>
            </div>
            {mode === 'register' && (
              <div className="card border-blue-500/30 max-w-md mx-auto mt-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Standard account registration
                </h2>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSelectedRole(null);
                    setError('');
                    setMessage(
                      'Choose a sign-in area above, then use the registration form.',
                    );
                  }}
                >
                  <p className="text-sm text-slate-300">
                    To register, select an account type above first. Standard
                    accounts are created from the registration form.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('user');
                      setMode('register');
                      resetMessages();
                    }}
                    className="w-full py-2 bg-accent-blue text-white rounded-lg"
                  >
                    Continue registration
                  </button>
                </form>
              </div>
            )}
          </section>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="card border-blue-500/30">
              <div className="flex items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'register'
                    ? selectedRole === 'user'
                      ? 'Create Standard Account'
                      : `Request ${selectedRole === 'developer' ? 'Developer' : 'RTO Authority'} Access`
                    : `${selectedRole === 'developer' ? 'Developer' : selectedRole === 'authority' ? 'RTO Authority' : 'Standard Account'} Login`}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setMode('login');
                    setName('');
                    setEmail('');
                    setPassword('');
                    resetMessages();
                  }}
                  className="text-slate-400 hover:text-white text-xl"
                  aria-label="Back to account selection"
                >
                  
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-accent-blue hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg mt-4"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Full name
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 12 characters"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-accent-blue hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              )}

              {error && (
                <div className="p-3 mt-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              {message && (
                <div className="p-3 mt-4 bg-green-500/10 border border-green-500/40 rounded-lg">
                  <p className="text-green-300 text-sm">{message}</p>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-slate-700 text-center space-y-3">
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      resetMessages();
                    }}
                    className="text-blue-300 hover:text-white underline text-sm"
                  >
                    New here? Create an account or request access
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetMessages();
                    }}
                    className="text-blue-300 hover:text-white underline text-sm"
                  >
                    Already registered? Sign in
                  </button>
                )}
                {selectedRole !== 'user' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('user');
                      setMode('register');
                      resetMessages();
                    }}
                    className="block mx-auto text-slate-300 hover:text-white text-sm"
                  >
                    Register as a standard user instead
                  </button>
                )}
                {selectedRole === 'user' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(null);
                      setMode('login');
                      resetMessages();
                    }}
                    className="block mx-auto text-slate-300 hover:text-white text-sm"
                  >
                    Back to account types
                  </button>
                )}
              </div>
            </div>
            <p className="mt-5 text-slate-400 text-xs text-center">
              Developer and RTO access requests require administrator approval.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
