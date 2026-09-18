import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { School, SchoolUser, UserRole } from '../types';
import { getSchool, seedDemoSchoolData, createSchool } from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  currentSchool: School | null;
  schoolId: string;
  role: UserRole;
  userProfile: SchoolUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, schoolName: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: UserRole, customSchoolId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchSchool: (newSchoolId: string) => Promise<void>;
  reloadSchoolData: () => Promise<void>;
  setSchoolData: (school: School) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schoolId, setSchoolId] = useState<string>('demo_school_dps');
  const [role, setRole] = useState<UserRole>('admin');
  const [userProfile, setUserProfile] = useState<SchoolUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user profile and school details
  const loadUserAndSchool = async (uid: string, fallbackEmail?: string) => {
    try {
      // 1. Check user profile at /users/{uid}
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      let targetSchoolId = 'demo_school_dps';
      let targetRole: UserRole = 'admin';
      let staffName = fallbackEmail?.split('@')[0] || 'Administrator';

      if (userSnap.exists()) {
        const uData = userSnap.data() as SchoolUser;
        targetSchoolId = uData.schoolId || 'demo_school_dps';
        targetRole = uData.role || 'admin';
        staffName = uData.name || staffName;
        setUserProfile(uData);
      } else {
        // Create initial default user profile
        const newProfile: SchoolUser = {
          uid,
          name: staffName,
          email: fallbackEmail || '',
          role: targetRole,
          schoolId: targetSchoolId,
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        setUserProfile(newProfile);
      }

      setSchoolId(targetSchoolId);
      setRole(targetRole);

      // 2. Load school details
      let school = await getSchool(targetSchoolId);
      if (!school && targetSchoolId === 'demo_school_dps') {
        // Automatically seed demo school if it doesn't exist yet
        await seedDemoSchoolData(targetSchoolId);
        school = await getSchool(targetSchoolId);
      }
      setCurrentSchool(school);
    } catch (err) {
      console.warn('Error loading user/school from Firestore:', err);
      // Fallback to demo school in case of permission or initial network setup
      const fallbackSchool = await getSchool('demo_school_dps');
      if (fallbackSchool) {
        setCurrentSchool(fallbackSchool);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        await loadUserAndSchool(user.uid, user.email || '');
      } else {
        // If not logged in, check if user was using demo mode from local state or clear
        const savedDemoRole = localStorage.getItem('schoolos_demo_role') as UserRole | null;
        if (savedDemoRole) {
          setRole(savedDemoRole);
          setSchoolId('demo_school_dps');
          setUserProfile({
            uid: `demo_${savedDemoRole}`,
            name: savedDemoRole === 'admin' ? 'Ritu Sen (Admin)' : 'Pawan Kumar (Accountant)',
            role: savedDemoRole,
            schoolId: 'demo_school_dps',
          });
          const school = await getSchool('demo_school_dps');
          if (!school) {
            await seedDemoSchoolData('demo_school_dps');
            setCurrentSchool(await getSchool('demo_school_dps'));
          } else {
            setCurrentSchool(school);
          }
        } else {
          setCurrentSchool(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      localStorage.removeItem('schoolos_demo_role');
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await loadUserAndSchool(cred.user.uid, cred.user.email || '');
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    schoolName: string,
    userRole: UserRole = 'admin'
  ) => {
    setLoading(true);
    try {
      localStorage.removeItem('schoolos_demo_role');
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = cred.user.uid;

      // Create new school for this registered admin
      const newSchool = await createSchool({
        name: schoolName || 'My School',
        address: 'Main Campus, City Center',
        phone: '+91 98765 43210',
        academicYear: '2026-2027',
        createdAt: new Date().toISOString(),
      });

      const profile: SchoolUser = {
        uid,
        name,
        email,
        role: userRole,
        schoolId: newSchool.id,
      };

      await setDoc(doc(db, 'users', uid), profile);
      await setDoc(doc(db, 'schools', newSchool.id, 'users', uid), profile);

      // Seed initial sample structure so they have something to start with
      await seedDemoSchoolData(newSchool.id, schoolName);

      setCurrentUser(cred.user);
      setCurrentSchool(newSchool);
      setSchoolId(newSchool.id);
      setRole(userRole);
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('schoolos_demo_role');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await loadUserAndSchool(result.user.uid, result.user.email || '');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (demoRole: UserRole, customSchoolId = 'demo_school_dps') => {
    setLoading(true);
    try {
      localStorage.setItem('schoolos_demo_role', demoRole);
      setRole(demoRole);
      setSchoolId(customSchoolId);
      const mockProfile: SchoolUser = {
        uid: `demo_${demoRole}`,
        name: demoRole === 'admin' ? 'Ritu Sen (Principal & Admin)' : 'Pawan Kumar (Senior Accountant)',
        role: demoRole,
        schoolId: customSchoolId,
      };
      setUserProfile(mockProfile);

      // Ensure demo school exists
      let school = await getSchool(customSchoolId);
      if (!school) {
        const schoolName = customSchoolId === 'demo_school_dps' 
          ? 'Delhi Public School, R.K. Puram' 
          : "St. Xavier's High School, Mumbai";
        await seedDemoSchoolData(customSchoolId, schoolName);
        school = await getSchool(customSchoolId);
      }
      setCurrentSchool(school);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('schoolos_demo_role');
    if (currentUser) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setCurrentSchool(null);
    setUserProfile(null);
  };

  const switchSchool = async (newSchoolId: string) => {
    setLoading(true);
    try {
      const sch = await getSchool(newSchoolId);
      if (sch) {
        setCurrentSchool(sch);
        setSchoolId(newSchoolId);
        if (currentUser) {
          await setDoc(doc(db, 'users', currentUser.uid), { schoolId: newSchoolId }, { merge: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadSchoolData = async () => {
    if (schoolId) {
      const sch = await getSchool(schoolId);
      if (sch) setCurrentSchool(sch);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentSchool,
        schoolId,
        role,
        userProfile,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsDemo,
        logout,
        switchSchool,
        reloadSchoolData,
        setSchoolData: setCurrentSchool,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
