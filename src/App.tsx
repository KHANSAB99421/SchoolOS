import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavView } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StudentsView } from './components/StudentsView';
import { FeeStructureView } from './components/FeeStructureView';
import { CollectFeeView } from './components/CollectFeeView';
import { ReceiptsListView } from './components/ReceiptsListView';
import { DefaultersView } from './components/DefaultersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginModal } from './components/LoginModal';

import {
  Student,
  FeeStructure,
  Payment,
  School,
  SchoolUser,
} from './types';
import {
  getSchool,
  getStudents,
  getFeeStructures,
  getPayments,
  getSchoolUsers,
  seedInitialSchoolData,
} from './services/firestoreService';
import { School as SchoolIcon, Loader2, RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { schoolId, role, currentSchool, setSchoolData } = useAuth();
  const isAdmin = role === 'admin';

  // Navigation State
  const [currentView, setCurrentView] = useState<NavView>(isAdmin ? 'dashboard' : 'collect-fee');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cross-view state (e.g. clicking "Collect Fee" on a student opens CollectFeeView with that student pre-selected)
  const [targetStudentForCollect, setTargetStudentForCollect] = useState<string | null>(null);

  // Active Receipt Modal state
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);
  const [activeReceiptStudent, setActiveReceiptStudent] = useState<Student | null>(null);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // If accountant tries to access admin-only views, auto redirect
  useEffect(() => {
    if (!isAdmin && ['dashboard', 'fee-structure', 'defaulters', 'reports', 'settings'].includes(currentView)) {
      setCurrentView('collect-fee');
    }
  }, [isAdmin, currentView]);

  // Load all data scoped to active tenant schoolId
  const loadTenantData = useCallback(async () => {
    if (!schoolId) return;
    try {
      let school = await getSchool(schoolId);

      // If school does not exist yet (brand new database), initialize seed data
      if (!school) {
        await seedInitialSchoolData(schoolId);
        school = await getSchool(schoolId);
      }

      if (school) {
        setSchoolData(school);
      }

      const [stList, fsList, pList, uList] = await Promise.all([
        getStudents(schoolId),
        getFeeStructures(schoolId),
        getPayments(schoolId),
        getSchoolUsers(schoolId),
      ]);

      setStudents(stList);
      setFeeStructures(fsList);
      setPayments(pList);
      setSchoolUsers(uList);
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, setSchoolData]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  // Handler for collecting fee from student list or defaulters list
  const handleCollectFeeForStudent = (student: Student) => {
    setTargetStudentForCollect(student.id);
    setCurrentView('collect-fee');
  };

  // Handler for viewing receipt
  const handleViewReceipt = (payment: Payment) => {
    const student = students.find(s => s.id === payment.studentId) || null;
    setActiveReceiptPayment(payment);
    setActiveReceiptStudent(student);
  };

  // Handler after successful payment creation in CollectFeeView
  const handlePaymentSuccess = (payment: Payment, student: Student) => {
    setActiveReceiptPayment(payment);
    setActiveReceiptStudent(student);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        activeView={currentView}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Responsive Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={view => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading SchoolOS Workspace...</p>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <Dashboard
                  school={currentSchool}
                  students={students}
                  feeStructures={feeStructures}
                  payments={payments}
                  onNavigate={setCurrentView}
                  onViewReceipt={handleViewReceipt}
                />
              )}

              {currentView === 'students' && (
                <StudentsView
                  students={students}
                  onRefresh={loadTenantData}
                  onCollectFeeForStudent={handleCollectFeeForStudent}
                />
              )}

              {currentView === 'fee-structure' && (
                <FeeStructureView
                  feeStructures={feeStructures}
                  onRefresh={loadTenantData}
                />
              )}

              {currentView === 'collect-fee' && (
                <CollectFeeView
                  students={students}
                  feeStructures={feeStructures}
                  payments={payments}
                  selectedStudentId={targetStudentForCollect}
                  onRefresh={loadTenantData}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              )}

              {currentView === 'receipts' && (
                <ReceiptsListView
                  payments={payments}
                  students={students}
                  onViewReceipt={handleViewReceipt}
                />
              )}

              {currentView === 'defaulters' && (
                <DefaultersView
                  students={students}
                  feeStructures={feeStructures}
                  payments={payments}
                  school={currentSchool}
                  onCollectFeeForStudent={handleCollectFeeForStudent}
                />
              )}

              {currentView === 'reports' && (
                <ReportsView
                  students={students}
                  feeStructures={feeStructures}
                  payments={payments}
                  school={currentSchool}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  school={currentSchool}
                  users={schoolUsers}
                  onRefresh={loadTenantData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Printable A5 Receipt Modal */}
      {activeReceiptPayment && (
        <ReceiptModal
          payment={activeReceiptPayment}
          student={activeReceiptStudent}
          school={currentSchool}
          isOpen={true}
          onClose={() => {
            setActiveReceiptPayment(null);
            setActiveReceiptStudent(null);
          }}
        />
      )}

      {/* Login & Multi-Tenant Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
