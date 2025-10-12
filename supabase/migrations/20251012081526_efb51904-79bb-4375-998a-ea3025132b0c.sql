-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'user');

-- Create enum for stock movement types
CREATE TYPE public.stock_destination_category AS ENUM ('SAJ_PUSAT', 'CABANG', 'SUPPLIER');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create cabang (branches) table
CREATE TABLE public.cabang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jenis_stok_masuk (stock-in types) table
CREATE TABLE public.jenis_stok_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jenis_stok_keluar (stock-out types) table
CREATE TABLE public.jenis_stok_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tujuan_category stock_destination_category NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  variants JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_in table
CREATE TABLE public.stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant TEXT,
  jenis_stok_masuk_id UUID REFERENCES public.jenis_stok_masuk(id) NOT NULL,
  cabang_id UUID REFERENCES public.cabang(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  plat_nomor TEXT,
  supir TEXT,
  no_surat_jalan TEXT,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_out table
CREATE TABLE public.stock_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant TEXT,
  tujuan_category stock_destination_category NOT NULL,
  jenis_stok_keluar_id UUID REFERENCES public.jenis_stok_keluar(id) NOT NULL,
  cabang_id UUID REFERENCES public.cabang(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  plat_nomor TEXT,
  supir TEXT,
  no_surat_jalan TEXT,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenis_stok_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jenis_stok_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_out ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for cabang (everyone can read)
CREATE POLICY "Everyone can view cabang"
  ON public.cabang FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage cabang"
  ON public.cabang FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for jenis_stok_masuk
CREATE POLICY "Everyone can view jenis_stok_masuk"
  ON public.jenis_stok_masuk FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage jenis_stok_masuk"
  ON public.jenis_stok_masuk FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for jenis_stok_keluar
CREATE POLICY "Everyone can view jenis_stok_keluar"
  ON public.jenis_stok_keluar FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage jenis_stok_keluar"
  ON public.jenis_stok_keluar FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for products
CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all products"
  ON public.products FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can manage their own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for stock_in
CREATE POLICY "Users can view their own stock_in"
  ON public.stock_in FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all stock_in"
  ON public.stock_in FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert their own stock_in"
  ON public.stock_in FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stock_out
CREATE POLICY "Users can view their own stock_out"
  ON public.stock_out FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all stock_out"
  ON public.stock_out FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can insert their own stock_out"
  ON public.stock_out FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation (creates profile and assigns role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default data
INSERT INTO public.jenis_stok_masuk (name) VALUES
  ('PEMBELANJAAN (SUPPLIER)'),
  ('RETUR KONSUMEN'),
  ('RETUR CABANG');

INSERT INTO public.jenis_stok_keluar (name, tujuan_category) VALUES
  ('Penjualan', 'SAJ_PUSAT'),
  ('Pemakaian', 'SAJ_PUSAT'),
  ('Orderan Cabang', 'CABANG'),
  ('Retur Supplier', 'SUPPLIER');

INSERT INTO public.cabang (name) VALUES
  ('Cabang Jakarta'),
  ('Cabang Bandung'),
  ('Cabang Surabaya');