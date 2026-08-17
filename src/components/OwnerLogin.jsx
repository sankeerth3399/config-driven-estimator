import React, { useState } from 'react';
import { Lock, User, Key, AlertCircle, ShieldCheck, RefreshCw, UserPlus, Mail, Building } from 'lucide-react';

export const OwnerLogin = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    company_name: 'Northline Roofing & Exteriors',
    role: 'Owner',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignUp
      ? {
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          company_name: form.company_name.trim(),
          role: form.role,
        }
      : {
          username: form.username.trim(),
          password: form.password,
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('wantace_auth_token', data.token);
      onLoginSuccess({
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        role: data.user.role,
        company_name: data.user.company_name,
        token: data.token,
      });
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user, pass) => {
    setIsSignUp(false);
    setForm((prev) => ({ ...prev, username: user, password: pass }));
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-left">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-3 font-bold">
            {isSignUp ? <UserPlus className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {isSignUp ? 'Create Owner Account' : 'Northline Owner Portal'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'Sign up to manage roofing formulas, rates, & leads' : 'Sign in to access your business estimator dashboard'}
          </p>

          {/* Toggle Tabs */}
          <div className="mt-5 inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700 w-full max-w-xs">
            <button
              type="button"
              id="tab-login-btn"
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !isSignUp ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-signup-btn"
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isSignUp ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Dale Whitmore"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="dale@northlineroofing.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Estimator">Estimator</option>
                    <option value="Finance">Finance</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company</label>
                  <input
                    name="company_name"
                    type="text"
                    value={form.company_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="username"
                type="text"
                required
                value={form.username}
                onChange={handleChange}
                placeholder="dale"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all mt-2 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Owner Account</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Owner Panel</span>
              </>
            )}
          </button>

          {/* Quick presets */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Presets:</span>
            <button
              type="button"
              onClick={() => handleQuickFill('dale', 'northline2026')}
              className="text-amber-600 hover:underline font-medium"
            >
              Dale (Owner)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleQuickFill('marcus', 'books2026')}
              className="text-amber-600 hover:underline font-medium"
            >
              Marcus (Finance)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
