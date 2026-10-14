import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Home() {
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 👈 استدعاء الرحلات النشطة فقط
    const q = query(
      collection(db, 'rides'),
      where('status', 'in', ['pending', 'searching', 'accepted', 'captain_arrived', 'passenger_on_the_way', 'waiting_for_scan', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ridesData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // ترتيب تنازلي (الأحدث أولاً)
      ridesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setActiveRides(ridesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🪄 دالة سحرية لرمي رحلة وهمية في الفايربيز للتجربة
  const addTestRide = async () => {
    try {
      await addDoc(collection(db, 'rides'), {
        name: 'راكب تجريبي (تيست)',
        phone: '01012345678',
        pickupLocation: 'محطة الرمل، الإسكندرية',
        destinationLocation: 'سيدي بشر، الإسكندرية',
        price: '75',
        status: 'accepted', // خلينا حالتها مقبولة
        timestamp: new Date().getTime(),
        paymentMethod: 'كاش',
        captainName: 'كابتن محمود (تجربة)', // 👈 اللوحة هتقرأ الاسم ده فوراً
        captainPhone: '01122334455'
      });
    } catch (error) {
      console.log('Error adding test ride:', error);
    }
  };

  // دالة ذكية لتلوين وتسمية حالة الرحلة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'searching': return <span className="status-badge status-pending">يبحث عن كابتن 🔍</span>;
      case 'accepted': return <span className="status-badge status-accepted">تم القبول ✅</span>;
      case 'captain_arrived':
      case 'passenger_on_the_way':
      case 'waiting_for_scan': return <span className="status-badge status-arrived">في نقطة الالتقاء ⏳</span>;
      case 'in_progress': return <span className="status-badge status-progress">الرحلة جارية 🚀</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>رادار الرحلات النشطة 📡</h2>
          <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
            {activeRides.length} رحلة لايف
          </span>
        </div>
        
        {/* زرار إنشاء الرحلة الوهمية */}
        <button 
          onClick={addTestRide}
          style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + إنشاء رحلة تجريبية
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>جاري تحميل البيانات...</p>
      ) : activeRides.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '18px' }}>لا توجد رحلات نشطة في الوقت الحالي.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الراكب</th>
                <th>الكابتن</th>
                <th>من</th>
                <th>إلى</th>
                <th>السعر</th>
                <th>الحالة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {activeRides.map((ride) => (
                <tr key={ride.id}>
                  {/* عمود الراكب */}
                  <td>
                    <div style={{ fontWeight: 'bold' }} dir="auto">{ride.name || 'غير معروف'}</div>
                    <div dir="ltr" style={{ fontSize: '13px', color: '#64748b', textAlign: 'right' }}>{ride.phone}</div>
                  </td>
                  
                  {/* عمود الكابتن */}
                  <td style={{ textAlign: 'right' }}>
                    {ride.captainName ? (
                      <>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>👤 {ride.captainName}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          📞 <span dir="ltr">{ride.captainPhone || 'غير متوفر'}</span>
                        </div>
                        {/* بيانات المركبة تظهر بشكل شيك لو موجودة */}
                        {(ride.carModel || ride.carPlate) && (
                          <div style={{ fontSize: '12px', color: '#8b5cf6', marginTop: '6px', fontWeight: 'bold', backgroundColor: '#ede9fe', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                            🚗 {ride.carModel || 'مركبة غير محددة'} | 🔢 {ride.carPlate || 'بدون لوحات'}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>لم يحدد بعد ⏳</span>
                    )}
                  </td>
                  
                  {/* عمود من */}
                  <td dir="auto" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '200px' }}>
                    {ride.pickupLocation}
                  </td>
                  
                  {/* عمود إلى */}
                  <td dir="auto" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '200px' }}>
                    {ride.destinationLocation}
                  </td>
                  
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>{ride.price} ج</td>
                  <td>{getStatusBadge(ride.status)}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '13px' }}>
                    {new Date(ride.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
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