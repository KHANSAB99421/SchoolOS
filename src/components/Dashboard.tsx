import React, { useMemo } from 'react';
import { School, Student, FeeStructure, Payment } from '../types';
import { formatINR, formatDate, getTodayISODate } from '../utils/formatters';
import {
  TrendingUp,
  CreditCard,
  Clock,
  Calendar,
  ArrowUpRight,
  Coins,
  UserPlus,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { NavView } from './Sidebar';

interface DashboardProps {
  school: School | null;
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  onNavigate: (view: NavView) => void;
  onViewReceipt: (payment: Payment) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  school,
  students,
  feeStructures,
  payments,
  onNavigate,
  onViewReceipt,
}) => {
  // Metrics calculation
  const metrics = useMemo(() => {
    // 1. Total Expected Fee for all active students
    let expectedTotal = 0;
    const structureMap = new Map<string, number>();
    feeStructures.forEach(fs => {
      structureMap.set(fs.class.trim().toLowerCase(), fs.totalAnnualAmount || 0);
    });

    const activeStudents = students.filter(s => s.status !== 'inactive');
    activeStudents.forEach(s => {
      const classAmt = structureMap.get(s.class.trim().toLowerCase()) || 0;
      expectedTotal += classAmt;
    });

    // 2. Total Collected
    const collectedTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // 3. Pending
    const pendingTotal = Math.max(0, expectedTotal - collectedTotal);

    // 4. Today's collection
    const todayStr = getTodayISODate();
    const todayPayments = payments.filter(p => p.date === todayStr);
    const todayCollected = todayPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Collection percentage
    const collectionPercentage = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;

    return {
      expectedTotal,
      collectedTotal,
      pendingTotal,
      todayCollected,
      todayCount: todayPayments.length,
      collectionPercentage,
      activeStudentCount: activeStudents.length,
    };
  }, [students, feeStructures, payments]);

  // Month-wise collection aggregation
  const monthData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Indian academic year order: Apr to Mar
    const academicOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // 3 is Apr

    const monthlyTotals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      monthlyTotals[i] = 0;
    }

    payments.forEach(p => {
      if (p.date) {
        const d = new Date(p.date);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          monthlyTotals[m] = (monthlyTotals[m] || 0) + (Number(p.amount) || 0);
        }
      }
    });

    const maxMonth = Math.max(...Object.values(monthlyTotals), 10000);

    return academicOrder.map(monthIdx => ({
      monthName: monthNames[monthIdx],
      amount: monthlyTotals[monthIdx] || 0,
      percentage: Math.min(100, Math.round(((monthlyTotals[monthIdx] || 0) / maxMonth) * 100)),
    }));
  }, [payments]);

  // Class-wise summary
  const classBreakdown = useMemo(() => {
    const map = new Map<string, { expected: number; collected: number; studentCount: number }>();

    students.forEach(s => {
      const cls = s.class.trim();
      const current = map.get(cls) || { expected: 0, collected: 0, studentCount: 0 };
      current.studentCount++;
      const fs = feeStructures.find(f => f.class.trim().toLowerCase() === cls.toLowerCase());
      current.expected += fs?.totalAnnualAmount || 0;
      map.set(cls, current);
    });

    // Add collected
    payments.forEach(p => {
      const st = students.find(s => s.id === p.studentId);
      if (st) {
        const cls = st.class.trim();
        const current = map.get(cls);
        if (current) {
          current.collected += Number(p.amount) || 0;
        }
      }
    });

    return Array.from(map.entries()).map(([className, data]) => ({
      className,
      ...data,
      pending: Math.max(0, data.expected - data.collected),
      percentage: data.expected > 0 ? Math.round((data.collected / data.expected) * 100) : 0,
    }));
  }, [students, feeStructures, payments]);

  const recentPayments = payments.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session: {school?.academicYear || '2026-2027'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {school?.name || 'School Fee Overview'}
            </h1>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Real-time fee tracking, ledger balances, and sequential receipt records.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="dashboard-collect-fee-btn"
              onClick={() => onNavigate('collect-fee')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-indigo-950 hover:bg-indigo-50 transition-all shadow-md cursor-pointer"
            >
              <Coins className="w-4 h-4 text-indigo-600" />
              Collect Fee
            </button>
            <button
              id="dashboard-add-student-btn"
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-700/80 hover:bg-indigo-700 text-white border border-indigo-500/50 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Manage Students
            </button>
          </div>
        </div>
      </div>

      {/* 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expected
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatINR(metrics.expectedTotal)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              For {metrics.activeStudentCount} enrolled students
            </p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Total Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
              {formatINR(metrics.collectedTotal)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.collectionPercentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-emerald-700 font-mono">
                {metrics.collectionPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Pending Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">
              {formatINR(metrics.pendingTotal)}
            </div>
            <p className="text-xs text-amber-600/80 mt-1 flex items-center gap-1">
              <button
                onClick={() => onNavigate('defaulters')}
                className="hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                View overdue defaulters <ArrowUpRight className="w-3 h-3" />
              </button>
            </p>
          </div>
        </div>

        {/* Today's Collection */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Today's Collection
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-900 font-mono tracking-tight">
              {formatINR(metrics.todayCollected)}
            </div>
            <p className="text-xs text-indigo-600/80 mt-1">
              {metrics.todayCount} receipt{metrics.todayCount === 1 ? '' : 's'} recorded today
            </p>
          </div>
        </div>
      </div>

      {/* MONTH-WISE COLLECTION BAR CHART */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Month-Wise Fee Collection</h2>
            <p className="text-xs text-slate-500">
              Distribution of fee collections across academic year cycle (Apr - Mar)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
              Collected
            </span>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="pt-8 pb-2">
          <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-44 sm:h-52 border-b border-slate-200 px-2">
            {monthData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-md shadow-md whitespace-nowrap">
                  <span>{formatINR(item.amount)}</span>
                </div>

                {/* Amount text for higher bars */}
                {item.amount > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 font-mono mb-1 scale-90 sm:scale-100 hidden sm:block truncate">
                    {Math.round(item.amount / 1000)}k
                  </span>
                )}

                {/* The Bar */}
                <div
                  className="w-full max-w-[28px] bg-indigo-600 group-hover:bg-indigo-700 rounded-t-md transition-all duration-300 min-h-[4px]"
                  style={{
                    height: `${Math.max(item.percentage, item.amount > 0 ? 6 : 2)}%`,
                    opacity: item.amount > 0 ? 1 : 0.25,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Month Labels */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3 px-2 pt-2 text-center text-[10px] sm:text-xs font-semibold text-slate-500">
            {monthData.map((item, idx) => (
              <div key={idx} className="truncate">
                {item.monthName}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: Recent Collections & Class-Wise Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Collections Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Collections</h2>
              <p className="text-xs text-slate-500">Latest receipts generated</p>
            </div>
            <button
              onClick={() => onNavigate('receipts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              View all receipts →
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No payments recorded yet. Click "Collect Fee" to record your first payment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.map(p => {
                    const student = students.find(s => s.id === p.studentId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-indigo-950">
                          {p.receiptNo}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block">{student?.name || 'Student'}</span>
                          <span className="text-[11px] text-slate-500">
                            {student?.class} - {student?.section}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.mode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{formatDate(p.date)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            id={`view-receipt-btn-${p.id}`}
                            onClick={() => onViewReceipt(p)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Receipt"
                          >
                            <FileText className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Class-wise Progress (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Class-wise Status</h2>
              <p className="text-xs text-slate-500">Collection by standard</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Full Report
            </button>
          </div>

          <div className="space-y-4">
            {classBreakdown.slice(0, 5).map(c => (
              <div key={c.className} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{c.className}</span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {formatINR(c.collected)} / {formatINR(c.expected)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, c.percentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{c.studentCount} students</span>
                  <span className="font-semibold text-indigo-900">{c.percentage}% collected</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
