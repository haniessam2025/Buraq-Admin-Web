
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase'; // تأكد من مسار ملف فايربيز
import { Search, PlusCircle, MinusCircle, Wallet, User } from 'lucide-react';

export default function CaptainBalances() {
  const [captains, setCaptains] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);
  
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب بيانات الكباتن عند فتح الصفحة
  useEffect(() => {
    const fetchCaptains = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'captains'));
        const capsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCaptains(capsData);
      } catch (error) {
        console.error("خطأ في جلب الكباتن:", error);
      }
    };
    fetchCaptains();
  }, []);

  // دالة تنفيذ العملية المالية (إضافة أو خصم)
  const handleTransaction = async (type: 'add' | 'deduct') => {
    if (!selectedCaptain) return alert("الرجاء اختيار كابتن أولاً");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return alert("الرجاء إدخال مبلغ صحيح");
    if (!reason.trim()) return alert("الرجاء كتابة سبب العملية");

    setLoading(true);
    const driverRef = doc(db, 'captains', selectedCaptain.id);
    const transactionRef = doc(collection(db, 'wallet_transactions'));
    const transactionValue = type === 'add' ? Number(amount) : -Number(amount);

    try {
      await runTransaction(db, async (transaction) => {
        const driverDoc = await transaction.get(driverRef);
        if (!driverDoc.exists()) throw new Error("الكابتن غير موجود");

        const currentBalance = driverDoc.data().walletBalance || 0;
        const newBalance = currentBalance + transactionValue;

        // 1. تحديث الرصيد في ملف الكابتن
        transaction.update(driverRef, { walletBalance: newBalance });

        // 2. توثيق العملية في السجل المالي
        transaction.set(transactionRef, {
          driverId: selectedCaptain.id,
          driverName: selectedCaptain.fullName || selectedCaptain.name || 'بدون اسم',
          amount: Number(amount), // القيمة الموجبة دائماً
          operationType: type, // 'add' | 'deduct'
          previousBalance: currentBalance,
          netBalanceAfter: newBalance,
          reason: reason,
          timestamp: new Date(),
          adminEmail: 'إدارة النظام' // يمكنك ربطها بإيميل الأدمن لاحقاً
        });

        // تحديث الرصيد محلياً في الواجهة بدون عمل ريفريش
        setSelectedCaptain({ ...selectedCaptain, walletBalance: newBalance });
      });

      alert(`تم ${type === 'add' ? 'إضافة' : 'خصم'} المبلغ بنجاح!`);
      setAmount('');
      setReason('');
    } catch (error) {
      console.error("خطأ مالي:", error);
      alert("حدث خطأ أثناء تنفيذ العملية المالية.");
    } finally {
      setLoading(false);
    }
  };

  // فلترة الكباتن بناءً على البحث
  const filteredCaptains = captains.filter(cap => 
    (cap.fullName?.includes(searchTerm) || cap.name?.includes(searchTerm) || cap.phone?.includes(searchTerm))
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', marginBottom: '30px' }}>
        <Wallet size={28} color="#3b82f6" /> إدارة أرصدة الكباتن
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* الجزء الأيمن: البحث واختيار الكابتن */}
        <div className="card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px', color: '#475569' }}>البحث عن كابتن</h3>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} style={{ position: 'absolute', right: '10px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو رقم الهاتف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 35px 10px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            {filteredCaptains.map(cap => (
              <div 
                key={cap.id} 
                onClick={() => setSelectedCaptain(cap)}
                style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #f1f5f9', 
                  cursor: 'pointer', 
                  backgroundColor: selectedCaptain?.id === cap.id ? '#eff6ff' : 'white',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} color="#64748b" />
                  <span style={{ fontWeight: 'bold' }}>{cap.fullName || cap.name || 'بدون اسم'}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{cap.phone}</span>
              </div>
            ))}
            {filteredCaptains.length === 0 && <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>لا يوجد نتائج</div>}
          </div>
        </div>

        {/* الجزء الأيسر: التحكم في الرصيد */}
        <div className="card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '15px', color: '#475569' }}>تنفيذ العمليات المالية</h3>
          
          {selectedCaptain ? (
            <div>
              <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>الكابتن المحدد:</p>
                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>{selectedCaptain.fullName || selectedCaptain.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: '#475569' }}>الرصيد الحالي:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: (selectedCaptain.walletBalance || 0) < 0 ? '#ef4444' : '#10b981' }}>
                    {selectedCaptain.walletBalance || 0} ج.م
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>المبلغ (ج.م):</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="أدخل القيمة..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>سبب العملية (مطلوب):</label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: تسديد مديونية، مكافأة..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleTransaction('add')}
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <PlusCircle size={18} /> {loading ? 'جاري التنفيذ...' : 'إضافة للرصيد'}
                </button>
                <button 
                  onClick={() => handleTransaction('deduct')}
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <MinusCircle size={18} /> {loading ? 'جاري التنفيذ...' : 'خصم من الرصيد'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Wallet size={48} style={{ margin: '0 auto 15px auto', opacity: 0.5 }} />
              <p>يرجى البحث واختيار كابتن من القائمة الجانبية لتعديل رصيده.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}