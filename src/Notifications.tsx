import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Send, Bell, Users, CarFront } from 'lucide-react';

export default function Notifications() {
  const [audience, setAudience] = useState<'captains' | 'passengers'>('captains');
  const [scope, setScope] = useState<'all' | 'specific'>('all');
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, audience));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
      setSelectedUsers([]);
      setSearchQuery('');
    });
    return () => unsubscribe();
  }, [audience]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // معالجة الصور وإظهار افتراضية لو مش موجودة
  const getAvatar = (imgStr: string) => {
    if (!imgStr || imgStr.trim() === '') {
      return audience === 'captains' 
        ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' 
        : 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
    }
    if (imgStr.startsWith('http') || imgStr.startsWith('data:image')) return imgStr;
    if (imgStr.length > 50) return `data:image/jpeg;base64,${imgStr}`;
    return audience === 'captains' 
      ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' 
      : 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
  };

  // الفلترة الذكية (تم إضافة الرقم القومي ونوع المركبة للبحث)
  const filteredUsers = usersList.filter(user => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const name = (user.name || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const nationalId = (user.nationalId || '').toLowerCase();
    const vehicle = (user.vehicle || user.vehicleCategory || '').toLowerCase();

    return name.includes(term) || phone.includes(term) || nationalId.includes(term) || vehicle.includes(term);
  });

  // دالة تحديد كل نتائج البحث بضغطة واحدة
  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUsers(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  // دالة إلغاء تحديد كل نتائج البحث
  const deselectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    setSelectedUsers(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      alert('يرجى كتابة عنوان ونص الإشعار أولاً!');
      return;
    }
    if (scope === 'specific' && selectedUsers.length === 0) {
      alert('يرجى تحديد مستخدم واحد على الأقل أو اختيار "إرسال للكل"!');
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        body,
        targetAudience: audience,
        targetScope: scope,
        targetIds: scope === 'specific' ? selectedUsers : [],
        timestamp: new Date().getTime(),
        status: 'sent'
      });

      alert('تم إرسال الإشعار بنجاح! ✅');
      setTitle('');
      setBody('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('حدث خطأ أثناء إرسال الإشعار.');
    }
    setIsSending(false);
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
        <Bell size={28} color="#f59e0b" />
        <h2>إرسال الإشعارات 📢</h2>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>إرسال إلى:</label>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => setAudience('captains')}
            style={{ flex: 1, padding: '15px', borderRadius: '8px', border: audience === 'captains' ? '2px solid #3b82f6' : '1px solid #cbd5e1', backgroundColor: audience === 'captains' ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', fontSize: '16px' }}
          >
            <CarFront size={20} color={audience === 'captains' ? '#3b82f6' : '#64748b'} />
            الكباتن
          </button>
          <button 
            onClick={() => setAudience('passengers')}
            style={{ flex: 1, padding: '15px', borderRadius: '8px', border: audience === 'passengers' ? '2px solid #8b5cf6' : '1px solid #cbd5e1', backgroundColor: audience === 'passengers' ? '#f5f3ff' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', fontSize: '16px' }}
          >
            <Users size={20} color={audience === 'passengers' ? '#8b5cf6' : '#64748b'} />
            الركاب
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} style={{ width: '18px', height: '18px' }} />
          الكل ({usersList.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <input type="radio" checked={scope === 'specific'} onChange={() => setScope('specific')} style={{ width: '18px', height: '18px' }} />
          تحديد أشخاص ({selectedUsers.length} محدد)
        </label>
      </div>

      {scope === 'specific' && (
        <div style={{ marginBottom: '20px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '15px', backgroundColor: '#f8fafc' }}>
          <input 
            type="text" 
            placeholder={audience === 'captains' ? "ابحث بالاسم، التليفون، الرقم القومي، أو نوع المركبة (مثال: توكتوك)... 🔍" : "ابحث بالاسم، التليفون، أو الرقم القومي... 🔍"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px' }}
          />
          
          {searchQuery && filteredUsers.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button onClick={selectAllFiltered} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                تحديد كل نتائج البحث ({filteredUsers.length})
              </button>
              <button onClick={deselectAllFiltered} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                إلغاء تحديد النتائج
              </button>
            </div>
          )}

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredUsers.map(user => (
              <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', transition: '0.2s' }}>
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  style={{ width: '20px', height: '20px' }}
                />
                
                {/* 👈 إضافة الصورة الشخصية */}
                <img 
                  src={getAvatar(user.avatar || user.image)} 
                  alt="avatar" 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>{user.name || 'بدون اسم'}</strong>
                    <span style={{ color: '#64748b', marginRight: '10px', fontSize: '14px', direction: 'ltr', display: 'inline-block' }}>
                      {user.phone || 'بدون رقم'}
                    </span>
                  </div>
                  
                  {/* إظهار نوع المركبة والرقم القومي لو الفئة كباتن */}
                  {audience === 'captains' ? (
                    <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#475569' }}>
                      <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {user.vehicle || user.vehicleCategory || 'بدون مركبة'}
                      </span>
                      <span>الرقم القومي: {user.nationalId || 'غير مسجل'}</span>
                    </div>
                  ) : (
                    /* إظهار الرقم القومي للركاب إن وجد */
                    <div style={{ fontSize: '13px', color: '#475569' }}>
                      <span>الرقم القومي: {user.nationalId || 'غير مسجل'}</span>
                    </div>
                  )}
                </div>
              </label>
            ))}
            {filteredUsers.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>لا يوجد نتائج للبحث.</p>}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>عنوان الإشعار:</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: خصم 50% أو تنبيه هام للكباتن!" 
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
        />
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>نص الإشعار:</label>
        <textarea 
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب تفاصيل الإشعار هنا..." 
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', minHeight: '100px', resize: 'vertical' }}
        />
      </div>

      <button 
        onClick={handleSendNotification}
        disabled={isSending}
        style={{ width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: isSending ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
      >
        <Send size={22} />
        {isSending ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
      </button>
    </div>
  );
}