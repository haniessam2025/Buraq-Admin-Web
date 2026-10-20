import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { MessageSquare, User, Send, XCircle } from 'lucide-react';

export default function SupportPage() {
  const [activeMainTab, setActiveMainTab] = useState<'passenger' | 'captain'>('passenger');
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'live'>('tickets');
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [liveMessage, setLiveMessage] = useState('');
  
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // جلب התذاكر
  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // جلب المحادثات
  useEffect(() => {
    const q = query(collection(db, 'support_chats'), orderBy('lastMessageTime', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // قراءة التذاكر
  useEffect(() => {
    if (activeSubTab === 'tickets') {
      const unreadVisible = tickets.filter(t => t.senderType === activeMainTab && t.isReadAdmin === false);
      unreadVisible.forEach(t => updateDoc(doc(db, 'support_tickets', t.id), { isReadAdmin: true }).catch(e => console.log(e)));
    }
  }, [activeMainTab, activeSubTab, tickets]);

  // قراءة الشات
  useEffect(() => {
    if (selectedChatId && activeSubTab === 'live') {
      updateDoc(doc(db, 'support_chats', selectedChatId), { unreadAdmin: false }).catch(e=>console.log(e));
      const q = query(collection(db, 'support_chats', selectedChatId, 'messages'), orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsub();
    }
  }, [selectedChatId, activeSubTab]);

  const sendTicketReply = async (ticketId: string, senderId: string, senderType: string) => {
    const reply = replyText[ticketId];
    if (!reply || reply.trim() === '') return;
    setSubmittingReply(ticketId);
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { reply: reply.trim(), status: 'replied', isReadAdmin: true });
      await addDoc(collection(db, 'notifications'), { userId: senderId, userType: senderType, title: 'رد من الدعم الفني 🎧', message: reply.trim(), read: false, timestamp: serverTimestamp() });
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
    } catch (error) { alert("خطأ في الإرسال"); }
    finally { setSubmittingReply(null); }
  };

  const sendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveMessage.trim() || !selectedChatId) return;
    const chatDoc = chats.find(c => c.id === selectedChatId);
    if (!chatDoc) return;
    const msgText = liveMessage.trim();
    setLiveMessage('');
    try {
      await addDoc(collection(db, 'support_chats', selectedChatId, 'messages'), { text: msgText, sender: 'admin', timestamp: serverTimestamp() });
      await updateDoc(doc(db, 'support_chats', selectedChatId), { lastMessage: msgText, lastMessageTime: serverTimestamp(), unreadUser: true });
    } catch (error) { console.log(error); }
  };

  const closeLiveChat = async () => {
    if (!selectedChatId) return;
    if(window.confirm('هل أنت متأكد من إنهاء هذه المحادثة؟')) {
      await updateDoc(doc(db, 'support_chats', selectedChatId), { status: 'closed' });
      setSelectedChatId(null);
    }
  };

  const deleteChat = async (chatId: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذه المحادثة نهائياً؟')) {
      try {
        await updateDoc(doc(db, 'support_chats', chatId), { status: 'deleted' });
        if (selectedChatId === chatId) setSelectedChatId(null);
      } catch (error) { console.log(error); }
    }
  };

  const deleteAllClosedChats = async () => {
    const closedChats = chats.filter(c => c.userType === activeMainTab && c.status === 'closed');
    if (closedChats.length === 0) return alert('لا توجد محادثات منتهية لمسحها.');
    if(window.confirm(`هل أنت متأكد من حذف ${closedChats.length} محادثة منتهية نهائياً؟`)) {
      try {
        await Promise.all(closedChats.map(c => updateDoc(doc(db, 'support_chats', c.id), { status: 'deleted' })));
      } catch (error) { console.log(error); }
    }
  };

    const filteredTickets = tickets.filter(t => t.senderType === activeMainTab);
  const filteredChats = chats.filter(c => c.userType === activeMainTab && c.status !== 'deleted');
  
  const unreadPass = tickets.filter(t => t.senderType === 'passenger' && !t.isReadAdmin).length;
  const unreadCapt = tickets.filter(t => t.senderType === 'captain' && !t.isReadAdmin).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <MessageSquare size={32} color="#3b82f6" />
        <h1 style={{ margin: 0, color: '#1e293b' }}>الدعم الفني</h1>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button onClick={() => { setActiveMainTab('passenger'); setSelectedChatId(null); }} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: activeMainTab === 'passenger' ? '#2563eb' : '#e2e8f0', color: activeMainTab === 'passenger' ? 'white' : '#475569', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', position: 'relative' }}>
          <User size={22} style={{verticalAlign:'middle', marginLeft:'8px'}}/> الركاب
          {unreadPass > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadPass}</span>}
        </button>
        <button onClick={() => { setActiveMainTab('captain'); setSelectedChatId(null); }} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: activeMainTab === 'captain' ? '#10b981' : '#e2e8f0', color: activeMainTab === 'captain' ? 'white' : '#475569', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', position: 'relative' }}>
          <User size={22} style={{verticalAlign:'middle', marginLeft:'8px'}}/> الكباتن
          {unreadCapt > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '12px', width: '24px', height: '24px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCapt}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '30px' }}>
        <button onClick={() => { setActiveSubTab('tickets'); setSelectedChatId(null); }} style={{ background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', color: activeSubTab === 'tickets' ? '#2563eb' : '#64748b', borderBottom: activeSubTab === 'tickets' ? '3px solid #2563eb' : 'none', paddingBottom: '5px', cursor: 'pointer' }}>طلبات الدعم والرسائل</button>
        <button onClick={() => setActiveSubTab('live')} style={{ background: 'none', border: 'none', fontSize: '16px', fontWeight: 'bold', color: activeSubTab === 'live' ? '#2563eb' : '#64748b', borderBottom: activeSubTab === 'live' ? '3px solid #2563eb' : 'none', paddingBottom: '5px', cursor: 'pointer', position: 'relative' }}>
          المحادثات المباشرة (Live)
          {chats.filter(c => c.userType === activeMainTab && c.unreadAdmin).length > 0 && <span style={{ position: 'absolute', top: '-5px', left: '-15px', width:'10px', height:'10px', backgroundColor: '#ef4444', borderRadius:'50%' }}></span>}
        </button>
      </div>

      {activeSubTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredTickets.map(ticket => (
            <div key={ticket.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>المرسل: {ticket.senderName}</h3>
                  <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: ticket.status === 'resolved' ? '#dcfce7' : ticket.reply ? '#e0e7ff' : '#fef3c7', color: ticket.status === 'resolved' ? '#166534' : ticket.reply ? '#3730a3' : '#b45309' }}>{ticket.status === 'resolved' ? 'مغلقة' : ticket.reply ? 'تم الرد' : 'بانتظار الرد'}</span>
              </div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '10px', color: '#334155', marginBottom: '20px' }}>{ticket.text}</div>
              {!ticket.reply && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="اكتب ردك هنا..." value={replyText[ticket.id] || ''} onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <button disabled={submittingReply === ticket.id} onClick={() => sendTicketReply(ticket.id, ticket.senderId, ticket.senderType)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer' }}>
                    {submittingReply === ticket.id ? 'جاري الإرسال...' : 'إرسال الرد'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredTickets.length === 0 && <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>لا توجد رسائل دعم</div>}
        </div>
      )}

      {activeSubTab === 'live' && (
        <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
          <div style={{ width: '350px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <strong style={{ color: '#1e293b' }}>المحادثات ({filteredChats.length})</strong>
              {filteredChats.some(c => c.status === 'closed') && (
                <button onClick={deleteAllClosedChats} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <XCircle size={14} /> مسح المنتهية
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChats.map(chat => (
                <div key={chat.id} onClick={() => setSelectedChatId(chat.id)} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: selectedChatId === chat.id ? '#eff6ff' : 'white', borderLeft: chat.unreadAdmin ? '4px solid #ef4444' : 'none', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <h4 style={{ margin: 0, color: '#1e293b', width: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.userName && chat.userName.trim() !== '' && chat.userName !== 'كابتن' && chat.userName !== 'undefined' 
                        ? chat.userName 
                        : (chat.userType === 'captain' ? `كابتن (${chat.userId ? chat.userId.slice(0, 6) : ''})` : `راكب (${chat.userId ? chat.userId.slice(0, 6) : ''})`)
                      }
                    </h4>
                    <span style={{ fontSize: '11px', color: chat.status === 'active' ? '#10b981' : '#94a3b8' }}>{chat.status === 'active' ? 'نشط' : 'مغلق'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '80%' }}>{chat.lastMessage}</p>
                    {(chat.status === 'closed' || chat.status !== 'active') && (
                      <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <XCircle size={18} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredChats.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>لا توجد محادثات</div>}
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            {selectedChatId ? (
              <>
                <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>
                    محادثة مع: {
                      (() => {
                        const activeChat = chats.find(c => c.id === selectedChatId);
                        if (!activeChat) return '';
                        return activeChat.userName && activeChat.userName.trim() !== '' && activeChat.userName !== 'كابتن' && activeChat.userName !== 'undefined'
                          ? activeChat.userName
                          : (activeChat.userType === 'captain' ? `كابتن (${activeChat.userId ? activeChat.userId.slice(0, 6) : ''})` : `راكب (${activeChat.userId ? activeChat.userId.slice(0, 6) : ''})`);
                      })()
                    }
                  </h3>
                  {chats.find(c => c.id === selectedChatId)?.status === 'active' && (
                    <button onClick={closeLiveChat} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                      <XCircle size={18} /> إنهاء المحادثة
                    </button>
                  )}
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f1f5f9' }}>
                  {chatMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'admin' ? 'flex-start' : 'flex-end', marginBottom: '15px' }}>
                      <div style={{ maxWidth: '70%', padding: '12px 15px', borderRadius: '12px', backgroundColor: msg.sender === 'admin' ? '#2563eb' : 'white', color: msg.sender === 'admin' ? 'white' : '#1e293b', border: msg.sender === 'user' ? '1px solid #e2e8f0' : 'none' }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {chats.find(c => c.id === selectedChatId)?.status === 'active' ? (
                  <form onSubmit={sendLiveMessage} style={{ padding: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                    <input type="text" value={liveMessage} onChange={e => setLiveMessage(e.target.value)} placeholder="اكتب رسالتك..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }} />
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Send size={18} /> إرسال</button>
                  </form>
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>تم إنهاء هذه المحادثة</div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>اختر محادثة من القائمة لعرضها</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}