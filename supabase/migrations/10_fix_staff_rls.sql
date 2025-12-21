
-- Enable RLS on staff table to be sure
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Add a specific policy for users to read their own staff record
-- This is critical for the subquery in sales_entries policy to work
DROP POLICY IF EXISTS "Users can read own staff record" ON public.staff;
CREATE POLICY "Users can read own staff record" ON public.staff
FOR SELECT USING (
    user_id = auth.uid()
);

-- Ensure admins/managers can do everything on staff
DROP POLICY IF EXISTS "Admins and Managers manage staff" ON public.staff;
CREATE POLICY "Admins and Managers manage staff" ON public.staff
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner'))
);

-- Ensure we have a public read policy for active staff if needed (e.g. for booking)
-- But the previous one "Public can read active staff" might still be there.
-- Let's reinforce it just in case.
DROP POLICY IF EXISTS "Public read active staff" ON public.staff;
CREATE POLICY "Public read active staff" ON public.staff
FOR SELECT USING (
    active = true
);

-- Now re-verify sales_entries policies. 
-- They rely on `staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())`
-- With the "Users can read own staff record" policy, this subquery should now return the ID.

-- Also grant usage on sequences if any (UUIDs don't use sequences but just in case)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
