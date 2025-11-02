-- Add mandor field to stock_in table
ALTER TABLE public.stock_in 
ADD COLUMN mandor text;

-- Add mandor field to stock_out table
ALTER TABLE public.stock_out 
ADD COLUMN mandor text;