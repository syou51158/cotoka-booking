-- Re-create get_user_staff_id function to properly handle UUID comparison
CREATE OR REPLACE FUNCTION public.get_user_staff_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  -- Cast auth.uid() to text if user_id is text, or keep as uuid if user_id is uuid.
  -- Based on 04_fix_staff_schema.sql, user_id is UUID.
  SELECT id INTO sid FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply RLS policies for sales_entries to ensure they use the correct function
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

-- Ensure RLS is enabled
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;
