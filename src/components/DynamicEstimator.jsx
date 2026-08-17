import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  RefreshCw,
  Calculator,
  ShieldCheck,
} from 'lucide-react';

export const DynamicEstimator = ({ onEstimateCompleted }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(0); // 0 = Start, 1..N = Questions, N+1 = Contact/Quote, N+2 = Success
  const [answers, setAnswers] = useState({});
  const [contact, setContact] = useState({ name: '', phone: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/public-config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        const initial = {};
        data.questions?.forEach((q) => {
          if (q.type === 'number') initial[q.key] = 2000;
          else if (q.options?.length) initial[q.key] = q.options[0].value;
        });
        setAnswers(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const questions = config?.questions || [];
  const totalQuestions = questions.length;
  const currentQ = step >= 1 && step <= totalQuestions ? questions[step - 1] : null;

  const handleNext = () => {
    setSubmitError(null);
    if (currentQ && currentQ.required && !answers[currentQ.key]) {
      setSubmitError('Please select an option to continue.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setSubmitError(null);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!contact.name.trim() || !contact.phone.trim() || !contact.email.includes('@')) {
      setSubmitError('Please enter your full name, phone number, and a valid email.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quote');

      setResult(data);
      setStep(totalQuestions + 2); // Result screen
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      if (onEstimateCompleted) onEstimateCompleted();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-medium gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        <span>Loading instant estimator...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 text-left">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div
            className="bg-amber-500 h-2 transition-all duration-300"
            style={{ width: `${((step + 1) / (totalQuestions + 3)) * 100}%` }}
          />
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Instant Roofing Price Estimator
              </h1>
            </div>
            <button
              type="button"
              id="start-estimate-btn"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              <span>Calculate My Roof Quote</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1..N: Dynamic Question Step */}
        {currentQ && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Question {step} of {totalQuestions}</span>
              <span>{config?.business?.name}</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900">{currentQ.label}</h2>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Select Options */}
            {currentQ.type === 'select' && currentQ.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt) => {
                  const isSelected = String(answers[currentQ.key]) === String(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [currentQ.key]: opt.value })}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40 text-slate-950 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="font-semibold text-sm">{opt.label}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-600 bg-amber-500 text-slate-950' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Number Input */}
            {currentQ.type === 'number' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={currentQ.min || 100}
                    max={currentQ.max || 20000}
                    step={50}
                    value={answers[currentQ.key] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQ.key]: Number(e.target.value) })}
                    className="w-48 px-4 py-3 text-xl font-bold text-slate-900 border border-slate-300 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none"
                  />
                  <span className="text-base font-semibold text-slate-500">{currentQ.unit || 'sq ft'}</span>
                </div>
                <input
                  type="range"
                  min={currentQ.min || 300}
                  max={currentQ.max || 8000}
                  step={50}
                  value={answers[currentQ.key] || 2000}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.key]: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {/* Nav Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step N+1: Contact Form */}
        {step === totalQuestions + 1 && (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Final Step</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Where should we deliver your estimate?</h2>
              <p className="text-slate-500 text-xs mt-1">
                Enter your contact info to unlock your customized cost range and quote summary.
              </p>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Your Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    placeholder="Jane Smith"
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      placeholder="(614) 555-0199"
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-100 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                id="submit-quote-btn"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg cursor-pointer transition-all"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Calculating Quote...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>View Instant Quote</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step N+2: Quote Result */}
        {step === totalQuestions + 2 && result && (
          <div className="p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Official Estimate Generated
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                ${result.estimate_low?.toLocaleString()} – ${result.estimate_high?.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ref ID: #{result.lead_id} • Calculated by {result.business_name || 'Northline'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="font-bold text-slate-800 pb-1 border-b border-slate-200">
                Included in Your Quote:
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Roof Area:</span>
                <span className="font-semibold text-slate-900">{answers.roof_area || 2000} sq ft</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Selected Material:</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {String(answers.material || '').replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tear-off & Disposal:</span>
                <span className="font-semibold text-slate-900">Included</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>City Permits & Inspections:</span>
                <span className="font-semibold text-slate-900">Included</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(0);
                setContact({ name: '', phone: '', email: '', notes: '' });
              }}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Start New Calculation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
