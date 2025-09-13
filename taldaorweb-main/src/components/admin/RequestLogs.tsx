import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequestLog, REQUEST_STATUS_LABELS } from '../../types';
import { FileText, AlertCircle, ArrowRight } from 'lucide-react';

export function RequestLogs() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('request_logs')
        .select(`
          *,
          admin:profiles!request_logs_updated_by_fkey (
            email
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <p className="text-red-600">Error loading logs: {error}</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logs yet</h3>
          <p className="text-gray-500">No request status changes have been logged yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Request Logs</h3>
        <p className="mt-1 text-sm text-gray-600">Complete history of all request status changes.</p>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Request #{log.request_id.slice(-6)}
                  </span>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                      {REQUEST_STATUS_LABELS[log.old_status as keyof typeof REQUEST_STATUS_LABELS]}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {REQUEST_STATUS_LABELS[log.new_status as keyof typeof REQUEST_STATUS_LABELS]}
                    </span>
                  </div>
                </div>
                
                {log.notes && (
                  <p className="text-sm text-gray-600 mb-2">{log.notes}</p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <span className="font-medium">Updated by:</span>
                    <span>{log.admin?.email}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="font-medium">Time:</span>
                    <span>
                      {new Date(log.updated_at).toLocaleDateString()} at{' '}
                      {new Date(log.updated_at).toLocaleTimeString()}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}