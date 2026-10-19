import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { LayoutDashboard, Users, CarFront, TicketPercent, Settings, BellRing, LogOut, ShieldCheck, UserCircle, FileCheck, MessageSquare } from 'lucide-react';
import { useAuth } from './AuthProvider';

import Home from './Home';
import Captains from './Captains';
import Passengers from './Passengers';
import Promos from './Promos';
import Notifications from './Notifications';
import StaffManagement from './StaffManagement';
import VerificationRequests from './VerificationRequests';
import SettingsPage from './Settings';
import SupportPage from './SupportPage';

export default function App() {
  const { user, roleData } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  // 🔴🔴 إيميل الأدمن الرئيسي 🔴🔴
  const ADMIN_EMAIL = 'haniessam@gmail.com'; 
  const isAdmin = roleData?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const canView = (page: string) => isAdmin || (roleData?.allowedPages && roleData.allowedPages.includes(page));

  // ==========================================
  // 🌟 نظام مراقبة الإشعارات اللحظي (Real-time) 🌟
  // ==========================================
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [newVerification, setNewVerification] = useState(0);
  const [newCaptains, setNewCaptains] = useState(0);
  const [newPassengers, setNewPassengers] = useState(0);

 useEffect(() => {
    // 1. مراقبة تذاكر الدعم الفني + المحادثات المباشرة
    let ticketsCount = 0;
    let chatsCount = 0;

    const qSupport = query(collection(db, 'support_tickets'), where('isReadAdmin', '==', false));
    const unsubSupport = onSnapshot(qSupport, (snap) => {
      ticketsCount = snap.docs.filter(doc => ['passenger', 'captain'].includes(doc.data().senderType)).length;
      setUnreadSupport(ticketsCount + chatsCount);
    });

    const qChats = query(collection(db, 'support_chats'), where('unreadAdmin', '==', true));
    const unsubChats = onSnapshot(qChats, (snap) => {
      chatsCount = snap.docs.filter(doc => ['passenger', 'captain'].includes(doc.data().userType)).length;
      setUnreadSupport(ticketsCount + chatsCount);
    });

    // 2. مراقبة طلبات التوثيق الجديدة
    const qVerification = query(collection(db, 'captains'), where('verificationStatus', '==', 'pending'));
    const unsubVerification = onSnapshot(qVerification, (snap) => setNewVerification(snap.docs.length));

    // 3. مراقبة الكباتن الجدد 
    const qCaptains = query(collection(db, 'captains'), where('isReviewed', '==', false));
    const unsubCaptains = onSnapshot(qCaptains, (snap) => setNewCaptains(snap.docs.length));

    // 4. مراقبة الركاب الجدد 
    const qPassengers = query(collection(db, 'passengers'), where('isReviewed', '==', false));
    const unsubPassengers = onSnapshot(qPassengers, (snap) => setNewPassengers(snap.docs.length));

    // 👇 السطر اللي كنت بقولك عليه اهو متضاف جاهز ومكتوب فيه unsubChats()
    return () => {
      unsubSupport();
      unsubChats(); // 👈 ضفناها هنا
      unsubVerification();
      unsubCaptains();
      unsubPassengers();
    };
  }, []);

  // لو حساب ملوش أي صلاحيات خالص
  if (!roleData && !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>غير مصرح بالدخول 🚫</h2>
          <p style={{ color: '#64748b', marginBottom: '25px' }}>هذا الحساب ليس لديه أي صلاحيات للوصول إلى لوحة التحكم.</p>
          <button onClick={() => signOut(auth)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            تسجيل الخروج للتبديل
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="dashboard-container">
        
        {/* القائمة الجانبية */}
        <aside className="sidebar">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px', padding: '0 20px' }}>
            <div className="sidebar-logo" style={{ margin: 0, fontSize: '24px' }}>بُرَاق | التحكم</div>
          </div>
          
          <nav>
            {canView('home') && <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><LayoutDashboard size={20} /> الرئيسية</NavLink>}
            
            {/* 🚙 الكباتن */}
            {canView('captains') && (
              <NavLink to="/captains" className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newCaptains > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
                <CarFront size={20} /> الكباتن
                {newCaptains > 0 && <span className="notification-badge">{newCaptains}</span>}
              </NavLink>
            )}

            {/* 👥 الركاب */}
            {canView('passengers') && (
              <NavLink to="/passengers" className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newPassengers > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
                <Users size={20} /> الركاب
                {newPassengers > 0 && <span className="notification-badge">{newPassengers}</span>}
              </NavLink>
            )}

            {canView('promos') && <NavLink to="/promos" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><TicketPercent size={20} /> أكواد الخصم</NavLink>}
            {canView('notifications') && <NavLink to="/notifications" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><BellRing size={20} /> الإشعارات</NavLink>}
            
            {/* 🎧 الدعم الفني */}
            {(isAdmin || canView('support')) && (
              <NavLink to="/support" className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${unreadSupport > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
                <MessageSquare size={20} /> الدعم الفني
                {unreadSupport > 0 && <span className="notification-badge">{unreadSupport}</span>}
              </NavLink>
            )}

            {canView('settings') && <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Settings size={20} /> الإعدادات</NavLink>}
            
            {/* 📋 مراجعة الطلبات */}
            {(isAdmin || canView('verification')) && (
              <NavLink to="/verification" className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newVerification > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
                <FileCheck size={20} /> مراجعة الطلبات
                {newVerification > 0 && <span className="notification-badge">{newVerification}</span>}
              </NavLink>
            )}

            {/* 🛡️ إدارة الموظفين */}
            {isAdmin && (
              <NavLink to="/staff" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{ borderTop: '1px solid #334155', marginTop: '10px', paddingTop: '20px' }}>
                <ShieldCheck size={20} color="#10b981" /> إدارة الموظفين
              </NavLink>
            )}
          </nav>
        </aside>

        {/* محتوى الشاشات */}
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* الهيدر */}
          <header style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', position: 'relative' }}>
            <div 
              onClick={() => setShowLogout(!showLogout)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '8px 15px', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                  {isAdmin ? 'مدير النظام (Admin)' : 'موظف (Staff)'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }} dir="ltr">{user?.email}</div>
              </div>
              <UserCircle size={36} color={isAdmin ? "#3b82f6" : "#10b981"} />
            </div>

            {/* قائمة تسجيل الخروج */}
            {showLogout && (
              <div style={{ position: 'absolute', top: '60px', left: '0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '10px', zIndex: 1000, minWidth: '200px' }}>
                <button 
                  onClick={() => signOut(auth)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                  <LogOut size={18} /> تسجيل الخروج
                </button>
              </div>
            )}
          </header>

          {/* راوتس الشاشات */}
          <div style={{ flex: 1 }}>
            <Routes>
              {canView('home') && <Route path="/" element={<Home />} />}
              {canView('captains') && <Route path="/captains" element={<Captains />} />}
              {canView('passengers') && <Route path="/passengers" element={<Passengers />} />}
              {canView('promos') && <Route path="/promos" element={<Promos />} />}
              {canView('notifications') && <Route path="/notifications" element={<Notifications />} />}
              {canView('settings') && <Route path="/settings" element={<SettingsPage />} />}
              {(isAdmin || canView('verification')) && <Route path="/verification" element={<VerificationRequests />} />}
              {(isAdmin || canView('support')) && <Route path="/support" element={<SupportPage />} />} 
              
              {isAdmin && <Route path="/staff" element={<StaffManagement />} />}
              
              <Route path="*" element={<Navigate to={canView('home') ? "/" : (isAdmin ? "/staff" : "/")} />} />
            </Routes>
          </div>

        </main>
      </div>

      {/* 🌟 استايلات الإشعارات 🌟 */}
      <style>{`
        .highlight-yellow {
          background-color: #fef08a !important; 
          color: #854d0e !important;
          border-right: 4px solid #eab308 !important;
          font-weight: bold !important;
          animation: pulseYellow 2s infinite;
        }

        .notification-badge {
          position: absolute;
          left: 15px;
          background-color: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: bold;
          width: 22px;
          height: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(239, 68, 68, 0.5);
        }

        @keyframes pulseYellow {
          0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
          100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
        }
      `}</style>
    </Router>
  );
}