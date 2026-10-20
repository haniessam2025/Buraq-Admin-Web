import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { Search, User, Phone, Calendar, MapPin } from 'lucide-react';
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
    });
    return () => unsub();
  }, []);

  // تجميع البلاغات حسب رقم الرحلة (tripId)
  const groupedByTrip = lostReports.reduce((acc: any, report: any) => {
    const tId = report.tripId || 'unknown_trip';
    if (!acc[tId]) {
      acc[tId] = {
        tripId: tId,
        tripDate: report.tripDate,
        pickupLocation: report.pickupLocation,
        destinationLocation: report.destinationLocation,
        passengerReport: null,
        captainReport: null
      };
    }
    if (report.reporterType === 'passenger') {
      acc[tId].passengerReport = report;
    } else if (report.reporterType === 'captain') {
      acc[tId].captainReport = report;
    }
    return acc;
  }, {});

  const tripCards = Object.values(groupedByTrip);

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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <Search size={32} color="#d97706" />
        <h1 style={{ margin: 0, color: '#1e293b' }}>مفقودات الرحلات (مجمعة حسب الرحلة)</h1>
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
              
              {/* هيدر الرحلة (العام لكل رحلة) */}
              <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#eab308" />
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>تاريخ الرحلة: {trip.tripDate || 'غير محدد'}</span>
                </div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>رقم الرحلة (ID): {trip.tripId}</span>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '14px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#10b981" /> <strong>من:</strong> {trip.pickupLocation || 'غير محدد'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#ef4444" /> <strong>إلى:</strong> {trip.destinationLocation || 'غير محدد'}
                </div>
              </div>

              {/* محتوى البلاغات (مقسوم لنصفين: راكب / كابتن) */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                {/* 1️⃣ بلاغ الراكب (لو موجود) */}
                {trip.passengerReport ? (
                  <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #dbeafe', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="#2563eb" />
                        <strong style={{ color: '#1e3a8a', fontSize: '16px' }}>بلاغ الراكب: {trip.passengerReport.reporterName}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <Phone size={14} color="#2563eb" /> <span dir="ltr" style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{trip.passengerReport.reporterPhone}</span>
                      </div>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '15px', lineHeight: '1.6', marginBottom: '15px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
                      {trip.passengerReport.text}
                    </div>

                    {trip.passengerReport.reply ? (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <strong style={{ color: '#059669', display: 'block', marginBottom: '3px' }}>رد الإدارة على الراكب:</strong>
                        <p style={{ margin: 0, color: '#064e3b' }}>{trip.passengerReport.reply}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="اكتب ردك هنا للراكب..."
                          value={replyText[trip.passengerReport.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [trip.passengerReport.id]: e.target.value })}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        />
                        <button 
                          onClick={() => sendReply(trip.passengerReport.id, trip.passengerReport.reporterId, 'passenger')}
                          disabled={submittingReply === trip.passengerReport.id}
                          style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          إرسال الرد
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* خط فاصل بين بلاغ الراكب والكابتن لو الاتنين موجودين */}
                {trip.passengerReport && trip.captainReport && (
                  <div style={{ height: '2px', backgroundColor: '#e2e8f0', width: '100%' }} />
                )}

                {/* 2️⃣ بلاغ الكابتن (لو موجود) */}
                {trip.captainReport ? (
                  <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #dcfce7', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color="#10b981" />
                        <strong style={{ color: '#065f46', fontSize: '16px' }}>بلاغ الكابتن: {trip.captainReport.reporterName}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <Phone size={14} color="#10b981" /> <span dir="ltr" style={{ fontWeight: 'bold', color: '#047857' }}>{trip.captainReport.reporterPhone}</span>
                      </div>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '15px', lineHeight: '1.6', marginBottom: '15px', backgroundColor: 'white', padding: '12px', borderRadius: '8px' }}>
                      {trip.captainReport.text}
                    </div>

                    {trip.captainReport.reply ? (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <strong style={{ color: '#059669', display: 'block', marginBottom: '3px' }}>رد الإدارة على الكابتن:</strong>
                        <p style={{ margin: 0, color: '#064e3b' }}>{trip.captainReport.reply}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="اكتب ردك هنا للكابتن..."
                          value={replyText[trip.captainReport.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [trip.captainReport.id]: e.target.value })}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        />
                        <button 
                          onClick={() => sendReply(trip.captainReport.id, trip.captainReport.reporterId, 'captain')}
                          disabled={submittingReply === trip.captainReport.id}
                          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          إرسال الرد
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}