import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  addStudent,
  updateStudent,
  deleteStudent,
  bulkAddStudents,
} from '../services/firestoreService';
import { parseStudentsCSV, exportToCSV } from '../utils/formatters';
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Trash2,
  Edit2,
  Coins,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  X,
  User,
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  onRefresh: () => Promise<void>;
  onCollectFeeForStudent: (student: Student) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onRefresh,
  onCollectFeeForStudent,
}) => {
  const { schoolId, role } = useAuth();
  const isAdmin = role === 'admin';

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    name: '',
    class: 'Class 1',
    section: 'A',
    rollNo: '',
    admissionNo: '',
    parentName: '',
    parentMobile: '',
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Bulk import states
  const [csvPreview, setCsvPreview] = useState<Omit<Student, 'id'>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [bulkStatusMessage, setBulkStatusMessage] = useState('');

  // Extract unique classes and sections for filters
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => s.class && set.add(s.class.trim()));
    // If empty, supply standard classes
    if (set.size === 0) {
      ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 10'].forEach(c => set.add(c));
    }
    return Array.from(set).sort();
  }, [students]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => s.section && set.add(s.section.trim()));
    return Array.from(set).sort();
  }, [students]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentMobile.includes(searchTerm);

      const matchClass = selectedClass === 'all' || s.class.trim().toLowerCase() === selectedClass.trim().toLowerCase();
      const matchSection = selectedSection === 'all' || s.section.trim().toLowerCase() === selectedSection.trim().toLowerCase();

      return matchSearch && matchClass && matchSection;
    });
  }, [students, searchTerm, selectedClass, selectedSection]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      class: uniqueClasses[0] || 'Class 1',
      section: 'A',
      rollNo: String(students.length + 1),
      admissionNo: `ADM-${2026}-${String(students.length + 1).padStart(3, '0')}`,
      parentName: '',
      parentMobile: '',
      status: 'active',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setFormData({
      name: student.name,
      class: student.class,
      section: student.section,
      rollNo: student.rollNo,
      admissionNo: student.admissionNo,
      parentName: student.parentName,
      parentMobile: student.parentMobile,
      status: student.status,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.admissionNo.trim() || !formData.parentMobile.trim()) {
      setFormError('Please fill in student name, admission number, and parent mobile number.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (isEditModalOpen && studentToEdit) {
        await updateStudent(schoolId, studentToEdit.id, formData);
        setIsEditModalOpen(false);
      } else {
        await addStudent(schoolId, formData);
        setIsAddModalOpen(false);
      }
      await onRefresh();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save student record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteStudent(schoolId, studentToDelete.id);
      setStudentToDelete(null);
      await onRefresh();
    } catch (err: any) {
      alert('Failed to delete student: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk CSV file selection
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const parsed = parseStudentsCSV(text);
      setCsvPreview(parsed);
      setBulkStatusMessage(`Parsed ${parsed.length} student records from CSV.`);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Class', 'Section', 'Roll No', 'Admission No', 'Parent Name', 'Mobile', 'Status'];
    const sampleRows = [
      ['Rohan Gupta', 'Class 1', 'A', '101', 'DPS-2026-101', 'Manoj Gupta', '9811223344', 'active'],
      ['Pooja Sharma', 'Class 1', 'B', '102', 'DPS-2026-102', 'Vikas Sharma', '9822334455', 'active'],
      ['Arjun Kapoor', 'Class 2', 'A', '201', 'DPS-2026-201', 'Anil Kapoor', '9833445566', 'active'],
    ];
    exportToCSV('SchoolOS_Students_Template', headers, sampleRows);
  };

  const handleCommitBulk = async () => {
    if (csvPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      const count = await bulkAddStudents(schoolId, csvPreview);
      setBulkStatusMessage(`Successfully imported ${count} students!`);
      setCsvPreview([]);
      setIsBulkModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setBulkStatusMessage('Error importing students: ' + (err?.message || 'Failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-xs text-slate-500">
            {students.length} total enrolled student{students.length === 1 ? '' : 's'}
            {!isAdmin && ' • (Read-only mode for Accountant)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                id="bulk-import-btn"
                onClick={() => {
                  setCsvPreview([]);
                  setBulkStatusMessage('');
                  setIsBulkModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Bulk CSV Import
              </button>

              <button
                id="add-student-btn"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="student-search-input"
            type="text"
            placeholder="Search by student name, admission no, roll no, parent name or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Class:</span>
          <select
            id="student-class-filter"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="all">All Classes</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Section:</span>
          <select
            id="student-section-filter"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="all">All Sections</option>
            {uniqueSections.map(sec => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No students found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Sec</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Parent Details</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{student.name}</span>
                          <span className="text-[11px] text-slate-400">ID: {student.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {student.class} - {student.section}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      {student.admissionNo}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{student.rollNo || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="block font-medium text-slate-800">{student.parentName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{student.parentMobile}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          student.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {student.status === 'active' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="capitalize">{student.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Collect Fee button */}
                        <button
                          id={`collect-fee-student-${student.id}`}
                          onClick={() => onCollectFeeForStudent(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          title="Collect fee and view ledger"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          Collect Fee
                        </button>

                        {/* Admin edit & delete */}
                        {isAdmin && (
                          <>
                            <button
                              id={`edit-student-${student.id}`}
                              onClick={() => handleOpenEdit(student)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Student"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-student-${student.id}`}
                              onClick={() => setStudentToDelete(student)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT STUDENT MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isEditModalOpen ? 'Edit Student Details' : 'Add New Student'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  id="student-form-name"
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class *</label>
                  <input
                    id="student-form-class"
                    type="text"
                    required
                    placeholder="e.g. Class 1"
                    value={formData.class}
                    onChange={e => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section *</label>
                  <input
                    id="student-form-section"
                    type="text"
                    required
                    placeholder="e.g. A"
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Admission No *</label>
                  <input
                    id="student-form-admission"
                    type="text"
                    required
                    placeholder="e.g. DPS-2026-001"
                    value={formData.admissionNo}
                    onChange={e => setFormData({ ...formData, admissionNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roll No</label>
                  <input
                    id="student-form-roll"
                    type="text"
                    placeholder="e.g. 101"
                    value={formData.rollNo}
                    onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                <input
                  id="student-form-parent"
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.parentName}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Mobile (10-digit) *</label>
                  <input
                    id="student-form-mobile"
                    type="tel"
                    required
                    placeholder="9811223344"
                    value={formData.parentMobile}
                    onChange={e => setFormData({ ...formData, parentMobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    id="student-form-status"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="student-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : isEditModalOpen ? 'Update Student' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT CSV MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Bulk Import Students from CSV</h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-indigo-950">Download CSV Template</p>
                  <p className="text-indigo-800/80 text-[11px] mt-0.5">
                    Include columns: Name, Class, Section, Roll No, Admission No, Parent Name, Mobile, Status
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
              </div>

              {/* Upload area */}
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50">
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <span className="font-bold text-slate-800 text-sm block">
                    {csvFileName ? csvFileName : 'Click or Drag CSV File Here'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Accepts standard comma-separated .csv files
                  </span>
                </label>
              </div>

              {bulkStatusMessage && (
                <p className="text-xs font-semibold text-indigo-900 bg-indigo-50 p-2.5 rounded-lg">
                  {bulkStatusMessage}
                </p>
              )}

              {/* Preview table */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800">Preview ({csvPreview.length} records ready):</span>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-600">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Adm No</th>
                          <th className="p-2">Parent Mobile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.slice(0, 10).map((s, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium text-slate-900">{s.name}</td>
                            <td className="p-2">{s.class}-{s.section}</td>
                            <td className="p-2 font-mono">{s.admissionNo}</td>
                            <td className="p-2 font-mono">{s.parentMobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="commit-bulk-import-btn"
                  onClick={handleCommitBulk}
                  disabled={isSubmitting || csvPreview.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : `Import ${csvPreview.length} Students`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Student Record</h3>
                <p className="text-slate-500 text-[11px]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-slate-600">
              Are you sure you want to delete student <strong>{studentToDelete.name}</strong> (
              {studentToDelete.admissionNo}) from Class {studentToDelete.class}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-student-btn"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
