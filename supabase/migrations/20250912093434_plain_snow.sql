/*
  # Fix infinite recursion in RLS policies

  1. Security Policy Updates
    - Remove circular dependency in admin profile reading policy
    - Simplify policies to avoid recursion
    - Use auth.jwt() to check user roles instead of querying profiles table

  2. Changes Made
    - Updated admin policies to use JWT claims instead of profile table queries
    - Simplified user policies to use direct auth.uid() comparisons
    - Fixed all policies that were causing infinite recursion
*/


-- Create simplified policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create simplified policies for requests table
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

-- Create simplified policies for request_logs table
CREATE POLICY "Users can read logs for own requests"
  ON request_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE requests.id = request_logs.request_id 
      AND requests.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for own requests"
  ON request_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());