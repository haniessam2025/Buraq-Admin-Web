import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase'; // 👈 تأكدنا من استدعاء auth هنا
import { ShieldCheck, Trash2, ChevronDown, ChevronUp, CheckSquare, Square, UserPlus } from 'lucide-react';
import { APP_PERMISSIONS } from './permissionsConfig';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState(''); // 👈 متغير كلمة المرور
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'roles'));
      const list = snapshot.docs
        .map(d => ({ email: d.id, ...d.data() }))
        .filter((s: any) => s.role !== 'admin');
      setStaffList(list);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };

  const handleAddStaff = async (e: any) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword || selectedPermissions.length === 0) {
      alert('برجاء إدخال الإيميل، الاسم، كلمة المرور، واختيار صلاحية واحدة على الأقل.');
      return;
    }
    if (newPassword.length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.');
      return;
    }

    setIsSubmitting(true);
    const emailKey = newEmail.trim().toLowerCase();
    
    try {
      // 1️⃣ إنشاء الحساب في Firebase Auth بصمت (في الخلفية) لمنع تسجيل خروج المدير
      const apiKey = auth.app.options.apiKey;
      const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailKey,
          password: newPassword,
          returnSecureToken: false
        })
      });

      const authData = await authResponse.json();

      // لو الحساب موجود مسبقاً، مفيش مشكلة هنحدث صلاحياته بس
      if (!authResponse.ok && authData.error.message !== 'EMAIL_EXISTS') {
        alert(`حدث خطأ أثناء إنشاء الحساب: ${authData.error.message}`);
        setIsSubmitting(false);
        return;
      }

      // 2️⃣ حفظ الصلاحيات والبيانات في Firestore
      await setDoc(doc(db, 'roles', emailKey), {
        name: newName.trim(),
        role: 'staff',
        allowedPages: selectedPermissions,
        createdAt: serverTimestamp()
      });
      
      alert(authData.error?.message === 'EMAIL_EXISTS' ? 'تم تحديث صلاحيات الموظف بنجاح (الحساب كان موجوداً مسبقاً).' : 'تم إنشاء حساب الموظف ومنحه الصلاحيات بنجاح!');
      
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setSelectedPermissions([]);
      setIsDropdownOpen(false);
      fetchStaff();
    } catch (error) {
      alert('حدث خطأ أثناء الاتصال بقاعدة البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm(`هل أنت متأكد من سحب صلاحيات الموظف (${email})؟ \n\nملاحظة: هذا سيمنعه من دخول لوحة التحكم، ولكن يفضل حذفه من Authentication يدوياً لمزيد من الأمان.`)) return;
    try {
      await deleteDoc(doc(db, 'roles', email));
      alert('تم سحب الصلاحيات بنجاح.');
      fetchStaff();
    } catch (error) {
      alert('خطأ أثناء سحب الصلاحيات.');
    }
  };

  const getPermissionLabel = (id: string) => {
    for (const group of APP_PERMISSIONS) {
      const item = group.items.find(i => i.id === id);
      if (item) return item.label;
    }
    return id;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <ShieldCheck size={32} color="#10b981" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>إدارة الموظفين والصلاحيات</h2>
      </div>

      <form onSubmit={handleAddStaff} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>اسم الموظف:</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: أحمد محمد" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>البريد الإلكتروني (لتسجيل الدخول):</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="employee@buraq.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }} dir="ltr" />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>كلمة المرور:</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6 أحرف أو أرقام على الأقل" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'left' }} dir="ltr" />
          </div>
        </div>

        <div style={{ marginBottom: '25px', position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>الشاشات المسموح للموظف برؤيتها:</label>
          
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ color: selectedPermissions.length > 0 ? '#0f172a' : '#94a3b8', fontWeight: selectedPermissions.length > 0 ? 'bold' : 'normal' }}>
              {selectedPermissions.length > 0 ? `تم تحديد (${selectedPermissions.length}) صلاحيات` : 'اضغط هنا لاختيار الصلاحيات...'}
            </span>
            {isDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {isDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '5px', zIndex: 10, maxHeight: '350px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {APP_PERMISSIONS.map((group, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div 
                    onClick={() => toggleGroup(group.group)}
                    style={{ padding: '12px 15px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}
                  >
                    <span>{group.group}</span>
                    {expandedGroups.includes(group.group) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  
                  {expandedGroups.includes(group.group) && (
                    <div style={{ padding: '10px 20px', backgroundColor: 'white' }}>
                      {group.items.map(item => {
                        const isSelected = selectedPermissions.includes(item.id);
                        return (
                          <div key={item.id} onClick={() => togglePermission(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer' }}>
                            {isSelected ? <CheckSquare size={18} color="#10b981" /> : <Square size={18} color="#cbd5e1" />}
                            <span style={{ color: isSelected ? '#0f172a' : '#64748b', fontWeight: isSelected ? 'bold' : 'normal' }}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} style={{ backgroundColor: isSubmitting ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSubmitting ? 'جاري الإنشاء...' : <><UserPlus size={20} /> إنشاء الحساب ومنح الصلاحيات</>}
        </button>
      </form>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '15px', color: '#475569' }}>الموظف</th>
              <th style={{ padding: '15px', color: '#475569' }}>البريد الإلكتروني</th>
              <th style={{ padding: '15px', color: '#475569' }}>الصلاحيات الممنوحة</th>
              <th style={{ padding: '15px', color: '#475569', width: '100px', textAlign: 'center' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>جاري التحميل...</td></tr>
            ) : staffList.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>لا يوجد موظفين مسجلين حالياً.</td></tr>
            ) : (
              staffList.map(staff => (
                <tr key={staff.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#1e293b' }}>{staff.name}</td>
                  <td style={{ padding: '15px', color: '#64748b' }} dir="ltr">{staff.email}</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(staff.allowedPages || []).map((pageId: string) => (
                        <span key={pageId} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                          {getPermissionLabel(pageId)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button onClick={() => handleDelete(staff.email)} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Trash2 size={16} /> سحب الصلاحيات
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}