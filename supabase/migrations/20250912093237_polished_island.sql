/*
  # Create profiles table and apartment management schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `role` (text, default 'tenant')
      - `apartment_number` (text, nullable)
      - `created_at` (timestamp)
    - `requests`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references profiles)
      - `type` (text)
      - `title` (text)
      - `description` (text)
      - `status` (text, default 'pending')
      - `priority` (text, default 'medium')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `request_logs`
      - `id` (uuid, primary key)
      - `request_id` (uuid, references requests)
      - `old_status` (text, nullable)
      - `new_status` (text, nullable)
      - `notes` (text, nullable)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admins to manage all data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'admin')),
 
  created_at timestamptz DEFAULT now()
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('maintenance', 'trash_removal', 'elevator', 'plumbing', 'electrical', 'hvac', 'pest_control', 'noise_complaint', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create request_logs table
CREATE TABLE IF NOT EXISTS request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);


 

-- Requests policies
CREATE POLICY "Tenants can read own requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can insert own requests"
  ON requests
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own requests"
  ON requests
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth.uid());


-- Request logs policies
CREATE POLICY "Users can read logs for own requests"
  ON request_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE id = request_logs.request_id AND tenant_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for own requests"
  ON request_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());


-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for requests table
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();




-- Make sure request_logs has these columns
ALTER TABLE public.request_logs
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- (Recommended) FK for joins & integrity
ALTER TABLE public.request_logs
  ADD CONSTRAINT request_logs_request_fk
  FOREIGN KEY (request_id) REFERENCES public.requests(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- Logger function
CREATE OR REPLACE FUNCTION public.log_request_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.request_logs (request_id, request_updated_at)
  VALUES (NEW.id, NEW.updated_at);
  RETURN NEW;
END
$$;

-- AFTER UPDATE trigger (uses the timestamp already set by your BEFORE trigger)
DROP TRIGGER IF EXISTS trg_requests_after_update_log ON public.requests;
CREATE TRIGGER trg_requests_after_update_log
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_update();

-- Create function to automatically log request status changes
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO request_logs (request_id, old_status, new_status, created_by, created_at, updated_by,updated_at)
    VALUES
    (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.updated_at, auth.uid(), NEW.updated_at);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic status change logging
CREATE TRIGGER log_request_status_change_trigger
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION log_request_status_change();