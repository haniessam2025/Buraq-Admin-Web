import { useState, useEffect } from 'react';
import { Server, DollarSign, PieChart, Activity } from 'lucide-react';

export default function BillingWidget() {
  const [billingData, setBillingData] = useState({
    totalFreeCredit: 300.00, // رصيد جوجل المجاني الترحيبي أو الشهري
    usedAmount: 0.00,
    remainingCredit: 300.00,
    actualCost: 0.00, // المبالغ المطلوبة الدفع لو انتهى المجاني
    status: 'loading'
  });

  // هذه الدالة سيتم ربطها بـ Firebase Cloud Functions لاحقاً لجلب الأرقام الحقيقية
  useEffect(() => {
    // محاكاة جلب البيانات مؤقتاً لحين انتهاء الـ 24 ساعة الأولى
    setTimeout(() => {
      setBillingData({
        totalFreeCredit: 300.00,
        usedAmount: 12.50,
        remainingCredit: 287.50,
        actualCost: 0.00,
        status: 'success'
      });
    }, 1500);
  }, []);

  if (billingData.status === 'loading') {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري الاتصال بخوادم جوجل...</div>;
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', borderWidth: '1px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Server size={28} color="#3b82f6" />
        <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>استهلاك الخوادم (Google Cloud & Firebase)</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        
        {/* الباقة المجانية الكلية */}
        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '10px' }}>
            <PieChart size={24} color="#2563eb" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>الرصيد المجاني الكلي</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', color: '#1e293b', fontWeight: '900' }}>${billingData.totalFreeCredit}</p>
          </div>
        </div>

        {/* ما تم استهلاكه */}
        <div style={{ backgroundColor: '#fff7ed', padding: '15px', borderRadius: '12px', border: '1px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#ffedd5', padding: '10px', borderRadius: '10px' }}>
            <Activity size={24} color="#ea580c" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#9a3412', fontWeight: 'bold' }}>تم استهلاك</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', color: '#ea580c', fontWeight: '900' }}>${billingData.usedAmount}</p>
          </div>
        </div>

        {/* المتبقي من الباقة */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '10px' }}>
            <DollarSign size={24} color="#16a34a" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: 'bold' }}>المتبقي من المجاني</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', color: '#16a34a', fontWeight: '900' }}>${billingData.remainingCredit}</p>
          </div>
        </div>

      </div>

      {billingData.actualCost > 0 && (
        <div style={{ marginTop: '20px', backgroundColor: '#fee2e2', padding: '15px', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: 'bold' }}>⚠️ تحذير: تم تجاوز الباقة المجانية</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>المبالغ المستحقة للدفع في نهاية الشهر الحالي.</p>
          </div>
          <p style={{ margin: 0, fontSize: '22px', color: '#ef4444', fontWeight: '900' }}>${billingData.actualCost}</p>
        </div>
      )}
      
      <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '15px' }}>* يتم تحديث البيانات تلقائياً مرة واحدة يومياً من خوادم Google.</p>
    </div>
  );
}