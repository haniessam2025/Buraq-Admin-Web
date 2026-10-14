import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import AuthProvider from './AuthProvider.tsx' // 👈 استدعاء الحارس
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* 👈 تغليف التطبيق بالكامل بحارس الصلاحيات */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
)