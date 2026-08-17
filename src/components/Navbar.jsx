import React from 'react';
import { Home, ShieldCheck, LogOut, Calculator, RefreshCw, User } from 'lucide-react';

export const Navbar = ({
  currentView,
  onSelectView,
  user,
  onLogout,
  configVersion,
  businessName = 'Northline Roofing & Exteriors',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-inner">
            <span className="text-xl tracking-tighter">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base sm:text-lg tracking-tight">
                {businessName}
              </span>
              {configVersion !== undefined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  v{configVersion}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Custom Lead & Cost Estimator Engine
            </p>
          </div>
        </div>

        {/* View Switcher / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-slate-950/60 p-1 rounded-lg border border-slate-800 flex items-center">
            <button
              type="button"
              id="nav-estimator-btn"
              onClick={() => onSelectView('estimator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentView === 'estimator'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Public Estimator</span>
            </button>

            <button
              type="button"
              id="nav-owner-btn"
              onClick={() => onSelectView('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                currentView === 'owner'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Owner Panel</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {user && currentView === 'owner' && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-mono">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                id="nav-logout-btn"
                onClick={onLogout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
