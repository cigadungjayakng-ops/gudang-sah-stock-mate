-- Add nama_pembeli and alamat columns to stock_out table
ALTER TABLE public.stock_out 
ADD COLUMN nama_pembeli text,
ADD COLUMN alamat text;