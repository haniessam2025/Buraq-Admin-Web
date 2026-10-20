import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { AlertTriangle, Lightbulb, Search, CheckCircle, Send } from 'lucide-react';

export default function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState<'complaint' | 'suggestion' | 'lost'>('complaint');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  // جلب التذاكر من الكوليكشن الجديد
  useEffect(() => {
    const q = query(collection(db, 'complaints_tickets'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // نظام القراءة اللحظي للتذاكر اللي المعروضة
  useEffect(() => {
    const unreadVisible = tickets.filter(t => t.ticketType === activeTab && t.isReadAdmin === false);
    if (unreadVisible.length > 0) {
      unreadVisible.forEach(t => {
        updateDoc(doc(db, 'complaints_tickets', t.id), { isReadAdmin: true }).catch(e => console.log(e));
      });
    }
  }, [activeTab, tickets]);

  const sendReply = async (ticketId: string, senderId: string, senderType: string) => {
    const reply = replyText[ticketId];
    if (!reply || reply.trim() === '') return;
    setSubmittingReply(ticketId);
    try {
      await updateDoc(doc(db, 'complaints_tickets', ticketId), { reply: reply.trim(), status: 'replied', isReadAdmin: true });
      await addDoc(collection(db, 'notifications'), { userId: senderId, userType: senderType, title: 'رد من الإدارة 📩', message: reply.trim(), read: false, timestamp: serverTimestamp() });
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
    } catch (error) { alert("خطأ في الإرسال"); }
    finally { setSubmittingReply(null); }
  };

  const markAsResolved = async (ticketId: string) => {
    try { await updateDoc(doc(db, 'complaints_tickets', ticketId), { status: 'resolved' }); } 
    catch (error) { console.log(error); }
  };

  const filteredTickets = tickets.filter(t => t.ticketType === activeTab);
  
  const unreadComplaint = tickets.filter(t => t.ticketType === 'complaint' && !t.isReadAdmin).length;
  const unreadSuggestion = tickets.filter(t => t.ticketType === 'suggestion' && !t.isReadAdmin).length;
  const unreadLost = tickets.filter(t => t.ticketType === 'lost' && !t.isReadAdmin).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <AlertTriangle size={32} color="#3b82f6" />
        <h1 style={{ margin: 0, color: '#1e293b' }}>المقترحات والشكاوى والمفقودات</h1>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('complaint')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: activeTab === 'complaint' ? '#2563eb' : '#e2e8f0', color: activeTab === 'complaint' ? 'white' : '#475569', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} /> الشكاوى
          {unreadComplaint > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadComplaint}</span>}
        </button>
        <button onClick={() => setActiveTab('suggestion')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: activeTab === 'suggestion' ? '#10b981' : '#e2e8f0', color: activeTab === 'suggestion' ? 'white' : '#475569', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={20} /> المقترحات
          {unreadSuggestion > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadSuggestion}</span>}
        </button>
        <button onClick={() => setActiveTab('lost')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: activeTab === 'lost' ? '#d97706' : '#e2e8f0', color: activeTab === 'lost' ? 'white' : '#475569', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <Search size={20} /> المفقودات
          {unreadLost > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadLost}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>جاري التحميل...</div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>لا توجد رسائل في هذا القسم حالياً.</div>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>المرسل: {ticket.senderName} <span style={{ fontSize: '12px', color: '#64748b' }}>({ticket.senderType === 'captain' ? 'كابتن' : 'راكب'})</span></h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>ID: {ticket.senderId}</p>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{ticket.timestamp ? new Date(ticket.timestamp.seconds * 1000).toLocaleString('ar-EG') : ''}</span>
                  </div>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: ticket.status === 'resolved' ? '#dcfce7' : ticket.reply ? '#e0e7ff' : '#fef3c7', color: ticket.status === 'resolved' ? '#166534' : ticket.reply ? '#3730a3' : '#b45309' }}>
                    {ticket.status === 'resolved' ? 'مغلقة' : ticket.reply ? 'تم الرد' : 'بانتظار الرد'}
                  </span>
               </div>
               
               <div style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '10px', color: '#334155', marginBottom: '20px', fontSize: '16px', lineHeight: '1.6' }}>
                 {ticket.text}
               </div>

               {ticket.reply ? (
                 <div style={{ backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                   <strong style={{ color: '#059669', display: 'block', marginBottom: '5px' }}>رد الإدارة:</strong>
                   <p style={{ margin: 0, color: '#064e3b' }}>{ticket.reply}</p>
                   {ticket.status !== 'resolved' && (
                     <button onClick={() => markAsResolved(ticket.id)} style={{ marginTop: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                       <CheckCircle size={16} /> إغلاق التذكرة
                     </button>
                   )}
                 </div>
               ) : (
                 <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="text" placeholder="اكتب ردك هنا..." value={replyText[ticket.id] || ''} onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                   <button disabled={submittingReply === ticket.id} onClick={() => sendReply(ticket.id, ticket.senderId, ticket.senderType)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     {submittingReply === ticket.id ? 'جاري...' : <><Send size={16}/> إرسال الرد</>}
                   </button>
                 </div>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}