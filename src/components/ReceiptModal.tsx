import React, { useRef } from 'react';
import { School, Student, Payment } from '../types';
import { formatINR, numberToWordsINR, formatDate } from '../utils/formatters';
import { Printer, Download, Share2, X, CheckCircle, School as SchoolIcon } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  student: Student | null;
  school: School | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  student,
  school,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!student.parentMobile) return;
    const phone = student.parentMobile.replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Dear ${student.parentName},\nFee payment receipt ${payment.receiptNo} of ${formatINR(payment.amount)} for ${student.name} (Class ${student.class}-${student.section}) has been recorded at ${school?.name || 'School'}.\nPayment Date: ${formatDate(payment.date)}\nMode: ${payment.mode}\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const headEntries = Object.entries(payment.headBreakup || {}).filter(([_, amt]) => Number(amt) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Header action bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-slate-800">Fee Receipt Generated</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-mono px-2 py-0.5 rounded-full font-medium">
              {payment.receiptNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              id="share-whatsapp-btn"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              title="Share receipt summary on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              id="close-receipt-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A5 RECEIPT CONTAINER */}
        <div
          ref={receiptRef}
          id="printable-receipt-card"
          className="p-6 sm:p-8 bg-white text-slate-900 text-sm print:p-4 print:text-xs"
          style={{ minHeight: '520px' }}
        >
          {/* Top School Header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-indigo-900/20 mb-4">
            <div className="flex items-center gap-3">
              {school?.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.name}
                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1"
                />
              ) : (
                <div className="w-14 h-14 bg-indigo-700 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-xs">
                  <SchoolIcon className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 print:text-lg">
                  {school?.name || 'SchoolOS Academy'}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {school?.address || 'Main Campus, India'}
                  {school?.phone && ` • Tel: ${school.phone}`}
                </p>
                {school?.affiliationNo && (
                  <p className="text-[11px] text-slate-500 font-medium">Affiliation No: {school.affiliationNo}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-bold tracking-wide uppercase text-xs">
                Fee Receipt
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1.5">
                Receipt No: <span className="font-mono text-indigo-900">{payment.receiptNo}</span>
              </p>
              <p className="text-xs text-slate-600">Date: {formatDate(payment.date)}</p>
              <p className="text-xs text-slate-500">Session: {payment.academicYear || school?.academicYear || '2026-2027'}</p>
            </div>
          </div>

          {/* Student & Parent Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs">
            <div>
              <span className="block text-slate-400 font-medium text-[10px] uppercase tracking-wider">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{student.name}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium text-[10px] uppercase tracking-wider">Class & Section</span>
              <span className="font-semibold text-slate-800">
                {student.class} - {student.section}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium text-[10px] uppercase tracking-wider">Admission / Roll No</span>
              <span className="font-medium text-slate-800 font-mono">
                {student.admissionNo} / {student.rollNo || '-'}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium text-[10px] uppercase tracking-wider">Parent & Mobile</span>
              <span className="font-medium text-slate-800">
                {student.parentName} ({student.parentMobile})
              </span>
            </div>
          </div>

          {/* Head-wise Breakup Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-900 text-white text-xs">
                  <th className="py-2.5 px-4 font-semibold w-12 text-center">#</th>
                  <th className="py-2.5 px-4 font-semibold">Particulars / Fee Head</th>
                  <th className="py-2.5 px-4 font-semibold text-right w-36">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {headEntries.length > 0 ? (
                  headEntries.map(([head, amount], index) => (
                    <tr key={head} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2 px-4 font-medium text-slate-800">{head}</td>
                      <td className="py-2 px-4 text-right font-semibold text-slate-900 font-mono">
                        {formatINR(Number(amount))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2 px-4 text-center text-slate-400 font-mono">1</td>
                    <td className="py-2 px-4 font-medium text-slate-800">School Composite Fee</td>
                    <td className="py-2 px-4 text-right font-semibold text-slate-900 font-mono">
                      {formatINR(payment.amount)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-xs">
                  <td colSpan={2} className="py-2.5 px-4 text-slate-900 text-right uppercase tracking-wider">
                    Total Amount Received
                  </td>
                  <td className="py-2.5 px-4 text-right text-indigo-900 font-bold text-sm font-mono">
                    {formatINR(payment.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Words & Mode Details */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="font-semibold text-slate-700">Amount in Words: </span>
                <span className="italic font-medium text-indigo-950 font-serif">
                  {numberToWordsINR(payment.amount)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-600 pt-1 border-t border-slate-200/60">
              <span>
                <strong className="text-slate-800">Payment Mode:</strong> {payment.mode}
              </span>
              {payment.referenceNo && (
                <span>
                  <strong className="text-slate-800">Ref/Txn No:</strong>{' '}
                  <span className="font-mono">{payment.referenceNo}</span>
                </span>
              )}
              {payment.remarks && (
                <span>
                  <strong className="text-slate-800">Remarks:</strong> {payment.remarks}
                </span>
              )}
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-dashed border-slate-300 text-xs">
            <div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                * This is a computer-generated fee receipt issued by SchoolOS.
                <br />* Fees once paid are non-refundable and non-transferable.
              </p>
            </div>
            <div className="text-right flex flex-col justify-end items-end">
              <div className="w-40 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-900 text-xs">{payment.collectedBy || 'Authorized Cashier'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cashier / Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
