
-- Create Enum Types safely
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sales_entry_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid_locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sales_entry_event_type AS ENUM ('submit', 'approve', 'reject', 'unlock', 'update');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payroll_run_status AS ENUM ('draft', 'confirmed', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'staff',
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create sales_entries table
CREATE TABLE IF NOT EXISTS public.sales_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sales_amount INTEGER NOT NULL DEFAULT 0,
    status public.sales_entry_status NOT NULL DEFAULT 'draft',
    note TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_entries_staff_date ON public.sales_entries(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_entries_status ON public.sales_entries(status);

-- Enable RLS
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.is_manager_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_staff_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  SELECT id INTO sid FROM public.staff WHERE user_id = auth.uid()::text LIMIT 1;
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sales Entries Policies
DROP POLICY IF EXISTS "Staff view own entries" ON public.sales_entries;
CREATE POLICY "Staff view own entries" ON public.sales_entries
FOR SELECT USING (
    staff_id = public.get_user_staff_id() OR public.is_manager_or_owner()
);

DROP POLICY IF EXISTS "Staff insert own entries" ON public.sales_entries;
CREATE POLICY "Staff insert own entries" ON public.sales_entries
FOR INSERT WITH CHECK (
    staff_id = public.get_user_staff_id()
);

DROP POLICY IF EXISTS "Staff update own entries" ON public.sales_entries;
CREATE POLICY "Staff update own entries" ON public.sales_entries
FOR UPDATE USING (
    (staff_id = public.get_user_staff_id() AND status NOT IN ('approved', 'paid_locked'))
    OR public.is_manager_or_owner()
);

-- Create sales_entry_events table
CREATE TABLE IF NOT EXISTS public.sales_entry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_entry_id UUID NOT NULL REFERENCES public.sales_entries(id) ON DELETE CASCADE,
    event_type public.sales_entry_event_type NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_events_entry ON public.sales_entry_events(sales_entry_id);

ALTER TABLE public.sales_entry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View events" ON public.sales_entry_events;
CREATE POLICY "View events" ON public.sales_entry_events
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales_entries WHERE id = sales_entry_events.sales_entry_id AND staff_id = public.get_user_staff_id())
    OR public.is_manager_or_owner()
);

-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month TEXT NOT NULL, -- YYYY-MM
    status public.payroll_run_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(month)
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage payroll" ON public.payroll_runs;
CREATE POLICY "Managers manage payroll" ON public.payroll_runs
FOR ALL USING (public.is_manager_or_owner());

-- Create payroll_items table
CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id),
    amount INTEGER NOT NULL DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage payroll items" ON public.payroll_items;
CREATE POLICY "Managers manage payroll items" ON public.payroll_items
FOR ALL USING (public.is_manager_or_owner());

DROP POLICY IF EXISTS "Staff view own payroll items" ON public.payroll_items;
CREATE POLICY "Staff view own payroll items" ON public.payroll_items
FOR SELECT USING (staff_id = public.get_user_staff_id());
