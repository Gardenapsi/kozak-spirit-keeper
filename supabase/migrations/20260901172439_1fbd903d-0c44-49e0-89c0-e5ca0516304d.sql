CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
CREATE TYPE public.product_category AS ENUM ('cachaca', 'licor', 'vodka', 'edicao_limitada');
CREATE TYPE public.product_status AS ENUM ('ativo', 'em_breve', 'descontinuado');
CREATE TYPE public.supply_type AS ENUM ('garrafa', 'tampa', 'rotulo', 'copo', 'caixa_madeira', 'outro');
CREATE TYPE public.movement_kind AS ENUM ('entrada', 'saida', 'ajuste');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.product_category NOT NULL DEFAULT 'cachaca',
  volume_ml INTEGER NOT NULL DEFAULT 750,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  status public.product_status NOT NULL DEFAULT 'ativo',
  launch_date DATE,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.supply_type NOT NULL DEFAULT 'outro',
  unit TEXT NOT NULL DEFAULT 'un',
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplies TO authenticated;
GRANT ALL ON public.supplies TO service_role;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage supplies" ON public.supplies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER supplies_updated_at BEFORE UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  supply_id UUID REFERENCES public.supplies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  kind public.movement_kind NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.movements TO authenticated;
GRANT ALL ON public.movements TO service_role;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read movements" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert movements" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE INDEX movements_created_at_idx ON public.movements (created_at DESC);

INSERT INTO public.products (name, category, volume_ml, is_premium, status, launch_date, stock_qty, min_stock) VALUES
('Amburana', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Canela', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Cataia', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Banana', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Esperciarias', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Carvalho', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Jambu', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('Prata', 'cachaca', 750, false, 'ativo', NULL, 0, 6),
('7 Madeiras Premium', 'cachaca', 750, true, 'ativo', NULL, 0, 4),
('Amendoim Premium', 'cachaca', 750, true, 'ativo', NULL, 0, 4),
('Bálsamo Premium', 'cachaca', 750, true, 'ativo', NULL, 0, 4),
('Licor Cítrico', 'licor', 500, false, 'ativo', NULL, 0, 4),
('Licor Pimenta', 'licor', 500, false, 'ativo', NULL, 0, 4),
('Licor Jambu com Pimenta', 'licor', 500, false, 'ativo', NULL, 0, 4),
('Licor Menta', 'licor', 500, false, 'ativo', NULL, 0, 4),
('Limited Edition Blue', 'edicao_limitada', 500, true, 'ativo', NULL, 0, 4),
('Amburana', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Canela', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Cataia', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Banana', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Especiarias', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Carvalho', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('Jambu', 'cachaca', 275, false, 'ativo', NULL, 0, 12),
('VODKA Mel com Pimenta', 'vodka', 750, false, 'em_breve', '2026-11-01', 0, 6);

INSERT INTO public.supplies (name, type, unit, stock_qty, min_stock) VALUES
('Garrafa 750ml', 'garrafa', 'un', 0, 100),
('Garrafa 500ml', 'garrafa', 'un', 0, 100),
('Garrafa 275ml', 'garrafa', 'un', 0, 100),
('Tampa metálica', 'tampa', 'un', 0, 200),
('Tampa de cortiça', 'tampa', 'un', 0, 200),
('Rótulo frontal', 'rotulo', 'un', 0, 200),
('Rótulo traseiro', 'rotulo', 'un', 0, 200),
('Copo de vidro personalizado', 'copo', 'un', 0, 50),
('Caixa de madeira para kit', 'caixa_madeira', 'un', 0, 20);