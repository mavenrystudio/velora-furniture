-- Run this migration in the Supabase SQL Editor for an existing VELORA project.

create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 20 and 1200),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','published','hidden')),
  created_at timestamptz not null default now()
);

alter table public.customer_reviews enable row level security;
revoke all on table public.customer_reviews from anon, authenticated;
grant select, insert on table public.customer_reviews to authenticated;
grant all on table public.customer_reviews to service_role;

drop policy if exists "Customers submit their own reviews" on public.customer_reviews;
drop policy if exists "Customers see their own reviews" on public.customer_reviews;
create policy "Customers submit their own reviews" on public.customer_reviews
  for insert to authenticated
  with check (auth.uid() = user_id and moderation_status = 'pending');
create policy "Customers see their own reviews" on public.customer_reviews
  for select to authenticated
  using (auth.uid() = user_id);

insert into public.products (id, slug, name, category, price, description, image, image_alt, color, badge, featured)
values
('17','taper-table-light','Taper Table Light','Lighting',248,'A slender turned stem and a gently weighted shade bring a pool of warmth to a bedside or reading chair.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1100&q=85','Warm sculptural table lamp in a considered interior','Burnished bronze / linen','New arrival',true),
('18','form-carafe','Form No. 04 Carafe','Objects',84,'A hand-thrown stoneware carafe with a soft, generous lip. Made for water at the table and flowers the morning after.','https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1100&q=85','Hand-finished ceramic vessel with natural glaze','Chalk / satin glaze','Small batch',false),
('19','perch-writing-desk','Perch Writing Desk','Furniture',720,'A pared-back writing surface in solid white oak, with a single quiet drawer for the things worth keeping close.','https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1100&q=85','Quiet oak workspace with a considered writing desk','Natural white oak','Made to order',false),
('20','index-desk-caddy','Index Desk Caddy','Workspace',68,'A small study in order. Ash compartments keep pens, notes, and everyday essentials within easy reach.','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1100&q=85','Warm wood catchall tray arranged with daily objects','Oiled ash / natural',null,true),
('21','luma-ceramic-light','Luma Ceramic Light','Lighting',285,'A softly rounded ceramic base meets a pleated shade, casting a low, generous light for slower evenings.','https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1100&q=85','Elegant warm wall and table lighting in a modern home','Moss glaze / natural linen',null,false),
('22','orbit-wall-mirror','Orbit Wall Mirror','Objects',310,'A fine smoked-oak frame gives this clear, uncomplicated mirror a little presence without taking over the room.','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1100&q=85','Quiet contemporary interior with warm wood details','Smoked oak / clear glass','Studio exclusive',false),
('23','stillroom-wool-rug','Stillroom Wool Rug','Textiles',480,'Undyed wool, hand-knotted in a small run. A grounding layer with a quietly varied texture underfoot.','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85','Soft neutral textiles and natural materials in a calm living room','Undyed / natural wool','Limited run',false),
('24','peregrine-valet-tray','Peregrine Valet Tray','Workspace',96,'A softly curved landing place for a watch, keys, or the small things that travel with you from room to room.','https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1100&q=85','Sculptural home objects styled on a softly lit shelf','Travertine / honed','New arrival',false)
on conflict (id) do update set
  slug=excluded.slug, name=excluded.name, category=excluded.category, price=excluded.price,
  description=excluded.description, image=excluded.image, image_alt=excluded.image_alt,
  color=excluded.color, badge=excluded.badge, featured=excluded.featured, active=true;
