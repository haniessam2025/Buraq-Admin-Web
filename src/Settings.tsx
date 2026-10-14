import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Clock, TrendingUp, Save, Zap, Wallet, Banknote, CreditCard, AlertTriangle, Settings as SettingsIconLucide } from 'lucide-react';

export default function Settings() {
  // إعدادات الصيانة
  const [isMaintenanceEnabled, setIsMaintenanceEnabled] = useState(false);

  // 🛡️ إعدادات ضوابط وحماية النظام
  const [debtLimit, setDebtLimit] = useState('-50');
  const [waitingTime, setWaitingTime] = useState('5');
  const [searchRadius, setSearchRadius] = useState('5');
  const [cancelLimit, setCancelLimit] = useState('3');

  // إعدادات أوقات الذروة
  const [isPeakEnabled, setIsPeakEnabled] = useState(false);
  const [peakMultiplier, setPeakMultiplier] = useState('1.5');
  const [peakStartTime, setPeakStartTime] = useState('14:00');
  const [peakEndTime, setPeakEndTime] = useState('17:00');

  // إعدادات بوابات الدفع
  const [isCashEnabled, setIsCashEnabled] = useState(true);
  const [isWalletEnabled, setIsWalletEnabled] = useState(true);
  const [isInstapayEnabled, setIsInstapayEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'pricing');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          setIsMaintenanceEnabled(data.isMaintenanceEnabled || false);
          
          // سحب بيانات ضوابط النظام
          setDebtLimit(data.debtLimit || '-50');
          setWaitingTime(data.waitingTime || '5');
          setSearchRadius(data.searchRadius || '5');
          setCancelLimit(data.cancelLimit || '3');

          setIsPeakEnabled(data.isPeakEnabled || false);
          setPeakMultiplier(data.peakMultiplier || '1.5');
          setPeakStartTime(data.peakStartTime || '14:00');
          setPeakEndTime(data.peakEndTime || '17:00');
          
          setIsCashEnabled(data.isCashEnabled ?? true);
          setIsWalletEnabled(data.isWalletEnabled ?? true);
          setIsInstapayEnabled(data.isInstapayEnabled ?? true);
        }
      } catch (error) {
        console.error("خطأ في جلب الإعدادات: ", error);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'pricing'), {
        isMaintenanceEnabled,
        debtLimit,
        waitingTime,
        searchRadius,
        cancelLimit,
        isPeakEnabled,
        peakMultiplier,
        peakStartTime,
        peakEndTime,
        isCashEnabled,
        isWalletEnabled,
        isInstapayEnabled,
        updatedAt: new Date().getTime()
      }, { merge: true });
      alert('تم حفظ جميع الإعدادات بنجاح! ✅');
    } catch (error) {
      console.error("خطأ أثناء الحفظ: ", error);
      alert('حدث خطأ أثناء الحفظ، حاول مرة أخرى.');
    }
    setSaving(false);
  };

  const ToggleSwitch = ({ enabled, onChange, danger = false }: { enabled: boolean, onChange: () => void, danger?: boolean }) => (
    <div 
      onClick={onChange}
      style={{ width: '56px', height: '30px', backgroundColor: enabled ? (danger ? '#ef4444' : '#10b981') : '#cbd5e1', borderRadius: '15px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.3s', margin: '0 auto' }}
    >
      <div style={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '3px', right: enabled ? '29px' : '3px', transition: 'right 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
    </div>
  );

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>جاري تحميل الإعدادات...</p>;
  }

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <CreditCard size={28} color="#3b82f6" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>إعدادات التطبيق العامة</h2>
      </div>

      {/* --- قسم وضع الصيانة (تحذيري) --- */}
      <div style={{ backgroundColor: '#fee2e2', padding: '25px', borderRadius: '12px', border: '1px solid #fca5a5', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={22} color="#dc2626" /> وضع الصيانة (إيقاف التطبيق)
            </h3>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px', maxWidth: '80%' }}>
              عند التفعيل، سيتم إيقاف الطلبات الجديدة. الرحلات الجارية ستستمر حتى تنتهي.
            </p>
          </div>
          <ToggleSwitch enabled={isMaintenanceEnabled} onChange={() => setIsMaintenanceEnabled(!isMaintenanceEnabled)} danger={true} />
        </div>
      </div>

      {/* --- ⚙️ قسم ضوابط وحماية النظام --- */}
      <div style={{ backgroundColor: '#162032', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px', color: 'white' }}>
        <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', color: '#f8fafc', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
           ضوابط وحماية النظام <SettingsIconLucide size={22} color="#94a3b8" />
        </h3>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          
          {/* حد المديونية */}
          <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#0f172a', padding: '20px 10px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '15px', fontSize: '15px' }}>حد المديونية (ج)</label>
            <input 
              type="number" 
              value={debtLimit} 
              onChange={e => setDebtLimit(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} 
            />
          </div>

          {/* وقت الانتظار */}
          <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#0f172a', padding: '20px 10px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '15px', fontSize: '15px' }}>وقت الانتظار (ق)</label>
            <input 
              type="number" 
              value={waitingTime} 
              onChange={e => setWaitingTime(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} 
            />
          </div>

          {/* قطر البحث */}
          <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#0f172a', padding: '20px 10px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '15px', fontSize: '15px' }}>قطر البحث (كم)</label>
            <input 
              type="number" 
              value={searchRadius} 
              onChange={e => setSearchRadius(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} 
            />
          </div>

          {/* الإلغاءات للحظر */}
          <div style={{ flex: 1, minWidth: '150px', backgroundColor: '#0f172a', padding: '20px 10px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '15px', fontSize: '15px' }}>إلغاءات للحظر</label>
            <input 
              type="number" 
              value={cancelLimit} 
              onChange={e => setCancelLimit(e.target.value)} 
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', outline: 'none' }} 
            />
          </div>

        </div>
      </div>

      {/* --- قسم إدارة بوابات الدفع --- */}
      <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px', color: 'white' }}>
        <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', color: '#f8fafc', fontSize: '18px' }}>إدارة بوابات الدفع المتاحة للركاب:</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
              <Banknote color="#10b981" size={24} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>كاش</span>
            </div>
            <ToggleSwitch enabled={isCashEnabled} onChange={() => setIsCashEnabled(!isCashEnabled)} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
              <Wallet color="#f59e0b" size={24} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>محفظة</span>
            </div>
            <ToggleSwitch enabled={isWalletEnabled} onChange={() => setIsWalletEnabled(!isWalletEnabled)} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
              <Zap color="#eab308" size={24} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>انستاباي</span>
            </div>
            <ToggleSwitch enabled={isInstapayEnabled} onChange={() => setIsInstapayEnabled(!isInstapayEnabled)} />
          </div>
        </div>
      </div>

      {/* --- قسم أوقات الذروة --- */}
      <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#f59e0b" /> تفعيل أوقات الذروة
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>عند التفعيل، سيتم ضرب الأجرة الأساسية في المعامل المحدد.</p>
          </div>
          <ToggleSwitch enabled={isPeakEnabled} onChange={() => setIsPeakEnabled(!isPeakEnabled)} />
        </div>

        <div style={{ opacity: isPeakEnabled ? 1 : 0.5, pointerEvents: isPeakEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
              <TrendingUp size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} />
              معامل الزيادة (الضرب):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="number" step="0.1" value={peakMultiplier} onChange={e => setPeakMultiplier(e.target.value)} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', direction: 'ltr' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}><Clock size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} /> تبدأ من:</label>
              <input type="time" value={peakStartTime} onChange={e => setPeakStartTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', direction: 'ltr' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}><Clock size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} /> تنتهي:</label>
              <input type="time" value={peakEndTime} onChange={e => setPeakEndTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', direction: 'ltr' }} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <Save size={20} /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}