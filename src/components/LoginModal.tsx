import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  School,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, loginAsDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials or login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = (role: 'admin' | 'accountant', schoolId = 'dps-rk-puram') => {
    loginAsDemo(role, schoolId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center mx-auto mb-3">
            <School className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="text-xl font-bold">Sign In to SchoolOS</h2>
          <p className="text-xs text-indigo-200 mt-1">
            Multi-Tenant School Fee Management System
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Instant 1-Click Role Login for Evaluation */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              1-Click Demo Profiles (Instant Access)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="demo-admin-login-btn"
                onClick={() => handleDemo('admin')}
                className="p-3 text-left bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-indigo-950 font-bold">
                  <span>DPS Admin</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[10px] text-indigo-700 block mt-0.5">Full System Rights</span>
              </button>

              <button
                type="button"
                id="demo-accountant-login-btn"
                onClick={() => handleDemo('accountant')}
                className="p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-900 font-bold">
                  <span>DPS Cashier</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Collect & Receipts</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDemo('admin', 'st-xaviers-mumbai')}
              className="w-full p-2.5 text-left bg-purple-50/50 hover:bg-purple-100/50 border border-purple-200/70 rounded-xl transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-purple-950 block">Tenant 2: St. Xavier's High School</span>
                <span className="text-[10px] text-purple-700">Test Multi-Tenant Isolation</span>
              </div>
              <Building className="w-4 h-4 text-purple-600" />
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              Or with Email / Password
            </span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email-input"
                  type="email"
                  placeholder="admin@schoolos.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In with Email'}
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Continue without signing in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
