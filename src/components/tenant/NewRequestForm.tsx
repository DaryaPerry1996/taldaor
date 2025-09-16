import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { REQUEST_TYPES, PRIORITY_LABELS, RequestType, RequestPriority } from '../../types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface NewRequestFormProps {
  onSuccess: () => void;
}

export function NewRequestForm({ onSuccess }: NewRequestFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'maintenance' as RequestType,
    title: '',
    description: '',
    priority: 'medium' as RequestPriority,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          tenant_id: user.id,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: 'pending',
        });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        type: 'maintenance',
        title: '',
        description: '',
        priority: 'medium',
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted!</h3>
          <p className="text-gray-600">Your maintenance request has been submitted successfully. You'll be redirected to view your requests shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Submit New Request</h3>
        <p className="mt-1 text-sm text-gray-600">Fill out the form below to submit a maintenance request.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Request Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as RequestType })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as RequestPriority })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the issue"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide detailed information about the issue, location, and any other relevant details..."
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}