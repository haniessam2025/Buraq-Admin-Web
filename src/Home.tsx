import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CarFront, MapPinned } from 'lucide-react';

export default function Home() {
  const [radarTab, setRadarTab] = useState<'rides' | 'captains'>('rides'); // حالة التبويب

  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [onlineCaptains, setOnlineCaptains] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ استدعاء الرحلات النشطة
    const qRides = query(
      collection(db, 'rides'),
      where('status', 'in', ['pending', 'searching', 'accepted', 'captain_arrived', 'passenger_on_the_way', 'waiting_for_scan', 'in_progress'])
    );
    const unsubRides = onSnapshot(qRides, (snapshot) => {
      const ridesData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ridesData.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setActiveRides(ridesData);
    });

    // 2️⃣ استدعاء الكباتن الأونلاين (المتاحين حالياً)
    const qCaptains = query(
      collection(db, 'captains'),
      where('isOnline', '==', true) // 👈 السر هنا: بيجيب الكباتن اللي حالتهم أونلاين بس
    );
    const unsubCaptains = onSnapshot(qCaptains, (snapshot) => {
      const capsData: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOnlineCaptains(capsData);
      setLoading(false);
    });

    return () => {
      unsubRides();
      unsubCaptains();
    };
  }, []);

  // 🧹 تنظيف الرادار للرحلات
  const cleanRadar = async () => {
    if (!window.confirm('هل أنت متأكد من تنظيف الرادار؟ (سيتم إنهاء الرحلات المعلقة منذ 15 دقيقة)')) return;
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000; 
    let cleanedCount = 0;

    for (const ride of activeRides) {
      if ((ride.status === 'pending' || ride.status === 'searching') && (now - ride.timestamp > fifteenMinutes)) {
        try {
          const rideRef = doc(db, 'rides', ride.id);
          await updateDoc(rideRef, { status: 'cancelled', cancelReason: 'تم الإلغاء تلقائياً لتجاوز الوقت' });
          cleanedCount++;
        } catch (error) { console.error('خطأ:', error); }
      }
    }
    if (cleanedCount > 0) alert(`✅ تم تنظيف ${cleanedCount} رحلة.`);
    else alert('✨ الرادار نظيف بالفعل!');
  };

  // 🧹 تنظيف رادار الكباتن (تحويل كل الكباتن المعلقين لـ أوفلاين)
  const cleanCaptains = async () => {
    if (!window.confirm('هل أنت متأكد من تنظيف قائمة الكباتن؟ (سيتم تحويل حالة جميع الكباتن المعلقين إلى أوفلاين)')) return;

    let cleanedCount = 0;
    for (const cap of onlineCaptains) {
      try {
        const capRef = doc(db, 'captains', cap.id);
        await updateDoc(capRef, { isOnline: false });
        cleanedCount++;
      } catch (error) {
        console.error('خطأ في تنظيف حالة الكابتن:', error);
      }
    }

    if (cleanedCount > 0) {
      alert(`✅ تم تنظيف الرادار بنجاح! تم تحويل ${cleanedCount} كابتن معلق إلى أوفلاين.`);
    } else {
      alert('✨ القائمة نظيفة بالفعل!');
    }
  };

  // 🪄 زرار رمي رحلة تجريبية
  const addTestRide = async () => {
    await addDoc(collection(db, 'rides'), {
      name: 'راكب تجريبي', phone: '01012345678', pickupLocation: 'محطة الرمل', destinationLocation: 'سيدي بشر', price: '75',
      status: 'pending', timestamp: new Date().getTime() - (20 * 60 * 1000), paymentMethod: 'كاش',
    });
  };

  // 🪄 زرار رمي كابتن أونلاين تجريبي (عشان تتأكد إنه شغال)
  const addTestCaptain = async () => {
    await addDoc(collection(db, 'captains'), {
      name: 'كابتن محمود (أونلاين تيست)', phone: '01122334455', carModel: 'نيسان صني', carPlate: 'س ج د 1234',
      isOnline: true, // 👈 دي اللي بتنوره في الرادار
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'searching': return <span className="status-badge status-pending">يبحث عن كابتن 🔍</span>;
      case 'accepted': return <span className="status-badge status-accepted">تم القبول ✅</span>;
      case 'in_progress': return <span className="status-badge status-progress">الرحلة جارية 🚀</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="card">
      
      {/* 🚀 أزرار التنقل بين رادار الرحلات ورادار الكباتن */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '10px' }}>
        <button 
          onClick={() => setRadarTab('rides')}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: radarTab === 'rides' ? '#3b82f6' : 'transparent', color: radarTab === 'rides' ? 'white' : '#334155', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
        >
          <MapPinned size={20} /> رادار الرحلات النشطة ({activeRides.length})
        </button>
        <button 
          onClick={() => setRadarTab('captains')}
          style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: radarTab === 'captains' ? '#10b981' : 'transparent', color: radarTab === 'captains' ? 'white' : '#334155', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
        >
          <CarFront size={20} /> الكباتن المتاحين الآن ({onlineCaptains.length})
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>جاري تحميل الرادار...</p>
      ) : (
        <>
          {/* ================= تبويب الرحلات النشطة ================= */}
          {radarTab === 'rides' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>الرحلات المطلوبة حالياً في الشارع</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={cleanRadar} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🧹 تنظيف</button>
                  <button onClick={addTestRide} style={{ backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ رحلة تيست</button>
                </div>
              </div>

              {activeRides.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>لا توجد رحلات نشطة الآن.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>الراكب</th>
                        <th>من</th>
                        <th>إلى</th>
                        <th>الحالة</th>
                        <th>الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRides.map((ride) => (
                        <tr key={ride.id}>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{ride.name || 'غير معروف'}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{ride.phone}</div>
                          </td>
                          <td>{ride.pickupLocation}</td>
                          <td>{ride.destinationLocation}</td>
                          <td>{getStatusBadge(ride.status)}</td>
                          <td dir="ltr" style={{ textAlign: 'right', fontSize: '13px' }}>
                            {new Date(ride.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= تبويب الكباتن المتاحين ================= */}
          {radarTab === 'captains' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>الكباتن المتصلين بالتطبيق وجاهزين للعمل</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={cleanCaptains} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🧹 تنظيف المعلقين</button>
                  <button onClick={addTestCaptain} style={{ backgroundColor: '#e2e8f0', color: '#1e293b', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ كابتن تيست أونلاين</button>
                </div>
              </div>

              {onlineCaptains.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>لا يوجد أي كابتن فاتح التطبيق حالياً.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>اسم الكابتن</th>
                        <th>الهاتف</th>
                        <th>بيانات المركبة</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineCaptains.map((cap) => (
                        <tr key={cap.id}>
                          <td>
                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={cap.profilePic || 'https://via.placeholder.com/40'} alt="صورة" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                              {cap.name || 'بدون اسم'}
                            </div>
                          </td>
                          <td dir="ltr" style={{ textAlign: 'right', fontWeight: 'bold' }}>{cap.phone || '-'}</td>
                          <td>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                              🚗 {cap.carModel || 'غير محدد'} | {cap.carPlate || 'بدون لوحة'}
                            </span>
                          </td>
                          <td>
                            <span style={{ backgroundColor: '#10b981', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                              🟢 متصل الآن
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}