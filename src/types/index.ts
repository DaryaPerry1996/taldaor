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
  notes?: string;
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

export type RequestStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RequestPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export const REQUEST_TYPES: Record<RequestType, string> = {
  trash_removal: 'Trash Removal',
  elevator: 'Broken Elevator',
  maintenance: 'General Maintenance',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  pest_control: 'Pest Control',
  noise_complaint: 'Noise Complaint',
  other: 'Other'
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};