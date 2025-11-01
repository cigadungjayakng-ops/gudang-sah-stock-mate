-- Fix security warnings

-- 1. Set search_path for refresh function (fix WARN 0011)
CREATE OR REPLACE FUNCTION refresh_product_stock_summary()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_stock_summary;
  RETURN NULL;
END;
$$;

-- 2. Create RLS policy for materialized view access (fix WARN 0016)
-- First, we need to enable RLS on a function that checks access
CREATE OR REPLACE FUNCTION can_access_product_stock(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM products 
    WHERE id = p_product_id 
    AND (
      user_id = auth.uid() 
      OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  );
$$;

-- Note: Materialized views don't support RLS directly, 
-- so we'll need to filter in application code using the can_access_product_stock function