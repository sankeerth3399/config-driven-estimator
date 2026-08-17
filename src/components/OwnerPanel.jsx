import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  History,
  Save,
  Trash2,
  Download,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const OwnerPanel = ({ user, onConfigUpdated }) => {
  const [activeTab, setActiveTab] = useState('pricing');
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-states
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('wantace_auth_token')}`,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, histRes, leadsRes] = await Promise.all([
        fetch('/api/owner/config', { headers: getHeaders() }),
        fetch('/api/owner/config/history', { headers: getHeaders() }),
        fetch('/api/owner/leads', { headers: getHeaders() }),
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (histRes.ok) setHistory(await histRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Pricing Changes
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/owner/config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ config, notes: 'Updated rates via Owner Dashboard' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setConfig(data.config);
      showToast(`Saved! Published config version v${data.config.config_version}`);
      if (onConfigUpdated) onConfigUpdated();
      fetch('/api/owner/config/history', { headers: getHeaders() })
        .then((r) => r.json())
        .then(setHistory);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Rollback Version
  const handleRollback = (ver) => {
    setConfirmDialog({
      title: `Rollback to v${ver}?`,
      message: `This will restore pricing formulas and active options from version ${ver}.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/owner/config/rollback/${ver}`, {
            method: 'POST',
            headers: getHeaders(),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Rollback failed');
          setConfig(data.config);
          showToast(`Successfully rolled back to v${ver}`);
          if (onConfigUpdated) onConfigUpdated();
          fetchData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  // Delete Lead
  const handleDeleteLead = (id) => {
    setConfirmDialog({
      title: 'Delete Lead?',
      message: 'This will permanently remove the lead from your database.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/owner/leads/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (res.ok) {
            setLeads((prev) => prev.filter((l) => l.id !== id));
            if (selectedLead?.id === id) setSelectedLead(null);
            showToast('Lead deleted');
          }
        } catch (err) {
          showToast('Failed to delete lead', 'error');
        }
      },
    });
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/owner/leads/export-csv', { headers: getHeaders() });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('CSV downloaded successfully');
    } catch (err) {
      showToast('CSV download failed', 'error');
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search)
  );

  if (loading || !config) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-semibold gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        <span>Loading owner dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-left space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{config.business?.name}</h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-300">
              v{config.config_version}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as <strong className="text-slate-800">{user?.name}</strong> ({user?.role})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {[
            { id: 'pricing', label: 'Pricing & Formulas', icon: DollarSign },
            { id: 'leads', label: `Leads (${leads.length})`, icon: Users },
            { id: 'history', label: 'Audit History', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: PRICING & FORMULAS */}
      {activeTab === 'pricing' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pricing Rates & Formula Multipliers</h2>
              <p className="text-xs text-slate-500">Edit material rates, waste factors, pitch multipliers, and fees.</p>
            </div>
            <button
              type="button"
              id="save-pricing-btn"
              disabled={saving}
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Pricing Changes</span>
            </button>
          </div>

          {/* Global Modifiers */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Global Modifiers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Waste Factor (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={Math.round((config.modifiers?.waste_factor || 0) * 100)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      modifiers: { ...config.modifiers, waste_factor: Number(e.target.value) / 100 },
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Permit Flat Fee ($)</label>
                <input
                  type="number"
                  value={config.modifiers?.permit_flat_fee || 0}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      modifiers: { ...config.modifiers, permit_flat_fee: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Range Spread (±%)</label>
                <input
                  type="number"
                  value={config.modifiers?.range_spread_pct || 12}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      modifiers: { ...config.modifiers, range_spread_pct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Question Rates and Options */}
          {config.questions?.map((q, qIndex) => (
            <div key={q.key} className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">{q.label}</h3>
              {q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {q.options.map((opt, optIndex) => (
                    <div key={opt.value} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="font-semibold text-xs text-slate-800">{opt.label}</div>
                      {opt.rate_per_sqft !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Rate / sq ft:</span>
                          <input
                            type="number"
                            step="0.05"
                            value={opt.rate_per_sqft}
                            onChange={(e) => {
                              const updated = [...config.questions];
                              updated[qIndex].options[optIndex].rate_per_sqft = Number(e.target.value);
                              setConfig({ ...config, questions: updated });
                            }}
                            className="w-24 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      )}
                      {opt.multiplier !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Multiplier:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={opt.multiplier}
                            onChange={(e) => {
                              const updated = [...config.questions];
                              updated[qIndex].options[optIndex].multiplier = Number(e.target.value);
                              setConfig({ ...config, questions: updated });
                            }}
                            className="w-24 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      )}
                      {opt.tear_off_per_sqft !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Tear-off / sq ft:</span>
                          <input
                            type="number"
                            step="0.05"
                            value={opt.tear_off_per_sqft}
                            onChange={(e) => {
                              const updated = [...config.questions];
                              updated[qIndex].options[optIndex].tear_off_per_sqft = Number(e.target.value);
                              setConfig({ ...config, questions: updated });
                            }}
                            className="w-24 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: HOMEOWNER LEADS */}
      {activeTab === 'leads' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search leads by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:border-amber-500 outline-none w-full sm:w-80"
            />
            <button
              type="button"
              id="export-csv-btn"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Estimated Quote</th>
                  <th className="p-3">Captured</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{lead.name}</td>
                      <td className="p-3 text-slate-600">
                        <div>{lead.phone}</div>
                        <div className="text-[11px] text-slate-400">{lead.email}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        ${lead.estimate_low?.toLocaleString()} – ${lead.estimate_high?.toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(lead.captured_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY & ROLLBACK */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Pricing Version History</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Version</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Updated By</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Rollback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.config_version} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      v{item.config_version}
                      {item.config_version === config.config_version && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{new Date(item.updated_at).toLocaleString()}</td>
                    <td className="p-3 font-medium text-slate-700">{item.updated_by || 'Dale Whitmore'}</td>
                    <td className="p-3 text-slate-600">{item.change_notes || 'Pricing adjustments'}</td>
                    <td className="p-3 text-right">
                      {item.config_version !== config.config_version && (
                        <button
                          type="button"
                          onClick={() => handleRollback(item.config_version)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Rollback</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAD DETAILS MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Lead Details: {selectedLead.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-2 text-slate-700">
              <p><strong>Phone:</strong> {selectedLead.phone}</p>
              <p><strong>Email:</strong> {selectedLead.email}</p>
              <p><strong>Quote Range:</strong> ${selectedLead.estimate_low?.toLocaleString()} – ${selectedLead.estimate_high?.toLocaleString()}</p>
              <p><strong>Config Version:</strong> v{selectedLead.config_version}</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 space-y-1">
                <span className="font-bold block text-slate-800">Answers Submitted:</span>
                {Object.entries(selectedLead.answers || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-600">
                    <span className="capitalize">{k.replace('_', ' ')}:</span>
                    <span className="font-semibold text-slate-900">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-600">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl cursor-pointer ${
                  confirmDialog.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST ALERTS */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
              toast.type === 'error' ? 'bg-rose-900 text-white border-rose-700' : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
