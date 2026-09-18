import React, { useState } from 'react';
import { FeeStructure, FeeHead, FeeInstallment } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveFeeStructure, deleteFeeStructure } from '../services/firestoreService';
import { formatINR, formatDate } from '../utils/formatters';
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';

interface FeeStructureViewProps {
  feeStructures: FeeStructure[];
  onRefresh: () => Promise<void>;
}

export const FeeStructureView: React.FC<FeeStructureViewProps> = ({
  feeStructures,
  onRefresh,
}) => {
  const { schoolId, currentSchool } = useAuth();
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentStructureId, setCurrentStructureId] = useState<string | undefined>(undefined);

  // Form states
  const [formClass, setFormClass] = useState('Class 1');
  const [formAcademicYear, setFormAcademicYear] = useState(currentSchool?.academicYear || '2026-2027');
  const [heads, setHeads] = useState<FeeHead[]>([
    { name: 'Tuition Fee', amount: 36000 },
    { name: 'Development Fee', amount: 8000 },
    { name: 'Computer & Smart Class', amount: 6000 },
  ]);
  const [installments, setInstallments] = useState<FeeInstallment[]>([
    { name: 'Quarter 1 (Apr - Jun)', dueDate: '2026-04-10', amount: 12500 },
    { name: 'Quarter 2 (Jul - Sep)', dueDate: '2026-07-10', amount: 12500 },
    { name: 'Quarter 3 (Oct - Dec)', dueDate: '2026-10-10', amount: 12500 },
    { name: 'Quarter 4 (Jan - Mar)', dueDate: '2027-01-10', amount: 12500 },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const activeStructure = feeStructures[selectedClassIndex] || feeStructures[0] || null;

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentStructureId(undefined);
    setFormClass(`Class ${feeStructures.length + 1}`);
    setFormAcademicYear(currentSchool?.academicYear || '2026-2027');
    setHeads([
      { name: 'Tuition Fee', amount: 40000 },
      { name: 'Development Fee', amount: 8000 },
      { name: 'Computer / STEM Lab', amount: 6000 },
      { name: 'Sports & Activities', amount: 4000 },
    ]);
    setInstallments([
      { name: 'Term 1 / Q1', dueDate: '2026-04-10', amount: 14500 },
      { name: 'Term 2 / Q2', dueDate: '2026-07-10', amount: 14500 },
      { name: 'Term 3 / Q3', dueDate: '2026-10-10', amount: 14500 },
      { name: 'Term 4 / Q4', dueDate: '2027-01-10', amount: 14500 },
    ]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (structure: FeeStructure) => {
    setIsEditing(true);
    setCurrentStructureId(structure.id);
    setFormClass(structure.class);
    setFormAcademicYear(structure.academicYear);
    setHeads(structure.heads.map(h => ({ ...h })));
    setInstallments(structure.installments.map(i => ({ ...i })));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddHead = () => {
    setHeads([...heads, { name: '', amount: 0 }]);
  };

  const handleRemoveHead = (idx: number) => {
    setHeads(heads.filter((_, i) => i !== idx));
  };

  const handleAddInstallment = () => {
    setInstallments([
      ...installments,
      { name: `Installment ${installments.length + 1}`, dueDate: '2026-04-10', amount: 0 },
    ]);
  };

  const handleRemoveInstallment = (idx: number) => {
    setInstallments(installments.filter((_, i) => i !== idx));
  };

  // Auto divide installments equally based on heads total
  const handleAutoSplitInstallments = () => {
    const totalHeads = heads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    if (installments.length === 0 || totalHeads === 0) return;
    const splitAmt = Math.round(totalHeads / installments.length);
    setInstallments(
      installments.map((inst, idx) => ({
        ...inst,
        amount: idx === installments.length - 1 ? totalHeads - splitAmt * (installments.length - 1) : splitAmt,
      }))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClass.trim()) {
      setFormError('Class name is required.');
      return;
    }
    if (heads.length === 0) {
      setFormError('Please add at least one fee head.');
      return;
    }
    if (installments.length === 0) {
      setFormError('Please add at least one installment.');
      return;
    }

    const totalHeads = heads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const totalInstallments = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    if (totalHeads !== totalInstallments) {
      setFormError(
        `Total heads (${formatINR(totalHeads)}) does not match total installments (${formatINR(
          totalInstallments
        )}). Please reconcile or click "Auto Split".`
      );
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await saveFeeStructure(
        schoolId,
        {
          class: formClass,
          academicYear: formAcademicYear,
          heads,
          installments,
        },
        currentStructureId
      );
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save fee structure');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (structureId: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await deleteFeeStructure(schoolId, structureId);
      await onRefresh();
    } catch (err: any) {
      alert('Failed to delete fee structure: ' + err?.message);
    }
  };

  const totalHeadsAmount = heads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  const totalInstallmentsAmount = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Structures</h1>
          <p className="text-xs text-slate-500">
            Define class-wise annual fees, multiple heads, and installment due dates.
          </p>
        </div>

        <button
          id="create-fee-structure-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Fee Structure
        </button>
      </div>

      {feeStructures.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-800 text-sm">No fee structures configured yet.</p>
          <p className="text-slate-400 mt-1">Click "Create Fee Structure" to configure class fees.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Class Selector Tabs */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Classes ({feeStructures.length})
            </span>
            <div className="space-y-1.5">
              {feeStructures.map((fs, idx) => {
                const isSelected = (selectedClassIndex === idx && activeStructure?.id === fs.id) || (idx === 0 && !activeStructure);
                return (
                  <button
                    key={fs.id}
                    id={`fee-structure-tab-${fs.id}`}
                    onClick={() => setSelectedClassIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{fs.class}</span>
                      <span className="font-mono text-indigo-700 font-bold">
                        {formatINR(fs.totalAnnualAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{fs.heads?.length || 0} heads</span>
                      <span>{fs.installments?.length || 0} installments</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed View of Selected Class Fee Structure */}
          {activeStructure && (
            <div className="lg:col-span-3 space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{activeStructure.class}</h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {activeStructure.academicYear}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Annual Composite Fee Structure</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Total Annual Fee
                      </span>
                      <span className="text-2xl font-bold text-indigo-900 font-mono">
                        {formatINR(activeStructure.totalAnnualAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
                      <button
                        id="edit-fee-structure-btn"
                        onClick={() => handleOpenEdit(activeStructure)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Structure"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        id="delete-fee-structure-btn"
                        onClick={() => handleDelete(activeStructure.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Structure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid of Heads and Installments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs">
                  {/* Fee Heads Breakdown */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Fee Heads ({activeStructure.heads?.length || 0})
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Head Name</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeStructure.heads?.map(h => (
                            <tr key={h.name} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-800">{h.name}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatINR(h.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold border-t border-slate-200">
                            <td className="py-2 px-3 text-slate-900">Total</td>
                            <td className="py-2 px-3 text-right font-mono text-indigo-900">
                              {formatINR(activeStructure.totalAnnualAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Installments Breakdown */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Installments & Due Dates ({activeStructure.installments?.length || 0})
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Installment</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeStructure.installments?.map(inst => (
                            <tr key={inst.name} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-800">{inst.name}</td>
                              <td className="py-2 px-3 text-slate-600">{formatDate(inst.dueDate)}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatINR(inst.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-bold border-t border-slate-200">
                            <td colSpan={2} className="py-2 px-3 text-slate-900">
                              Total Due
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-indigo-900">
                              {formatINR(activeStructure.totalAnnualAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? `Edit Fee Structure (${formClass})` : 'Create New Fee Structure'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Class *</label>
                  <input
                    id="fee-form-class"
                    type="text"
                    required
                    placeholder="e.g. Class 6"
                    value={formClass}
                    onChange={e => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year *</label>
                  <input
                    id="fee-form-year"
                    type="text"
                    required
                    value={formAcademicYear}
                    onChange={e => setFormAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Dynamic Fee Heads Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-900">Fee Heads</label>
                    <span className="text-[11px] text-slate-500 ml-2">
                      Total: <strong className="font-mono text-indigo-900">{formatINR(totalHeadsAmount)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddHead}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Head
                  </button>
                </div>

                <div className="space-y-2">
                  {heads.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Head name (e.g. Tuition Fee)"
                        value={h.name}
                        onChange={e => {
                          const copy = [...heads];
                          copy[idx].name = e.target.value;
                          setHeads(copy);
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Amount"
                          value={h.amount || ''}
                          onChange={e => {
                            const copy = [...heads];
                            copy[idx].amount = Number(e.target.value) || 0;
                            setHeads(copy);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHead(idx)}
                        disabled={heads.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Installments Section */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-900">Installments & Due Dates</label>
                    <span className="text-[11px] text-slate-500 ml-2">
                      Total:{' '}
                      <strong className="font-mono text-indigo-900">{formatINR(totalInstallmentsAmount)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoSplitInstallments}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md"
                    >
                      <Sparkles className="w-3 h-3" /> Auto Split
                    </button>
                    <button
                      type="button"
                      onClick={handleAddInstallment}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Installment
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Installment name"
                        value={inst.name}
                        onChange={e => {
                          const copy = [...installments];
                          copy[idx].name = e.target.value;
                          setInstallments(copy);
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                      <input
                        type="date"
                        required
                        value={inst.dueDate}
                        onChange={e => {
                          const copy = [...installments];
                          copy[idx].dueDate = e.target.value;
                          setInstallments(copy);
                        }}
                        className="w-36 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                      />
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Amount"
                          value={inst.amount || ''}
                          onChange={e => {
                            const copy = [...installments];
                            copy[idx].amount = Number(e.target.value) || 0;
                            setInstallments(copy);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInstallment(idx)}
                        disabled={installments.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Balance Status */}
              <div
                className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
                  totalHeadsAmount === totalInstallmentsAmount && totalHeadsAmount > 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span>
                  {totalHeadsAmount === totalInstallmentsAmount
                    ? '✓ Heads and Installments are balanced.'
                    : `Difference: ${formatINR(Math.abs(totalHeadsAmount - totalInstallmentsAmount))}`}
                </span>
                <span className="font-mono">
                  {formatINR(totalHeadsAmount)} / {formatINR(totalInstallmentsAmount)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-fee-structure-submit-btn"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Fee Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
