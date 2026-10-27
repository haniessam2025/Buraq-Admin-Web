import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from './firebase'; 
import { ShieldCheck, UserCheck, UserX, CheckCircle2 } from 'lucide-react';

export default function VerificationRequests() {
  const [tab, setTab] = useState<'register' | 'updates'>('register'); 
  const [roleTab, setRoleTab] = useState<'driver' | 'passenger'>('driver'); 
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  
  // 🟢 عدادات الأقسام
  const [counts, setCounts] = useState({ capReg: 0, capUpd: 0, passReg: 0, passUpd: 0 });

  // 1. مستمعين (Listeners) لجلب العدادات اللحظية لكل الأقسام (تدمج الحالتين)
  useEffect(() => {
    let cR1=0, cR2=0, pR1=0, pR2=0;
    const updateC = () => setCounts(p => ({ ...p, capReg: cR1+cR2, passReg: pR1+pR2 }));
    
    const u1 = onSnapshot(query(collection(db, 'captains'), where('verificationStatus', '==', 'pending')), s => { cR1 = s.size; updateC(); });
    const u2 = onSnapshot(query(collection(db, 'captains'), where('status', '==', 'pending')), s => { cR2 = s.size; updateC(); });
    const u3 = onSnapshot(query(collection(db, 'passengers'), where('verificationStatus', '==', 'pending')), s => { pR1 = s.size; updateC(); });
    const u4 = onSnapshot(query(collection(db, 'passengers'), where('status', '==', 'pending')), s => { pR2 = s.size; updateC(); });
    
    const u5 = onSnapshot(query(collection(db, 'captains'), where('updateStatus', '==', 'pending')), s => setCounts(p => ({ ...p, capUpd: s.size })));
    const u6 = onSnapshot(query(collection(db, 'passengers'), where('updateStatus', '==', 'pending')), s => setCounts(p => ({ ...p, passUpd: s.size })));
    
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  // 2. جلب بيانات القائمة النشطة حالياً ودمجها بذكاء (Real-time)
  useEffect(() => {
    setLoading(true);
    const collectionName = roleTab === 'driver' ? 'captains' : 'passengers';
    
    if (tab === 'register') {
      // بنجيب الطلبات بالشرطين عشان مفيش حاجة تضيع
      const q1 = query(collection(db, collectionName), where('verificationStatus', '==', 'pending'));
      const q2 = query(collection(db, collectionName), where('status', '==', 'pending'));
      
      let list1: any[] = []; let list2: any[] = [];
      const updateList = () => {
        const combined = [...list1, ...list2];
        // دمج القائمتين وحذف أي تكرار لو الطلب واخد الحالتين مع بعض
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setRequests(unique);
        setLoading(false);
      };
      
      const un1 = onSnapshot(q1, snap => { list1 = snap.docs.map(d => ({ id: d.id, ...d.data() })); updateList(); });
      const un2 = onSnapshot(q2, snap => { list2 = snap.docs.map(d => ({ id: d.id, ...d.data() })); updateList(); });
      
      return () => { un1(); un2(); };
    } else {
      const q = query(collection(db, collectionName), where('updateStatus', '==', 'pending'));
      const unsub = onSnapshot(q, (snapshot) => {
        setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
      return () => unsub();
    }
  }, [tab, roleTab]);

  const getNextKyotNumber = async () => {
    try {
      const q = query(collection(db, 'captains'), orderBy('vehicleSequenceNumber', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      let nextNumber = 100;
      if (!snapshot.empty) {
        const highestDoc = snapshot.docs[0].data();
        nextNumber = (highestDoc.vehicleSequenceNumber || 100) + 1;
      }
      return nextNumber;
    } catch (error) { return null; }
  };

  const handleApprove = async (item: any) => {
    if (!window.confirm('هل أنت متأكد من قبول هذا الطلب؟')) return;
    try {
      const collectionName = roleTab === 'driver' ? 'captains' : 'passengers';
      const docRef = doc(db, collectionName, item.id);
      let updateData: any = {};
      let nextNum: number | null = null;
      
      if (tab === 'register') {
        updateData = { verificationStatus: 'approved', status: 'active' };
        if (roleTab === 'driver' && (item.vehicleCategory === 'tuktuk_alt' || item.vehicleCategory === 'كيوت')) {
          nextNum = await getNextKyotNumber();
          if (nextNum) {
            updateData.vehicleSequenceNumber = nextNum;
            updateData.vehicleNumber = String(nextNum);
          }
        }
      } else { updateData = { updateStatus: 'approved' }; }

      let notificationBody = tab === 'register' 
        ? (nextNum ? `مبروك لقد تمت الموافقة على حسابك ورقمك الكودي هو (${nextNum}) يمكنك الآن استقبال الرحلات بنجاح.` : 'مبارك! تم اعتماد حسابك بنجاح ويمكنك بدء العمل الآن.')
        : 'تم قبول تعديلات الملف الشخصي بنجاح.';

      await updateDoc(docRef, { ...updateData, notifications: arrayUnion({ title: 'تم قبول طلبك! 🎉', body: notificationBody, timestamp: new Date().getTime(), read: false }) });
      alert('تم قبول الطلب وإرسال الإشعار بنجاح!');
    } catch (error) { alert('حدث خطأ أثناء تنفيذ العملية.'); }
  };

  const handleReject = async (item: any) => {
    const reason = rejectReason[item.id] || 'لم يتم ذكر سبب محدد';
    if (!window.confirm(`هل أنت متأكد من رفض الطلب بسبب: "${reason}"؟`)) return;
    try {
      const collectionName = roleTab === 'driver' ? 'captains' : 'passengers';
      const docRef = doc(db, collectionName, item.id);
      const updateData: any = tab === 'register' ? { verificationStatus: 'rejected', status: 'rejected' } : { updateStatus: 'rejected' };
      
      await updateDoc(docRef, { ...updateData, rejectionReason: reason, notifications: arrayUnion({ title: 'عذراً، تم رفض الطلب ❌', body: `السبب: ${reason}`, timestamp: new Date().getTime(), read: false }) });
      alert('تم رفض الطلب وإرسال سبب الرفض للمستخدم في الإشعارات.');
    } catch (error) { alert('حدث خطأ أثناء تنفيذ العملية.'); }
  };

  const registerCount = counts.capReg + counts.passReg;
  const updatesCount = counts.capUpd + counts.passUpd;
  const currentCapCount = tab === 'register' ? counts.capReg : counts.capUpd;
  const currentPassCount = tab === 'register' ? counts.passReg : counts.passUpd;

  return (
    <div className="card" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <ShieldCheck size={32} color="#10b981" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>مراجعة واعتماد الطلبات والوثائق</h2>
      </div>

      {/* التبويبات الرئيسية (تسجيل / تعديل) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '10px' }}>
        <button 
          onClick={() => setTab('register')}
          style={{ position: 'relative', flex: 1, padding: '14px', borderRadius: '8px', border: tab !== 'register' && registerCount > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: tab === 'register' ? '#10b981' : (registerCount > 0 ? '#fef08a' : 'transparent'), color: tab === 'register' ? 'white' : (registerCount > 0 ? '#854d0e' : '#334155'), fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: tab === 'register' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
        >
          📋 طلبات التسجيل الجديدة
          {registerCount > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '2px solid white' }}>{registerCount}</span>}
        </button>
        <button 
          onClick={() => setTab('updates')}
          style={{ position: 'relative', flex: 1, padding: '14px', borderRadius: '8px', border: tab !== 'updates' && updatesCount > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: tab === 'updates' ? '#10b981' : (updatesCount > 0 ? '#fef08a' : 'transparent'), color: tab === 'updates' ? 'white' : (updatesCount > 0 ? '#854d0e' : '#334155'), fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: tab === 'updates' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
        >
          ✏️ طلبات تعديل البيانات
          {updatesCount > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '2px solid white' }}>{updatesCount}</span>}
        </button>
      </div>

      {/* التبويبات الفرعية (كابتن / راكب) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <button 
          onClick={() => setRoleTab('driver')}
          style={{ position: 'relative', padding: '8px 20px', borderRadius: '20px', border: roleTab !== 'driver' && currentCapCount > 0 ? '2px solid #eab308' : '1px solid #cbd5e1', backgroundColor: roleTab === 'driver' ? '#3b82f6' : (currentCapCount > 0 ? '#fef08a' : 'white'), color: roleTab === 'driver' ? 'white' : (currentCapCount > 0 ? '#854d0e' : '#1e293b'), fontWeight: 'bold', cursor: 'pointer' }}
        >
          🚖 الكباتن
          {currentCapCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '1px solid white' }}>{currentCapCount}</span>}
        </button>
        <button 
          onClick={() => setRoleTab('passenger')}
          style={{ position: 'relative', padding: '8px 20px', borderRadius: '20px', border: roleTab !== 'passenger' && currentPassCount > 0 ? '2px solid #eab308' : '1px solid #cbd5e1', backgroundColor: roleTab === 'passenger' ? '#3b82f6' : (currentPassCount > 0 ? '#fef08a' : 'white'), color: roleTab === 'passenger' ? 'white' : (currentPassCount > 0 ? '#854d0e' : '#1e293b'), fontWeight: 'bold', cursor: 'pointer' }}
        >
          👤 الركاب
          {currentPassCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '1px solid white' }}>{currentPassCount}</span>}
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>جاري تحميل الطلبات المعلقة...</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '10px' }} />
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>لا توجد طلبات معلقة في هذا القسم حالياً ✨</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {requests.map(item => (
            <div key={item.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img src={item.profilePic || item.photo || 'https://via.placeholder.com/60'} alt="صورة شخصية" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setViewImage(item.profilePic || item.photo)} />
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{item.name || item.fullName || 'بدون اسم'}</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>📞 الهاتف: {item.phone || item.phoneNumber || 'لا يوجد'} | 🆔 الرقم القومي: {item.nationalId || item.idNumber || 'لا يوجد'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#334155' }}>المستندات المرفقة:</p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {item.nationalIdFront && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>بطاقة (وش)</p>
                      <img src={item.nationalIdFront} alt="بطاقة وجه" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setViewImage(item.nationalIdFront)} />
                    </div>
                  )}
                  {item.nationalIdBack && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>بطاقة (ظهر)</p>
                      <img src={item.nationalIdBack} alt="بطاقة ظهر" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setViewImage(item.nationalIdBack)} />
                    </div>
                  )}
                  {roleTab === 'driver' && item.licenseFront && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>رخصة (وش)</p>
                      <img src={item.licenseFront} alt="رخصة وجه" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setViewImage(item.licenseFront)} />
                    </div>
                  )}
                  {roleTab === 'driver' && item.licenseBack && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>رخصة (ظهر)</p>
                      <img src={item.licenseBack} alt="رخصة ظهر" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => setViewImage(item.licenseBack)} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => handleApprove(item)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={18} /> قبول الطلب
                  </button>
                  <input type="text" placeholder="اكتب سبب الرفض هنا في حال عدم الموافقة..." value={rejectReason[item.id] || ''} onChange={(e) => setRejectReason({ ...rejectReason, [item.id]: e.target.value })} style={{ flex: 1, minWidth: '250px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <button onClick={() => handleReject(item)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserX size={18} /> رفض الطلب
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setViewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={viewImage} alt="صورة مكبرة" style={{ width: '100%', height: 'auto', maxHeight: '85vh', borderRadius: '10px', objectFit: 'contain' }} />
            <button style={{ position: 'absolute', top: '-40px', right: '0', background: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>إغلاق ✕</button>
          </div>
        </div>
      )}
    </div>
  );
}