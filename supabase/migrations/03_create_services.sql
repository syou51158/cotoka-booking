
-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read services" ON public.services;
    CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins manage services" ON public.services;
    CREATE POLICY "Admins manage services" ON public.services FOR ALL USING (public.is_manager_or_owner());
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
