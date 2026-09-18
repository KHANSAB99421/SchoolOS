import React, { useState } from 'react';
import { School, SchoolUser } from '../types';
import { useAuth } from '../context/AuthContext';
import { updateSchoolProfile, addSchoolUser, updateSchoolUserRole } from '../services/firestoreService';
import {
  Building2,
  Users,
  ShieldCheck,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  Image,
  Upload,
} from 'lucide-react';

interface SettingsViewProps {
  school: School | null;
  users: SchoolUser[];
  onRefresh: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  school,
  users,
  onRefresh,
}) => {
  const { schoolId, role } = useAuth();
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  // School profile form state
  const [name, setName] = useState(school?.name || 'Delhi Public School');
  const [address, setAddress] = useState(school?.address || 'Sector 14, Ring Road, New Delhi');
  const [phone, setPhone] = useState(school?.phone || '+91 11 2789 4500');
  const [logoUrl, setLogoUrl] = useState(school?.logoUrl || '');
  const [academicYear, setAcademicYear] = useState(school?.academicYear || '2026-2027');
  const [affiliationNo, setAffiliationNo] = useState(school?.affiliationNo || 'CBSE-AFF/2026/8941');

  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'accountant'>('accountant');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchool(true);
    setSchoolStatus(null);
    try {
      await updateSchoolProfile(schoolId, {
        name,
        address,
        phone,
        logoUrl,
        academicYear,
        affiliationNo,
      });
      setSchoolStatus({ type: 'success', msg: 'School profile updated successfully!' });
      await onRefresh();
    } catch (err: any) {
      setSchoolStatus({ type: 'error', msg: err?.message || 'Failed to update profile' });
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setLogoUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserMobile.trim()) {
      setUserError('Name and mobile are required.');
      return;
    }
    setIsSavingUser(true);
    setUserError('');
    try {
      await addSchoolUser(schoolId, {
        name: newUserName,
        role: newUserRole,
        mobile: newUserMobile,
        email: newUserEmail || undefined,
      });
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserMobile('');
      await onRefresh();
    } catch (err: any) {
      setUserError(err?.message || 'Failed to add user');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'accountant') => {
    try {
      await updateSchoolUserRole(schoolId, userId, newRole);
      await onRefresh();
    } catch (err: any) {
      alert('Failed to update role: ' + err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings & Administration</h1>
          <p className="text-xs text-slate-500">
            Tenant configuration, official branding, and staff access roles.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            School Profile
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff & Roles ({users.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SCHOOL PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-3xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">School Profile & Branding</h2>
              <p className="text-xs text-slate-500">Appears on official A5 printed receipts and ledger summaries.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            {schoolStatus && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 ${
                  schoolStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {schoolStatus.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{schoolStatus.msg}</span>
              </div>
            )}

            {/* School Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Full Name *</label>
              <input
                id="settings-school-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Logo Preview and Upload */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">School Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Image className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    placeholder="Enter Image URL or upload image below"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition-colors text-[11px]">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Logo Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Campus Address *</label>
              <input
                id="settings-school-address"
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Phone & Affiliation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone *</label>
                <input
                  id="settings-school-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Affiliation / Reg No.</label>
                <input
                  id="settings-school-affiliation"
                  type="text"
                  value={affiliationNo}
                  onChange={e => setAffiliationNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Academic Year */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-indigo-950 block">Current Academic Session</span>
                <span className="text-[11px] text-indigo-800/80">
                  Used for sequential receipt numbering and billing periods.
                </span>
              </div>
              <input
                id="settings-academic-year"
                type="text"
                required
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-36 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-indigo-900 font-bold font-mono text-center"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                id="save-school-profile-btn"
                type="submit"
                disabled={isSavingSchool || !isAdmin}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSavingSchool ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MANAGE USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Staff Accounts & Permissions</h2>
              <p className="text-xs text-slate-500">
                Admins have full access. Accountants can collect fees, generate receipts, and view directory.
              </p>
            </div>

            {isAdmin && (
              <button
                id="add-staff-btn"
                onClick={() => setIsAddUserOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Staff Member
              </button>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Staff Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Mobile</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span className="capitalize">{u.role}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{u.mobile}</td>
                      <td className="py-3.5 px-4 text-slate-500">{u.email || '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin && (
                          <select
                            value={u.role}
                            onChange={e =>
                              handleChangeUserRole(u.uid, e.target.value as 'admin' | 'accountant')
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                          >
                            <option value="accountant">Accountant</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Staff Modal */}
          {isAddUserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">Add Staff Member</h3>
                  <button
                    onClick={() => setIsAddUserOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {userError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                      {userError}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Staff Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="9811223344"
                        value={newUserMobile}
                        onChange={e => setNewUserMobile(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                      <select
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as 'admin' | 'accountant')}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                      >
                        <option value="accountant">Accountant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="staff@school.org"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddUserOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                    >
                      {isSavingUser ? 'Adding...' : 'Add Staff'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
