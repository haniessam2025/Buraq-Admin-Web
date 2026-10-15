import SettingsPage from './Settings';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LayoutDashboard, Users, CarFront, TicketPercent, Settings, BellRing, LogOut, ShieldCheck, UserCircle, FileCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';

import Home from './Home';
import Captains from './Captains';
import Passengers from './Passengers';
import Promos from './Promos';
import Notifications from './Notifications';
import StaffManagement from './StaffManagement';
import VerificationRequests from './VerificationRequests';

export default function App() {
  const { user, roleData } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  // 🔴🔴 اكتب إيميلك أنت هنا عشان اللوحة تعتبرك الأدمن غصب عن أي حاجة 🔴🔴
  const ADMIN_EMAIL = 'haniessam@gmail.com'; 

  // تأكيد إنك أدمن (لو الإيميل مطابق للي فوق، أو متسجل في الداتا بيز كأدمن)
  const isAdmin = roleData?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  
  // دوال فحص الصلاحيات لباقي الشاشات
  const canView = (page: string) => isAdmin || (roleData?.allowedPages && roleData.allowedPages.includes(page));

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
            {canView('captains') && <NavLink to="/captains" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><CarFront size={20} /> الكباتن</NavLink>}
            {canView('passengers') && <NavLink to="/passengers" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Users size={20} /> الركاب</NavLink>}
            {canView('promos') && <NavLink to="/promos" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><TicketPercent size={20} /> أكواد الخصم</NavLink>}
            {canView('notifications') && <NavLink to="/notifications" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><BellRing size={20} /> الإشعارات</NavLink>}
            {canView('settings') && <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Settings size={20} /> الإعدادات</NavLink>}

            {/* 📋 زر مراجعة الطلبات والوثائق */}
            {(isAdmin || canView('verification')) && (
              <NavLink to="/verification" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                <FileCheck size={20} /> مراجعة الطلبات
              </NavLink>
            )}

            {/* 🛡️ زر إدارة الموظفين بيظهر للأدمن فقط */}
            {isAdmin && (
              <NavLink to="/staff" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} style={{ borderTop: '1px solid #334155', marginTop: '10px', paddingTop: '20px' }}>
                <ShieldCheck size={20} color="#10b981" /> إدارة الموظفين
              </NavLink>
            )}
          </nav>
        </aside>

        {/* محتوى الشاشات */}
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* 🌟 الهيدر الجديد (أيقونة الحساب وتسجيل الخروج) 🌟 */}
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

            {/* قائمة تسجيل الخروج المنسدلة */}
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
              
              {isAdmin && <Route path="/staff" element={<StaffManagement />} />}
              
              <Route path="*" element={<Navigate to={canView('home') ? "/" : (isAdmin ? "/staff" : "/")} />} />
            </Routes>
          </div>

        </main>
      </div>
    </Router>
  );
}