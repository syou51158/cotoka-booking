
-- Drop policies that depend on the function first
DROP POLICY IF EXISTS "View events" ON public.sales_entry_events;
DROP POLICY IF EXISTS "Staff view own payroll items" ON public.payroll_items;
DROP POLICY IF EXISTS "Staff view own entries" ON public.sales_entries;
DROP POLICY IF EXISTS "Staff insert own entries" ON public.sales_entries;
DROP POLICY IF EXISTS "Staff update own entries" ON public.sales_entries;

-- Now we can drop and recreate the function
DROP FUNCTION IF EXISTS public.get_user_staff_id();

CREATE OR REPLACE FUNCTION public.get_user_staff_id()
RETURNS UUID AS $$
    SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Re-apply policies using direct subqueries for robustness where possible, or the new function

-- Sales Entries Policies
CREATE POLICY "Staff view own entries" ON public.sales_entries
FOR SELECT USING (
    (staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1)) 
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner')))
);

CREATE POLICY "Staff insert own entries" ON public.sales_entries
FOR INSERT WITH CHECK (
    staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Staff update own entries" ON public.sales_entries
FOR UPDATE USING (
    (staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1) 
     AND status NOT IN ('approved', 'paid_locked'))
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner')))
);

-- Re-apply other dropped policies
CREATE POLICY "View events" ON public.sales_entry_events
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales_entries WHERE id = sales_entry_events.sales_entry_id AND staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1))
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'owner')))
);

CREATE POLICY "Staff view own payroll items" ON public.payroll_items
FOR SELECT USING (staff_id = (SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1));
