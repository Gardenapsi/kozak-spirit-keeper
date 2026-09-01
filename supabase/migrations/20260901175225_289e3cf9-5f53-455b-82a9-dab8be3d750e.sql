ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.supplies ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY category, volume_ml DESC, name) * 10 AS pos
  FROM public.products
)
UPDATE public.products p SET sort_order = o.pos FROM ordered o WHERE o.id = p.id;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY type, name) * 10 AS pos
  FROM public.supplies
)
UPDATE public.supplies s SET sort_order = o.pos FROM ordered o WHERE o.id = s.id;

CREATE TABLE IF NOT EXISTS public.product_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supply_id uuid NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  qty_per_unit numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, supply_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_supplies TO authenticated;
GRANT ALL ON public.product_supplies TO service_role;

ALTER TABLE public.product_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth manage product_supplies" ON public.product_supplies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER product_supplies_updated_at
  BEFORE UPDATE ON public.product_supplies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS product_supplies_product_id_idx ON public.product_supplies(product_id);
CREATE INDEX IF NOT EXISTS product_supplies_supply_id_idx ON public.product_supplies(supply_id);

ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_product_id_fkey;
ALTER TABLE public.movements ADD CONSTRAINT movements_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_supply_id_fkey;
ALTER TABLE public.movements ADD CONSTRAINT movements_supply_id_fkey
  FOREIGN KEY (supply_id) REFERENCES public.supplies(id) ON DELETE SET NULL;