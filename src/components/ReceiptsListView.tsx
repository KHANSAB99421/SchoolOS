import React, { useState, useMemo } from 'react';
import { Payment, Student } from '../types';
import { formatINR, formatDate, exportToCSV } from '../utils/formatters';
import {
  Search,
  Printer,
  Download,
  ReceiptText,
  FileText,
  Calendar,
  Share2,
} from 'lucide-react';

interface ReceiptsListViewProps {
  payments: Payment[];
  students: Student[];
  onViewReceipt: (payment: Payment) => void;
}

export const ReceiptsListView: React.FC<ReceiptsListViewProps> = ({
  payments,
  students,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const student = studentMap.get(p.studentId);
      const studentName = student?.name || '';
      const admNo = student?.admissionNo || '';
      const receiptNo = p.receiptNo || '';

      const matchSearch =
        receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMode = selectedMode === 'all' || p.mode.toLowerCase() === selectedMode.toLowerCase();

      return matchSearch && matchMode;
    });
  }, [payments, studentMap, searchTerm, selectedMode]);

  const handleExportCSV = () => {
    const headers = ['Receipt No', 'Date', 'Student Name', 'Admission No', 'Class', 'Mode', 'Amount (INR)', 'Ref No', 'Collected By'];
    const rows = filteredPayments.map(p => {
      const s = studentMap.get(p.studentId);
      return [
        p.receiptNo,
        p.date,
        s?.name || 'Unknown',
        s?.admissionNo || '-',
        s ? `${s.class}-${s.section}` : '-',
        p.mode,
        p.amount,
        p.referenceNo || '-',
        p.collectedBy,
      ];
    });
    exportToCSV('SchoolOS_Receipts_Register', headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Receipts Register</h1>
          <p className="text-xs text-slate-500">
            Chronological archive of all sequential payment receipts issued.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          Export Receipts CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="receipt-search-input"
            type="text"
            placeholder="Search by receipt no, student name, admission no, or ref no..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Mode:</span>
          <select
            value={selectedMode}
            onChange={e => setSelectedMode(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No fee receipts found matching your query.
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
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4 text-center">Print / View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const student = studentMap.get(p.studentId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-950">
                        {p.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(p.date)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{student?.name || 'Unknown Student'}</span>
                        <span className="text-[11px] text-slate-400 font-mono">Adm: {student?.admissionNo}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {student ? `${student.class}-${student.section}` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.mode}
                        </span>
                        {p.referenceNo && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {p.referenceNo}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.collectedBy}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          id={`view-receipt-row-${p.id}`}
                          onClick={() => onViewReceipt(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Receipt
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
    </div>
  );
};
