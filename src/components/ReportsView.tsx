import React, { useState, useMemo } from 'react';
import { Student, FeeStructure, Payment, School } from '../types';
import { formatINR, formatDate, exportToCSV, getTodayISODate } from '../utils/formatters';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  CreditCard,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface ReportsViewProps {
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  school: School | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  feeStructures,
  payments,
  school,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'collection' | 'class-pending'>('collection');

  // Date range state (default to start of current month to today)
  const todayStr = getTodayISODate();
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  // Date-range filtered collections
  const dateFilteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.date) return false;
      return p.date >= fromDate && p.date <= toDate;
    });
  }, [payments, fromDate, toDate]);

  // Mode breakdown stats for date range
  const modeBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      Cash: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      Card: { count: 0, total: 0 },
      Cheque: { count: 0, total: 0 },
    };

    let grandTotal = 0;

    dateFilteredPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      grandTotal += amt;
      const m = p.mode || 'Cash';
      if (!counts[m]) {
        counts[m] = { count: 0, total: 0 };
      }
      counts[m].count++;
      counts[m].total += amt;
    });

    return { counts, grandTotal };
  }, [dateFilteredPayments]);

  // Class-wise Pending Report calculation
  const classPendingData = useMemo(() => {
    const map = new Map<
      string,
      { studentCount: number; expected: number; collected: number }
    >();

    // 1. Expected from students
    students.forEach(s => {
      const cls = s.class.trim();
      const cur = map.get(cls) || { studentCount: 0, expected: 0, collected: 0 };
      cur.studentCount++;
      const fs = feeStructures.find(f => f.class.trim().toLowerCase() === cls.toLowerCase());
      cur.expected += fs?.totalAnnualAmount || 0;
      map.set(cls, cur);
    });

    // 2. Collected from payments
    payments.forEach(p => {
      const s = studentMap.get(p.studentId);
      if (s) {
        const cls = s.class.trim();
        const cur = map.get(cls);
        if (cur) {
          cur.collected += Number(p.amount) || 0;
        }
      }
    });

    const rows = Array.from(map.entries()).map(([className, data]) => {
      const pending = Math.max(0, data.expected - data.collected);
      const percentage = data.expected > 0 ? Math.round((data.collected / data.expected) * 100) : 0;
      return {
        className,
        ...data,
        pending,
        percentage,
      };
    });

    // Total row
    const totals = rows.reduce(
      (acc, r) => {
        acc.studentCount += r.studentCount;
        acc.expected += r.expected;
        acc.collected += r.collected;
        acc.pending += r.pending;
        return acc;
      },
      { studentCount: 0, expected: 0, collected: 0, pending: 0, percentage: 0 }
    );
    totals.percentage = totals.expected > 0 ? Math.round((totals.collected / totals.expected) * 100) : 0;

    return { rows, totals };
  }, [students, feeStructures, payments, studentMap]);

  // CSV Exporters
  const handleExportCollectionCSV = () => {
    const headers = ['Receipt No', 'Date', 'Student Name', 'Admission No', 'Class', 'Mode', 'Amount (INR)', 'Collected By'];
    const rows = dateFilteredPayments.map(p => {
      const s = studentMap.get(p.studentId);
      return [
        p.receiptNo,
        p.date,
        s?.name || 'Unknown',
        s?.admissionNo || '-',
        s ? `${s.class}-${s.section}` : '-',
        p.mode,
        p.amount,
        p.collectedBy,
      ];
    });
    exportToCSV(`SchoolOS_Collection_Report_${fromDate}_to_${toDate}`, headers, rows);
  };

  const handleExportClassPendingCSV = () => {
    const headers = ['Class', 'Students', 'Total Expected (INR)', 'Total Collected (INR)', 'Pending Due (INR)', 'Collection %'];
    const rows = classPendingData.rows.map(r => [
      r.className,
      r.studentCount,
      r.expected,
      r.collected,
      r.pending,
      `${r.percentage}%`,
    ]);
    // Add totals row
    rows.push([
      'TOTAL',
      classPendingData.totals.studentCount,
      classPendingData.totals.expected,
      classPendingData.totals.collected,
      classPendingData.totals.pending,
      `${classPendingData.totals.percentage}%`,
    ]);
    exportToCSV(`SchoolOS_Classwise_Pending_Report_${school?.academicYear || '2026-27'}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports</h1>
          <p className="text-xs text-slate-500">
            Audit-ready collection summaries and class-level receivables.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveReportTab('collection')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeReportTab === 'collection'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Date-Range Collection
          </button>
          <button
            onClick={() => setActiveReportTab('class-pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeReportTab === 'class-pending'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Class-Wise Pending Dues
          </button>
        </div>
      </div>

      {/* REPORT 1: DATE-RANGE COLLECTION */}
      {activeReportTab === 'collection' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">From Date:</span>
                <input
                  id="report-from-date"
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">To Date:</span>
                <input
                  id="report-to-date"
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                />
              </div>
            </div>

            <button
              onClick={handleExportCollectionCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer self-start md:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Export to CSV
            </button>
          </div>

          {/* Mode-wise Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 bg-indigo-900 text-white rounded-2xl shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-indigo-200 uppercase tracking-wider block font-semibold">
                Grand Collection
              </span>
              <span className="text-xl font-bold font-mono mt-1 block">
                {formatINR(modeBreakdown.grandTotal)}
              </span>
              <span className="text-[11px] text-indigo-200/80 mt-1 block">
                {dateFilteredPayments.length} receipt{dateFilteredPayments.length === 1 ? '' : 's'}
              </span>
            </div>

            {Object.entries(modeBreakdown.counts).map(([mode, data]) => (
              <div key={mode} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  {mode}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                  {formatINR(data.total)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{data.count} payment(s)</span>
              </div>
            ))}
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {dateFilteredPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No fee collections found between {formatDate(fromDate)} and {formatDate(toDate)}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount (INR)</th>
                      <th className="py-3 px-4">Collected By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dateFilteredPayments.map(p => {
                      const student = studentMap.get(p.studentId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-900">
                            {p.receiptNo}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{formatDate(p.date)}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{student?.name || '-'}</td>
                          <td className="py-3 px-4 text-slate-700">
                            {student ? `${student.class}-${student.section}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {p.mode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                            {formatINR(p.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{p.collectedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT 2: CLASS-WISE PENDING */}
      {activeReportTab === 'class-pending' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Aggregated annual expected fees vs actual collections per class.
            </p>
            <button
              onClick={handleExportClassPendingCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Export Class Summary CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4 text-center">Enrolled</th>
                    <th className="py-3.5 px-4 text-right">Expected Fee</th>
                    <th className="py-3.5 px-4 text-right">Collected Fee</th>
                    <th className="py-3.5 px-4 text-right">Pending Balance</th>
                    <th className="py-3.5 px-4 w-44">Collection Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classPendingData.rows.map(row => (
                    <tr key={row.className} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{row.className}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-medium">
                        {row.studentCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatINR(row.expected)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatINR(row.collected)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                        {formatINR(row.pending)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{row.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, row.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-xs">
                    <td className="py-3.5 px-4 text-slate-900 uppercase tracking-wider">Total School</td>
                    <td className="py-3.5 px-4 text-center text-slate-900">
                      {classPendingData.totals.studentCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 text-sm">
                      {formatINR(classPendingData.totals.expected)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm">
                      {formatINR(classPendingData.totals.collected)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700 text-sm">
                      {formatINR(classPendingData.totals.pending)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-900 font-bold">
                      {classPendingData.totals.percentage}% Overall
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
