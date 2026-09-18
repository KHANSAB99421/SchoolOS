import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  School,
  Student,
  FeeStructure,
  Payment,
  SchoolUser,
  StudentLedger,
  DefaulterRecord,
} from '../types';

/**
 * School Operations
 */
export async function getSchool(schoolId: string): Promise<School | null> {
  const path = `schools/${schoolId}`;
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as School;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createSchool(school: Omit<School, 'id'>, customId?: string): Promise<School> {
  const id = customId || 'sch_' + Math.random().toString(36).substring(2, 9);
  const path = `schools/${id}`;
  try {
    const schoolData: School = {
      id,
      ...school,
      createdAt: school.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'schools', id), schoolData);
    return schoolData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSchool(schoolId: string, data: Partial<School>): Promise<void> {
  const path = `schools/${schoolId}`;
  try {
    await updateDoc(doc(db, 'schools', schoolId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Student Operations
 */
export async function getStudents(schoolId: string): Promise<Student[]> {
  const path = `schools/${schoolId}/students`;
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'students'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addStudent(schoolId: string, student: Omit<Student, 'id'>): Promise<Student> {
  const id = 'std_' + Math.random().toString(36).substring(2, 10);
  const path = `schools/${schoolId}/students/${id}`;
  try {
    const newStudent: Student = { id, ...student };
    await setDoc(doc(db, 'schools', schoolId, 'students', id), newStudent);
    return newStudent;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudent(schoolId: string, studentId: string, data: Partial<Student>): Promise<void> {
  const path = `schools/${schoolId}/students/${studentId}`;
  try {
    await updateDoc(doc(db, 'schools', schoolId, 'students', studentId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudent(schoolId: string, studentId: string): Promise<void> {
  const path = `schools/${schoolId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function bulkAddStudents(schoolId: string, students: Omit<Student, 'id'>[]): Promise<number> {
  let count = 0;
  for (const s of students) {
    await addStudent(schoolId, s);
    count++;
  }
  return count;
}

/**
 * Fee Structure Operations
 */
export async function getFeeStructures(schoolId: string, academicYear?: string): Promise<FeeStructure[]> {
  const path = `schools/${schoolId}/feeStructures`;
  try {
    const colRef = collection(db, 'schools', schoolId, 'feeStructures');
    const q = academicYear ? query(colRef, where('academicYear', '==', academicYear)) : colRef;
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      const totalAnnualAmount = data.heads?.reduce((acc: number, h: { amount: number }) => acc + (Number(h.amount) || 0), 0) || 0;
      return { id: d.id, ...data, totalAnnualAmount } as FeeStructure;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveFeeStructure(schoolId: string, structure: Omit<FeeStructure, 'id'>, structureId?: string): Promise<FeeStructure> {
  const id = structureId || 'fs_' + structure.class.replace(/\s+/g, '_').toLowerCase();
  const path = `schools/${schoolId}/feeStructures/${id}`;
  try {
    const totalAnnualAmount = structure.heads.reduce((acc, h) => acc + (Number(h.amount) || 0), 0);
    const data: FeeStructure = { id, ...structure, totalAnnualAmount };
    await setDoc(doc(db, 'schools', schoolId, 'feeStructures', id), data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteFeeStructure(schoolId: string, structureId: string): Promise<void> {
  const path = `schools/${schoolId}/feeStructures/${structureId}`;
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'feeStructures', structureId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Payments & Sequential Receipt Generation
 */
export async function getPayments(schoolId: string): Promise<Payment[]> {
  const path = `schools/${schoolId}/payments`;
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'payments'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    // Sort descending by date/createdAt
    return list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getStudentPayments(schoolId: string, studentId: string): Promise<Payment[]> {
  const path = `schools/${schoolId}/payments`;
  try {
    const q = query(collection(db, 'schools', schoolId, 'payments'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Sequential receipt number per school and academic year.
 * Atomic transaction increments counter in `schools/{schoolId}/meta/receiptSequence_{year}`
 */
export async function collectFeePayment(
  schoolId: string,
  academicYear: string,
  schoolCode: string,
  paymentData: Omit<Payment, 'id' | 'receiptNo' | 'createdAt'>
): Promise<Payment> {
  const counterDocRef = doc(db, 'schools', schoolId, 'meta', `receiptSequence_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}`);
  const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const paymentDocRef = doc(db, 'schools', schoolId, 'payments', paymentId);

  try {
    const finalPayment = await runTransaction(db, async transaction => {
      const counterSnap = await transaction.get(counterDocRef);
      let nextSeq = 1;
      if (counterSnap.exists()) {
        nextSeq = (counterSnap.data().currentSequence || 0) + 1;
      }
      transaction.set(counterDocRef, { currentSequence: nextSeq, academicYear, updatedAt: new Date().toISOString() }, { merge: true });

      const paddedSeq = String(nextSeq).padStart(4, '0');
      // Format: SCH/2026-27/0001
      const shortYear = academicYear.includes('-') ? academicYear : 'AY' + academicYear;
      const receiptNo = `${schoolCode.toUpperCase().replace(/\s+/g, '')}/${shortYear}/${paddedSeq}`;

      const newPayment: Payment = {
        id: paymentId,
        ...paymentData,
        receiptNo,
        academicYear,
        createdAt: new Date().toISOString(),
      };

      transaction.set(paymentDocRef, newPayment);
      return newPayment;
    });

    return finalPayment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}/payments`);
  }
}

/**
 * Users management scoped to school
 */
export async function getSchoolUsers(schoolId: string): Promise<SchoolUser[]> {
  const path = `schools/${schoolId}/users`;
  try {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'users'));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as SchoolUser));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function setSchoolUser(schoolId: string, user: SchoolUser): Promise<void> {
  const path = `schools/${schoolId}/users/${user.uid}`;
  try {
    await setDoc(doc(db, 'schools', schoolId, 'users', user.uid), user, { merge: true });
    // Also store in root /users/{uid} for instant lookup at login
    await setDoc(doc(db, 'users', user.uid), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSchoolUser(schoolId: string, uid: string): Promise<void> {
  const path = `schools/${schoolId}/users/${uid}`;
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'users', uid));
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateSchoolProfile(schoolId: string, data: Partial<School>): Promise<void> {
  const path = `schools/${schoolId}`;
  try {
    await setDoc(doc(db, 'schools', schoolId), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addSchoolUser(
  schoolId: string,
  userData: { name: string; role: 'admin' | 'accountant'; mobile: string; email?: string }
): Promise<SchoolUser> {
  const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
  const path = `schools/${schoolId}/users/${uid}`;
  try {
    const user: SchoolUser = {
      id: uid,
      uid,
      schoolId,
      name: userData.name,
      role: userData.role,
      mobile: userData.mobile,
      email: userData.email,
    };
    await setSchoolUser(schoolId, user);
    return user;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSchoolUserRole(
  schoolId: string,
  uid: string,
  role: 'admin' | 'accountant'
): Promise<void> {
  const path = `schools/${schoolId}/users/${uid}`;
  try {
    await updateDoc(doc(db, 'schools', schoolId, 'users', uid), { role });
    // Also sync root users doc if exists
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch {
      // ignore
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Helper to calculate student ledger
 */
export function calculateStudentLedger(
  student: Student,
  feeStructures: FeeStructure[],
  payments: Payment[]
): StudentLedger {
  // Find fee structure for student's class
  const feeStructure = feeStructures.find(fs => fs.class.trim().toLowerCase() === student.class.trim().toLowerCase()) || null;
  const studentPayments = payments.filter(p => p.studentId === student.id);

  const totalExpected = feeStructure
    ? feeStructure.heads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
    : 0;

  const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, totalExpected - totalPaid);

  // Head-wise breakdown
  const headWise = (feeStructure?.heads || []).map(head => {
    const expected = Number(head.amount) || 0;
    // Sum paid for this head from payments
    let paid = 0;
    studentPayments.forEach(p => {
      if (p.headBreakup && p.headBreakup[head.name]) {
        paid += Number(p.headBreakup[head.name]) || 0;
      }
    });
    return {
      headName: head.name,
      expected,
      paid,
      balance: Math.max(0, expected - paid),
    };
  });

  // Calculate overdue status from installments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueInstallments: FeeStructure['installments'] = [];
  let cumulativeInstallmentDue = 0;

  if (feeStructure?.installments) {
    for (const inst of feeStructure.installments) {
      cumulativeInstallmentDue += Number(inst.amount) || 0;
      const due = new Date(inst.dueDate);
      if (!isNaN(due.getTime()) && due < today) {
        // If total paid so far is less than the cumulative installments due by this date
        if (totalPaid < cumulativeInstallmentDue) {
          overdueInstallments.push(inst);
        }
      }
    }
  }

  return {
    student,
    feeStructure,
    totalExpected,
    totalPaid,
    balance,
    headWise,
    payments: studentPayments,
    isOverdue: overdueInstallments.length > 0 && balance > 0,
    overdueInstallments,
  };
}

/**
 * Calculates defaulters list (students with pending amount past installment due date)
 */
export function calculateDefaulters(
  students: Student[],
  feeStructures: FeeStructure[],
  payments: Payment[]
): DefaulterRecord[] {
  const activeStudents = students.filter(s => s.status !== 'inactive');
  const defaulters: DefaulterRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const student of activeStudents) {
    const ledger = calculateStudentLedger(student, feeStructures, payments);
    if (ledger.isOverdue && ledger.balance > 0 && ledger.overdueInstallments.length > 0) {
      // Find oldest overdue installment
      const oldestOverdue = ledger.overdueInstallments[0];
      const dueDate = new Date(oldestOverdue.dueDate);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      defaulters.push({
        student,
        pendingAmount: ledger.balance,
        overdueDate: oldestOverdue.dueDate,
        installmentName: oldestOverdue.name,
        daysOverdue,
      });
    }
  }

  return defaulters.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Seed initial high-quality demo school data if school is empty
 */
export async function seedDemoSchoolData(schoolId: string, schoolName = 'Delhi Public School, R.K. Puram'): Promise<void> {
  const academicYear = '2026-2027';

  // 1. Create or update School document
  const schoolData: School = {
    id: schoolId,
    name: schoolName,
    address: 'Sector XII, R.K. Puram, New Delhi - 110022',
    phone: '+91 11 4911 5555',
    logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    academicYear,
    affiliationNo: 'CBSE/AFF/198762',
    email: 'info@dpsrkpuram.edu.in',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'schools', schoolId), schoolData, { merge: true });

  // 2. Fee structures for Class 1 to Class 5
  const sampleFeeStructures: Omit<FeeStructure, 'id'>[] = [
    {
      class: 'Class 1',
      academicYear,
      heads: [
        { name: 'Tuition Fee', amount: 36000 },
        { name: 'Development Fee', amount: 8000 },
        { name: 'Computer & Smart Class', amount: 6000 },
        { name: 'Sports & Co-curricular', amount: 4000 },
        { name: 'Examination Fee', amount: 2000 },
      ],
      installments: [
        { name: 'Quarter 1 (Apr - Jun)', dueDate: '2026-04-10', amount: 14000 },
        { name: 'Quarter 2 (Jul - Sep)', dueDate: '2026-07-10', amount: 14000 },
        { name: 'Quarter 3 (Oct - Dec)', dueDate: '2026-10-10', amount: 14000 },
        { name: 'Quarter 4 (Jan - Mar)', dueDate: '2027-01-10', amount: 14000 },
      ],
    },
    {
      class: 'Class 2',
      academicYear,
      heads: [
        { name: 'Tuition Fee', amount: 38000 },
        { name: 'Development Fee', amount: 8000 },
        { name: 'Computer & Smart Class', amount: 6000 },
        { name: 'Sports & Co-curricular', amount: 4000 },
        { name: 'Examination Fee', amount: 2000 },
      ],
      installments: [
        { name: 'Quarter 1 (Apr - Jun)', dueDate: '2026-04-10', amount: 14500 },
        { name: 'Quarter 2 (Jul - Sep)', dueDate: '2026-07-10', amount: 14500 },
        { name: 'Quarter 3 (Oct - Dec)', dueDate: '2026-10-10', amount: 14500 },
        { name: 'Quarter 4 (Jan - Mar)', dueDate: '2027-01-10', amount: 14500 },
      ],
    },
    {
      class: 'Class 5',
      academicYear,
      heads: [
        { name: 'Tuition Fee', amount: 48000 },
        { name: 'Science & STEM Lab', amount: 9000 },
        { name: 'Development Fee', amount: 10000 },
        { name: 'Sports & Swimming', amount: 5000 },
        { name: 'Examination Fee', amount: 3000 },
      ],
      installments: [
        { name: 'Quarter 1 (Apr - Jun)', dueDate: '2026-04-10', amount: 18750 },
        { name: 'Quarter 2 (Jul - Sep)', dueDate: '2026-07-10', amount: 18750 },
        { name: 'Quarter 3 (Oct - Dec)', dueDate: '2026-10-10', amount: 18750 },
        { name: 'Quarter 4 (Jan - Mar)', dueDate: '2027-01-10', amount: 18750 },
      ],
    },
    {
      class: 'Class 10',
      academicYear,
      heads: [
        { name: 'Tuition Fee', amount: 60000 },
        { name: 'Lab & Physics/Chemistry/Bio', amount: 12000 },
        { name: 'Smart Tech & LMS', amount: 8000 },
        { name: 'Board Examination & Registration', amount: 6000 },
      ],
      installments: [
        { name: 'Quarter 1 (Apr - Jun)', dueDate: '2026-04-10', amount: 21500 },
        { name: 'Quarter 2 (Jul - Sep)', dueDate: '2026-07-10', amount: 21500 },
        { name: 'Quarter 3 (Oct - Dec)', dueDate: '2026-10-10', amount: 21500 },
        { name: 'Quarter 4 (Jan - Mar)', dueDate: '2027-01-10', amount: 21500 },
      ],
    },
  ];

  for (const fs of sampleFeeStructures) {
    await saveFeeStructure(schoolId, fs);
  }

  // 3. Sample Students
  const sampleStudents: Omit<Student, 'id'>[] = [
    {
      name: 'Aarav Sharma',
      class: 'Class 1',
      section: 'A',
      rollNo: '101',
      admissionNo: 'DPS-2024-001',
      parentName: 'Rajesh Sharma',
      parentMobile: '9811223344',
      status: 'active',
    },
    {
      name: 'Ananya Verma',
      class: 'Class 1',
      section: 'A',
      rollNo: '102',
      admissionNo: 'DPS-2024-002',
      parentName: 'Sunil Verma',
      parentMobile: '9822334455',
      status: 'active',
    },
    {
      name: 'Vihaan Gupta',
      class: 'Class 1',
      section: 'B',
      rollNo: '103',
      admissionNo: 'DPS-2024-003',
      parentName: 'Ramesh Gupta',
      parentMobile: '9833445566',
      status: 'active',
    },
    {
      name: 'Ishaan Patel',
      class: 'Class 2',
      section: 'A',
      rollNo: '201',
      admissionNo: 'DPS-2023-089',
      parentName: 'Bhavin Patel',
      parentMobile: '9844556677',
      status: 'active',
    },
    {
      name: 'Diya Nair',
      class: 'Class 2',
      section: 'B',
      rollNo: '202',
      admissionNo: 'DPS-2023-094',
      parentName: 'Kishore Nair',
      parentMobile: '9855667788',
      status: 'active',
    },
    {
      name: 'Reyansh Reddy',
      class: 'Class 5',
      section: 'A',
      rollNo: '501',
      admissionNo: 'DPS-2021-045',
      parentName: 'Venkat Reddy',
      parentMobile: '9866778899',
      status: 'active',
    },
    {
      name: 'Saanvi Malhotra',
      class: 'Class 5',
      section: 'B',
      rollNo: '502',
      admissionNo: 'DPS-2021-052',
      parentName: 'Kunal Malhotra',
      parentMobile: '9877889900',
      status: 'active',
    },
    {
      name: 'Kabir Singhania',
      class: 'Class 10',
      section: 'A',
      rollNo: '1001',
      admissionNo: 'DPS-2018-012',
      parentName: 'Gaurav Singhania',
      parentMobile: '9888990011',
      status: 'active',
    },
  ];

  const addedStudents: Student[] = [];
  for (const s of sampleStudents) {
    const created = await addStudent(schoolId, s);
    addedStudents.push(created);
  }

  // 4. Sample Payments with realistic head breakups
  if (addedStudents.length >= 4) {
    // Payment 1 for Aarav Sharma (Quarter 1 fee)
    await collectFeePayment(schoolId, academicYear, 'DPS', {
      studentId: addedStudents[0].id,
      amount: 14000,
      mode: 'UPI',
      date: '2026-04-05',
      headBreakup: {
        'Tuition Fee': 9000,
        'Development Fee': 2000,
        'Computer & Smart Class': 1500,
        'Sports & Co-curricular': 1000,
        'Examination Fee': 500,
      },
      collectedBy: 'Ritu Sen (Admin)',
      referenceNo: 'UPI-REF-908124',
      remarks: 'Q1 fee paid online',
    });

    // Payment 2 for Aarav Sharma (Quarter 2 fee)
    await collectFeePayment(schoolId, academicYear, 'DPS', {
      studentId: addedStudents[0].id,
      amount: 14000,
      mode: 'Card',
      date: '2026-07-08',
      headBreakup: {
        'Tuition Fee': 9000,
        'Development Fee': 2000,
        'Computer & Smart Class': 1500,
        'Sports & Co-curricular': 1000,
        'Examination Fee': 500,
      },
      collectedBy: 'Pawan Kumar (Accountant)',
      referenceNo: 'TXN-CARD-4421',
      remarks: 'Q2 fee POS counter swipe',
    });

    // Payment 3 for Ananya Verma (Quarter 1 fee only, Q2 pending -> defaulter!)
    await collectFeePayment(schoolId, academicYear, 'DPS', {
      studentId: addedStudents[1].id,
      amount: 14000,
      mode: 'Cash',
      date: '2026-04-09',
      headBreakup: {
        'Tuition Fee': 9000,
        'Development Fee': 2000,
        'Computer & Smart Class': 1500,
        'Sports & Co-curricular': 1000,
        'Examination Fee': 500,
      },
      collectedBy: 'Pawan Kumar (Accountant)',
      remarks: 'Q1 paid at fee counter',
    });

    // Payment 4 for Kabir Singhania (Class 10 - Q1 and Q2 fees)
    await collectFeePayment(schoolId, academicYear, 'DPS', {
      studentId: addedStudents[7].id,
      amount: 43000,
      mode: 'Cheque',
      date: '2026-06-15',
      headBreakup: {
        'Tuition Fee': 30000,
        'Lab & Physics/Chemistry/Bio': 6000,
        'Smart Tech & LMS': 4000,
        'Board Examination & Registration': 3000,
      },
      collectedBy: 'Ritu Sen (Admin)',
      referenceNo: 'CHQ-HDFC-992102',
      remarks: 'Cheque cleared on 18 Jun',
    });

    // Payment 5 today for Reyansh Reddy
    const todayStr = new Date().toISOString().split('T')[0];
    await collectFeePayment(schoolId, academicYear, 'DPS', {
      studentId: addedStudents[5].id,
      amount: 18750,
      mode: 'UPI',
      date: todayStr,
      headBreakup: {
        'Tuition Fee': 12000,
        'Science & STEM Lab': 2250,
        'Development Fee': 2500,
        'Sports & Swimming': 1250,
        'Examination Fee': 750,
      },
      collectedBy: 'Pawan Kumar (Accountant)',
      referenceNo: 'UPI/HDFC/20260918/001',
      remarks: 'Counter UPI QR payment',
    });
  }
}

export const seedInitialSchoolData = seedDemoSchoolData;

