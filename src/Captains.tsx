import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Search, ShieldBan, Car, Star, Wallet, X, IdCard, Image as ImageIcon, CarFront, Filter, ArrowUpDown } from 'lucide-react';

export default function Captains() {
  const [captains, setCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 👈 حالات الترتيب (النوع + الاتجاه)
  const [sortBy, setSortBy] = useState('default'); 
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); 
  
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'captains')); 
    
    const unsub = onSnapshot(q, (snapshot) => {
      const capsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCaptains(capsData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleBan = async (captainId: string, currentStatus: string, e: any) => {
    e.stopPropagation();
    if (window.confirm(`هل أنت متأكد من ${currentStatus === 'banned' ? 'فك حظر' : 'حظر'} هذا الكابتن؟`)) {
      try {
        await updateDoc(doc(db, 'captains', captainId), {
          status: currentStatus === 'banned' ? 'active' : 'banned',
          isOnline: false 
        });
      } catch (error) {
        alert("حدث خطأ أثناء تغيير حالة الكابتن");
      }
    }
  };

  const formatVehicleDisplay = (cap: any) => {
    const category = cap.vehicleCategory || '';
    const rawVehicle = cap.vehicle || '';
    
    if (category === 'tuktuk_alt' || rawVehicle.includes('توكتوك')) {
      let finalName = cap.tuktukAltType || rawVehicle;
      finalName = finalName.replace(/بديل توكتوك/g, '').replace(/[()]/g, '').trim();
      return finalName || 'كيوت 3 راكب'; 
    }
    
    if (category === 'car' || category === 'scooter' || rawVehicle.includes('سيارة') || rawVehicle.includes('سكوتر')) {
      const make = cap.carMake || cap.vehicleDetails?.make || '';
      const model = cap.carModel || cap.vehicleDetails?.model || '';
      const year = cap.carYear || cap.vehicleDetails?.year || '';
      
      const fullDetails = `${make} ${model} ${year}`.trim();
      return fullDetails.length > 2 ? fullDetails : (rawVehicle || (category === 'car' ? 'سيارة' : 'سكوتر'));
    }

    return rawVehicle || 'غير محدد';
  };

  const getBuraqCode = (cap: any) => {
    return cap.vehicleNumber || cap.vehicleSequenceNumber || 'غير مسجل';
  };

  const filteredCaptains = captains.filter(cap => {
    const searchLower = searchTerm.toLowerCase();
    const buraqCode = getBuraqCode(cap).toString().toLowerCase();
    return (
      (cap.name && cap.name.toLowerCase().includes(searchLower)) ||
      (cap.phone && cap.phone.includes(searchLower)) ||
      (cap.nationalId && cap.nationalId.includes(searchLower)) ||
      (cap.plateNumber && cap.plateNumber.toLowerCase().includes(searchLower)) ||
      (buraqCode.includes(searchLower))
    );
  });

  // 👈 الترتيب المزدوج (حسب النوع والاتجاه معاً)
  const displayedCaptains = [...filteredCaptains].sort((a, b) => {
    let result = 0;
    
    if (sortBy === 'name') {
      result = (a.name || '').localeCompare(b.name || '', 'ar');
    } else if (sortBy === 'rating') {
      result = Number(b.averageRating || 5) - Number(a.averageRating || 5);
    } else if (sortBy === 'buraq_code') {
      const codeA = getBuraqCode(a).toString();
      const codeB = getBuraqCode(b).toString();
      result = codeA.localeCompare(codeB, 'en', { numeric: true });
    } else if (sortBy === 'vehicle') {
      const vA = formatVehicleDisplay(a);
      const vB = formatVehicleDisplay(b);
      result = vA.localeCompare(vB, 'ar');
    } else {
      const timeA = a.createdAt || a.timestamp || 0;
      const timeB = b.createdAt || b.timestamp || 0;
      result = timeB - timeA;
    }
    
    // إذا كان الاتجاه 'تنازلي'، نضرب النتيجة في -1 لعكس الترتيب
    return sortOrder === 'asc' ? result : -result;
  });

  const openCaptainDetails = (captain: any) => {
    setSelectedCaptain(captain);
    setIsModalOpen(true);
  };

  const DocumentImage = ({ title, url }: { title: string, url: string }) => {
    if (!url) return null;
    return (
      <div style={{ flex: '1 1 45%', minWidth: '150px', marginBottom: '15px' }}>
        <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>{title}</p>
        <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
          <img src={url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1e293b' }}>
          <CarFront size={32} color="#2563eb" /> إدارة الكباتن والمركبات
        </h1>
        <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
          {captains.length} كابتن
        </div>
      </div>

      {/* 👈 شريط البحث + الفلتر + زر العكس */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexDirection: 'row-reverse' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', right: '15px', top: '15px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="ابحث بالاسم، الهاتف، البطاقة، اللوحة، أو بُرَاق الكودي..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '15px 45px 15px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
          />
        </div>
        
        <div style={{ position: 'relative', width: '220px' }}>
          <Filter size={18} style={{ position: 'absolute', right: '15px', top: '16px', color: '#3b82f6', pointerEvents: 'none' }} />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ 
              width: '100%', padding: '14px 40px 14px 15px', borderRadius: '10px', 
              border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', 
              backgroundColor: 'white', color: '#1e293b', fontWeight: 'bold',
              appearance: 'none', cursor: 'pointer'
            }}
          >
            <option value="default">🕒 الأحدث تسجيلاً</option>
            <option value="name">👤 الترتيب بالاسم (أ - ي)</option>
            <option value="buraq_code">🔢 رقم بُرَاق الكودي</option>
            <option value="vehicle">🚗 نوع المركبة</option>
            <option value="rating">⭐ الأعلى تقييماً</option>
          </select>
          <div style={{ position: 'absolute', left: '15px', top: '18px', pointerEvents: 'none', fontSize: '12px', color: '#64748b' }}>▼</div>
        </div>

        {/* 👈 زر عكس الاتجاه (تصاعدي/تنازلي) */}
        <button 
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0 15px', 
            backgroundColor: 'white', borderRadius: '10px', border: '1px solid #cbd5e1', 
            cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold' 
          }}
          title="عكس اتجاه الترتيب"
        >
          <ArrowUpDown size={18} />
          {sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '15px', color: '#475569' }}>الصورة</th>
              <th style={{ padding: '15px', color: '#475569' }}>رقم بُرَاق الكودي</th>
              <th style={{ padding: '15px', color: '#475569' }}>اسم الكابتن</th>
              <th style={{ padding: '15px', color: '#475569' }}>رقم الهاتف</th>
              <th style={{ padding: '15px', color: '#475569' }}>المركبة</th>
              <th style={{ padding: '15px', color: '#475569' }}>رقم اللوحة</th>
              <th style={{ padding: '15px', color: '#475569' }}>التقييم</th>
              <th style={{ padding: '15px', color: '#475569' }}>حالة الحساب</th>
              <th style={{ padding: '15px', color: '#475569' }}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>جاري تحميل البيانات...</td></tr>
            ) : displayedCaptains.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>لا يوجد نتائج</td></tr>
            ) : (
              displayedCaptains.map(cap => (
                <tr 
                  key={cap.id} 
                  onClick={() => openCaptainDetails(cap)}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s', cursor: 'pointer' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '12px 15px' }}>
                    <img src={cap.profileImage || cap.avatar || 'https://via.placeholder.com/40'} alt="صورة" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                  </td>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#3b82f6' }} dir="ltr">{getBuraqCode(cap)}</td>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#1e293b' }}>{cap.name || 'بدون اسم'}</td>
                  <td style={{ padding: '12px 15px', color: '#475569' }} dir="ltr">{cap.phone}</td>
                  <td style={{ padding: '12px 15px' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '5px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                      {formatVehicleDisplay(cap)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px', color: '#475569' }}>{cap.plateNumber || 'بدون لوحة'}</td>
                  <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#eab308' }}>
                    {Number(cap.averageRating || 5).toFixed(1)} <Star size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    {cap.status === 'banned' ? (
                      <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldBan size={16}/> محظور</span>
                    ) : cap.isOnline ? (
                      <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>🟢 أونلاين</span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>🔴 أوفلاين</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 15px' }}>
                    <button 
                      onClick={(e) => toggleBan(cap.id, cap.status, e)}
                      style={{ 
                        backgroundColor: cap.status === 'banned' ? '#10b981' : '#ef4444', 
                        color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' 
                      }}
                    >
                      {cap.status === 'banned' ? 'فك الحظر' : 'حظر الكابتن'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedCaptain && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setIsModalOpen(false)}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '15px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>الملف الشخصي للكابتن</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ position: 'relative' }}>
                  <img src={selectedCaptain.profileImage || selectedCaptain.avatar || 'https://via.placeholder.com/100'} alt="صورة الكابتن" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3b82f6', padding: '2px', backgroundColor: 'white' }} />
                </div>
                <h2 style={{ margin: '15px 0 5px 0', color: '#0f172a' }}>{selectedCaptain.name}</h2>
                <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={16} color="#eab308" /> {Number(selectedCaptain.averageRating || 5).toFixed(1)} تقييم</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: (selectedCaptain.walletBalance || 0) < 0 ? '#ef4444' : '#10b981' }}><Wallet size={16} /> الرصيد: {selectedCaptain.walletBalance || 0} ج</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}><IdCard size={18} color="#3b82f6"/> البيانات الشخصية</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>رقم بُرَاق الكودي:</span> <strong style={{ color: '#3b82f6' }} dir="ltr">{getBuraqCode(selectedCaptain)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>الاسم:</span> <strong style={{ color: '#0f172a' }}>{selectedCaptain.name}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>الهاتف:</span> <strong style={{ color: '#0f172a' }} dir="ltr">{selectedCaptain.phone}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>الرقم القومي:</span> <strong style={{ color: '#0f172a' }} dir="ltr">{selectedCaptain.nationalId || 'غير متوفر'}</strong></div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}><Car size={18} color="#10b981"/> بيانات المركبة</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>نوع المركبة:</span> <strong style={{ color: '#0f172a' }}>{formatVehicleDisplay(selectedCaptain)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>رقم اللوحة:</span> <strong style={{ color: '#0f172a' }}>{selectedCaptain.plateNumber || 'بدون لوحة'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#64748b' }}>سنة الصنع:</span> <strong style={{ color: '#0f172a' }}>{selectedCaptain.carYear || selectedCaptain.vehicleDetails?.year || '-'}</strong></div>
                </div>
              </div>

              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', marginTop: 0, marginBottom: '15px' }}><ImageIcon size={20} color="#8b5cf6"/> المستندات وصور المركبة</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                <DocumentImage title="البطاقة (أمام)" url={selectedCaptain.nationalIdFront || selectedCaptain.idFrontImage} />
                <DocumentImage title="البطاقة (خلف)" url={selectedCaptain.nationalIdBack || selectedCaptain.idBackImage} />
                
                <DocumentImage title="رخصة القيادة (أمام)" url={selectedCaptain.drivingLicenseFront || selectedCaptain.licenseFrontImage} />
                <DocumentImage title="رخصة القيادة (خلف)" url={selectedCaptain.drivingLicenseBack || selectedCaptain.licenseBackImage} />
                
                <DocumentImage title="رخصة المركبة (أمام)" url={selectedCaptain.vehicleLicenseFront || selectedCaptain.carLicenseFrontImage} />
                <DocumentImage title="رخصة المركبة (خلف)" url={selectedCaptain.vehicleLicenseBack || selectedCaptain.carLicenseBackImage} />
                
                <DocumentImage title="صورة المركبة" url={selectedCaptain.vehicleImage || selectedCaptain.carImage || selectedCaptain.tuktukImage} />
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: #eff6ff !important;
        }
      `}</style>

    </div>
  );
}