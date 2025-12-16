import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Request, REQUEST_TYPES, PRIORITY_LABELS, RequestStatus } from '../../types';
import { Clock, CheckCircle, AlertCircle, XCircle, Filter, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function RequestManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [updateData, setUpdateData] = useState<{ status: RequestStatus; notes: string }>({
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(
          `
          *,
          tenant:profiles!requests_tenant_id_fkey (
            email
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!editingRequest || !user) return;

    try {
      const { data: updated, error: updateError } = await supabase
        .from('requests')
        .update({ status: updateData.status })
        .eq('id', editingRequest.id)
        .select('id, status, updated_at, created_at, tenant_id')
        .single();

      if (updateError) throw updateError;

      const note = (updateData.notes ?? '').trim();
      const statusChanged = editingRequest.status !== updated.status;

      if (statusChanged || note !== '') {
        const ts = updated.updated_at ?? new Date().toISOString();

        const { error: logError } = await supabase.from('request_logs').insert({
          request_id: updated.id,
          old_status: editingRequest.status,
          new_status: updated.status,
          notes: note || null,
          created_by: updated.tenant_id,
          created_at: updated.created_at,
          updated_by: user.id,
          updated_at: ts,
        });

        if (logError) throw logError;
      }

      await fetchRequests();
      setEditingRequest(null);
      setUpdateData({ status: 'pending', notes: '' });
    } catch (error: any) {
      setError(error.message ?? String(error));
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

  const filteredRequests =
    filterStatus === 'all' ? requests : requests.filter((request) => request.status === filterStatus);

  const statusCounts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
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
          <p className="text-red-600">{t('requests.errorLoading', { error })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{t('requests.total')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('he-IL').format(requests.length)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{t('status.pending')}</p>
              <p className="text-2xl font-bold text-yellow-600">
                {new Intl.NumberFormat('he-IL').format(statusCounts.pending || 0)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{t('status.in_progress')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('he-IL').format(statusCounts.in_progress || 0)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{t('status.completed')}</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('he-IL').format(statusCounts.completed || 0)}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filter and Requests */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('requests.allTitle')}</h3>
              <p className="mt-1 text-sm text-gray-600">{t('requests.allSubtitle')}</p>
            </div>

            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as RequestStatus | 'all')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('requests.allStatuses')}</option>
                <option value="pending">{t('status.pending')}</option>
                <option value="in_progress">{t('status.in_progress')}</option>
                <option value="completed">{t('status.completed')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select>
            </div>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('requests.noneTitle')}</h3>
            <p className="text-gray-500">{t('requests.noneSubtitle')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{t('requests.type')}</span>
                        <span>{REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES]}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <span className="font-medium">{t('requests.tenant')}</span>
                        <span dir="ltr" className="text-left">
                          {request.tenant?.email}
                        </span>
                      </span>

                      <span className="flex items-center gap-1">
                        <span className="font-medium">{t('requests.created')}</span>
                        <span dir="ltr" className="text-left">
                          {new Date(request.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <button
                      onClick={() => {
                        setEditingRequest(request);
                        setUpdateData({ status: request.status as RequestStatus, notes: '' });
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                      aria-label={t('requests.edit')}
                      title={t('requests.edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('requests.updateModalTitle')}</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('requests.requestLabel')}: {editingRequest.title}
                </label>
                <p className="text-sm text-gray-500">
                  {t('requests.currentStatus')} {t(`status.${editingRequest.status}`)}
                </p>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('requests.newStatus')}
                </label>
                <select
                  id="status"
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as RequestStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">{t('status.pending')}</option>
                  <option value="in_progress">{t('status.in_progress')}</option>
                  <option value="completed">{t('status.completed')}</option>
                  <option value="cancelled">{t('status.cancelled')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('requests.notesOptional')}
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('requests.notesPlaceholder')}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingRequest(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleStatusUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                {t('requests.updateStatus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
