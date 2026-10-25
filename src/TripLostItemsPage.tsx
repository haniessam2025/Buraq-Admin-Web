import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; 
import { Search, User, Phone, Calendar, MapPin, Clock, Trash2 } from 'lucide-react';

export default function TripLostItemsPage() {
  const [lostReports, setLostReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'trip_lost_items'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLostReports(reports);
      setLoading(false);

      reports.forEach((report: any) => {
        if (report.isReadAdmin === false) {
          updateDoc(doc(db, 'trip_lost_items', report.id), {
            isReadAdmin: true
          }).catch(err => console.error("خطأ في تحديث حالة القراءة:", err));
        }
      });
    });
    return () => unsub();
  }, []);

  const groupedByTrip = lostReports.reduce((acc: any, report: any) => {
    const tId = report.tripId || 'unknown_trip';
    if (!acc[tId]) {
      acc[tId] = {
        tripId: tId,
        tripDate: report.tripDate || new Date(report.timestamp).toLocaleDateString('ar-EG'),
        latestTimestamp: report.timestamp || 0, 
        pickupLocation: report.pickupLocation,
        destinationLocation: report.destinationLocation,
        passengerReports: [], 
        captainReports: []    
      };
    }
    
    if (report.timestamp > acc[tId].latestTimestamp) {
      acc[tId].latestTimestamp = report.timestamp;
    }

    if (report.reporterType === 'passenger') {
      acc[tId].passengerReports.push(report);
    } else if (report.reporterType === 'captain') {
      acc[tId].captainReports.push(report);
    }
    return acc;
  }, {});

  const tripCards = Object.values(groupedByTrip).sort((a: any, b: any) => b.latestTimestamp - a.latestTimestamp);

  const sendReply = async (reportId: string, userId: string, userType: string) => {
    const reply = replyText[reportId];
    if (!reply || reply.trim() === '') return;

    setSubmittingReply(reportId);
    try {
      await updateDoc(doc(db, 'trip_lost_items', reportId), {
        reply: reply.trim(),
        status: 'replied',
        isReadAdmin: true 
      });

      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        userType: userType,
        title: 'رد بخصوص بلاغ المفقودات 🔍',
        message: reply.trim(),
        read: false,
        timestamp: serverTimestamp()
      });

      setReplyText(prev => ({ ...prev, [reportId]: '' }));
    } catch (error) {
      alert("خطأ في إرسال الرد");
    } finally {
      setSubmittingReply(null);
    }
  };

  // 🗑️ دالة مسح بلاغات رحلة معينة
  const deleteTripReports = async (trip: any) => {
    if (!window.confirm('هل أنت متأكد من مسح جميع بلاغات هذه الرحلة نهائياً؟')) return;
    try {
      const deletePromises: any[] = [];
      trip.passengerReports.forEach((r: any) => deletePromises.push(deleteDoc(doc(db, 'trip_lost_items', r.id))));
      trip.captainReports.forEach((r: any) => deletePromises.push(deleteDoc(doc(db, 'trip_lost_items', r.id))));
      
      await Promise.all(deletePromises);
    } catch (error) {
      alert('حدث خطأ أثناء مسح البلاغات.');
    }
  };

  // 🗑️ دالة مسح جميع البلاغات
  const deleteAllReports = async () => {
    if (!window.confirm('🚨 تحذير: هل أنت متأكد من مسح جميع بلاغات المفقودات لجميع الرحلات؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      const deletePromises = lostReports.map(report => deleteDoc(doc(db, 'trip_lost_items', report.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      alert('حدث خطأ أثناء المسح الشامل.');
    }
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={32} color="#d97706" />
          <h1 style={{ margin: 0, color: '#1e293b' }}>مفقودات الرحلات (مجمعة حسب الرحلة)</h1>
        </div>
        
        {/* زر مسح الكل */}
        {lostReports.length > 0 && (
          <button 
            onClick={deleteAllReports}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Trash2 size={18} /> مسح جميع البلاغات
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>جاري التحميل...</div>
      ) : tripCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
          لا توجد بلاغات مفقودات مسجلة حالياً.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {tripCards.map((trip: any) => (
            <div key={trip.tripId} style={{ backgroundColor: 'white', borderRadius: '16px', border: '2px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              
              <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#eab308" />
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>تاريخ الرحلة: {trip.tripDate || 'غير محدد'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>رقم الرحلة (ID): {trip.tripId}</span>
                  {/* زر مسح الرحلة الواحدة */}
                  <button 
                    onClick={() => deleteTripReports(trip)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    <Trash2 size={14} /> مسح
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '14px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#10b981" /> <strong>من:</strong> {trip.pickupLocation || 'غير محدد'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#ef4444" /> <strong>إلى:</strong> {trip.destinationLocation || 'غير محدد'}
                </div>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                {trip.passengerReports.map((report: any) => (
                  <div key={report.id} style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #dbeafe', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="#2563eb" />
                        <strong style={{ color: '#1e3a8a', fontSize: '16px' }}>بلاغ الراكب: {report.reporterName}</strong>
                        <span style={{ fontSize: '12px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '10px' }}>
                          <Clock size={12} /> {formatMessageTime(report.timestamp)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <Phone size={14} color="#2563eb" /> <span dir="ltr" style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{report.reporterPhone}</span>
                      </div>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '15px', lineHeight: '1.6', marginBottom: '15px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
                      {report.text}
                    </div>

                    {report.reply ? (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <strong style={{ color: '#059669', display: 'block', marginBottom: '3px' }}>رد الإدارة على الراكب:</strong>
                        <p style={{ margin: 0, color: '#064e3b' }}>{report.reply}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="اكتب ردك هنا للراكب..."
                          value={replyText[report.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [report.id]: e.target.value })}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        />
                        <button 
                          onClick={() => sendReply(report.id, report.reporterId, 'passenger')}
                          disabled={submittingReply === report.id}
                          style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          إرسال الرد
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {trip.passengerReports.length > 0 && trip.captainReports.length > 0 && (
                  <div style={{ height: '2px', backgroundColor: '#e2e8f0', width: '100%' }} />
                )}

                {trip.captainReports.map((report: any) => (
                  <div key={report.id} style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #dcfce7', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="#10b981" />
                        <strong style={{ color: '#065f46', fontSize: '16px' }}>بلاغ الكابتن: {report.reporterName}</strong>
                        <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '10px' }}>
                          <Clock size={12} /> {formatMessageTime(report.timestamp)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <Phone size={14} color="#10b981" /> <span dir="ltr" style={{ fontWeight: 'bold', color: '#047857' }}>{report.reporterPhone}</span>
                      </div>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '15px', lineHeight: '1.6', marginBottom: '15px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
                      {report.text}
                    </div>

                    {report.reply ? (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <strong style={{ color: '#059669', display: 'block', marginBottom: '3px' }}>رد الإدارة على الكابتن:</strong>
                        <p style={{ margin: 0, color: '#064e3b' }}>{report.reply}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="اكتب ردك هنا للكابتن..."
                          value={replyText[report.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [report.id]: e.target.value })}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        />
                        <button 
                          onClick={() => sendReply(report.id, report.reporterId, 'captain')}
                          disabled={submittingReply === report.id}
                          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          إرسال الرد
                        </button>
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}