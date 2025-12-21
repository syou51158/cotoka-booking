-- Fix type mismatch in get_user_staff_id function
-- user_id is UUID, but the function was casting auth.uid() to text
-- This caused "operator does not exist: uuid = text" error in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_staff_id()
RETURNS UUID AS $$
DECLARE
  sid UUID;
BEGIN
  -- Remove ::text cast to compare UUID with UUID correctly
  SELECT id INTO sid FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
  RETURN sid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
