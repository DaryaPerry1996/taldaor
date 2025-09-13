import React, { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { NewRequestForm } from './NewRequestForm';
import { MyRequests } from './MyRequests';
import { Plus, List } from 'lucide-react';

type ActiveTab = 'requests' | 'new-request';

export function TenantDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');

  return (
    <Layout title="Tenant Dashboard">
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
                My Requests
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
                New Request
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