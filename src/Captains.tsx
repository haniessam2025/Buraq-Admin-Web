import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Captains() {
  const [captains, setCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'captains'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const capsData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      capsData.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      setCaptains(capsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleBlockStatus = async (captainId: string, currentStatus: boolean) => {
    const confirmMsg = currentStatus 
      ? 'هل أنت متأكد من تفعيل حساب هذا الكابتن مرة أخرى؟' 
      : 'هل أنت متأكد من إيقاف (حظر) هذا الكابتن؟ لن يتمكن من استقبال رحلات.';
      
    if (window.confirm(confirmMsg)) {
      try {
        const capRef = doc(db, 'captains', captainId);
        await updateDoc(capRef, { isBlocked: !currentStatus });
      } catch (error) {
        console.error('Error updating status:', error);
        alert('حدث خطأ أثناء تعديل حالة الكابتن');
      }
    }
  };

  const getAvatar = (imgStr: string) => {
    if (!imgStr || imgStr.trim() === '') return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    if (imgStr.startsWith('http') || imgStr.startsWith('data:image')) return imgStr;
    if (imgStr.length > 50) return `data:image/jpeg;base64,${imgStr}`;
    return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  };

  const filteredCaptains = captains.filter((captain) => {
    const queryText = searchQuery.toLowerCase().trim();
    if (!queryText) return true;

    const name = (captain.name || '').toLowerCase();
    const phone = (captain.phone || '').toLowerCase();
    const nationalId = (captain.nationalId || '').toLowerCase(); 
    const vehicle = (captain.vehicle || captain.vehicleCategory || '').toLowerCase();
    const plateNumber = (captain.plateNumber || '').toLowerCase();

    return (
      name.includes(queryText) ||
      phone.includes(queryText) ||
      nationalId.includes(queryText) ||
      vehicle.includes(queryText) ||
      plateNumber.includes(queryText)
    );
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>إدارة الكباتن والمركبات 🛺🚗</h2>
        <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
          {filteredCaptains.length} كابتن
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="ابحث بالاسم، رقم الهاتف، رقم البطاقة، المركبة، أو رقم اللوحة... 🔍"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 15px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '15px',
            outline: 'none',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
          }}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>جاري تحميل بيانات الكباتن...</p>
      ) : filteredCaptains.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '18px' }}>
          {searchQuery ? 'لا يوجد كابتن يطابق نتيجة البحث 🔍' : 'لا يوجد كباتن مسجلين في النظام.'}
        </p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الصورة</th>
                <th>اسم الكابتن</th>
                <th>رقم الهاتف</th>
                <th>الرقم القومي</th> {/* 👈 ضفنا العمود هنا */}
                <th>المركبة</th>
                <th>رقم اللوحة</th>
                <th>التقييم</th>
                <th>حالة الحساب</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredCaptains.map((captain) => (
                <tr key={captain.id} style={{ backgroundColor: captain.isBlocked ? '#fee2e2' : 'transparent' }}>
                  <td>
                    <img 
                      src={getAvatar(captain.avatar || captain.image)} 
                      alt="avatar" 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                    />
                  </td>
                  <td><strong>{captain.name || 'بدون اسم'}</strong></td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{captain.phone || 'غير مسجل'}</td>
                  
                  {/* 👈 ضفنا خانة الرقم القومي هنا */}
                  <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>
                    {captain.nationalId || 'غير مسجل'}
                  </td>
                  
                  <td>
                    <span style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                      {captain.vehicle || captain.vehicleCategory || 'غير محدد'}
                    </span>
                  </td>
                  <td>{captain.plateNumber || 'بدون لوحة'}</td>
                  <td style={{ color: '#d97706', fontWeight: 'bold', fontSize: '15px' }}>⭐ {captain.rating || '5.0'}</td>
                  <td>
                    {captain.isBlocked ? (
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>محظور 🚫</span>
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>نشط ✅</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleBlockStatus(captain.id, captain.isBlocked)}
                      style={{ 
                        backgroundColor: captain.isBlocked ? '#10b981' : '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        transition: '0.3s'
                      }}
                    >
                      {captain.isBlocked ? 'تفعيل الحساب' : 'حظر الكابتن'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}