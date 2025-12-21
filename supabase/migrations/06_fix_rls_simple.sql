
-- Drop the function first to ensure clean state
DROP FUNCTION IF EXISTS public.get_user_staff_id();

-- Re-create function with simpler logic and explicit casting if needed, 
-- but most importantly, we need to make sure RLS sees this function.
CREATE OR REPLACE FUNCTION public.get_user_staff_id()
RETURNS UUID AS $$
    SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Re-apply RLS policies for sales_entries with a more permissive approach for testing
DROP POLICY IF EXISTS "Staff view own entries" ON public.sales_entries;
CREATE POLICY "Staff view own entries" ON public.sales_entries
FOR SELECT USING (
    (staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1)) 
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner')))
);

DROP POLICY IF EXISTS "Staff insert own entries" ON public.sales_entries;
CREATE POLICY "Staff insert own entries" ON public.sales_entries
FOR INSERT WITH CHECK (
    staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Staff update own entries" ON public.sales_entries;
CREATE POLICY "Staff update own entries" ON public.sales_entries
FOR UPDATE USING (
    (staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1) 
     AND status NOT IN ('approved', 'paid_locked'))
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner')))
);
