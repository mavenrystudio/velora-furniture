create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  slug text unique not null,
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price > 0),
  description text not null,
  image text not null,
  image_alt text not null,
  color text not null,
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique,
  email text,
  amount_total integer not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

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

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.customer_reviews enable row level security;
revoke all on table public.customer_reviews from anon, authenticated;
grant select, insert on table public.customer_reviews to authenticated;
grant all on table public.customer_reviews to service_role;
create policy "Active products are public" on public.products for select using (active = true);
create policy "Customers see their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Customers submit their own reviews" on public.customer_reviews for insert with check (auth.uid() = user_id and moderation_status = 'pending');
create policy "Customers see their own reviews" on public.customer_reviews for select using (auth.uid() = user_id);

insert into public.products (id, slug, name, category, price, description, image, image_alt, color, badge, featured)
values
('01','arc-table-light','Arc Table Light','Lighting',189,'A quiet study in contrast. Softly diffused light meets a sculptural, powder-coated steel base.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1100&q=85','Sculptural warm table lamp glowing on a bedside table','Chalk / brushed brass','Bestseller',true),
('02','form-vessel','Form No. 02 Vessel','Objects',74,'Hand-finished stoneware with a generous silhouette, made to hold branches or stand beautifully alone.','https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1100&q=85','Handmade ceramic vessel in a calm, sunlit interior','Oat / natural glaze',null,true),
('03','stillwater-throw','Stillwater Throw','Textiles',148,'A soft, substantial layer in brushed recycled cotton. Woven slowly in a family-run Portuguese mill.','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85','Textured neutral throw draped over a lounge chair','Undyed / moss stitch','Small batch',true),
('04','column-side-table','Column Side Table','Furniture',320,'A compact companion with a monolithic form. Cast in solid oak and finished by hand with natural oil.','https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1100&q=85','Minimal oak side table styled with a book and ceramic object','Smoked oak',null,true),
('05','daily-tray','Daily Catchall','Objects',52,'A tactile landing place for the things you reach for every day. Turned from responsibly sourced ash.','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1100&q=85','Minimal wooden tray with personal objects on a console','Natural ash',null,false),
('06','line-wall-sconce','Line Wall Sconce','Lighting',215,'Architectural light with a warm heart. A slim brass arm directs a generous pool of evening light.','https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1100&q=85','Warm contemporary wall light illuminating a neutral wall','Burnished brass',null,false),
('07','gather-serving-set','Gather Serving Set','Objects',96,'Two hand-thrown bowls for everyday rituals, finished in a satin glaze that reveals the clay beneath.','https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1100&q=85','Handmade ceramic bowls arranged on a dining table','Warm white / set of 2',null,false),
('08','soft-edge-cushion','Soft Edge Cushion','Textiles',88,'A little softness, made to last. Linen and wool with a feather-free recycled fill.','https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1100&q=85','Linen cushion in a quiet, sunlit living room','Clay / 50 × 50 cm',null,false),
('09','atelier-pendant','Atelier Pendant No. 01','Lighting',395,'A softly spun shade with a beautifully balanced profile. Made to cast an intimate pool of light over long dinners.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1100&q=85','Sculptural pendant light over a warm dining space','Aged bronze / parchment','Studio exclusive',false),
('10','monolith-bookend','Monolith Bookends','Objects',112,'A pair of weighty, hand-shaped stone forms that lend a little architecture to a well-loved shelf.','https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1100&q=85','Sculptural stone bookends and carefully arranged books','Travertine / pair','Limited run',false),
('11','folded-linen-runner','Folded Linen Runner','Textiles',126,'European flax linen with a softly rumpled hand, finished with a fine hem for everyday gathering.','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85','Natural linen layered across a quiet dining table','Natural / 45 × 180 cm',null,false),
('12','solstice-candleholders','Solstice Candleholders','Objects',138,'Turned in small numbers from solid oak, these two low forms bring candlelight closer to the table.','https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1100&q=85','Pair of sculptural candleholders in evening light','Smoked oak / set of 2',null,false),
('13','haven-lounge-stool','Haven Low Stool','Furniture',540,'A quiet anchor for an open corner. Solid ash, softened edges, and a seat woven by hand in Copenhagen.','https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1100&q=85','Minimal wood stool in a warm architectural interior','Natural ash / woven flax','Made to order',false),
('14','arc-portable-light','Arc Portable Light','Lighting',168,'The familiar warmth of our Arc light, made cordless for slower evenings inside or out.','https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1100&q=85','Portable sculptural lamp glowing in a calm interior','Olive / warm white','New',false),
('15','still-life-vase','Still Life Vase','Objects',94,'A compact, tactile vessel with an opening shaped for a single stem or a small gathering of branches.','https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1100&q=85','Handmade ceramic vase with an organic silhouette','Chalk / satin glaze',null,false),
('16','hearth-wool-cushion','Hearth Wool Cushion','Textiles',156,'A generous cushion in undyed merino wool, woven in a small Scottish mill and filled for a softer landing.','https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1100&q=85','Soft wool cushion styled in a restful neutral room','Oat / 55 × 55 cm','Small batch',false),
('17','taper-table-light','Taper Table Light','Lighting',248,'A slender turned stem and a gently weighted shade bring a pool of warmth to a bedside or reading chair.','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1100&q=85','Warm sculptural table lamp in a considered interior','Burnished bronze / linen','New arrival',true),
('18','form-carafe','Form No. 04 Carafe','Objects',84,'A hand-thrown stoneware carafe with a soft, generous lip. Made for water at the table and flowers the morning after.','https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1100&q=85','Hand-finished ceramic vessel with natural glaze','Chalk / satin glaze','Small batch',false),
('19','perch-writing-desk','Perch Writing Desk','Furniture',720,'A pared-back writing surface in solid white oak, with a single quiet drawer for the things worth keeping close.','https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1100&q=85','Quiet oak workspace with a considered writing desk','Natural white oak','Made to order',false),
('20','index-desk-caddy','Index Desk Caddy','Workspace',68,'A small study in order. Ash compartments keep pens, notes, and everyday essentials within easy reach.','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1100&q=85','Warm wood catchall tray arranged with daily objects','Oiled ash / natural',null,true),
('21','luma-ceramic-light','Luma Ceramic Light','Lighting',285,'A softly rounded ceramic base meets a pleated shade, casting a low, generous light for slower evenings.','https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1100&q=85','Elegant warm wall and table lighting in a modern home','Moss glaze / natural linen',null,false),
('22','orbit-wall-mirror','Orbit Wall Mirror','Objects',310,'A fine smoked-oak frame gives this clear, uncomplicated mirror a little presence without taking over the room.','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1100&q=85','Quiet contemporary interior with warm wood details','Smoked oak / clear glass','Studio exclusive',false),
('23','stillroom-wool-rug','Stillroom Wool Rug','Textiles',480,'Undyed wool, hand-knotted in a small run. A grounding layer with a quietly varied texture underfoot.','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85','Soft neutral textiles and natural materials in a calm living room','Undyed / natural wool','Limited run',false),
('24','peregrine-valet-tray','Peregrine Valet Tray','Workspace',96,'A softly curved landing place for a watch, keys, or the small things that travel with you from room to room.','https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1100&q=85','Sculptural home objects styled on a softly lit shelf','Travertine / honed','New arrival',false)
on conflict (id) do update set slug=excluded.slug, name=excluded.name, category=excluded.category, price=excluded.price, description=excluded.description, image=excluded.image, image_alt=excluded.image_alt, color=excluded.color, badge=excluded.badge, featured=excluded.featured, active=true;
