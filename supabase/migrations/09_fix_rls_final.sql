
-- Drop existing policies on sales_entries to start fresh
DROP POLICY IF EXISTS "Staff insert own entries" ON public.sales_entries;
DROP POLICY IF EXISTS "Staff update own entries" ON public.sales_entries;
DROP POLICY IF EXISTS "Staff view own entries" ON public.sales_entries;

-- Create robust policies using direct subqueries
-- This avoids reliance on the helper function for the core logic

CREATE POLICY "Staff view own entries" ON public.sales_entries
FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner'))
);

CREATE POLICY "Staff insert own entries" ON public.sales_entries
FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
);

CREATE POLICY "Staff update own entries" ON public.sales_entries
FOR UPDATE USING (
    (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()) 
     AND status NOT IN ('approved', 'paid_locked'))
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner'))
);

-- Grant permissions explicitly just in case (though RLS handles it)
GRANT ALL ON public.sales_entries TO authenticated;
GRANT ALL ON public.sales_entries TO service_role;
