import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { LayoutDashboard, Users, CarFront, TicketPercent, Settings, BellRing, LogOut, ShieldCheck, UserCircle, FileCheck, MessageSquare, AlertTriangle, Search, Wallet, Menu, X } from 'lucide-react';
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
import ComplaintsPage from './ComplaintsPage';
import TripLostItemsPage from './TripLostItemsPage';
import CaptainBalances from './CaptainBalances';

export default function App() {
  const { user, roleData } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 👈 حالة قائمة الموبايل

  const ADMIN_EMAIL = 'haniessam@gmail.com'; 
  const isAdmin = roleData?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const canView = (page: string) => isAdmin || (roleData?.allowedPages && roleData.allowedPages.includes(page));

  const [unreadSupport, setUnreadSupport] = useState(0);
  const [unreadComplaints, setUnreadComplaints] = useState(0);
  const [unreadTripLost, setUnreadTripLost] = useState(0);
  const [newVerification, setNewVerification] = useState(0);
  const [newCaptains, setNewCaptains] = useState(0);
  const [newPassengers, setNewPassengers] = useState(0);

  useEffect(() => {
    const qSupport = query(collection(db, 'support_chats'), where('unreadAdmin', '==', true));
    const unsubSupport = onSnapshot(qSupport, (snap) => setUnreadSupport(snap.docs.length));
    
    const qComplaints = query(collection(db, 'complaints_tickets'), where('isReadAdmin', '==', false));
    const unsubComplaints = onSnapshot(qComplaints, (snap) => setUnreadComplaints(snap.docs.length));
    
    const qTripLost = query(collection(db, 'trip_lost_items'), where('isReadAdmin', '==', false));
    const unsubTripLost = onSnapshot(qTripLost, (snap) => setUnreadTripLost(snap.docs.length));
    
    const qVerification = query(collection(db, 'captains'), where('verificationStatus', '==', 'pending'));
    const unsubVerification = onSnapshot(qVerification, (snap) => setNewVerification(snap.docs.length));

    const qCaptains = query(collection(db, 'captains'), where('isReviewed', '==', false));
    const unsubCaptains = onSnapshot(qCaptains, (snap) => setNewCaptains(snap.docs.length));

    const qPassengers = query(collection(db, 'passengers'), where('isReviewed', '==', false));
    const unsubPassengers = onSnapshot(qPassengers, (snap) => setNewPassengers(snap.docs.length));

    return () => {
      unsubSupport();
      unsubComplaints();
      unsubVerification();
      unsubCaptains();
      unsubPassengers();
      unsubTripLost();
    };
  }, []);

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

  // 👈 قائمة الروابط عشان متتكررش في الكود
  const renderNavLinks = () => (
    <>
      {canView('home') && <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><LayoutDashboard size={20} /> الرئيسية</NavLink>}
      
      {canView('captains') && (
        <NavLink to="/captains" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newCaptains > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <CarFront size={20} /> الكباتن
          {newCaptains > 0 && <span className="notification-badge">{newCaptains}</span>}
        </NavLink>
      )}

      {(isAdmin || canView('balances')) && (
        <NavLink to="/balances" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} style={{ position: 'relative' }}>
          <Wallet size={20} /> أرصدة الكباتن
        </NavLink>
      )}

      {canView('passengers') && (
        <NavLink to="/passengers" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newPassengers > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <Users size={20} /> الركاب
          {newPassengers > 0 && <span className="notification-badge">{newPassengers}</span>}
        </NavLink>
      )}
      
      {(isAdmin || canView('trip_lost')) && (
        <NavLink to="/trip-lost-items" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${unreadTripLost > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <Search size={20} /> مفقودات الرحلات
          {unreadTripLost > 0 && <span className="notification-badge">{unreadTripLost}</span>}
        </NavLink>
      )}
      
      {canView('promos') && <NavLink to="/promos" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><TicketPercent size={20} /> أكواد الخصم</NavLink>}
      {canView('notifications') && <NavLink to="/notifications" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><BellRing size={20} /> الإشعارات</NavLink>}
      
      {(isAdmin || canView('support')) && (
        <NavLink to="/support" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${unreadSupport > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <MessageSquare size={20} /> الدعم الفني
          {unreadSupport > 0 && <span className="notification-badge">{unreadSupport}</span>}
        </NavLink>
      )}

      {(isAdmin || canView('complaints')) && (
        <NavLink to="/complaints" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${unreadComplaints > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <AlertTriangle size={20} />   الشكاوى والمقترحات
          {unreadComplaints > 0 && <span className="notification-badge">{unreadComplaints}</span>}
        </NavLink>
      )}

      {canView('settings') && <NavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Settings size={20} /> الإعدادات</NavLink>}
      
      {(isAdmin || canView('verification')) && (
        <NavLink to="/verification" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${newVerification > 0 ? "highlight-yellow" : ""}`} style={{ position: 'relative' }}>
          <FileCheck size={20} /> مراجعة الطلبات
          {newVerification > 0 && <span className="notification-badge">{newVerification}</span>}
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/staff" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{ borderTop: '1px solid #334155', marginTop: '10px', paddingTop: '20px' }}>
          <ShieldCheck size={20} color="#10b981" /> إدارة الموظفين
        </NavLink>
      )}
    </>
  );

  return (
    <Router>
      <div className="dashboard-container">
        
        {/* 📱 خلفية شفافة للقائمة في وضع الموبايل */}
        {isMobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        {/* 📌 القائمة الجانبية */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 20px' }}>
            <div className="sidebar-logo" style={{ margin: 0, fontSize: '24px' }}>بُرَاق | التحكم</div>
            <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={24} color="white" />
            </button>
          </div>
          <nav className="sidebar-nav-container">
            {renderNavLinks()}
          </nav>
        </aside>

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            
            {/* 👈 زر القائمة للموبايل */}
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} color="#1e293b" />
            </button>

            <div style={{ flex: 1 }}></div>

            <div 
              onClick={() => setShowLogout(!showLogout)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 15px', borderRadius: '30px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
            >
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                  {isAdmin ? 'مدير النظام' : 'موظف (Staff)'}
                </span>
                <span className="header-email" style={{ fontSize: '12px', color: '#64748b' }} dir="ltr">{user?.email}</span>
              </div>
              <UserCircle size={36} color={isAdmin ? "#3b82f6" : "#10b981"} />
            </div>

            {showLogout && (
              <div style={{ position: 'absolute', top: '70px', left: '15px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '10px', zIndex: 1000, minWidth: '200px' }}>
                <button 
                  onClick={() => signOut(auth)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                  <LogOut size={18} /> تسجيل الخروج
                </button>
              </div>
            )}
          </header>

          <div style={{ flex: 1, overflowX: 'hidden' }}>
            <Routes>
              {canView('home') && <Route path="/" element={<Home />} />}
              {canView('captains') && <Route path="/captains" element={<Captains />} />}
              {(isAdmin || canView('balances')) && <Route path="/balances" element={<CaptainBalances />} />} 
              {canView('passengers') && <Route path="/passengers" element={<Passengers />} />}
              {canView('promos') && <Route path="/promos" element={<Promos />} />}
              {canView('notifications') && <Route path="/notifications" element={<Notifications />} />}
              {canView('settings') && <Route path="/settings" element={<SettingsPage />} />}
              {(isAdmin || canView('trip_lost')) && <Route path="/trip-lost-items" element={<TripLostItemsPage />} />}
              {(isAdmin || canView('verification')) && <Route path="/verification" element={<VerificationRequests />} />}
              {(isAdmin || canView('support')) && <Route path="/support" element={<SupportPage />} />} 
              {(isAdmin || canView('complaints')) && <Route path="/complaints" element={<ComplaintsPage />} />} 
              {isAdmin && <Route path="/staff" element={<StaffManagement />} />}
              <Route path="*" element={<Navigate to={canView('home') ? "/" : (isAdmin ? "/staff" : "/")} />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* 🚀 أكواد الـ CSS الخاصة بالتجاوب (Responsive) */}
      <style>{`
        .dashboard-container { display: flex; min-height: 100vh; background-color: #f1f5f9; }
        .sidebar { width: 260px; background-color: #0f172a; color: white; padding-top: 20px; display: flex; flexDirection: column; transition: all 0.3s ease; z-index: 1000; }
        .sidebar-nav-container { flex: 1; overflow-y: auto; padding: 0 10px; }
        .main-content { flex: 1; padding: 20px; overflow-y: auto; width: 100%; }
        
        .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; }
        .mobile-close-btn { display: none; background: none; border: none; cursor: pointer; }
        .mobile-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }

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

        /* 📱 إعدادات الموبايل (Responsive Media Queries) */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            right: -280px; /* مخفية بره الشاشة يمين */
            top: 0;
            bottom: 0;
            width: 260px;
            box-shadow: -4px 0 15px rgba(0,0,0,0.2);
          }
          .sidebar.open {
            right: 0; /* تظهر لما نضغط على الزرار */
          }
          .mobile-menu-btn { display: block; }
          .mobile-close-btn { display: block; }
          .mobile-overlay { display: block; }
          .main-content { padding: 10px; width: 100%; }
          .header-email { display: none; /* إخفاء الإيميل في الموبايل لتوفير المساحة */ }
        }
      `}</style>
    </Router>
  );
}