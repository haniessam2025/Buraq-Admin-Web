import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserPlus, Trash2, Shield } from 'lucide-react';

export default function AdminUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'adminUsers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmins(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      alert('يرجى ملء جميع الحقول!');
      return;
    }

    setLoading(true);
    try {
      // بما أن إنشاء مستخدم Firebase Auth يتطلب اكواد سيرفر أو Firebase Admin SDK، 
      // هنحفظ بيانات المستخدم الجديد في كوليكشن adminUsers بالبريد وكلمة المرور وصلاحياته
      const customId = email.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'adminUsers', customId), {
        name,
        email,
        password, // لحفظه كمساعد لتسجيل الدخول المباشر
        role,
        createdAt: new Date().getTime()
      });

      alert('تم إضافة المستخدم بنجاح! يمكنه الآن تسجيل الدخول بالبريد وكلمة المرور.');
      setName('');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إضافة المستخدم.');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الحساب الإداري؟')) {
      await deleteDoc(doc(db, 'adminUsers', id));
    }
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Shield size={28} color="#3b82f6" />
        <h2>إدارة صلاحيات ومستخدمي لوحة التحكم 🔐</h2>
      </div>

      <form onSubmit={handleCreateAdmin} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>إضافة مستخدم إداري جديد</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم الموظف:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أحمد محمد" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>البريد الإلكتروني:</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@buraq.com" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', direction: 'ltr', textAlign: 'right' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>كلمة المرور:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', direction: 'ltr', textAlign: 'right' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>الصلاحية:</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="staff">موظف (متابعة وعملاء)</option>
              <option value="manager">مدير تشغيل (صلاحيات كاملة)</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} />
          {loading ? 'جاري الإضافة...' : 'إنشاء حساب جديد'}
        </button>
      </form>

      <h3>المستخدمون الحاليون ({admins.length})</h3>
      <div className="table-container" style={{ marginTop: '15px' }}>
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الصلاحية</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.id}>
                <td><strong>{admin.name}</strong></td>
                <td style={{ direction: 'ltr', textAlign: 'right' }}>{admin.email}</td>
                <td>
                  <span style={{ backgroundColor: admin.role === 'manager' ? '#dbeafe' : '#f1f5f9', color: admin.role === 'manager' ? '#1d4ed8' : '#475569', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                    {admin.role === 'manager' ? 'مدير تشغيل' : 'موظف'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleDelete(admin.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}