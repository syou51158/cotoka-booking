
-- Update RLS policies to use the SECURITY DEFINER function
-- This avoids potential issues with circular RLS checks or visibility of the staff table

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

DROP POLICY IF EXISTS "Staff view own entries" ON public.sales_entries;
CREATE POLICY "Staff view own entries" ON public.sales_entries
FOR SELECT USING (
    staff_id = public.get_user_staff_id() OR public.is_manager_or_owner()
);

-- Also fix View events policy just in case
DROP POLICY IF EXISTS "View events" ON public.sales_entry_events;
CREATE POLICY "View events" ON public.sales_entry_events
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales_entries WHERE id = sales_entry_events.sales_entry_id AND staff_id = public.get_user_staff_id())
    OR public.is_manager_or_owner()
);

-- Ensure payroll items policy uses it too
DROP POLICY IF EXISTS "Staff view own payroll items" ON public.payroll_items;
CREATE POLICY "Staff view own payroll items" ON public.payroll_items
FOR SELECT USING (staff_id = public.get_user_staff_id());
