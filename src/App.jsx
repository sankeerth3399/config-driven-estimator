import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DynamicEstimator } from './components/DynamicEstimator';
import { OwnerLogin } from './components/OwnerLogin';
import { OwnerPanel } from './components/OwnerPanel';

export default function App() {
  const [currentView, setCurrentView] = useState('estimator');
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [configVersion, setConfigVersion] = useState(undefined);
  const [businessName, setBusinessName] = useState('Northline Roofing & Exteriors');

  // Verify existing token on initial load
  const checkAuth = async () => {
    const token = localStorage.getItem('wantace_auth_token');
    if (!token) {
      setAuthChecking(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('wantace_auth_token');
        setUser(null);
      }
    } catch (e) {
      console.warn('Auth check error:', e);
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchPublicMeta = async () => {
    try {
      const res = await fetch('/api/public-config');
      if (res.ok) {
        const data = await res.json();
        setConfigVersion(data.config_version);
        if (data.business?.name) {
          setBusinessName(data.business.name);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch public meta:', e);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchPublicMeta();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('wantace_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('wantace_auth_token');
    setUser(null);
  };

  const handleConfigUpdated = () => {
    fetchPublicMeta();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        user={user}
        onLogout={handleLogout}
        configVersion={configVersion}
        businessName={businessName}
      />

      <main className="flex-1">
        {currentView === 'estimator' ? (
          <DynamicEstimator onEstimateCompleted={fetchPublicMeta} />
        ) : (
          <div>
            {authChecking ? (
              <div className="min-h-[400px] flex items-center justify-center text-sm font-semibold text-slate-500">
                Verifying authorization credentials...
              </div>
            ) : user ? (
              <OwnerPanel user={user} onConfigUpdated={handleConfigUpdated} />
            ) : (
              <OwnerLogin onLoginSuccess={setUser} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
