import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Request } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MyRequests() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as Request[]);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const dateLocale = i18n.language === 'he' ? 'he-IL' : 'en-US';

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600">{t('tenantRequests.errorLoading', { error })}</p>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tenantRequests.emptyTitle')}</h3>
          <p className="text-gray-500">{t('tenantRequests.emptySubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{t('tenantRequests.title')}</h3>
        <p className="mt-1 text-sm text-gray-600">{t('tenantRequests.subtitle')}</p>
      </div>

      <div className="divide-y divide-gray-200">
        {requests.map((request) => (
          <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-medium text-gray-900">{request.title}</h4>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      request.status
                    )}`}
                  >
                    {t(`status.${request.status}`)}
                  </span>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                      request.priority
                    )}`}
                  >
                    {t(`priority.${request.priority}`)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{request.description}</p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{t('tenantRequests.type')}</span>
                    <span>{t(`requestTypes.${request.type}`)}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="font-medium">{t('tenantRequests.created')}</span>
                    <span dir="ltr" className="text-left">
                      {new Date(request.created_at).toLocaleDateString(dateLocale)}
                    </span>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="font-medium">{t('tenantRequests.updated')}</span>
                    <span dir="ltr" className="text-left">
                      {new Date(request.updated_at).toLocaleDateString(dateLocale)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center">{getStatusIcon(request.status)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
