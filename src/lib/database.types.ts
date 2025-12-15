export interface Database {
  public: {
    Tables: {
      requests: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: string;
          title: string;
          description: string;
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      request_logs: {
        Row: {
          id: string;
          request_id: string;
          old_status: string;
          new_status: string;
          notes: string | null;
          updated_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          old_status: string;
          new_status: string;
          notes?: string | null;
          updated_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          old_status?: string;
          new_status?: string;
          notes?: string | null;
          updated_by?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: string;
         
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: string;
         
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
       
          created_at?: string;
        };
      };
    };
  };
}