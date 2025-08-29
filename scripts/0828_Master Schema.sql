-- =================================================================
-- Master Schema (v2 - Task Management Update)
-- DO NOT RUN ON A DATABASE WITH EXISTING DATA!
-- This script is for setting up a new, empty database from scratch.
-- =================================================================

-- Section 0: Clean up existing tables
DROP TABLE IF EXISTS public.activity_records;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.staff;
DROP TABLE IF EXISTS public.activity_types;

-- =================================================================
-- 1. Staff Table (staff)
-- =================================================================
CREATE TABLE public.staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.staff IS 'Information about the staff who create activity records in this system.';

-- =================================================================
-- 2. Users Table (users)
-- =================================================================
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.users IS 'A table to sync and cache user information from the master system.';

-- =================================================================
-- 3. Activity Types Table (activity_types)
-- =================================================================
CREATE TABLE public.activity_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.activity_types IS 'Defines types of activities such as "Regular Visit" or "Shopping Assistance".';

-- =================================================================
-- 4. Activity Records Table (activity_records)
-- =================================================================
CREATE TABLE public.activity_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id),
  activity_type_id UUID NOT NULL REFERENCES public.activity_types(id),
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  content TEXT,
  is_completed BOOLEAN DEFAULT true,
  has_next_appointment BOOLEAN DEFAULT false,
  next_appointment_date DATE,
  next_appointment_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.activity_records IS 'The main table for daily activity records.';
COMMENT ON COLUMN public.activity_records.is_completed IS 'Flag to indicate if the task is completed. true=completed record, false=uncompleted task.';


-- =================================================================
-- 5. Indexes for Performance
-- =================================================================
CREATE INDEX idx_activity_records_user_date ON public.activity_records(user_id, activity_date DESC);
CREATE INDEX idx_activity_records_date ON public.activity_records(activity_date);
CREATE INDEX idx_users_master_uid ON public.users(master_uid);

-- =================================================================
-- 6. Trigger for auto-updating updated_at
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_staff_update
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_users_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
  
CREATE TRIGGER on_activity_records_update
  BEFORE UPDATE ON public.activity_records
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- =================================================================
-- Schema setup complete
-- =================================================================