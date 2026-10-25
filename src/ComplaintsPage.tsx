import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { AlertTriangle, Lightbulb, Search, CheckCircle, Send, User, Clock, Phone, MessageSquare } from 'lucide-react';

export default function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState<'complaint' | 'suggestion' | 'lost'>('complaint');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  
  // حفظ الشخص المحدد حالياً لفتح رسايله
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);

  // جلب التذاكر
  useEffect(() => {
    const q = query(collection(db, 'complaints_tickets'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // تصفير الشخص المحدد عند تغيير التاب
  useEffect(() => {
    setSelectedUserKey(null);
  }, [activeTab]);

  // دالة مساعدة لحساب الوقت بدقة
  const getTime = (t: any) => {
    if (!t.timestamp) return 0;
    return t.timestamp.seconds ? t.timestamp.seconds * 1000 : t.timestamp;
  };

  // 🧠 الذكاء هنا: تجميع التذاكر لكل مستخدم مع بعض (عشان متبقاش مفرطة)
  const groupedUsers = useMemo(() => {
    const groups: { [key: string]: any } = {};
    const tabTickets = tickets.filter(t => t.type === activeTab || t.ticketType === activeTab);
    
    tabTickets.forEach(t => {
      // استخدام الـ ID او رقم الهاتف كمفتاح تجميع
      const key = t.senderId || t.captainId || t.passengerId || t.phone || t.senderPhone || t.id; 
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: t.senderName || t.name || 'مستخدم غير مسجل',
          phone: t.senderPhone || t.phone || 'غير مسجل',
          userType: t.senderType || t.userType || (t.captainId ? 'captain' : 'passenger'),
          tickets: [],
          latestTimestamp: 0,
          hasUnread: false
        };
      }
      
      groups[key].tickets.push(t);
      const tTime = getTime(t);
      if (tTime > groups[key].latestTimestamp) {
        groups[key].latestTimestamp = tTime;
      }
      if (!t.isReadAdmin) {
        groups[key].hasUnread = true;
      }
    });
    
    // ترتيب المستخدمين من الأحدث للأقدم
    return Object.values(groups).sort((a: any, b: any) => b.latestTimestamp - a.latestTimestamp);
  }, [tickets, activeTab]);

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
    try { await updateDoc(doc(db, 'complaints_tickets', ticketId), { status: 'resolved', isReadAdmin: true }); } 
    catch (error) { console.log(error); }
  };

  // لما نختار شخص، نعلم على كل تذاكره في التاب ده إنها اتقرأت
  const handleSelectUser = (userGroup: any) => {
    setSelectedUserKey(userGroup.id);
    userGroup.tickets.forEach((t: any) => {
      if (!t.isReadAdmin) {
        updateDoc(doc(db, 'complaints_tickets', t.id), { isReadAdmin: true }).catch(() => {});
      }
    });
  };

  // حساب الرسائل غير المقروءة بدقة لكل تاب (عشان الزراير اللي بره)
  const unreadComplaint = tickets.filter(t => (t.type === 'complaint' || t.ticketType === 'complaint') && !t.isReadAdmin).length;
  const unreadSuggestion = tickets.filter(t => (t.type === 'suggestion' || t.ticketType === 'suggestion') && !t.isReadAdmin).length;
  const unreadLost = tickets.filter(t => (t.type === 'lost_item' || t.ticketType === 'lost' || t.type === 'lost') && !t.isReadAdmin).length;

  // الشخص المحدد حالياً
  const selectedGroup = groupedUsers.find(g => g.id === selectedUserKey);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return date.toLocaleString('ar-EG', { hour12: true, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* الهيدر */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <AlertTriangle size={32} color="#3b82f6" />
        <h1 style={{ margin: 0, color: '#1e293b' }}>المقترحات والشكاوى والمفقودات</h1>
      </div>

      {/* التابات اللي بتنور أصفر */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('complaint')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: activeTab !== 'complaint' && unreadComplaint > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: activeTab === 'complaint' ? '#2563eb' : (unreadComplaint > 0 ? '#fef08a' : 'white'), color: activeTab === 'complaint' ? 'white' : (unreadComplaint > 0 ? '#854d0e' : '#64748b'), fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <AlertTriangle size={20} /> الشكاوى
          {unreadComplaint > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadComplaint}</span>}
        </button>

        <button onClick={() => setActiveTab('suggestion')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: activeTab !== 'suggestion' && unreadSuggestion > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: activeTab === 'suggestion' ? '#10b981' : (unreadSuggestion > 0 ? '#fef08a' : 'white'), color: activeTab === 'suggestion' ? 'white' : (unreadSuggestion > 0 ? '#854d0e' : '#64748b'), fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <Lightbulb size={20} /> المقترحات
          {unreadSuggestion > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadSuggestion}</span>}
        </button>

        <button onClick={() => setActiveTab('lost')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: activeTab !== 'lost' && unreadLost > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: activeTab === 'lost' ? '#d97706' : (unreadLost > 0 ? '#fef08a' : 'white'), color: activeTab === 'lost' ? 'white' : (unreadLost > 0 ? '#854d0e' : '#64748b'), fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <Search size={20} /> المفقودات
          {unreadLost > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadLost}</span>}
        </button>
      </div>

      {/* منطقة العرض الرئيسية (اليمين للأسماء واليسار للرسائل) */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
        {/* اللوحة اليمنى (قائمة المستخدمين) */}
        <div style={{ width: '380px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div> : groupedUsers.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا توجد رسائل.</div> : (
              groupedUsers.map(group => {
                const isSelected = selectedUserKey === group.id;
                const isUnread = group.hasUnread;
                
                return (
                  <div key={group.id} onClick={() => handleSelectUser(group)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (isUnread ? '#fef9c3' : 'white'), borderRight: isUnread ? '4px solid #eab308' : 'none', transition: '0.2s', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: group.userType === 'captain' ? '#dcfce7' : '#dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                      <User size={24} color={group.userType === 'captain' ? '#16a34a' : '#2563eb'} />
                      {isUnread && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white', zIndex: 10 }}></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{group.tickets.length} تذكرة</span>
                      </div>
                      <div style={{ fontSize: '13px', color: isUnread ? '#0f172a' : '#64748b', fontWeight: isUnread ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {group.phone}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* اللوحة اليسرى (تذاكر ورسائل المستخدم المحدد) */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {selectedGroup ? (
            <>
              {/* هيدر المستخدم */}
              <div style={{ padding: '15px 25px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: selectedGroup.userType === 'captain' ? '#dcfce7' : '#dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={24} color={selectedGroup.userType === 'captain' ? '#16a34a' : '#2563eb'} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>
                      {selectedGroup.name} 
                      <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: selectedGroup.userType === 'captain' ? '#10b981' : '#3b82f6', color: 'white', borderRadius: '12px', marginRight: '8px' }}>
                        {selectedGroup.userType === 'captain' ? 'كابتن' : 'راكب'}
                      </span>
                    </h3>
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={12}/> {selectedGroup.phone}</span>
                  </div>
                </div>
              </div>

              {/* قائمة التذاكر (الأحدث فوق) */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                {selectedGroup.tickets.sort((a: any, b: any) => getTime(b) - getTime(a)).map((ticket: any) => (
                  <div key={ticket.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                        <Clock size={16} /> <span>{formatDateTime(ticket.timestamp)}</span>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: ticket.status === 'resolved' ? '#dcfce7' : ticket.reply ? '#e0e7ff' : '#fef3c7', color: ticket.status === 'resolved' ? '#166534' : ticket.reply ? '#3730a3' : '#b45309' }}>
                        {ticket.status === 'resolved' ? 'مغلقة' : ticket.reply ? 'تم الرد' : 'بانتظار الرد'}
                      </span>
                    </div>
                    
                    <div style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '10px', color: '#334155', marginBottom: '15px', fontSize: '16px', lineHeight: '1.6' }}>
                      {ticket.text || ticket.message || ticket.content}
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
                        <input 
                          type="text" 
                          placeholder="اكتب ردك لحل المشكلة..." 
                          value={replyText[ticket.id] || ''} 
                          onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })} 
                          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                        />
                        <button 
                          disabled={submittingReply === ticket.id || !replyText[ticket.id]?.trim()} 
                          onClick={() => sendReply(ticket.id, ticket.senderId || ticket.captainId || ticket.passengerId || ticket.id, ticket.senderType || ticket.userType || selectedGroup.userType)} 
                          style={{ backgroundColor: replyText[ticket.id]?.trim() ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: replyText[ticket.id]?.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.2s' }}
                        >
                          {submittingReply === ticket.id ? 'جاري...' : <><Send size={16}/> إرسال הرد</>}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>
              <MessageSquare size={60} style={{ marginBottom: '15px', opacity: 0.5 }} />
              <h2>اختر مرسل من القائمة لعرض تذاكره</h2>
              <p>يتم تجميع كل الشكاوى والمقترحات الخاصة بنفس الشخص هنا.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}