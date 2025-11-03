-- Create stock_opname table for stock adjustments
CREATE TABLE public.stock_opname (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  variant TEXT,
  qty_before INTEGER NOT NULL,
  qty_after INTEGER NOT NULL,
  qty_difference INTEGER NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_opname
CREATE POLICY "Superadmins can view all stock_opname"
ON public.stock_opname
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own stock_opname"
ON public.stock_opname
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock_opname"
ON public.stock_opname
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_stock_opname_product_id ON public.stock_opname(product_id);
CREATE INDEX idx_stock_opname_created_at ON public.stock_opname(created_at DESC);