import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { TenantDashboard } from './components/tenant/TenantDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import Reset from './components/Reset'; // <-- add this

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  return profile.role === 'admin' ? <AdminDashboard /> : <TenantDashboard />;
}

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <AuthProvider>
      {path === '/reset' ? <Reset /> : <AppContent />}
    </AuthProvider>
  );
}

export default App;
