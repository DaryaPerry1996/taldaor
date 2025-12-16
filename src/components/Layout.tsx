import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  title: string; // keep as-is (caller can pass translated title later if you want)
}

export function Layout({ children, title }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Left block */}
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">{t('appTitle')}</p>
              </div>
            </div>

            {/* Right block */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />

                {/* Email should be LTR */}
                <span dir="ltr" className="text-sm text-gray-700 text-left">
                  {profile?.email}
                </span>

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile?.role ? t(`roles.${profile.role}`) : ''}
                </span>

                {profile?.role === 'tenant' && (
                  <span className="text-sm text-gray-500">{/* reserved */}</span>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
