import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import clsx from 'clsx';
import { User } from '../../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  navItems: Array<{
    label: string;
    path: string;
    icon: React.ReactNode;
  }>;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  onLogout,
  navItems,
  isOpen,
  onToggle,
}) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-700 transition-transform duration-300 z-50 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Traffic</h1>
                <p className="text-xs text-slate-400">Intelligence</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-block px-2 py-1 bg-accent-blue/20 text-accent-blue text-xs font-semibold rounded">
                {user.role === 'developer' ? 'Developer' : 'RTO Authority'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-2">
              {navItems.map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                    location.pathname === item.path
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : 'text-slate-300 hover:bg-slate-800'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-slate-700 p-4">
            <div className="bg-slate-800 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-400 mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-white truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

interface TopbarProps {
  user: User;
  onSidebarToggle: () => void;
  pageTitle: string;
  onSearch?: (query: string) => void;
  notificationCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  onSidebarToggle,
  pageTitle,
  onSearch,
  notificationCount = 0,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-800 border-b border-slate-700 z-40 lg:ml-64">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Menu & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSidebarToggle}
            className="lg:hidden p-2 hover:bg-slate-700 rounded-lg"
          >
            <Menu size={20} className="text-slate-300" />
          </button>
          <h1 className="text-lg font-semibold text-white hidden sm:block">
            {pageTitle}
          </h1>
        </div>

        {/* Center: Search */}
        {searchOpen ? (
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md flex items-center"
          >
            <input
              type="text"
              placeholder="Search vehicles, violations, cameras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="ml-2 p-2 hover:bg-slate-700 rounded-lg text-slate-300"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <>
            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              >
                <Search size={18} />
              </button>

              <button className="relative p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-700">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user.role === 'developer' ? 'Developer' : 'RTO Officer'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center">
                  <span className="text-accent-blue font-bold">
                    {user.email[0].toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

interface LayoutProps {
  user: User;
  onLogout: () => void;
  navItems: Array<{
    label: string;
    path: string;
    icon: React.ReactNode;
  }>;
  pageTitle: string;
  onSearch?: (query: string) => void;
  children: React.ReactNode;
  notificationCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  onLogout,
  navItems,
  pageTitle,
  onSearch,
  children,
  notificationCount,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar
        user={user}
        onLogout={onLogout}
        navItems={navItems}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <Topbar
        user={user}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        pageTitle={pageTitle}
        onSearch={onSearch}
        notificationCount={notificationCount}
      />

      <main className="pt-16 lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
};
