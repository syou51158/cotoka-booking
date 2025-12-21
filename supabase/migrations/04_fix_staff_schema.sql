
-- Ensure app_role enum exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'contractor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to staff table if they don't exist
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'employee';
