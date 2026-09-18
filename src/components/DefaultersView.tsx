import React, { useState, useMemo } from 'react';
import { Student, FeeStructure, Payment, School } from '../types';
import { calculateDefaulters } from '../services/firestoreService';
import { formatINR, formatDate } from '../utils/formatters';
import {
  AlertTriangle,
  Search,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  Phone,
  User,
  ExternalLink,
} from 'lucide-react';

interface DefaultersViewProps {
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  school: School | null;
  onCollectFeeForStudent: (student: Student) => void;
}

export const DefaultersView: React.FC<DefaultersViewProps> = ({
  students,
  feeStructures,
  payments,
  school,
  onCollectFeeForStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute all defaulters
  const defaulters = useMemo(() => {
    return calculateDefaulters(students, feeStructures, payments);
  }, [students, feeStructures, payments]);

  // Unique classes for filter
  const classes = useMemo(() => {
    const set = new Set<string>();
    defaulters.forEach(d => set.add(d.student.class));
    return Array.from(set).sort();
  }, [defaulters]);

  const filteredDefaulters = useMemo(() => {
    return defaulters.filter(d => {
      const matchClass = selectedClass === 'all' || d.student.class === selectedClass;
      const matchSearch =
        d.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.student.parentMobile.includes(searchTerm) ||
        d.student.parentName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [defaulters, selectedClass, searchTerm]);

  const totalDefaulterAmount = useMemo(() => {
    return filteredDefaulters.reduce((acc, d) => acc + d.pendingAmount, 0);
  }, [filteredDefaulters]);

  const getWhatsAppReminderMessage = (d: typeof defaulters[0]) => {
    const schoolName = school?.name || 'School';
    return (
      `Dear ${d.student.parentName},\n\n` +
      `This is a gentle reminder from ${schoolName} regarding the pending school fee for your ward, ${d.student.name} (Class ${d.student.class}-${d.student.section}, Adm No: ${d.student.admissionNo}).\n\n` +
      `• Pending Amount: ${formatINR(d.pendingAmount)}\n` +
      `• Due Date: ${formatDate(d.overdueDate)} (${d.installmentName})\n\n` +
      `Kindly arrange to clear the outstanding dues at your earliest convenience to avoid disruption. If you have already paid, please ignore this notice.\n\n` +
      `Warm regards,\nAccounts Department\n${schoolName}`
    );
  };

  const handleSendWhatsApp = (d: typeof defaulters[0]) => {
    const cleanPhone = d.student.parentMobile.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(getWhatsAppReminderMessage(d));
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const handleCopyMessage = (d: typeof defaulters[0]) => {
    const text = getWhatsAppReminderMessage(d);
    navigator.clipboard.writeText(text);
    setCopiedId(d.student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Defaulters</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {filteredDefaulters.length} Overdue
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Students with outstanding fee balances past the installment due date.
          </p>
        </div>

        {/* Total Overdue Summary Pill */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
              Total Overdue Amount
            </span>
            <span className="text-lg font-bold font-mono text-amber-950">
              {formatINR(totalDefaulterAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="defaulter-search-input"
            type="text"
            placeholder="Search defaulters by student name, admission no, parent mobile..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Class:</span>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Defaulters List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDefaulters.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            🎉 No overdue fee defaulters found! All active students are up to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Overdue Term</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Pending Amount</th>
                  <th className="py-3 px-4">Parent / Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDefaulters.map(d => (
                  <tr key={d.student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          {d.student.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{d.student.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">Adm: {d.student.admissionNo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {d.student.class} - {d.student.section}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{d.installmentName}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 block font-medium">{formatDate(d.overdueDate)}</span>
                      <span className="text-[10px] text-rose-600 font-semibold font-mono">
                        {d.daysOverdue} day{d.daysOverdue === 1 ? '' : 's'} overdue
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-800 text-sm">
                      {formatINR(d.pendingAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="block font-medium text-slate-800">{d.student.parentName}</span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {d.student.parentMobile}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Send WhatsApp Reminder */}
                        <button
                          id={`whatsapp-reminder-btn-${d.student.id}`}
                          onClick={() => handleSendWhatsApp(d)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          title="Open WhatsApp with personalized reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </button>

                        {/* Copy Reminder Text */}
                        <button
                          onClick={() => handleCopyMessage(d)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copy Reminder Message"
                        >
                          {copiedId === d.student.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Quick Collect Fee */}
                        <button
                          onClick={() => onCollectFeeForStudent(d.student)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          title="Collect fee for this student"
                        >
                          Collect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
