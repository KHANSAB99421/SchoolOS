import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Coins,
  ReceiptText,
  Users,
  Layers,
  AlertTriangle,
  BarChart3,
  Settings,
  ShieldCheck,
  Lock,
  X,
} from 'lucide-react';

export type NavView =
  | 'dashboard'
  | 'collect-fee'
  | 'receipts'
  | 'students'
  | 'fee-structure'
  | 'defaulters'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpen,
  onClose,
}) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  interface NavItem {
    id: NavView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'collect-fee', label: 'Collect Fee', icon: Coins, badge: 'Daily' },
    { id: 'receipts', label: 'Receipts', icon: ReceiptText },
    { id: 'students', label: 'Students', icon: Users, badge: !isAdmin ? 'Read Only' : undefined },
    { id: 'fee-structure', label: 'Fee Structure', icon: Layers, adminOnly: true },
    { id: 'defaulters', label: 'Defaulters', icon: AlertTriangle, adminOnly: true },
    { id: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  const handleSelect = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) {
      return;
    }
    onSelectView(item.id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-40 lg:z-10 h-full lg:h-[calc(100vh-4rem)] w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <span className="font-bold text-white tracking-wide">Navigation</span>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Notice Card */}
        <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-white uppercase tracking-wider text-[10px]">
              Access: {role}
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {isAdmin
              ? 'Full management authority enabled.'
              : 'Accountant role: Fee Collection, Receipts & Student directory.'}
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = currentView === item.id;
            const isLocked = item.adminOnly && !isAdmin;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item)}
                disabled={isLocked}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isLocked
                    ? 'text-slate-600 hover:bg-transparent cursor-not-allowed opacity-60'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocked && <Lock className="w-3 h-3 text-slate-500" />}
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
          <p className="font-semibold text-slate-400">SchoolOS v2.4</p>
          <p className="text-[10px]">Secure Multi-Tenant Firestore</p>
        </div>
      </aside>
    </>
  );
};
