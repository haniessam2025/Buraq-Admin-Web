import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { Search, Send, User, Clock, MessageSquare, Phone, Ticket, Ban, CheckCircle } from 'lucide-react';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'passenger_tickets' | 'captain_tickets'>('live');
  
  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qChats = query(collection(db, 'support_chats'), orderBy('lastUpdatedAt', 'desc'));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const chatsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveChats(chatsData);
      
      if (activeTab === 'live' && selectedItem) {
        const updated = chatsData.find(c => c.id === selectedItem.id);
        if (updated) setSelectedItem(updated);
      }
    });

    const qTickets = query(collection(db, 'support_tickets'), orderBy('timestamp', 'desc'));
    const unsubTickets = onSnapshot(qTickets, (snapshot) => {
      const ticketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(ticketsData);
      setLoading(false);

      if (activeTab !== 'live' && selectedItem) {
        const updated = ticketsData.find(t => t.id === selectedItem.id);
        if (updated) setSelectedItem(updated);
      }
    });

    return () => { unsubChats(); unsubTickets(); };
  }, [activeTab]);

  useEffect(() => {
    setSelectedItem(null);
    setReplyText('');
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'live' && selectedItem?.id) {
      const qMsgs = query(collection(db, 'support_chats', selectedItem.id, 'messages'), orderBy('timestamp', 'asc'));
      const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubMsgs();
    }
  }, [activeTab, selectedItem?.id]);

  const handleSendLiveMessage = async (e: any) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedItem || selectedItem.isClosed) return;

    const msg = replyText.trim();
    setReplyText('');
    try {
      await addDoc(collection(db, 'support_chats', selectedItem.id, 'messages'), { text: msg, sender: 'admin', timestamp: serverTimestamp() });
      await updateDoc(doc(db, 'support_chats', selectedItem.id), { lastMessage: msg, lastUpdatedAt: serverTimestamp(), unreadUser: true });
    } catch (error) { alert("حدث خطأ أثناء الإرسال."); }
  };

  const handleEndLiveChat = async () => {
    if (!selectedItem || selectedItem.isClosed) return;
    if (!window.confirm('هل أنت متأكد من إنهاء هذه المحادثة؟ لن يتمكن العميل من إرسال رسائل أخرى هنا.')) return;

    try {
      await updateDoc(doc(db, 'support_chats', selectedItem.id), {
        isClosed: true,
        status: 'closed',
        lastMessage: 'تم إنهاء المحادثة بواسطة الإدارة',
        lastUpdatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'support_chats', selectedItem.id, 'messages'), {
        text: '🛑 تم إنهاء هذه المحادثة بواسطة خدمة العملاء.',
        sender: 'system',
        timestamp: serverTimestamp()
      });
    } catch (error) { alert("حدث خطأ أثناء الإغلاق."); }
  };

  const handleReplyToTicket = async (e: any) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedItem) return;

    const reply = replyText.trim();
    setReplyText('');
    try {
      await updateDoc(doc(db, 'support_tickets', selectedItem.id), {
        reply: reply,
        status: 'replied',
        isReadAdmin: true
      });

      await addDoc(collection(db, 'notifications'), {
        userId: selectedItem.passengerId || selectedItem.captainId || selectedItem.userId || selectedItem.senderId || selectedItem.id,
        userType: selectedItem.userType || selectedItem.senderType,
        title: 'رد على رسالتك للدعم الفني 📞',
        message: reply,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) { alert("حدث خطأ أثناء إرسال الرد."); }
  };

  // الدالة دي بتمسح الإشعار بس لما تدوس على الرسالة وتقرأها فعلياً
  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    if (activeTab === 'live' && item.unreadAdmin) {
      updateDoc(doc(db, 'support_chats', item.id), { unreadAdmin: false }).catch(() => {});
    } else if (activeTab !== 'live' && !item.isReadAdmin) {
      updateDoc(doc(db, 'support_tickets', item.id), { isReadAdmin: true }).catch(() => {});
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ar-EG');
  };

  const currentList = activeTab === 'live' 
    ? liveChats 
    : tickets.filter((t: any) => (t.userType || t.senderType) === (activeTab === 'passenger_tickets' ? 'passenger' : 'captain'));

  // حساب الرسائل غير المقروءة بدقة
  const unreadLiveCount = liveChats.filter(c => c.unreadAdmin).length;
  const unreadPassengerTickets = tickets.filter(t => (t.userType === 'passenger' || t.senderType === 'passenger') && !t.isReadAdmin).length;
  const unreadCaptainTickets = tickets.filter(t => (t.userType === 'captain' || t.senderType === 'captain') && !t.isReadAdmin).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {/* زرار الشات المباشر */}
        <button onClick={() => setActiveTab('live')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: unreadLiveCount > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: unreadLiveCount > 0 ? '#fef08a' : (activeTab === 'live' ? '#3b82f6' : 'white'), color: unreadLiveCount > 0 ? '#854d0e' : (activeTab === 'live' ? 'white' : '#64748b'), fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <MessageSquare size={20} /> المحادثات المباشرة (Live)
          {unreadLiveCount > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadLiveCount}</span>}
        </button>

        {/* زرار رسائل الركاب */}
        <button onClick={() => setActiveTab('passenger_tickets')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: unreadPassengerTickets > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: unreadPassengerTickets > 0 ? '#fef08a' : (activeTab === 'passenger_tickets' ? '#2563eb' : 'white'), color: unreadPassengerTickets > 0 ? '#854d0e' : (activeTab === 'passenger_tickets' ? 'white' : '#64748b'), fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <Ticket size={20} /> رسائل الركاب
          {unreadPassengerTickets > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadPassengerTickets}</span>}
        </button>

        {/* زرار رسائل الكباتن */}
        <button onClick={() => setActiveTab('captain_tickets')} style={{ position: 'relative', flex: 1, padding: '15px', borderRadius: '12px', border: unreadCaptainTickets > 0 ? '2px solid #ca8a04' : 'none', backgroundColor: unreadCaptainTickets > 0 ? '#fef08a' : (activeTab === 'captain_tickets' ? '#10b981' : 'white'), color: unreadCaptainTickets > 0 ? '#854d0e' : (activeTab === 'captain_tickets' ? 'white' : '#64748b'), fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }}>
          <Ticket size={20} /> رسائل الكباتن
          {unreadCaptainTickets > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{unreadCaptainTickets}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
        <div style={{ width: '380px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
              <input type="text" placeholder="ابحث بالاسم أو الهاتف..." style={{ width: '100%', padding: '10px 40px 10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</div> : currentList.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا توجد بيانات.</div> : (
              currentList.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const isUnread = activeTab === 'live' ? item.unreadAdmin : !item.isReadAdmin;
                
                const name = item.senderName || item.name || item.userName || item.passengerName || item.captainName || 'مستخدم غير مسجل';
                const time = formatTime(item.lastUpdatedAt || item.timestamp);
                const subText = activeTab === 'live' ? item.lastMessage : item.message || item.text || item.content;

                return (
                  <div key={item.id} onClick={() => handleSelectItem(item)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : (isUnread ? '#fef9c3' : 'white'), borderRight: isUnread ? '4px solid #eab308' : 'none', transition: '0.2s', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: (item.userType || item.senderType) === 'captain' ? '#dcfce7' : '#dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                      <User size={24} color={(item.userType || item.senderType) === 'captain' ? '#16a34a' : '#2563eb'} />
                      {/* النقطة الحمراء للرسايل الجديدة */}
                      {isUnread && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white', zIndex: 10 }}></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: isUnread ? '#0f172a' : '#64748b', fontWeight: isUnread ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subText}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {selectedItem ? (
            <>
              <div style={{ padding: '15px 25px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: (selectedItem.userType || selectedItem.senderType) === 'captain' ? '#dcfce7' : '#dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={24} color={(selectedItem.userType || selectedItem.senderType) === 'captain' ? '#16a34a' : '#2563eb'} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>
                      {selectedItem.senderName || selectedItem.name || selectedItem.userName || selectedItem.passengerName || selectedItem.captainName} 
                      <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: (selectedItem.userType || selectedItem.senderType) === 'captain' ? '#10b981' : '#3b82f6', color: 'white', borderRadius: '12px', marginRight: '8px' }}>
                        {(selectedItem.userType || selectedItem.senderType) === 'captain' ? 'كابتن' : 'راكب'}
                      </span>
                      {selectedItem.isClosed && <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#ef4444', color: 'white', borderRadius: '12px', marginRight: '5px' }}>مغلقة</span>}
                    </h3>
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={12}/> {selectedItem.senderPhone || selectedItem.phone || selectedItem.userPhone || selectedItem.passengerPhone || selectedItem.captainPhone || 'رقم غير مسجل'}</span>
                  </div>
                </div>

                {activeTab === 'live' && !selectedItem.isClosed && (
                  <button onClick={handleEndLiveChat} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Ban size={16} /> إنهاء المحادثة
                  </button>
                )}
              </div>

              {activeTab === 'live' ? (
                <>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {messages.map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      const isSystem = msg.sender === 'system';
                      
                      if (isSystem) {
                        return <div key={msg.id} style={{ textAlign: 'center', margin: '15px 0' }}><span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '5px 15px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>{msg.text}</span></div>;
                      }

                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                          <div style={{ maxWidth: '70%', padding: '10px 15px', borderRadius: '12px', backgroundColor: isAdmin ? '#e0f2fe' : '#ffffff', border: `1px solid ${isAdmin ? '#bae6fd' : '#e2e8f0'}`, borderTopRightRadius: !isAdmin ? '2px' : '12px', borderTopLeftRadius: isAdmin ? '2px' : '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e293b', lineHeight: '1.5' }}>{msg.text}</p>
                            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}><Clock size={10} /> {formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendLiveMessage} style={{ padding: '15px 20px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={selectedItem.isClosed ? "لا يمكن الرد، المحادثة مغلقة." : "اكتب رسالتك هنا..."}
                      disabled={selectedItem.isClosed}
                      style={{ flex: 1, padding: '15px', borderRadius: '25px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: selectedItem.isClosed ? '#f1f5f9' : '#f8fafc', fontSize: '15px' }}
                    />
                    <button 
                      type="submit" 
                      disabled={!replyText.trim() || selectedItem.isClosed}
                      style={{ backgroundColor: (replyText.trim() && !selectedItem.isClosed) ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', width: '50px', height: '50px', borderRadius: '50%', cursor: (replyText.trim() && !selectedItem.isClosed) ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s' }}
                    >
                      <Send size={20} style={{ transform: 'rotate(180deg)', marginLeft: '2px' }} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                  <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '15px', fontSize: '14px' }}>
                      <Clock size={16} /> <span>تاريخ الرسالة: {formatDate(selectedItem.timestamp)} {formatTime(selectedItem.timestamp)}</span>
                    </div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '18px' }}>نص الرسالة:</h4>
                    <p style={{ margin: 0, color: '#334155', fontSize: '16px', lineHeight: '1.8', backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '10px' }}>
                      {selectedItem.message || selectedItem.text || selectedItem.content}
                    </p>
                  </div>

                  {selectedItem.reply ? (
                    <div style={{ backgroundColor: '#ecfdf5', padding: '25px', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#065f46', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={20} /> رد الإدارة:</h4>
                      <p style={{ margin: 0, color: '#064e3b', fontSize: '16px', lineHeight: '1.8' }}>{selectedItem.reply}</p>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '18px' }}>إرسال رد للعميل:</h4>
                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="اكتب ردك هنا وسيصل كإشعار للعميل..."
                        style={{ width: '100%', minHeight: '120px', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', fontSize: '15px', resize: 'vertical', marginBottom: '15px' }}
                      />
                      <button 
                        onClick={handleReplyToTicket}
                        disabled={!replyText.trim()}
                        style={{ width: '100%', backgroundColor: replyText.trim() ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: replyText.trim() ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        <Send size={20} /> إرسال الرد
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>
              <MessageSquare size={60} style={{ marginBottom: '15px', opacity: 0.5 }} />
              <h2>اختر رسالة أو محادثة للبدء</h2>
              <p>اضغط على أي عنصر من القائمة لعرض التفاصيل.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}