import React, { useState } from 'react';
import { Layout } from '../Layout';
import { NewRequestForm } from '../shared/NewRequestForm';
import { MyRequests } from './MyRequests';
import { Plus, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ActiveTab = 'requests' | 'new-request';

export function TenantDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');

  return (
    <Layout title={t('tenant.dashboardTitle')}>
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <List className="inline-block w-4 h-4 mr-2" />
                {t('tenant.tabs.myRequests')}
              </button>

              <button
                onClick={() => setActiveTab('new-request')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'new-request'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Plus className="inline-block w-4 h-4 mr-2" />
                {t('tenant.tabs.newRequest')}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'requests' && <MyRequests />}
        {activeTab === 'new-request' && <NewRequestForm onSuccess={() => setActiveTab('requests')} />}
      </div>
    </Layout>
  );
}
