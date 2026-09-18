import React, { useState, useEffect, useMemo } from 'react';
import { Student, FeeStructure, Payment, PaymentMode, HeadBreakup } from '../types';
import { useAuth } from '../context/AuthContext';
import { collectFeePayment, calculateStudentLedger } from '../services/firestoreService';
import { formatINR, formatDate, getTodayISODate } from '../utils/formatters';
import {
  Search,
  Coins,
  Receipt,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  Printer,
  Sparkles,
  CreditCard,
} from 'lucide-react';

interface CollectFeeViewProps {
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  selectedStudentId?: string | null;
  onRefresh: () => Promise<void>;
  onPaymentSuccess: (payment: Payment, student: Student) => void;
}

export const CollectFeeView: React.FC<CollectFeeViewProps> = ({
  students,
  feeStructures,
  payments,
  selectedStudentId,
  onRefresh,
  onPaymentSuccess,
}) => {
  const { schoolId, currentSchool, userProfile } = useAuth();

  // Search & Selected Student state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode] = useState<PaymentMode>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayISODate());
  const [remarks, setRemarks] = useState('');
  const [headBreakup, setHeadBreakup] = useState<HeadBreakup>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial selection if provided via prop
  useEffect(() => {
    if (selectedStudentId) {
      const st = students.find(s => s.id === selectedStudentId);
      if (st) setSelectedStudent(st);
    } else if (!selectedStudent && students.length > 0) {
      setSelectedStudent(students[0]);
    }
  }, [selectedStudentId, students]);

  // Compute ledger for the currently selected student
  const ledger = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentLedger(selectedStudent, feeStructures, payments);
  }, [selectedStudent, feeStructures, payments]);

  // Auto-allocate head breakup whenever amount changes
  useEffect(() => {
    if (!ledger || amount <= 0) {
      setHeadBreakup({});
      return;
    }

    let remainingToAllocate = amount;
    const newBreakup: HeadBreakup = {};

    // Prioritize heads that still have unpaid balance
    for (const h of ledger.headWise) {
      if (remainingToAllocate <= 0) {
        newBreakup[h.headName] = 0;
        continue;
      }
      const toAssign = Math.min(remainingToAllocate, h.balance > 0 ? h.balance : remainingToAllocate);
      newBreakup[h.headName] = toAssign;
      remainingToAllocate -= toAssign;
    }

    // If remainingToAllocate is still left (e.g. overpayment/advance), add to Tuition Fee or first head
    if (remainingToAllocate > 0 && ledger.headWise.length > 0) {
      const firstHead = ledger.headWise[0].headName;
      newBreakup[firstHead] = (newBreakup[firstHead] || 0) + remainingToAllocate;
    }

    setHeadBreakup(newBreakup);
  }, [amount, ledger]);

  // Filter student list for dropdown / search
  const searchedStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 8);
    const q = studentSearch.toLowerCase();
    return students.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.parentMobile.includes(q) ||
        s.class.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    setAmount(0);
    setRemarks('');
    setReferenceNo('');
    setErrorMessage('');
  };

  const handleQuickPayFull = () => {
    if (ledger) {
      setAmount(ledger.balance);
    }
  };

  const handleQuickPayInstallment = (instAmount: number) => {
    setAmount(instAmount);
  };

  const handleHeadBreakupChange = (headName: string, val: number) => {
    setHeadBreakup(prev => ({
      ...prev,
      [headName]: Math.max(0, val),
    }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Please select a student.');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('Payment amount must be greater than ₹0.');
      return;
    }

    // Check head breakup sum
    const breakupTotal = Object.values(headBreakup).reduce((acc, v) => acc + (Number(v) || 0), 0);
    if (breakupTotal !== amount) {
      setErrorMessage(
        `Head breakdown total (${formatINR(breakupTotal)}) does not match total amount (${formatINR(
          amount
        )}). Please adjust heads.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const schoolCode = currentSchool?.name ? currentSchool.name.substring(0, 3) : 'SCH';
      const academicYear = currentSchool?.academicYear || '2026-2027';

      const payment = await collectFeePayment(schoolId, academicYear, schoolCode, {
        studentId: selectedStudent.id,
        amount,
        mode,
        date: paymentDate,
        headBreakup,
        collectedBy: userProfile?.name || 'School Accountant',
        remarks: remarks.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
      });

      await onRefresh();
      // Trigger receipt modal
      onPaymentSuccess(payment, selectedStudent);
      // Reset form
      setAmount(0);
      setRemarks('');
      setReferenceNo('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to record fee payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Collect School Fee</h1>
        <p className="text-xs text-slate-500">
          Verify student ledger, record payment, and generate sequential receipt number.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Student Selector & Full Ledger (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Student Search & Picker Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Student
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="collect-student-search"
                type="text"
                placeholder="Search student by name, admission no, or phone..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
              />
            </div>

            {/* Quick results if search active */}
            {studentSearch && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg">
                {searchedStudents.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">No students found</div>
                ) : (
                  searchedStudents.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleSelectStudent(st)}
                      className="w-full text-left p-2.5 hover:bg-indigo-50/70 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{st.name}</span>
                        <span className="text-[11px] text-slate-500">
                          Class {st.class}-{st.section} • Adm: {st.admissionNo}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{st.parentMobile}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Current Selected Student Card */}
            {selectedStudent && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedStudent.name}</h3>
                    <p className="text-xs text-slate-600">
                      Class: <strong className="text-slate-800">{selectedStudent.class} - {selectedStudent.section}</strong>{' '}
                      • Adm No: <span className="font-mono text-indigo-900 font-medium">{selectedStudent.admissionNo}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Parent: {selectedStudent.parentName} ({selectedStudent.parentMobile})
                    </p>
                  </div>
                </div>

                {ledger?.isOverdue && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Overdue Fee
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LEDGER DETAILS */}
          {ledger && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Student Fee Ledger</h2>
                  <p className="text-xs text-slate-500">
                    Expected vs Paid vs Balance breakdown for academic session
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Current Outstanding
                  </span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      ledger.balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatINR(ledger.balance)}
                  </span>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Annual Expected
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatINR(ledger.totalExpected)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 uppercase tracking-wider block font-semibold">
                    Total Paid
                  </span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {formatINR(ledger.totalPaid)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-600 uppercase tracking-wider block font-semibold">
                    Balance Due
                  </span>
                  <span className="text-sm font-bold text-amber-800 font-mono">
                    {formatINR(ledger.balance)}
                  </span>
                </div>
              </div>

              {/* Head-wise Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  Head-Wise Ledger Breakdown
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Fee Head</th>
                        <th className="py-2.5 px-3 text-right">Expected</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.headWise.map(h => (
                        <tr key={h.headName} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{h.headName}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatINR(h.expected)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-medium">
                            {formatINR(h.paid)}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono font-bold ${
                              h.balance > 0 ? 'text-amber-700' : 'text-slate-400'
                            }`}
                          >
                            {formatINR(h.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installments timeline if any */}
              {ledger.feeStructure?.installments && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Installment Due Schedule
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ledger.feeStructure.installments.map(inst => {
                      const isPast = new Date(inst.dueDate) < new Date();
                      return (
                        <div
                          key={inst.name}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 block">{inst.name}</span>
                            <span className={`text-[10px] ${isPast ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                              Due: {formatDate(inst.dueDate)} {isPast && '• Passed'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {formatINR(inst.amount)}
                            </span>
                            {ledger.balance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleQuickPayInstallment(inst.amount)}
                                className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                              >
                                Pay this
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment History Timeline for this student */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  Past Payment History ({ledger.payments.length})
                </h3>
                {ledger.payments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No previous payments recorded for this student.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                    {ledger.payments.map(p => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <span className="font-mono font-bold text-indigo-900 block">{p.receiptNo}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatDate(p.date)} • Mode: {p.mode}
                            {p.referenceNo ? ` • Ref: ${p.referenceNo}` : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatINR(p.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">by {p.collectedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Payment Collection Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 sticky top-20">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Record Fee Payment</h2>
                <p className="text-[11px] text-slate-500">Generates sequential receipt on submission</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Amount input & Quick buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Amount to Collect (INR) *</label>
                  {ledger && ledger.balance > 0 && (
                    <button
                      type="button"
                      onClick={handleQuickPayFull}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Pay Full Due ({formatINR(ledger.balance)})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-base">
                    ₹
                  </span>
                  <input
                    id="fee-amount-input"
                    type="number"
                    min="1"
                    required
                    placeholder="Enter amount"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Payment Mode *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Cash', 'UPI', 'Card', 'Cheque'] as PaymentMode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      id={`payment-mode-${m.toLowerCase()}`}
                      onClick={() => setMode(m)}
                      className={`py-2 px-2 rounded-xl font-bold text-center text-xs transition-all cursor-pointer border ${
                        mode === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number if not cash */}
              {mode !== 'Cash' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {mode === 'UPI'
                      ? 'UPI Transaction / UTR No'
                      : mode === 'Card'
                      ? 'POS Auth / Card Reference No'
                      : 'Cheque No & Bank Name'}
                  </label>
                  <input
                    id="payment-reference-input"
                    type="text"
                    placeholder="e.g. UTR-9821839"
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>
              )}

              {/* Payment Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    id="payment-date-input"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Collected By</label>
                  <input
                    type="text"
                    disabled
                    value={userProfile?.name || 'Authorized Staff'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Head-wise Breakup Allocation */}
              {ledger && ledger.headWise.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Head Allocation Breakup</label>
                    <span className="text-[11px] text-indigo-700 font-medium">Auto-allocated</span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {ledger.headWise.map(h => (
                      <div key={h.headName} className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 truncate max-w-[140px]">{h.headName}</span>
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={headBreakup[h.headName] ?? 0}
                            onChange={e => handleHeadBreakupChange(h.headName, Number(e.target.value) || 0)}
                            className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  id="payment-remarks-input"
                  type="text"
                  placeholder="e.g. Q1 fee cleared, paid by father"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              {/* Submit Button */}
              <button
                id="submit-fee-payment-btn"
                type="submit"
                disabled={isSubmitting || !selectedStudent || amount <= 0}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-4 h-4" />
                {isSubmitting ? 'Recording & Generating Receipt...' : 'Confirm Payment & Generate Receipt'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
