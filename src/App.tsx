import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { LayoutDashboard, Users, CarFront, TicketPercent, Settings, BellRing, LogOut, ShieldCheck, UserCircle, FileCheck, MessageSquare, AlertTriangle, Search, Wallet, Menu, X, Server } from 'lucide-react';
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
import BillingWidget from './BillingWidget';

// 🟢 قائمة الروابط الأساسية (Source of Truth)
const NAV_ITEMS = [
  { id: 'home', path: '/', icon: LayoutDashboard, label: 'الرئيسية', req: 'home' },
  { id: 'captains', path: '/captains', icon: CarFront, label: 'الكباتن', req: 'captains' },
  { id: 'balances', path: '/balances', icon: Wallet, label: 'أرصدة الكباتن', req: 'balances' },
  { id: 'passengers', path: '/passengers', icon: Users, label: 'الركاب', req: 'passengers' },
  { id: 'trip_lost', path: '/trip-lost-items', icon: Search, label: 'مفقودات الرحلات', req: 'trip_lost' },
  { id: 'promos', path: '/promos', icon: TicketPercent, label: 'أكواد الخصم', req: 'promos' },
  { id: 'notifications', path: '/notifications', icon: BellRing, label: 'إرسال الإشعارات', req: 'notifications' },
  { id: 'support', path: '/support', icon: MessageSquare, label: 'الدعم الفني', req: 'support' },
  { id: 'complaints', path: '/complaints', icon: AlertTriangle, label: 'الشكاوى والمقترحات', req: 'complaints' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'الإعدادات', req: 'settings' },
  { id: 'verification', path: '/verification', icon: FileCheck, label: 'مراجعة الطلبات', req: 'verification' },
  { id: 'billing', path: '/billing', icon: Server, label: 'الاستهلاك والفواتير', req: 'billing' },
  { id: 'staff', path: '/staff', icon: ShieldCheck, label: 'إدارة الموظفين', req: 'admin' },
];

export default function App() {
  const { user, roleData } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ADMIN_EMAIL = 'haniessam@gmail.com'; 
  const isAdmin = roleData?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const canView = (page: string) => isAdmin || (roleData?.allowedPages && roleData.allowedPages.includes(page));

  // 🔔 العدادات اللحظية
  const [unreadSupport, setUnreadSupport] = useState(0);
  const [unreadComplaints, setUnreadComplaints] = useState(0);
  const [unreadTripLost, setUnreadTripLost] = useState(0);
  const [newVerification, setNewVerification] = useState(0);
  const [onlineCaptains, setOnlineCaptains] = useState(0);
  const [onlinePassengers, setOnlinePassengers] = useState(0);

  // 🚀 حالات السحب والإفلات (Drag and Drop)
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const dragTimer = useRef<any>(null); // مؤقت التمييز بين السكرول والسحب

  // استرجاع ترتيب الأزرار المحفوظ في المتصفح
  useEffect(() => {
    const savedOrder = localStorage.getItem('buraq_sidebar_order');
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      const missingIds = NAV_ITEMS.map(i => i.id).filter(id => !parsed.includes(id));
      setNavOrder([...parsed, ...missingIds]);
    } else {
      setNavOrder(NAV_ITEMS.map(i => i.id));
    }
  }, []);

  // جلب الإشعارات
  useEffect(() => {
    const unsubSupportChats = onSnapshot(query(collection(db, 'support_chats'), where('unreadAdmin', '==', true)), snap => setUnreadSupport(snap.docs.length));
    const unsubComplaints = onSnapshot(query(collection(db, 'complaints_tickets'), where('isReadAdmin', '==', false)), snap => setUnreadComplaints(snap.docs.length));
    const unsubTripLost = onSnapshot(query(collection(db, 'trip_lost_items'), where('isReadAdmin', '==', false)), snap => setUnreadTripLost(snap.docs.length));
    
    let c1=0, c2=0, c3=0, c4=0, c5=0, c6=0;
    const updateVerifCount = () => setNewVerification(c1+c2+c3+c4+c5+c6);
    const unsubV1 = onSnapshot(query(collection(db, 'captains'), where('verificationStatus', '==', 'pending')), s => { c1 = s.size; updateVerifCount(); });
    const unsubV2 = onSnapshot(query(collection(db, 'captains'), where('status', '==', 'pending')), s => { c2 = s.size; updateVerifCount(); });
    const unsubV3 = onSnapshot(query(collection(db, 'captains'), where('updateStatus', '==', 'pending')), s => { c3 = s.size; updateVerifCount(); });
    const unsubV4 = onSnapshot(query(collection(db, 'passengers'), where('verificationStatus', '==', 'pending')), s => { c4 = s.size; updateVerifCount(); });
    const unsubV5 = onSnapshot(query(collection(db, 'passengers'), where('status', '==', 'pending')), s => { c5 = s.size; updateVerifCount(); });
    const unsubV6 = onSnapshot(query(collection(db, 'passengers'), where('updateStatus', '==', 'pending')), s => { c6 = s.size; updateVerifCount(); });

    const unsubOnlineCaptains = onSnapshot(query(collection(db, 'captains'), where('isOnline', '==', true)), snap => setOnlineCaptains(snap.docs.length));
    const unsubOnlinePassengers = onSnapshot(query(collection(db, 'passengers'), where('isOnline', '==', true)), snap => setOnlinePassengers(snap.docs.length));

    return () => {
      unsubSupportChats(); unsubComplaints(); unsubTripLost(); 
      unsubV1(); unsubV2(); unsubV3(); unsubV4(); unsubV5(); unsubV6();
      unsubOnlineCaptains(); unsubOnlinePassengers();
    };
  }, []);

  if (!roleData && !isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>غير مصرح بالدخول 🚫</h2>
          <p style={{ color: '#64748b', marginBottom: '25px' }}>هذا الحساب ليس لديه صلاحيات للوصول إلى لوحة التحكم.</p>
          <button onClick={() => signOut(auth)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>تسجيل الخروج للتبديل</button>
        </div>
      </div>
    );
  }

  // 🎯 دوال السحب والإفلات للماوس والموبايل
  const handleDragStart = (index: number) => { 
    dragItem.current = index; 
    setIsDragging(true); 
  };
  
  const handleDragEnter = (index: number) => { 
    dragOverItem.current = index; 
  };
  
  const handleDragEnd = () => {
    if (dragTimer.current) clearTimeout(dragTimer.current);
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newOrder = [...navOrder];
      const draggedItem = newOrder.splice(dragItem.current, 1)[0];
      newOrder.splice(dragOverItem.current, 0, draggedItem);
      setNavOrder(newOrder);
      localStorage.setItem('buraq_sidebar_order', JSON.stringify(newOrder));
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setTimeout(() => setIsDragging(false), 50);
  };

  const handleTouchStart = (index: number) => {
    dragTimer.current = setTimeout(() => {
      handleDragStart(index);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 350);
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging) {
      if (dragTimer.current) clearTimeout(dragTimer.current);
      return; 
    }
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const dropTarget = element.closest('.draggable-nav-item');
      if (dropTarget) {
        const index = Number(dropTarget.getAttribute('data-index'));
        if (!isNaN(index)) dragOverItem.current = index;
      }
    }
  };

  const getBadgeCount = (id: string) => {
    switch(id) {
      case 'captains': return onlineCaptains;
      case 'passengers': return onlinePassengers;
      case 'trip_lost': return unreadTripLost;
      case 'support': return unreadSupport;
      case 'complaints': return unreadComplaints;
      case 'verification': return newVerification;
      default: return 0;
    }
  };

  const renderNavLinks = () => {
    return navOrder.map((itemId, index) => {
      const item = NAV_ITEMS.find(i => i.id === itemId);
      if (!item) return null;

      if (item.req === 'admin' && !isAdmin) return null;
      if (item.req !== 'admin' && !canView(item.req)) return null;

      const badge = getBadgeCount(item.id);
      const Icon = item.icon;
      const isStaffBtn = item.id === 'staff';

      return (
        <div 
          key={item.id}
          className={`draggable-nav-item ${isDragging && dragItem.current === index ? 'dragging-active' : ''}`}
          data-index={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          onTouchStart={() => handleTouchStart(index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
          style={{ 
            borderTop: isStaffBtn ? '1px solid #334155' : 'none', 
            marginTop: isStaffBtn ? '15px' : '2px', 
            paddingTop: isStaffBtn ? '15px' : '0' 
          }}
        >
          <NavLink 
            to={item.path} 
            onClick={(e) => { 
              if (isDragging) { e.preventDefault(); return; } 
              setIsMobileMenuOpen(false); 
            }} 
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${badge > 0 ? "highlight-yellow" : ""}`} 
            style={{ position: 'relative' }}
          >
            <Icon size={20} color={isStaffBtn ? "#10b981" : undefined} /> {item.label}
            {badge > 0 && <span className="notification-badge">{badge}</span>}
          </NavLink>
        </div>
      );
    });
  };

  return (
    <Router>
      <div className="dashboard-container">
        {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 20px' }}>
            <div className="sidebar-logo" style={{ margin: 0, fontSize: '24px', cursor: 'default' }}>بُرَاق | التحكم</div>
            <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}><X size={24} color="white" /></button>
          </div>
          <nav className="sidebar-nav-container">
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>يمكنك سحب الأزرار لترتيبها ↕️</p>
            {renderNavLinks()}
          </nav>
        </aside>

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} color="#1e293b" />
            </button>

            <div style={{ flex: 1 }}></div>

            <div 
              onClick={() => setShowLogout(!showLogout)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 15px', borderRadius: '30px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
            >
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{isAdmin ? 'مدير النظام' : 'موظف (Staff)'}</span>
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
              {(isAdmin || canView('billing')) && <Route path="/billing" element={<BillingWidget />} />}
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

      <style>{`
        .dashboard-container { display: flex; min-height: 100vh; background-color: #f1f5f9; }
        .sidebar { width: 260px; background-color: #0f172a; color: white; padding-top: 20px; display: flex; flexDirection: column; transition: all 0.3s ease; z-index: 1000; }
        .sidebar-nav-container { flex: 1; overflow-y: auto; padding: 0 10px; overflow-x: hidden; }
        .main-content { flex: 1; padding: 20px; overflow-y: auto; width: 100%; }
        
        .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; }
        .mobile-close-btn { display: none; background: none; border: none; cursor: pointer; }
        .mobile-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }

        /* 🟢 تنسيقات السحب والإفلات */
        .draggable-nav-item {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .draggable-nav-item a {
          cursor: grab !important;
        }
        .dragging-active {
          touch-action: none !important;
          opacity: 0.6;
          transform: scale(0.95);
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

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

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            right: -280px;
            top: 0;
            bottom: 0;
            width: 260px;
            box-shadow: -4px 0 15px rgba(0,0,0,0.2);
          }
          .sidebar.open { right: 0; }
          .mobile-menu-btn { display: block; }
          .mobile-close-btn { display: block; }
          .mobile-overlay { display: block; }
          .main-content { padding: 10px; width: 100%; }
          .header-email { display: none; }
        }
      `}</style>
    </Router>
  );
}