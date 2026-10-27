import BillingWidget from './BillingWidget';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, updateDoc,  } from 'firebase/firestore';
import { db } from './firebase';
import { Activity, CarFront, MapPin, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function Home() {
  const [onlineCaptains, setOnlineCaptains] = useState<any[]>([]);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [activeRides, setActiveRides] = useState<any[]>([]);
  const [completedRides, setCompletedRides] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    const qCaptains = query(collection(db, 'captains'), where('isOnline', '==', true));
    const unsubCaptains = onSnapshot(qCaptains, (snap) => {
      setOnlineCaptains(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qRides = query(collection(db, 'rides'), orderBy('timestamp', 'desc'));
    const unsubRides = onSnapshot(qRides, (snap) => {
      const allRides = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      setPendingRides(allRides.filter(r => r.status === 'pending' || r.status === 'searching'));
      setActiveRides(allRides.filter(r => ['accepted', 'captain_arrived', 'passenger_on_the_way', 'waiting_for_scan', 'in_progress'].includes(r.status)));
      setCompletedRides(allRides.filter(r => r.status === 'completed' || r.status === 'canceled'));
    });

    return () => {
      unsubCaptains();
      unsubRides();
    };
  }, []);

 // 🔄 دالة تحديث وتنظيف الرادار
  const handleRefreshAndClean = async () => {
    setIsCleaning(true);
    try {
      // تحديد المهلة الزمنية (10 دقائق) - يمكنك تعديلها
      const THRESHOLD_MINUTES = 10;
      const thresholdTime = Date.now() - (THRESHOLD_MINUTES * 60 * 1000);

      const qCaptains = query(collection(db, 'captains'), where('isOnline', '==', true));
      const snapshot = await getDocs(qCaptains);

      let cleanedCount = 0;

      const updatePromises = snapshot.docs.map(async (captainDoc) => {
        const data = captainDoc.data();
        let lastActive = 0;

        // معالجة ذكية لحقل الوقت أياً كانت صيغته في فايربيز
        if (data.timestamp) {
          if (typeof data.timestamp === 'number') {
            lastActive = data.timestamp; // لو كان رقم Milliseconds
          } else if (typeof data.timestamp.toMillis === 'function') {
            lastActive = data.timestamp.toMillis(); // لو كان Firestore Timestamp
          }
        }

        // إذا كان آخر تحديث أقدم من المهلة المحددة، حوله لأوفلاين
        if (lastActive > 0 && lastActive < thresholdTime) {
          cleanedCount++;
          return updateDoc(doc(db, 'captains', captainDoc.id), {
            isOnline: false,
          });
        }
      });

      await Promise.all(updatePromises);
      
      if (cleanedCount > 0) {
        alert(`تم التنظيف! تم تحويل ${cleanedCount} كابتن غير نشط إلى أوفلاين.`);
      } else {
        alert('الرادار نظيف! جميع الكباتن في القائمة متصلين بالفعل.');
      }
    } catch (error) {
      console.error("Error cleaning radar:", error);
      alert("حدث خطأ أثناء تنظيف الرادار.");
    } finally {
      setIsCleaning(false);
    }
  };

  // 🛑 دالة الإلغاء الإجباري الفردي لأي رحلة
  const forceCancelRide = async (rideId: string) => {
    if (window.confirm('هل أنت متأكد من إنهاء هذه الرحلة إجبارياً؟')) {
      try {
        await updateDoc(doc(db, 'rides', rideId), { status: 'canceled', cancelReason: 'إلغاء إجباري من الإدارة' });
      } catch (error) {
        alert('حدث خطأ أثناء إلغاء الرحلة.');
      }
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'جاري البحث عن كابتن 🔍';
      case 'accepted': return 'في الطريق للراكب 🚗';
      case 'captain_arrived': return 'وصل لنقطة الركوب 📍';
      case 'passenger_on_the_way': return 'الراكب متوجه للكابتن 🚶';
      case 'waiting_for_scan': return 'بانتظار مسح الكود 📱';
      case 'in_progress': return 'الرحلة جارية 🚀';
      default: return status;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={28} color="#2563eb" /> رادار بُرَاق اللحظي 📡
        </h1>
        <button 
          onClick={handleRefreshAndClean}
          disabled={isCleaning}
          style={{ 
            backgroundColor: isCleaning ? '#94a3b8' : '#ef4444', color: 'white', border: 'none', padding: '10px 20px', 
            borderRadius: '10px', cursor: isCleaning ? 'not-allowed' : 'pointer', fontWeight: 'bold', 
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)' 
          }}
        >
          <RefreshCw size={18} className={isCleaning ? 'spin-anim' : ''} /> 
          {isCleaning ? 'جاري التنظيف...' : 'تحديث وتنظيف الرادار 🧹'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#10b981', padding: '20px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>كباتن أونلاين الآن</p>
            <h2 style={{ margin: 0, fontSize: '32px' }}>{onlineCaptains.length}</h2>
          </div>
          <CarFront size={40} opacity={0.8} />
        </div>

        <div style={{ backgroundColor: '#f59e0b', padding: '20px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>رحلات في الانتظار</p>
            <h2 style={{ margin: 0, fontSize: '32px' }}>{pendingRides.length}</h2>
          </div>
          <Clock size={40} opacity={0.8} />
        </div>

        <div style={{ backgroundColor: '#3b82f6', padding: '20px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>رحلات شغالة حالياً</p>
            <h2 style={{ margin: 0, fontSize: '32px' }}>{activeRides.length}</h2>
          </div>
          <MapPin size={40} opacity={0.8} />
        </div>

        <div style={{ backgroundColor: '#64748b', padding: '20px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>إجمالي الرحلات المنتهية</p>
            <h2 style={{ margin: 0, fontSize: '32px' }}>{completedRides.length}</h2>
          </div>
          <CheckCircle size={40} opacity={0.8} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* الرحلات الجارية */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxHeight: '550px', overflowY: 'auto' }}>
          <h3 style={{ color: '#1e293b', marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #3b82f6', paddingBottom: '10px', display: 'inline-block' }}>تفاصيل الرحلات الشغالة</h3>
          {activeRides.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>لا توجد رحلات قيد التنفيذ الآن</p> : (
            activeRides.map(ride => (
              <div key={ride.id} style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#1e3a8a' }}>الكابتن: {ride.captainName || 'جاري التحديد'}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{getStatusText(ride.status)}</span>
                    {/* 👈 زر الإلغاء الإجباري لأي رحلة */}
                    <button 
                      onClick={() => forceCancelRide(ride.id)} 
                      title="إلغاء إجباري للرحلة"
                      style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✖
                    </button>
                  </div>
                </div>
                <div style={{ color: '#334155', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>الراكب: {ride.name || 'بدون اسم'}</div>
                <div style={{ color: '#475569', fontSize: '13px', marginBottom: '4px' }}>📍 من: {ride.pickupLocation}</div>
                <div style={{ color: '#475569', fontSize: '13px' }}>🏁 إلى: {ride.destinationLocation || (ride.destinationsList ? ride.destinationsList.join(' - ') : 'غير محدد')}</div>
              </div>
            ))
          )}
        </div>

        {/* الكباتن المتاحين */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxHeight: '550px', overflowY: 'auto' }}>
          <h3 style={{ color: '#1e293b', marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #10b981', paddingBottom: '10px', display: 'inline-block' }}>حالة الكباتن 🟢</h3>
          {onlineCaptains.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>الجميع أوفلاين</p> : (
            onlineCaptains.map(cap => (
              <div key={cap.id} style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#065f46', display: 'block', marginBottom: '6px', fontSize: '15px' }}>{cap.name || 'بدون اسم'}</strong>
                  <span style={{ color: '#047857', fontSize: '13px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }} dir="ltr">{cap.phone}</span>
                  <span style={{ color: '#166534', fontSize: '12px' }}>{cap.vehicleCategory === 'car' ? '🚗 سيارة' : cap.vehicleCategory === 'scooter' ? '🛵 سكوتر' : '🛺 بديل توكتوك'} | {cap.plateNumber || 'بدون لوحة'}</span>
                </div>
                <div style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}>متاح للعمل</div>
              </div>
            ))
          )}
        </div>

      </div>

      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
<BillingWidget />