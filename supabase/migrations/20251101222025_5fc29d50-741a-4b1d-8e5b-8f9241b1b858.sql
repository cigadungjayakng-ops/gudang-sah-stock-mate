-- Create materialized view for product stock summary
CREATE MATERIALIZED VIEW IF NOT EXISTS product_stock_summary AS
WITH stock_in_agg AS (
  SELECT 
    product_id,
    variant,
    SUM(qty) as total_in
  FROM stock_in
  GROUP BY product_id, variant
),
stock_out_agg AS (
  SELECT 
    product_id,
    variant,
    SUM(qty) as total_out
  FROM stock_out
  GROUP BY product_id, variant
)
SELECT 
  COALESCE(si.product_id, so.product_id) as product_id,
  COALESCE(si.variant, so.variant) as variant,
  COALESCE(si.total_in, 0) as total_in,
  COALESCE(so.total_out, 0) as total_out,
  COALESCE(si.total_in, 0) - COALESCE(so.total_out, 0) as current_stock
FROM stock_in_agg si
FULL OUTER JOIN stock_out_agg so 
  ON si.product_id = so.product_id 
  AND (si.variant IS NOT DISTINCT FROM so.variant);

-- Create unique index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_stock_summary_product_variant 
ON product_stock_summary(product_id, variant);

-- Create index for null variants
CREATE INDEX IF NOT EXISTS idx_product_stock_summary_null_variant 
ON product_stock_summary(product_id) WHERE variant IS NULL;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_product_stock_summary()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_stock_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-refresh on stock changes
DROP TRIGGER IF EXISTS refresh_stock_on_stock_in ON stock_in;
CREATE TRIGGER refresh_stock_on_stock_in
AFTER INSERT OR UPDATE OR DELETE ON stock_in
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_product_stock_summary();

DROP TRIGGER IF EXISTS refresh_stock_on_stock_out ON stock_out;
CREATE TRIGGER refresh_stock_on_stock_out
AFTER INSERT OR UPDATE OR DELETE ON stock_out
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_product_stock_summary();

-- Grant select permission on materialized view
GRANT SELECT ON product_stock_summary TO authenticated;

-- Add RLS to materialized view (views inherit table policies, but we need explicit for materialized views)
ALTER MATERIALIZED VIEW product_stock_summary OWNER TO postgres;