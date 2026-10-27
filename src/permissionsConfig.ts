// هذا الملف هو المرجع الأساسي.. أي صفحة تضيفها هنا ستظهر تلقائياً في شاشة إدارة الموظفين

export const APP_PERMISSIONS = [
  {
    group: 'الرئيسية والملخصات',
    items: [
      { id: 'home', label: 'الرئيسية (الرحلات)' }
    ]
  },
  {
    group: 'إدارة الكباتن',
    items: [
      { id: 'captains', label: 'قائمة الكباتن' },
      { id: 'balances', label: 'أرصدة الكباتن' }
    ]
  },
  {
    group: 'إدارة الركاب',
    items: [
      { id: 'passengers', label: 'قائمة الركاب' }
    ]
  },
  {
    group: 'الدعم والمفقودات',
    items: [
      { id: 'support', label: 'الدعم الفني' },
      { id: 'complaints', label: 'الشكاوى والمقترحات' },
      { id: 'trip_lost', label: 'مفقودات الرحلات' }
    ]
  },
  {
    group: 'التسويق والطلبات',
    items: [
      { id: 'promos', label: 'أكواد الخصم' },
      { id: 'notifications', label: 'إرسال الإشعارات' },
      { id: 'verification', label: 'مراجعة الطلبات والوثائق' }
    ]
  },
  {
    group: 'إدارة النظام',
    items: [
      { id: 'settings', label: 'الإعدادات' },
      { id: 'billing', label: 'الاستهلاك والفواتير' }, // 👈 السطر الجديد
      { id: 'staff', label: 'إدارة الموظفين (للمدير فقط)' }
    ]
  }
];
