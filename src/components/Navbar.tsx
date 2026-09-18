import React from 'react';
import { useAuth } from '../context/AuthContext';
import { School as SchoolIcon, Shield, Wallet, LogOut, Menu, User, RefreshCw } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  activeView: string;
  onOpenLoginModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenLoginModal }) => {
  const { currentSchool, role, userProfile, logout, loginAsDemo } = useAuth();

  const handleRoleToggle = (targetRole: UserRole) => {
    loginAsDemo(targetRole);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Hamburger & School Brand */}
          <div className="flex items-center gap-3">
            <button
              id="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs font-bold">
                <SchoolIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base tracking-tight leading-tight">
                    {currentSchool?.name || 'SchoolOS'}
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {currentSchool?.academicYear || '2026-2027'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Multi-Tenant School Fee Management
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Role badge, quick switcher, user & logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Role Tester Switcher */}
            <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Role:</span>
              <button
                id="role-switch-admin-btn"
                onClick={() => handleRoleToggle('admin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Admin (Full Access)"
              >
                Admin
              </button>
              <button
                id="role-switch-accountant-btn"
                onClick={() => handleRoleToggle('accountant')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  role === 'accountant'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Accountant (Collect & Receipts only)"
              >
                Accountant
              </button>
            </div>

            {/* Current Active Role Badge (Mobile/Compact) */}
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                role === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
              <span className="capitalize">{role}</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {userProfile?.name || 'Staff User'}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">{role}</span>
              </div>
            </div>

            {/* Switch School / Tenant Button */}
            {onOpenLoginModal && (
              <button
                id="switch-tenant-btn"
                onClick={onOpenLoginModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                title="Switch Tenant School or Login"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Switch School</span>
              </button>
            )}

            {/* Logout button */}
            <button
              id="logout-btn"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
