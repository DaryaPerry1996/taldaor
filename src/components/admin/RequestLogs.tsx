import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequestLog } from '../../types';
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function RequestLogs() {
  const { t, i18n } = useTranslation();

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
        .select(
          `
          *,
          admin:profiles!request_logs_updated_by_fkey (
            email
          )
        `
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLogs((data || []) as RequestLog[]);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const dateLocale = i18n.language === 'he' ? 'he-IL' : 'en-US';

  const pickNotes = (log: RequestLog) => {
    // prefer current language, fallback to the other, else empty
    const he = (log.notes_he ?? '').trim();
    const en = (log.notes_en ?? '').trim();

    if (i18n.language === 'he') return he || en;
    return en || he;
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
          <p className="text-red-600">{t('logs.errorLoading', { error })}</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('logs.emptyTitle')}</h3>
          <p className="text-gray-500">{t('logs.emptySubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{t('logs.title')}</h3>
        <p className="mt-1 text-sm text-gray-600">{t('logs.subtitle')}</p>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {logs.map((log) => {
          const notes = pickNotes(log);

          return (
            <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span dir="ltr" className="text-sm font-medium text-gray-900 text-left">
                      {t('logs.requestPrefix')} #{log.request_id.slice(-6)}
                    </span>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {t(`status.${log.old_status}`)}
                      </span>

                      <ArrowLeft className="h-4 w-4 text-gray-400" />

                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {t(`status.${log.new_status}`)}
                      </span>
                    </div>
                  </div>

                  {notes && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium text-gray-700">{t('logs.notes')} </span>
                      <span dir={i18n.language === 'he' ? 'rtl' : 'ltr'} className="text-left">
                        {notes}
                      </span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{t('logs.updatedBy')}</span>
                      <span dir="ltr" className="text-left">
                        {log.admin?.email}
                      </span>
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="font-medium">{t('logs.time')}</span>
                      <span dir="ltr" className="text-left">
                        {new Date(log.updated_at).toLocaleDateString(dateLocale)} {t('logs.at')}{' '}
                        {new Date(log.updated_at).toLocaleTimeString(dateLocale)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
