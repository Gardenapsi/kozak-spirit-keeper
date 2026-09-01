CREATE TYPE public.event_status AS ENUM ('planejado', 'ativo', 'finalizado');

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  starts_on date,
  ends_on date,
  status public.event_status NOT NULL DEFAULT 'planejado',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.event_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  allocated_qty integer NOT NULL DEFAULT 0,
  sold_qty integer NOT NULL DEFAULT 0,
  returned_qty integer NOT NULL DEFAULT 0,
  unit_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, product_id)
);
CREATE INDEX event_items_event_idx ON public.event_items(event_id);
CREATE INDEX event_items_product_idx ON public.event_items(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_items TO authenticated;
GRANT ALL ON public.event_items TO service_role;
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage event_items" ON public.event_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  event_name text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_event_idx ON public.sales(event_id);
CREATE INDEX sales_product_idx ON public.sales(product_id);
CREATE INDEX sales_created_at_idx ON public.sales(created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER event_items_updated_at BEFORE UPDATE ON public.event_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();