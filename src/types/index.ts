export interface User {
  id: string;
  email: string;
  role: 'tenant' | 'admin';
  created_at: string;
}

export interface Request {
  id: string;
  tenant_id: string;
  tenant?: {
    email: string;
  };
  type: RequestType;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  created_at: string;
  updated_at: string;
}

export interface RequestLog {
  id: string;
  request_id: string;
  old_status: RequestStatus;
  new_status: RequestStatus;

  // ✅ bilingual notes (new columns in DB)
  notes_he?: string | null;
  notes_en?: string | null;

  updated_by: string;
  updated_at: string;

  admin?: {
    email: string;
  };
}

export type RequestType =
  | 'trash_removal'
  | 'elevator'
  | 'maintenance'
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'pest_control'
  | 'noise_complaint'
  | 'other';

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Keep these as "value maps" only (not display labels).
 * UI will translate with i18n:
 *  - t(`requestTypes.${request.type}`)
 *  - t(`status.${request.status}`)
 *  - t(`priority.${request.priority}`)
 */
export const REQUEST_TYPES: Record<RequestType, RequestType> = {
  trash_removal: 'trash_removal',
  elevator: 'elevator',
  maintenance: 'maintenance',
  plumbing: 'plumbing',
  electrical: 'electrical',
  hvac: 'hvac',
  pest_control: 'pest_control',
  noise_complaint: 'noise_complaint',
  other: 'other',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, RequestStatus> = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

export const PRIORITY_LABELS: Record<RequestPriority, RequestPriority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
};
