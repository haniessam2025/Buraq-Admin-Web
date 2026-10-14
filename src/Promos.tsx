import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; 
import { Ticket, Plus, Trash2, Tag, Calendar, RefreshCw, Users, Search, CheckSquare, Square } from 'lucide-react';

export default function PromoCodes() {
  const [promos, setPromos] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('fixed'); 
  const [expiryDate, setExpiryDate] = useState('');
  
  // متغيرات تحديد الركاب
  const [scope, setScope] = useState('all'); // 'all' أو 'specific'
  const [passengers, setPassengers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. جلب أكواد الخصم الحالية
        const docRef = doc(db, 'app_settings', 'pricing');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPromos(docSnap.data().promoCodes || []);
        }

        // 2. جلب قائمة الركاب
        const passengersSnap = await getDocs(collection(db, 'passengers'));
        const passList = passengersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || data.fullName || data.userName || 'راكب بدون اسم',
            phone: data.phone || data.phoneNumber || data.mobile || 'لا يوجد',
            nationalId: data.nationalId || data.idNumber || data.nid || data.civilId || 'لا يوجد',
            profilePic: data.profilePic || data.photo || data.avatar || data.image || 'https://via.placeholder.com/40'
          };
        });
        setPassengers(passList);
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // دالة توليد كود عشوائي
  const generateRandomCode = () => {
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCode(`BURAQ-${randomChars}`);
  };

  // فلترة الركاب بناءً على البحث
  const filteredPassengers = passengers.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) || 
      (p.phone && p.phone.includes(term)) || 
      (p.nationalId && p.nationalId.includes(term))
    );
  });

  // دالة اختيار أو إلغاء اختيار راكب
  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // دالة الحفظ
  const handleAddPromo = async () => {
    if (!code || !discountValue || !expiryDate) {
      alert('يرجى تعبئة جميع الحقول الأساسية!');
      return;
    }
    if (scope === 'specific' && selectedUsers.length === 0) {
      alert('يرجى تحديد راكب واحد على الأقل!');
      return;
    }

    setSaving(true);
    const newPromo = {
      code: code.toUpperCase().trim(),
      discountValue: Number(discountValue),
      discountType,
      expiryDate, 
      scope, // all أو specific
      selectedUsers: scope === 'specific' ? selectedUsers : [], // حفظ قائمة الآيديهات
      isActive: true,
      createdAt: new Date().getTime(),
    };

    try {
      // 1. حفظ الكود في إعدادات التسعير
      const docRef = doc(db, 'app_settings', 'pricing');
      await setDoc(docRef, { promoCodes: arrayUnion(newPromo) }, { merge: true });

      setPromos([...promos, newPromo]);
      
      // تصفير الحقول
      setCode('');
      setDiscountValue('');
      setExpiryDate('');
      setScope('all');
      setSelectedUsers([]);
      setSearchQuery('');
      
      alert('تم إرسال الكود بنجاح للركاب المحددين! 🎉');
      
      // 💡 ملحوظة للإشعارات:
      // بمجرد حفظ الكود هنا، شاشة "النافذة المنبثقة (تهانينا)" في الموبايل
      // هتظهر وقتي (Real-time) للمستخدم لو هو فاتح التطبيق.
      
    } catch (error) {
      console.error('خطأ أثناء الحفظ:', error);
      alert('حدث خطأ أثناء الإرسال.');
    }
    setSaving(false);
  };

  const handleDeletePromo = async (promoToDelete: any) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
    try {
      const docRef = doc(db, 'app_settings', 'pricing');
      await updateDoc(docRef, { promoCodes: arrayRemove(promoToDelete) });
      setPromos(promos.filter((p) => p.code !== promoToDelete.code));
      alert('تم حذف الكود!');
    } catch (error) {
      console.error('خطأ أثناء الحذف:', error);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '40px' }}>جاري تحميل البيانات...</p>;

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <Ticket size={28} color="#10b981" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>إدارة وإنشاء أكواد الخصم للركاب</h2>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
        
        {/* --- الحقول الأساسية --- */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}><Tag size={16} /> الكود:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="مثال: BURAQ50" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button onClick={generateRandomCode} title="توليد كود عشوائي" style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}><RefreshCw size={18} /></button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '100px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>قيمة الخصم:</label>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="50" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ flex: 1, minWidth: '100px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>النوع:</label>
            <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="fixed">ثابت (جنيه)</option>
              <option value="percentage">نسبة (%)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}><Calendar size={16} /> ينتهي في:</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
        </div>

        {/* --- تحديد المستفيدين --- */}
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#f59e0b" /> تحديد المستفيدين من الكود:
          </h3>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} style={{ transform: 'scale(1.2)' }} />
              إرسال لجميع الركاب
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="scope" checked={scope === 'specific'} onChange={() => setScope('specific')} style={{ transform: 'scale(1.2)' }} />
              تحديد ركاب مخصصين
            </label>
          </div>

          {/* قائمة الركاب (تظهر فقط لو اختار مخصصين) */}
          {scope === 'specific' && (
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              
              {/* شريط البحث */}
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <Search size={18} color="#64748b" style={{ position: 'absolute', right: '10px', top: '12px' }} />
                <input 
                  type="text" 
                  placeholder="ابحث بالاسم، الموبايل، أو الرقم القومي..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 35px 10px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              {/* القائمة */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                {filteredPassengers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>لا توجد نتائج مطابقة</p>
                ) : (
                  filteredPassengers.map(p => {
                    const isSelected = selectedUsers.includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => toggleUserSelection(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: isSelected ? '#f0fdf4' : 'white', transition: 'background 0.2s' }}
                      >
                        {isSelected ? <CheckSquare size={20} color="#10b981" /> : <Square size={20} color="#cbd5e1" />}
                        <img src={p.profilePic || 'https://via.placeholder.com/40'} alt="صورة الراكب" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>{p.name || 'راكب بدون اسم'}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>📞 {p.phone || 'لا يوجد'} | 🆔 {p.nationalId || 'لا يوجد'}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#10b981', marginTop: '10px', fontWeight: 'bold' }}>
                تم تحديد ({selectedUsers.length}) راكب
              </p>
            </div>
          )}
        </div>

        <button onClick={handleAddPromo} disabled={saving} style={{ width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> {saving ? 'جاري الإرسال...' : 'إرسال وإنشاء الكود'}
        </button>
      </div>

      {/* --- جدول عرض الأكواد الحالية --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
            <th style={{ padding: '12px' }}>الكود</th>
            <th style={{ padding: '12px' }}>الخصم</th>
            <th style={{ padding: '12px' }}>الاستهداف</th>
            <th style={{ padding: '12px' }}>ينتهي في</th>
            <th style={{ padding: '12px' }}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {promos.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>لا توجد أكواد خصم حالياً</td></tr>
          ) : (
            promos.map((p, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#3b82f6' }}>{p.code}</td>
                <td style={{ padding: '12px' }}>{p.discountValue} {p.discountType === 'fixed' ? 'جنيه' : '%'}</td>
                <td style={{ padding: '12px', color: '#64748b', fontSize: '14px' }}>
                  {p.scope === 'all' ? 'الكل' : `مخصص (${p.selectedUsers?.length || 0} ركاب)`}
                </td>
                <td style={{ padding: '12px' }}>{p.expiryDate}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleDeletePromo(p)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}