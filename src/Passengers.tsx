import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Passengers() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // تأكد إن اسم الكوليكشن هو اللي بتستخدمه (passengers أو users)
    const q = query(collection(db, 'passengers'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const passData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      passData.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      setPassengers(passData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // دالة إيقاف/تفعيل حساب الراكب
  const toggleBlockStatus = async (passengerId: string, currentStatus: boolean) => {
    const confirmMsg = currentStatus 
      ? 'هل أنت متأكد من تفعيل حساب هذا الراكب مرة أخرى؟' 
      : 'هل أنت متأكد من إيقاف (حظر) هذا الراكب؟ لن يتمكن من طلب رحلات.';
      
    if (window.confirm(confirmMsg)) {
      try {
        const passRef = doc(db, 'passengers', passengerId);
        await updateDoc(passRef, { isBlocked: !currentStatus });
      } catch (error) {
        console.error('Error updating status:', error);
        alert('حدث خطأ أثناء تعديل حالة الراكب');
      }
    }
  };

  // دالة لمعالجة الصورة
  const getAvatar = (imgStr: string) => {
    if (!imgStr || imgStr.trim() === '') return 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
    if (imgStr.startsWith('http') || imgStr.startsWith('data:image')) return imgStr;
    if (imgStr.length > 50) return `data:image/jpeg;base64,${imgStr}`;
    return 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
  };

// الدالة الذكية لضبط أي صيغة تاريخ أو البحث عن حقول بديلة
  const formatDate = (passenger: any) => {
    // تجميع كل الاحتمالات اللي ممكن يكون التاريخ متسجل بيها
    const timeData = passenger.timestamp || passenger.createdAt || passenger.date;

    if (!timeData) return 'راكب قديم (بدون تاريخ)'; 
    
    if (timeData.seconds) return new Date(timeData.seconds * 1000).toLocaleDateString('ar-EG');
    
    const date = new Date(timeData);
    if (!isNaN(date.getTime())) return date.toLocaleDateString('ar-EG');
    
    return 'غير محدد';
  };

  // 👈 دالة الفلترة (تم إضافة الرقم القومي للبحث)
  const filteredPassengers = passengers.filter((passenger) => {
    const queryText = searchQuery.toLowerCase().trim();
    if (!queryText) return true;

    const name = (passenger.name || '').toLowerCase();
    const phone = (passenger.phone || '').toLowerCase();
    const nationalId = (passenger.nationalId || '').toLowerCase(); // 👈 الرقم القومي

    return name.includes(queryText) || phone.includes(queryText) || nationalId.includes(queryText);
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>إدارة الركاب والعملاء 👥</h2>
        <span style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
          {filteredPassengers.length} راكب
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="ابحث عن راكب بالاسم، رقم الهاتف، أو الرقم القومي... 🔍"
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
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>جاري تحميل بيانات الركاب...</p>
      ) : filteredPassengers.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '18px' }}>
          {searchQuery ? 'لا يوجد راكب يطابق نتيجة البحث 🔍' : 'لا يوجد ركاب مسجلين في النظام.'}
        </p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الصورة</th>
                <th>اسم الراكب</th>
                <th>رقم الهاتف</th>
                <th>الرقم القومي</th> {/* 👈 العمود الجديد */}
                <th>تاريخ التسجيل</th>
                <th>حالة الحساب</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.map((passenger) => (
                <tr key={passenger.id} style={{ backgroundColor: passenger.isBlocked ? '#fee2e2' : 'transparent' }}>
                  <td>
                    <img 
                      src={getAvatar(passenger.avatar || passenger.image)} 
                      alt="avatar" 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} 
                    />
                  </td>
                  <td><strong>{passenger.name || 'بدون اسم'}</strong></td>
                  <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>
                    {passenger.phone || 'غير مسجل'}
                  </td>
                  
                  {/* 👈 خلية الرقم القومي */}
                  <td style={{ direction: 'ltr', textAlign: 'right', color: '#334155' }}>
                    {passenger.nationalId || 'غير مسجل'}
                  </td>

                  <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '13px' }}>
                    {formatDate(passenger)}
                    </td>
                  <td>
                    {passenger.isBlocked ? (
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>محظور 🚫</span>
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>نشط ✅</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleBlockStatus(passenger.id, passenger.isBlocked)}
                      style={{ 
                        backgroundColor: passenger.isBlocked ? '#10b981' : '#ef4444', 
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
                      {passenger.isBlocked ? 'تفعيل الحساب' : 'حظر الراكب'}
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