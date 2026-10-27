import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Server, DollarSign, Activity, Clock, AlertTriangle } from 'lucide-react';

export default function BillingWidget() {
  const [data, setData] = useState({
    usedAmount: '0.00',
    remainingCredit: '300.00',
    totalFreeCredit: 300,
    actualCost: '0.00'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const functions = getFunctions();
        const getBillingData = httpsCallable(functions, 'getBillingData');
        const response = await getBillingData();
        if (response.data) {
          setData(response.data as any);
        }
      } catch (err) {
        console.error(err);
        setError('تعذر الاتصال بخوادم الفواتير مؤقتاً.');
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>استهلاك الخوادم (Google Cloud & Firebase)</h2>
        <Server size={24} color="#3b82f6" />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          جاري جلب أرقام الاستهلاك الحية من جوجل... ⏳
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
          <AlertTriangle size={24} style={{ marginBottom: '10px' }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '50%' }}>
              <Clock size={24} color="#3b82f6" />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>الرصيد المجاني الكلي</p>
              <h3 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#1e293b' }}>${data.totalFreeCredit}</h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#ffedd5', padding: '12px', borderRadius: '50%' }}>
              <Activity size={24} color="#ea580c" />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#ea580c', fontWeight: 'bold' }}>تم استهلاك</p>
              <h3 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#ea580c' }}>${data.usedAmount}</h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '50%' }}>
              <DollarSign size={24} color="#16a34a" />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>المتبقي من المجاني</p>
              <h3 style={{ margin: '5px 0 0 0', fontSize: '24px', color: '#16a34a' }}>${data.remainingCredit}</h3>
            </div>
          </div>

        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#94a3b8', direction: 'rtl' }}>
        * يتم تحديث البيانات تلقائياً، إجمالي المبالغ الفعلية المستحقة (خارج الباقة المجانية): <strong style={{ color: Number(data.actualCost) > 0 ? '#ef4444' : '#10b981' }}>${data.actualCost}</strong>
      </div>
    </div>
  );
}