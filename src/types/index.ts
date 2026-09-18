export type UserRole = 'admin' | 'accountant';

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  academicYear: string;
  createdAt: string;
  affiliationNo?: string;
  email?: string;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNo: string;
  admissionNo: string;
  parentName: string;
  parentMobile: string;
  status: 'active' | 'inactive';
  category?: string;
  discountPercentage?: number;
}

export interface FeeHead {
  name: string;
  amount: number;
}

export interface FeeInstallment {
  name: string;
  dueDate: string;
  amount: number;
}

export interface FeeStructure {
  id: string;
  class: string;
  academicYear: string;
  heads: FeeHead[];
  installments: FeeInstallment[];
  totalAnnualAmount?: number;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Cheque';

export interface HeadBreakup {
  [headName: string]: number;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  receiptNo: string;
  headBreakup: HeadBreakup;
  collectedBy: string;
  remarks?: string;
  referenceNo?: string;
  academicYear?: string;
  createdAt?: string;
}

export interface SchoolUser {
  id?: string;
  uid: string;
  name: string;
  role: UserRole;
  mobile?: string;
  email?: string;
  schoolId: string;
}

export interface StudentLedger {
  student: Student;
  feeStructure: FeeStructure | null;
  totalExpected: number;
  totalPaid: number;
  balance: number;
  headWise: {
    headName: string;
    expected: number;
    paid: number;
    balance: number;
  }[];
  payments: Payment[];
  isOverdue: boolean;
  overdueInstallments: FeeInstallment[];
}

export interface DefaulterRecord {
  student: Student;
  pendingAmount: number;
  overdueDate: string;
  installmentName: string;
  daysOverdue: number;
}
