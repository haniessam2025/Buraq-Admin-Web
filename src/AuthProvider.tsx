import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Lock, Mail, LogIn } from 'lucide-react';

const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [roleData, setRoleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🔴🔴🔴 ضع إيميل الأدمن الأساسي الخاص بك هنا بدلاً من هذا الإيميل 🔴🔴🔴
  const ADMIN_EMAIL = 'haniessam@gmail.com'; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // نبحث عن صلاحيات الموظف باستخدام الإيميل
          const docRef = doc(db, 'staffRoles', currentUser.email!.toLowerCase());
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setRoleData(docSnap.data());
          } else if (currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            // لو الإيميل هو إيميل الأدمن الأساسي اللي حددناه فوق
            setRoleData({ role: 'admin', allowedPages: ['all'] });
          } else {
            // حساب ملوش أي صلاحيات متسجلة
            setRoleData(null); 
          }
        } catch (error) {
          console.error("خطأ في جلب الصلاحيات: ", error);
        }
      } else {
        setUser(null);
        setRoleData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', fontSize: '18px', fontWeight: 'bold', color: '#475569' }}>
        جاري التحقق من الصلاحيات... 🔐
      </div>
    );
  }

  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) return setError('يرجى إدخال البريد وكلمة المرور');
      setSubmitting(true);
      setError('');
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError('بيانات الدخول غير صحيحة، تأكد من البريد أو كلمة المرور!');
      }
      setSubmitting(false);
    };

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9', direction: 'rtl' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: 'white', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>بُرَاق | لوحة التحكم</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>تسجيل الدخول للموظفين والإدارة</p>
          </div>
          {error && <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>البريد الإلكتروني:</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', right: '12px', color: '#94a3b8' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', direction: 'ltr', textAlign: 'right' }} />
              </div>
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>كلمة المرور:</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', right: '12px', color: '#94a3b8' }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', direction: 'ltr', textAlign: 'right' }} />
              </div>
            </div>
            <button type="submit" disabled={submitting} style={{ width: '100%', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <LogIn size={20} /> {submitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, roleData }}>{children}</AuthContext.Provider>;
}