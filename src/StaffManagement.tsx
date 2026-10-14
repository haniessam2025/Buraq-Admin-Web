import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';

const PAGES = [
  { id: 'home', name: 'الرئيسية (الرحلات)' },
  { id: 'captains', name: 'الكباتن والمركبات' },
  { id: 'passengers', name: 'الركاب' },
  { id: 'promos', name: 'أكواد الخصم' },
  { id: 'notifications', name: 'إرسال الإشعارات' },
  { id: 'settings', name: 'إعدادات التسعير' }
];

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staffRoles'), (snapshot) => {
      setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const togglePage = (pageId: string) => {
    if (allowedPages.includes(pageId)) {
      setAllowedPages(allowedPages.filter(p => p !== pageId));
    } else {
      setAllowedPages([...allowedPages, pageId]);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return alert('يرجى إدخال الاسم والبريد الإلكتروني');
    if (allowedPages.length === 0) return alert('يرجى اختيار صلاحية واحدة على الأقل');

    setLoading(true);
    try {
      const staffEmail = email.toLowerCase().trim();
      await setDoc(doc(db, 'staffRoles', staffEmail), {
        name,
        email: staffEmail,
        allowedPages,
        role: 'staff'
      });
      setEmail('');
      setName('');
      setAllowedPages([]);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إضافة الصلاحيات');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('هل أنت متأكد من حذف صلاحيات هذا الموظف نهائياً؟')) {
      await deleteDoc(doc(db, 'staffRoles', id));
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <ShieldCheck size={28} color="#3b82f6" />
        <h2>إدارة الموظفين والصلاحيات</h2>
      </div>
      <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '25px', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
        ⚠️ هام: قم بإنشاء (البريد وكلمة المرور) للموظف الجديد من لوحة Firebase Authentication أولاً، ثم أضف بريده هنا لمنحه الصلاحيات.
      </p>

      <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>اسم الموظف:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="مثال: أحمد محمد" />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>البريد الإلكتروني:</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'left', direction: 'ltr' }} placeholder="employee@buraq.com" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>الشاشات المسموح للموظف برؤيتها:</label>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {PAGES.map(page => (
              <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <input type="checkbox" checked={allowedPages.includes(page.id)} onChange={() => togglePage(page.id)} />
                {page.name}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '200px', marginTop: '10px' }}>
          <UserPlus size={18} /> {loading ? 'جاري الحفظ...' : 'إضافة الصلاحيات'}
        </button>
      </form>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>الموظف</th>
              <th style={{ textAlign: 'right' }}>الصلاحيات الممنوحة</th>
              <th style={{ textAlign: 'center' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{staff.name}</div>
                  <div style={{ color: '#64748b', fontSize: '13px' }} dir="ltr">{staff.email}</div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {staff.allowedPages.map((pageId: string) => (
                      <span key={pageId} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {PAGES.find(p => p.id === pageId)?.name || pageId}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleDelete(staff.id)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>لا يوجد موظفين مسجلين حالياً.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}