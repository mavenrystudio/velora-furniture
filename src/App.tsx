import { useEffect, useMemo, useState, createContext, useContext, useRef } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Menu, Minus, Package, Plus, RotateCw, ShoppingBag, Sparkles, Star, UserRound, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { products as localProducts } from './data/products';
import { supabase } from './lib/supabase';
import type { CartLine, Product } from './types';

type Store = { products: Product[]; cart: CartLine[]; add: (p: Product) => void; change: (id: string, n: number) => void; cartOpen: boolean; setCartOpen: (v: boolean) => void; savedIds: string[]; toggleSaved: (id: string) => void };
const StoreContext = createContext<Store | null>(null);
const useStore = () => { const store = useContext(StoreContext); if (!store) throw new Error('Store context missing'); return store; };
const money = (n: number) => `$${n.toFixed(0)}`;
type AccountOrder = { id: string; stripe_session_id: string | null; amount_total: number; currency: string; status: string; created_at: string };

export default function App() {
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [cart, setCart] = useState<CartLine[]>(() => { try { return JSON.parse(localStorage.getItem('velora-cart') || '[]'); } catch { return []; } });
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const savedKey = `velora-saved-${authUser?.id || 'guest'}`;
  const [savedIds, setSavedIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('velora-saved-guest') || '[]'); } catch { return []; } });
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const location = useLocation();
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setAuthUser(data.session?.user ?? null); setAuthLoading(false); }
    }).catch(() => { if (active) setAuthLoading(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => { try { const stored: string[] = JSON.parse(localStorage.getItem(savedKey) || '[]'); const guest: string[] = authUser ? JSON.parse(localStorage.getItem('velora-saved-guest') || '[]') : []; setSavedIds([...new Set([...stored, ...guest])]); } catch { setSavedIds([]); } }, [savedKey, authUser]);
  useEffect(() => { localStorage.setItem(savedKey, JSON.stringify(savedIds)); }, [savedKey, savedIds]);
  useEffect(() => { fetch('/api/products').then((r) => r.ok ? r.json() : null).then((d) => { if (d?.products?.length) setProducts(d.products); }).catch(() => {}); }, []);
  useEffect(() => { localStorage.setItem('velora-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { window.scrollTo(0, 0); setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { const params = new URLSearchParams(location.search); if (params.get('checkout') === 'cancelled') { setToast('Checkout was canceled. Your bag is still here.'); setCartOpen(true); } else if (params.get('signedout') === '1') setToast('Thank you for being here. You are signed out.'); }, [location.search]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);
  const add = (product: Product) => { setCart((current) => { const found = current.find((line) => line.product.id === product.id); return found ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }]; }); setToast(`${product.name} added to your bag`); };
  const change = (id: string, n: number) => setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: n } : line).filter((line) => line.quantity > 0));
  const toggleSaved = (id: string) => setSavedIds((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]);
  const store: Store = { products, cart, add, change, cartOpen, setCartOpen, savedIds, toggleSaved };
  return <StoreContext.Provider value={store}><MotionConfig reducedMotion="user">
    <div className="announcement">Considered pieces, made to stay. <span>Complimentary shipping over $150</span></div>
    <header className="site-header">
      <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
      <nav className={`nav-left ${mobileOpen ? 'nav-visible' : ''}`} aria-label="Main navigation"><Link to="/shop">Shop</Link><Link to="/about">About</Link><Link to="/studio">The Studio</Link>{authUser && <Link className="member-nav-link" to="/members">The Edit <span>MEMBERS</span></Link>}<Link to="/journal">Journal</Link><Link to="/contact">Contact</Link><Link className="mobile-account-link" to={authUser ? '/account' : '/login'}>{authUser ? 'My profile' : 'Log in'}</Link></nav>
      <Link className="wordmark" to="/" aria-label="VELORA home">VELORA<span>®</span></Link>
      <div className="nav-right"><Link className="icon-button account-button" to={authUser ? '/account' : '/login'} aria-label={authUser ? 'Open your profile' : 'Log in'}><UserRound size={18} /><span>{authUser ? 'My profile' : 'Log in'}</span></Link><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${cart.reduce((s, l) => s + l.quantity, 0)} items`}><span>Bag</span><span className="bag-count">{cart.reduce((s, l) => s + l.quantity, 0)}</span></button></div>
    </header>
    <main><Routes>
      <Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/shop/:category" element={<Shop />} /><Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} /><Route path="/studio" element={<Studio />} /><Route path="/journal" element={<Journal />} /><Route path="/journal/:slug" element={<JournalStory />} />
      <Route path="/product/:slug" element={<ProductPage />} /><Route path="/checkout/success" element={<Success />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/signup" element={<AuthPage mode="signup" />} /><Route path="/account" element={<AccountPage user={authUser} loading={authLoading} />} /><Route path="/members" element={<MembersPage user={authUser} loading={authLoading} />} /><Route path="/review" element={<ReviewPage user={authUser} loading={authLoading} />} /><Route path="*" element={<Home />} />
    </Routes></main>
    <Footer />
    <CartDrawer />
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}><Check size={16} />{toast}<button onClick={() => setCartOpen(true)}>View bag</button></motion.div>}</AnimatePresence>
  </MotionConfig></StoreContext.Provider>;
}

function Home() {
  const { products } = useStore();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">A quieter kind of living · Vol. 01</p><h1>Make room<br />for <em>meaning.</em></h1><p className="hero-description">Objects for the everyday, made with intention and kept for a long time.</p><Link to="/shop" className="button button-dark">Explore the collection <ArrowRight size={16} /></Link><div className="hero-footnote"><span>01 / 04</span><span>Designed to be lived with</span></div></div>
      <div className="hero-image" role="img" aria-label="Sunlit sculptural living room with warm neutral furnishings"><div className="hero-image-note"><span>THE CONSIDERED HOME</span><ArrowUpRight size={16} /></div><div className="image-index">40° 42' 46.3" N&nbsp; / &nbsp;73° 59' 11.8" W</div></div>
      <div className="hero-side-label">OBJECTS WITH A SENSE OF PLACE</div>
    </section>
    <section className="intro-strip"><span className="eyebrow">Less, but considered</span><p>We believe the things we live with should<br className="desktop-only" /> make the everyday feel a little more <em>special.</em></p><a href="#story" aria-label="Read our story"><ArrowDown /></a></section>
    <section className="section collection-section" id="collection"><div className="section-heading"><div><span className="eyebrow">The collection / 2026</span><h2>Made for <em>the in-between.</em></h2></div><Link className="text-link" to="/shop">View all objects <ArrowUpRight size={15} /></Link></div>
      <div className="product-grid">{featured.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}</div>
    </section>
    <section className="room-edit section"><div className="section-heading"><div><span className="eyebrow">A place for everything</span><h2>Find your <em>quiet corner.</em></h2></div><span className="room-note">Three small edits for the spaces you call yours.</span></div><div className="room-grid"><Link to="/shop/Lighting" className="room-card room-light"><span>01 / THE EVENING ROOM</span><strong>Light, <em>softly.</em></strong><b>Discover lighting <ArrowUpRight size={15}/></b></Link><Link to="/shop/Objects" className="room-card room-table"><span>02 / THE GATHERING PLACE</span><strong>Set the <em>table.</em></strong><b>Discover objects <ArrowUpRight size={15}/></b></Link><Link to="/shop/Textiles" className="room-card room-rest"><span>03 / THE SLOW MORNING</span><strong>Stay a <em>little longer.</em></strong><b>Discover textiles <ArrowUpRight size={15}/></b></Link></div></section>
    <section className="story-section" id="story"><div className="story-photo" role="img" aria-label="A warm, tactile interior with natural materials" /><div className="story-copy"><span className="eyebrow">A note on making</span><h2>Good things take<br />their <em>own time.</em></h2><p>We work with a small circle of independent makers who share our belief that how something is made matters just as much as how it looks.</p><Link to="/about" className="text-link">Get to know VELORA <ArrowUpRight size={15} /></Link><span className="story-mark">V.</span></div></section>
    <section className="quote-band"><span className="eyebrow">A slower point of view</span><blockquote>“The beauty of an object lives in the life it joins.”</blockquote><span className="quote-author">— THE VELORA STUDIO</span></section>
    <section className="journal section" id="journal"><div className="section-heading"><div><span className="eyebrow">Notes from the studio</span><h2>Living with <em>intention.</em></h2></div><Link to="/journal" className="text-link">Read the journal <ArrowUpRight size={15}/></Link></div><div className="journal-grid"><JournalCard slug="less-but-better" image="journal-image-one" category="Spaces / 06 min read" title="On keeping a little less, a little better" large/><JournalCard slug="beauty-of-imperfect" image="journal-image-two" category="Makers / 04 min read" title="The beauty of the imperfect"/><JournalCard slug="softer-morning" image="journal-image-three" category="Rituals / 03 min read" title="A softer start to the morning"/></div></section>
    <Newsletter />
  </>;
}

function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add, savedIds, toggleSaved } = useStore();
  return <motion.article className="product-card" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: .45, delay: index * .07 }}>
    <div className="product-image-wrap"><Link to={`/product/${product.slug}`} className="product-image-link" aria-label={`View ${product.name}`}><img src={product.image} alt={product.imageAlt} loading="lazy" />{product.badge && <span className="product-badge">{product.badge}</span>}</Link><button className={`quick-save ${savedIds.includes(product.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(product.id)} aria-label={savedIds.includes(product.id) ? `Remove ${product.name} from saved pieces` : `Save ${product.name}`} aria-pressed={savedIds.includes(product.id)}><Heart size={16} fill={savedIds.includes(product.id) ? 'currentColor' : 'none'} /></button><button className="quick-add" onClick={() => add(product)} aria-label={`Add ${product.name} to bag`}><Plus size={17} /></button></div>
    <div className="product-meta"><div><Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link><span className="product-color">{product.color}</span></div><span className="product-price">{money(Number(product.price))}</span></div>
  </motion.article>;
}

function Shop() {
  const { products } = useStore();
  const { category } = useParams();
  const [filter, setFilter] = useState(category ? decodeURIComponent(category) : 'All objects');
  const [sort, setSort] = useState('Featured');
  useEffect(() => setFilter(category ? decodeURIComponent(category) : 'All objects'), [category]);
  const categories = ['All objects', ...Array.from(new Set(products.map((p) => p.category)))];
  const shown = useMemo(() => { const rows = products.filter((p) => filter === 'All objects' || p.category.toLowerCase() === filter.toLowerCase()); return rows.sort((a, b) => sort === 'Price: low to high' ? a.price - b.price : sort === 'Price: high to low' ? b.price - a.price : 0); }, [products, filter, sort]);
  return <section className="shop-page"><div className="shop-hero"><span className="eyebrow">A considered collection · 01—{products.length.toString().padStart(2, '0')}</span><h1>Objects for<br /><em>everyday living.</em></h1><p>Thoughtful forms, honest materials, and pieces that feel like they were always meant to be yours.</p><div className="shop-hero-count">{products.length.toString().padStart(2, '0')} OBJECTS &nbsp; / &nbsp; SMALL BATCH · ALWAYS</div></div><div className="shop-toolbar"><div className="filters" aria-label="Filter products">{categories.map((c) => <button className={filter === c ? 'filter-active' : ''} key={c} onClick={() => setFilter(c)}>{c}</button>)}</div><label className="sort-select">Sort by <select value={sort} onChange={(e) => setSort(e.target.value)}><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select><ChevronDown size={14} /></label></div><div className="shop-count">Showing {shown.length} considered pieces <span>Complimentary shipping over $150</span></div><div className="product-grid shop-grid">{shown.map((product, i) => <ProductCard key={product.id} product={product} index={i % 4} />)}</div></section>;
}

const journalStories = [
  { slug: 'less-but-better', category: 'Spaces', read: '06 min read', title: 'On keeping a little less, a little better', intro: 'A considered home is not an empty one. It is a place where every object has room to be itself—and room to become part of your story.', image: 'journal-image-one', body: 'We have always been drawn to rooms that feel collected rather than completed. A chair that has moved with you. A vessel found on a trip. Light falling across the same table at the same hour. The things that stay are rarely the things we bought in a hurry.\n\nStart with what you use, what you reach for, and what makes an ordinary moment feel more like your own. Let the rest wait. A little space is an invitation.' },
  { slug: 'beauty-of-imperfect', category: 'Makers', read: '04 min read', title: 'The beauty of the imperfect', intro: 'Small marks, softened edges, a glaze that moves differently in every firing: the traces of a human hand are what make an object feel alive.', image: 'journal-image-two', body: 'At the studio, we look for the evidence of making. A small variation in the glaze. The gentle asymmetry of a turned form. These are not flaws to be corrected; they are the quiet signatures of time, material, and attention.\n\nWe work in short runs with independent makers, leaving room for the character of the material to come through. The result is never exactly the same twice—and that is the point.' },
  { slug: 'softer-morning', category: 'Rituals', read: '03 min read', title: 'A softer start to the morning', intro: 'Before the day gathers speed, make a small ritual of the things already within reach.', image: 'journal-image-three', body: 'Open the curtains. Put the kettle on. Leave your phone in the other room for five minutes. A slower morning does not need a new routine or a perfect setting—just a little attention.\n\nA favourite cup, a linen cloth, the first light on the wall. These are small things, but small things are often where a day begins to feel like yours.' },
];

function JournalCard({ slug, image, category, title, large = false }: { slug: string; image: string; category: string; title: string; large?: boolean }) { return <article className={`journal-card ${large ? 'journal-large' : ''}`}><Link to={`/journal/${slug}`} className="journal-story-link"><div className={`journal-image ${image}`} /><span className="eyebrow">{category}</span><h3>{title}</h3><span className="journal-arrow" aria-hidden="true"><ArrowUpRight /></span></Link></article>; }

function Studio() {
  const { products, add } = useStore();
  const customizable = products.filter((product) => ['Lighting', 'Objects', 'Furniture'].includes(product.category));
  const [selectedId, setSelectedId] = useState('01');
  const [finish, setFinish] = useState('Warm brass');
  const [tone, setTone] = useState('Oat');
  const [size, setSize] = useState('Standard');
  const [engraving, setEngraving] = useState('');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotation, setRotation] = useState({ x: -4, y: 17 });
  const drag = useRef<{ x: number; y: number; rotationX: number; rotationY: number } | null>(null);
  const product = customizable.find((item) => item.id === selectedId) || customizable[0] || products[0];
  const tones = [{ name: 'Oat', color: '#c6b9a5', filter: 'none' }, { name: 'Moss', color: '#78806b', filter: 'sepia(.18) hue-rotate(20deg) saturate(.78)' }, { name: 'Terracotta', color: '#a86750', filter: 'sepia(.27) hue-rotate(332deg) saturate(.9)' }, { name: 'Ink', color: '#4a4b47', filter: 'grayscale(.3) brightness(.8)' }];
  const finishes = ['Warm brass', 'Satin ceramic', 'Smoked oak'];
  const toneStyle = tones.find((item) => item.name === tone) || tones[0];
  const price = Number(product?.price || 0);
  const addCustom = () => {
    if (!product) return;
    const customName = engraving.trim() ? `${product.name} · ${engraving.trim()}` : product.name;
    const variant = `${finish}-${tone}-${size}-${engraving.trim()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    add({ ...product, id: `${product.id}-atelier-${variant}`, checkoutProductId: product.id, name: customName, color: `${tone} / ${finish}${size !== 'Standard' ? ` / ${size}` : ''}${engraving.trim() ? ` / Engraved “${engraving.trim()}”` : ''}` });
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => { drag.current = { x: event.clientX, y: event.clientY, rotationX: rotation.x, rotationY: rotation.y }; event.currentTarget.setPointerCapture(event.pointerId); setAutoRotate(false); };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!drag.current) return; setRotation({ x: Math.max(-22, Math.min(22, drag.current.rotationX - (event.clientY - drag.current.y) * .28)), y: drag.current.rotationY + (event.clientX - drag.current.x) * .42 }); };
  const onPointerUp = () => { drag.current = null; };
  return <section className="studio-page atelier-page">
    <header className="atelier-heading"><div><span className="eyebrow">THE VELORA ATELIER · MADE PERSONAL</span><h1>Make it <em>yours.</em></h1><p>A familiar form, finished in your own way. Adjust the details and watch your piece come to life.</p></div><div className="atelier-edition"><Sparkles size={15}/><span>ONE OF ONE<br/>YOUR DESIGN, YOURS TO KEEP</span></div></header>
    <div className="atelier-workbench">
      <div className="atelier-viewer-column">
        <div className="atelier-viewer" style={{ backgroundColor: tone === 'Moss' ? '#e6e7de' : tone === 'Terracotta' ? '#eee3dc' : tone === 'Ink' ? '#e1e1dd' : '#e9e6dd' }}>
          <div className="viewer-topline"><span>LIVE OBJECT PREVIEW</span><span>01 — 04 &nbsp; / &nbsp; {product?.category?.toUpperCase()}</span></div>
          <div className="atelier-orbit orbit-one"/><div className="atelier-orbit orbit-two"/>
          <div className="atelier-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} role="img" aria-label={`Interactive dimensional preview of ${product?.name || 'your object'} in ${tone} with ${finish}`}>
            <div className={`atelier-object finish-${finish.toLowerCase().replaceAll(' ', '-')} size-${size.toLowerCase()} ${autoRotate ? 'is-spinning' : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
              <div className="object-shadow"/><div className="object-halo" style={{ backgroundColor: toneStyle.color }}/>
              <img src={product?.image} alt="" draggable="false" style={{ filter: toneStyle.filter }}/>
            </div>
            <div className="atelier-plinth"><i/><b/></div>
          </div>
          <div className="viewer-caption"><span><i style={{ backgroundColor: toneStyle.color }}/>{tone} · {finish}</span><button onClick={() => { setRotation((value) => ({ ...value, y: value.y + 90 })); setAutoRotate(false); }} aria-label="Rotate product preview"><RotateCw size={15}/> ROTATE</button></div>
          <p className="drag-hint">DRAG TO EXPLORE &nbsp; · &nbsp; YOUR FINISH UPDATES IN REAL TIME</p>
        </div>
        <div className="atelier-proof"><span>01 / PERSONAL OBJECTS</span><span>HAND FINISHED IN SMALL RUNS</span><span>COMPLIMENTARY GIFT WRAP</span></div>
      </div>
      <div className="atelier-controls">
        <div className="atelier-product-title"><div><span className="eyebrow">START WITH A FORM</span><h2>{product?.name || 'Choose a piece'}</h2></div><strong>{money(price)}</strong></div>
        <label className="atelier-label" htmlFor="atelier-product">01 <span>CHOOSE YOUR OBJECT</span></label>
        <div className="atelier-select-wrap"><select id="atelier-product" value={product?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>{customizable.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><ChevronDown size={15}/></div>
        <div className="atelier-control-section"><div className="atelier-control-heading"><label className="atelier-label">02 <span>CHOOSE YOUR TONE</span></label><span>{tone}</span></div><div className="tone-options">{tones.map((item) => <button key={item.name} className={`tone-swatch ${tone === item.name ? 'selected' : ''}`} aria-label={item.name} aria-pressed={tone === item.name} onClick={() => setTone(item.name)}><i style={{ backgroundColor: item.color }}/><span>{item.name}</span></button>)}</div></div>
        <div className="atelier-control-section"><div className="atelier-control-heading"><label className="atelier-label">03 <span>SELECT A FINISH</span></label></div><div className="finish-options">{finishes.map((item, index) => <button key={item} className={finish === item ? 'finish-selected' : ''} onClick={() => setFinish(item)} aria-pressed={finish === item}><span className={`finish-sample finish-sample-${index}`}/>{item}{finish === item && <Check size={14}/>}</button>)}</div></div>
        <div className="atelier-control-section"><div className="atelier-control-heading"><label className="atelier-label">04 <span>FIND YOUR SCALE</span></label></div><div className="size-options">{['Small', 'Standard', 'Large'].map((item) => <button key={item} className={size === item ? 'size-selected' : ''} onClick={() => setSize(item)} aria-pressed={size === item}>{item}</button>)}</div></div>
        <label className="atelier-label engraving-label" htmlFor="atelier-engraving">05 <span>ADD A QUIET SIGNATURE</span><small>OPTIONAL · 12 CHARACTERS</small></label><input id="atelier-engraving" className="atelier-engraving" maxLength={12} placeholder="Initials or a small word" value={engraving} onChange={(event) => setEngraving(event.target.value)}/>
        <button className="button button-dark atelier-add" onClick={addCustom}>Add your piece to the bag <ArrowRight size={16}/></button>
        <div className="atelier-footnote"><Check size={14}/><span>Made to order in 2–3 weeks. Your chosen finish and signature travel with your piece.</span></div>
      </div>
    </div>
    <section className="atelier-story"><div><span className="eyebrow">A LITTLE MORE YOU</span><h2>The beauty is<br/>in the <em>details.</em></h2></div><p>Each VELORA piece starts with a thoughtful form. The Atelier lets you leave your own mark: a softer tone, a finish that feels like home, a signature only you know is there.</p><span className="atelier-story-mark">V.</span></section>
    <div className="studio-manifesto"><span className="eyebrow">Our point of view</span><h2>Buy fewer things.<br/><em>Live with them longer.</em></h2><p>We believe good design is generous: honest materials, considered forms, and a price that respects the hands behind the work. Every piece begins with a question—will it still matter in ten years?</p></div><div className="studio-values"><article><span>01</span><h3>Made with care</h3><p>We partner with independent makers and family-run workshops who know their materials by heart.</p></article><article><span>02</span><h3>Materials that age well</h3><p>Natural textures and repairable forms, chosen to gather a little history with every year.</p></article><article><span>03</span><h3>Small, considered runs</h3><p>We make in modest quantities, so nothing is produced without a place and a purpose.</p></article></div><section className="studio-makers"><div className="maker-image" role="img" aria-label="Craftsperson shaping a handmade ceramic vessel"/><div><span className="eyebrow">In good company</span><h2>Made by people,<br/><em>not a production line.</em></h2><p>From a pottery in Stoke-on-Trent to a family weaving mill in Porto, each partnership is built on a shared respect for patience and craft.</p><Link to="/journal/beauty-of-imperfect" className="text-link">Meet our makers <ArrowUpRight size={15}/></Link></div></section><section className="studio-invitation"><span className="eyebrow">A closer look</span><h2>Come in, stay <em>a while.</em></h2><p>Questions about a piece, a material, or how it might live in your home? We would love to help.</p><a className="button button-dark" href="mailto:studio@velora.studio">Write to the studio <ArrowUpRight size={16}/></a></section>
  </section>;
}
function About() { return <section className="about-page"><div className="about-hero"><div className="about-hero-copy"><span className="eyebrow">A story still being made · Since 2018</span><h1>From a small<br/>idea to a <em>way of living.</em></h1><p>VELORA began with a simple thought: the everyday deserves the same care as the extraordinary.</p><a className="about-scroll" href="#journey">OUR JOURNEY <ArrowDown size={14}/></a></div><div className="about-hero-photo" role="img" aria-label="Warm, sunlit home furnished with natural materials"/></div><div className="about-intro"><span className="eyebrow">A note from our founder</span><blockquote>“I wanted to make a few things that felt considered enough to keep, and easy enough to live with.”</blockquote><p>— ELLIS ROWAN, FOUNDER</p></div><div className="about-journey" id="journey"><div className="about-journey-heading"><span className="eyebrow">The VELORA story</span><h2>Four chapters.<br/><em>One steady idea.</em></h2></div><div className="journey-list"><article><span className="journey-year">2018</span><div><h3>The first sketches</h3><p>In a borrowed corner of a Brooklyn apartment, designer Ellis Rowan began drawing objects for the small rituals that make a home feel like yours. VELORA started as a notebook, a worktable, and a belief in doing less—better.</p></div></article><article><span className="journey-year">2020</span><div><h3>Finding our people</h3><p>A search for the right hands led to a family-run ceramics workshop in Stoke-on-Trent and a weaving mill in Porto. The first pieces were made slowly, in small numbers, with the makers in the room.</p></div></article><article><span className="journey-year">2022</span><div><h3>A collection takes shape</h3><p>Lighting, textiles, and everyday objects joined the original vessel. Each new form carried the same question: would it earn its place for years to come?</p></div></article><article><span className="journey-year">TODAY</span><div><h3>A studio with an open door</h3><p>VELORA remains an independent design house. We work with a close circle of makers, release considered collections, and keep listening to the homes our objects become part of.</p></div></article></div></div><div className="about-image-band" role="img" aria-label="Tactile materials and handmade objects in the VELORA studio"><span>MADE WITH INTENTION · KEPT IN GOOD COMPANY</span></div><div className="about-end"><span className="eyebrow">The next chapter is yours</span><h2>Make room for <em>meaning.</em></h2><Link to="/shop" className="button button-dark">Explore VELORA <ArrowRight size={16}/></Link></div></section>; }

function Contact() { const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [topic, setTopic] = useState('A piece in the collection'); const [message, setMessage] = useState(''); const [draftUrl, setDraftUrl] = useState(''); const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const subject = `VELORA enquiry · ${topic}`; const body = `Hello VELORA,\n\n${message}\n\nName: ${name}\nEmail: ${email}`; setDraftUrl(`mailto:studio@velora.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`); }; return <section className="contact-page"><div className="contact-hero"><span className="eyebrow">A real person, a thoughtful reply</span><h1>Let’s start<br/><em>a conversation.</em></h1><p>Whether you have a question about a piece or simply want a little advice, our studio is here.</p><div className="contact-hero-caption">VELORA STUDIO &nbsp; / &nbsp; NEW YORK · EVERYWHERE</div></div><div className="contact-layout"><aside className="contact-aside"><div><span className="eyebrow">WRITE TO US</span><a href="mailto:studio@velora.studio">studio@velora.studio <ArrowUpRight size={14}/></a></div><div><span className="eyebrow">STUDIO HOURS</span><p>Monday—Friday<br/>10 am—5 pm ET</p><small>We usually reply within two working days.</small></div><div><span className="eyebrow">FOR PRESS & PARTNERSHIPS</span><a href="mailto:studio@velora.studio?subject=Press%20and%20partnerships">Tell us what you have in mind <ArrowUpRight size={14}/></a></div><div className="contact-aside-note">Good conversations start with a little curiosity.</div></aside><div className="contact-form-wrap"><span className="eyebrow">SEND A NOTE</span><h2>How can we <em>help?</em></h2><p className="contact-form-intro">Share a few details and we’ll prepare a note to the studio in your email app.</p><form className="contact-form" onSubmit={submit}><div className="contact-form-row"><label>Your name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name"/></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label></div><label>What’s on your mind?<select value={topic} onChange={(event) => setTopic(event.target.value)}><option>A piece in the collection</option><option>An existing order</option><option>Press or partnership</option><option>Something else</option></select></label><label>Your note<textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us a little more…"/></label><button className="button button-dark" type="submit">Prepare email <ArrowRight size={16}/></button></form>{draftUrl && <p className="contact-draft" role="status">Your note is ready. <a href={draftUrl}>Open your email draft <ArrowUpRight size={13}/></a></p>}</div></div><div className="contact-bottom"><span>WE’RE HERE FOR THE DETAILS</span><span>Materials · care · delivery · choosing the right piece</span><Link to="/shop">Explore the collection <ArrowUpRight size={14}/></Link></div></section>; }

function Journal() { return <section className="journal-page"><div className="journal-page-hero"><span className="eyebrow">The VELORA journal · Issue 01</span><h1>Notes on a life<br/><em>well considered.</em></h1><p>Small observations on spaces, makers, and the rituals that make a day your own.</p></div><div className="journal-page-grid">{journalStories.map((story, index) => <JournalCard key={story.slug} slug={story.slug} image={story.image} category={`${story.category} / ${story.read}`} title={story.title} large={index === 0}/>)}</div><div className="journal-signoff"><span className="eyebrow">A letter, now and then</span><p>Good things take their own time. We’ll write when there’s something worth sharing.</p><Link to="/#journal" className="text-link">Stay close <ArrowUpRight size={15}/></Link></div></section>; }

function JournalStory() { const { slug } = useParams(); const story = journalStories.find((item) => item.slug === slug); if (!story) return <section className="not-found"><span className="eyebrow">A little detour</span><h1>This note has wandered.</h1><Link className="button button-dark" to="/journal">Back to the journal <ArrowRight size={16}/></Link></section>; return <article className="journal-article"><Link to="/journal" className="back-link"><ArrowLeft size={15}/> All journal notes</Link><header><span className="eyebrow">{story.category} · {story.read} · VELORA STUDIO</span><h1>{story.title}</h1><p>{story.intro}</p></header><div className={`journal-article-image ${story.image}`}/><div className="journal-article-body">{story.body.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<Link to="/shop" className="button button-dark">Explore the collection <ArrowRight size={16}/></Link></div></article>; }

function ProductPage() {
  const { slug } = useParams(); const { products, add, savedIds, toggleSaved } = useStore(); const product = products.find((p) => p.slug === slug); const [added, setAdded] = useState(false);
  if (!product) return <section className="not-found"><span className="eyebrow">A little detour</span><h1>We can’t find that piece.</h1><Link className="button button-dark" to="/shop">Back to the collection <ArrowRight size={16} /></Link></section>;
  const isSaved = savedIds.includes(product.id);
  return <section className="detail-page"><Link to="/shop" className="back-link"><ArrowLeft size={15} /> Back to the collection</Link><div className="detail-grid"><div className="detail-image"><img src={product.image} alt={product.imageAlt} /></div><div className="detail-info"><span className="eyebrow">VELORA / {product.category.toUpperCase()}</span><h1>{product.name}</h1><p className="detail-price">{money(Number(product.price))}</p><p className="detail-description">{product.description}</p><div className="detail-color"><span>FINISH</span>{product.color}</div><button className="button button-dark add-bag" onClick={() => { add(product); setAdded(true); }}>{added ? 'Added to your bag' : 'Add to bag'} <span>{money(Number(product.price))}</span></button><button className={`save-detail-button ${isSaved ? 'is-saved' : ''}`} onClick={() => toggleSaved(product.id)} aria-pressed={isSaved}><Heart size={16} fill={isSaved ? 'currentColor' : 'none'}/>{isSaved ? 'Saved to your personal edit' : 'Save to your personal edit'}</button><div className="product-promise"><p><Check size={14} /> Complimentary shipping over $150</p><p><Check size={14} /> Thoughtfully packed in recycled materials</p><p><Check size={14} /> 30-day returns, always</p></div><details><summary>Materials & making <Plus size={15} /></summary><p>Made in small batches with traceable materials and finished by hand. Subtle variations are part of the character of every piece.</p></details><details><summary>Shipping & returns <Plus size={15} /></summary><p>Ships within 2–4 business days. If it isn't quite right, return it within 30 days in its original condition.</p></details></div></div></section>;
}

function CartDrawer() {
  const { cart, change, cartOpen, setCartOpen } = useStore(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const total = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  useEffect(() => { document.body.classList.toggle('overlay-open', cartOpen); return () => document.body.classList.remove('overlay-open'); }, [cartOpen]);
  const checkout = async () => { setBusy(true); setError(''); try { let token: string | undefined; let email: string | undefined; if (supabase) { const { data } = await supabase.auth.getSession(); token = data.session?.access_token; email = data.session?.user.email; } const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers.Authorization = `Bearer ${token}`; const response = await fetch('/api/checkout/session', { method: 'POST', headers, body: JSON.stringify({ email, items: cart.map((line) => ({ id: line.product.checkoutProductId || line.product.id, quantity: line.quantity })) }) }); const data = await response.json().catch(() => null) as { error?: string; url?: string } | null; if (!response.ok) throw new Error(data?.error || 'Checkout is temporarily unavailable. Please try again shortly.'); if (!data?.url) throw new Error('We could not open secure checkout. Please try again shortly.'); window.location.href = data.url; } catch (e) { setError(e instanceof Error ? e.message : 'Checkout is temporarily unavailable. Please try again shortly.'); } finally { setBusy(false); } };
  return <AnimatePresence>{cartOpen && <><motion.button className="drawer-scrim" aria-label="Close bag" onClick={() => setCartOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 270 }}><div className="drawer-header"><div><span className="eyebrow">YOUR EDIT</span><h2>Shopping bag <span>({cart.reduce((s, l) => s + l.quantity, 0)})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><X /></button></div>{cart.length ? <><div className="cart-lines">{cart.map(({ product, quantity }) => <div className="cart-line" key={product.id}><Link to={`/product/${product.slug}`} onClick={() => setCartOpen(false)}><img src={product.image} alt={product.imageAlt} /></Link><div className="cart-line-info"><Link to={`/product/${product.slug}`} onClick={() => setCartOpen(false)}>{product.name}</Link><span>{product.color}</span><div className="quantity"><button onClick={() => change(product.id, quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => change(product.id, quantity + 1)} aria-label="Increase quantity"><Plus size={13} /></button></div></div><span className="cart-line-price">{money(Number(product.price) * quantity)}</span></div>)}</div><div className="cart-summary"><p className="shipping-note">{total >= 150 ? 'Your order ships on us.' : `You’re ${money(150 - total)} away from complimentary shipping.`}</p><div className="subtotal"><span>Subtotal</span><strong>{money(total)}</strong></div><span className="tax-note">Shipping and taxes calculated at checkout.</span>{error && <p className="form-error">{error}</p>}<button className="button button-dark checkout-button" onClick={checkout} disabled={busy}>{busy ? 'Opening secure checkout…' : 'Continue to checkout'} <ArrowRight size={16} /></button><p className="secure-note">SECURE CHECKOUT &nbsp;·&nbsp; STRIPE</p></div></> : <div className="empty-cart"><ShoppingBag size={25} /><h3>Your bag is taking a breather.</h3><p>Find something that feels like you.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Explore the collection <ArrowRight size={16} /></button></div>}</motion.aside></>}</AnimatePresence>;
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!supabase) { setError('Account access is not connected yet. Add your Supabase project URL and public anon key to the environment settings to enable secure sign-in.'); return; }
    if (password.length < 8) { setError('Please use a password with at least 8 characters.'); return; }
    if (isSignup && password !== confirmPassword) { setError('Those passwords do not match. Please try again.'); return; }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: `${window.location.origin}/account` } });
        if (authError) throw authError;
        if (data.session) navigate('/account');
        else setNotice('Your account is nearly ready. Check your inbox for a confirmation link, then come back to log in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (authError) throw authError;
        navigate('/account');
      }
    } catch (authError) { setError(authError instanceof Error ? authError.message : 'We could not complete that request. Please try again.'); }
    finally { setBusy(false); }
  };

  return <section className="auth-page"><motion.div className="auth-photo" initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8 }}><Link to="/" className="auth-photo-mark">VELORA<span>®</span></Link><div><span className="eyebrow">A quieter kind of living</span><p>Keep the pieces<br/>that feel like <em>you.</em></p></div><span className="auth-photo-credit">THE CONSIDERED HOME · VOL. 01</span></motion.div><motion.div className="auth-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, delay: .12 }}><span className="eyebrow">{isSignup ? 'A PLACE FOR THE CONSIDERED' : 'WELCOME BACK'}</span><h1>{isSignup ? <>Make yourself<br/><em>at home.</em></> : <>Good to see<br/><em>you again.</em></>}</h1><p className="auth-intro">{isSignup ? 'Create an account for order updates and a closer look at new studio releases.' : 'Sign in to revisit your orders and keep in touch with the studio.'}</p><form className="auth-form" onSubmit={submit} noValidate><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com"/><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/>{isSignup && <><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again"/></>}<button className="button button-dark auth-submit" disabled={busy}>{busy ? 'One moment…' : isSignup ? 'Create your account' : 'Log in'} <ArrowRight size={16}/></button></form>{error && <p className="auth-feedback auth-error" role="alert">{error}</p>}{notice && <p className="auth-feedback auth-success" role="status">{notice}</p>}<p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to VELORA?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create an account'} <ArrowUpRight size={13}/></Link></p><p className="auth-privacy">Your details stay private. We only use them to manage your account and orders.</p></motion.div></section>;
}

function AccountPage({ user, loading }: { user: User | null; loading: boolean }) {
  const { products, savedIds } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(String(user?.user_metadata?.full_name || ''));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  useEffect(() => { setName(String(user?.user_metadata?.full_name || '')); }, [user?.id, user?.user_metadata?.full_name]);
  useEffect(() => {
    const authClient = supabase;
    if (!user || !authClient) { setOrders([]); return; }
    let active = true;
    setOrdersLoading(true); setOrdersError('');
    const loadOrders = async () => {
      try {
        const { data } = await authClient.auth.getSession();
        if (!data.session?.access_token) throw new Error('Sign in again to view your orders.');
        const response = await fetch('/api/account/orders', { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const result = await response.json().catch(() => null) as { error?: string; orders?: AccountOrder[] } | null;
        if (!response.ok) throw new Error(result?.error || 'Your order history is temporarily unavailable.');
        if (active) setOrders(result?.orders || []);
      } catch (error) { if (active) setOrdersError(error instanceof Error ? error.message : 'Your order history is temporarily unavailable.'); }
      finally { if (active) setOrdersLoading(false); }
    };
    void loadOrders();
    return () => { active = false; };
  }, [user?.id]);
  const firstName = name.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'there';
  const savedProducts = products.filter((product) => savedIds.includes(product.id));
  const updateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFeedback('');
    if (!supabase) { setFeedback('Profile updates are unavailable until account access is connected.'); return; }
    setBusy(true);
    try { const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } }); if (error) throw error; setFeedback('Your profile has been updated.'); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'We could not update your profile. Please try again.'); }
    finally { setBusy(false); }
  };
  const signOut = () => navigate('/review');
  if (loading) return <section className="account-page"><span className="eyebrow">YOUR VELORA</span><h1>Opening your<br/><em>account.</em></h1></section>;
  if (!user) return <section className="account-page"><span className="eyebrow">YOUR VELORA</span><h1>A place for<br/><em>the considered.</em></h1><p>Sign in to see your profile, keep your favourite pieces, and explore the members’ edit.</p><div className="account-actions"><Link className="button button-dark" to="/login">Log in to your account <ArrowRight size={16}/></Link><Link className="button account-signout" to="/signup">Create an account</Link></div></section>;
  return <section className="account-dashboard">
    <header className="account-dashboard-head"><div><span className="eyebrow">YOUR VELORA · PRIVATE ACCOUNT</span><h1>Welcome, <em>{firstName}.</em></h1><p>A home for your details, saved pieces, and the next things worth discovering.</p></div><button className="account-signout" onClick={signOut}>Sign out</button></header>
    <div className="account-overview-grid">
      <form className="profile-card" onSubmit={updateProfile}><div className="account-card-heading"><span className="profile-avatar"><UserRound size={21}/></span><div><span className="eyebrow">YOUR PROFILE</span><h2>Personal details</h2></div></div><label htmlFor="profile-name">Name</label><input id="profile-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Add your name"/><label htmlFor="profile-email">Email address</label><input id="profile-email" value={user.email || ''} readOnly aria-readonly="true"/><div className="profile-form-foot"><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save details'} <ArrowRight size={15}/></button>{feedback && <span role="status">{feedback}</span>}</div></form>
      <div className="member-card"><span className="member-card-mark">V.</span><span className="eyebrow">A LITTLE CLOSER TO THE STUDIO</span><h2>Your VELORA<br/><em>membership.</em></h2><p>Keep a personal edit of favourite objects and get a first look at the stories and pieces taking shape in the studio.</p><Link to="/members" className="text-link">Enter the members’ edit <ArrowUpRight size={15}/></Link></div>
    </div>
    <div className="account-quick-links"><Link to="/members" className="account-link-card"><span><Sparkles size={18}/></span><small>01 / MEMBERS</small><strong>The Edit</strong><p>Studio notes and member favourites.</p><ArrowRight size={17}/></Link><Link to="/studio" className="account-link-card"><span><RotateCw size={18}/></span><small>02 / MAKE IT YOURS</small><strong>The Atelier</strong><p>Personalise a piece in the 3D studio.</p><ArrowRight size={17}/></Link><a href="#orders" className="account-link-card"><span><Package size={18}/></span><small>03 / ORDER HISTORY</small><strong>Your orders</strong><p>Completed purchases attached to this account.</p><ArrowRight size={17}/></a></div>
    <section className="account-orders" id="orders"><div className="section-heading"><div><span className="eyebrow">A RECORD OF WHAT YOU’VE CHOSEN</span><h2>Your <em>orders.</em></h2></div><span className="order-count">{orders.length.toString().padStart(2, '0')} ORDERS</span></div>{ordersLoading ? <p className="orders-message">Gathering your order history…</p> : ordersError ? <p className="orders-message" role="status">{ordersError}</p> : orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-row" key={order.id}><span className="order-reference">ORDER<br/><strong>{(order.stripe_session_id || order.id).slice(-8).toUpperCase()}</strong></span><span className="order-date">{new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span><span className={`order-status order-status-${order.status}`}>{order.status}</span><strong className="order-amount">{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency.toUpperCase() }).format(order.amount_total / 100)}</strong></article>)}</div> : <div className="orders-message"><Package size={19}/><p>Your order history will appear here after a completed, signed-in checkout.</p><Link to="/shop">Explore the collection <ArrowRight size={14}/></Link></div>}</section>
    <section className="account-saved-section"><div className="section-heading"><div><span className="eyebrow">KEPT CLOSE</span><h2>Your saved <em>pieces.</em></h2></div><Link className="text-link" to="/shop">Browse all objects <ArrowUpRight size={15}/></Link></div>{savedProducts.length ? <div className="product-grid">{savedProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div> : <div className="saved-empty"><Heart size={20}/><p>Your personal edit is waiting. Save a piece with the heart as you explore.</p><Link className="button button-dark" to="/shop">Find a favourite <ArrowRight size={15}/></Link></div>}</section>
    <div className="account-bottom-links"><span>Signed in as <strong>{user.email}</strong></span><Link to="/contact">Need a hand? Talk to the studio <ArrowUpRight size={14}/></Link></div>
  </section>;
}

function ReviewPage({ user, loading }: { user: User | null; loading: boolean }) {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const ratingLabels = ['Not for me', 'Could be better', 'It was alright', 'Really lovely', 'Exceptional'];
  const signOutNow = async () => {
    if (!supabase) { navigate('/login', { replace: true }); return; }
    setBusy(true); setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      navigate('/?signedout=1', { replace: true });
    } catch (signOutError) { setError(signOutError instanceof Error ? signOutError.message : 'We could not sign you out. Please try again.'); }
    finally { setBusy(false); }
  };
  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (!user || !supabase) { setError('Please sign in again before sending your note.'); return; }
    if (noteSaved) { await signOutNow(); return; }
    if (rating < 1) { setError('Choose a star rating before you continue.'); return; }
    setBusy(true);
    let reviewSaved = false;
    try {
      const { error: reviewError } = await supabase.from('customer_reviews').insert({
        user_id: user.id,
        email: user.email || '',
        display_name: String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'VELORA customer'),
        rating,
        title: title.trim(),
        body: body.trim(),
      });
      if (reviewError?.code === 'PGRST205' || reviewError?.code === '42P01') throw new Error('The review space is not set up in Supabase yet. Run the VELORA reviews and collection migration, then try again.');
      if (reviewError) throw reviewError;
      reviewSaved = true;
      setNoteSaved(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      navigate('/?signedout=1', { replace: true });
    } catch (submitError) { setError(reviewSaved ? 'Your note was saved, but we could not finish signing you out. Please try again or choose “Skip & sign out.”' : submitError instanceof Error ? `${submitError.message} You are still signed in; try again or choose “Skip & sign out.”` : 'We could not save your note. You are still signed in; try again or choose “Skip & sign out.”'); }
    finally { setBusy(false); }
  };
  if (loading) return <section className="account-page"><span className="eyebrow">A NOTE BEFORE YOU GO</span><h1>One last<br/><em>moment.</em></h1></section>;
  if (!user) return <section className="members-gate"><span className="eyebrow">A NOTE BEFORE YOU GO</span><h1>Your session<br/><em>has ended.</em></h1><p>You’re signed out. You can come back to the VELORA collection any time.</p><Link className="button button-dark" to="/">Return to VELORA <ArrowRight size={16}/></Link></section>;
  return <section className="review-page">
    <aside className="review-editorial"><Link to="/" className="review-wordmark">VELORA<span>®</span></Link><div className="review-editorial-copy"><span className="eyebrow">A PARTING NOTE · VELORA STUDIO</span><p>Good things are made better by the people who live with them.</p><span className="review-editorial-mark">V.</span></div><span className="review-editorial-caption">THANK YOU FOR MAKING ROOM FOR US.</span></aside>
    <div className="review-content"><span className="eyebrow">BEFORE YOU GO, {String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'FRIEND').split(/\s+/)[0].toUpperCase()}</span><h1>How did it<br/><em>feel?</em></h1><p className="review-intro">A few words help us make the next piece, and the next visit, more thoughtful.</p>
      <form className="review-form" onSubmit={submitReview}>
        <fieldset className="review-rating"><legend>Your experience</legend><div className="review-stars" role="group" aria-label="Rate your VELORA experience">{ratingLabels.map((label, index) => <button key={label} type="button" disabled={noteSaved} className={rating >= index + 1 ? 'star-selected' : ''} onClick={() => setRating(index + 1)} aria-label={`${index + 1} out of 5 stars — ${label}`} aria-pressed={rating === index + 1}><Star size={27} fill={rating >= index + 1 ? 'currentColor' : 'none'}/></button>)}</div><span className="rating-caption" aria-live="polite">{rating ? ratingLabels[rating - 1] : 'Choose the feeling that fits'}</span></fieldset>
        <label htmlFor="review-title">Give your note a title<input id="review-title" required minLength={3} maxLength={80} disabled={noteSaved} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A small detail that stayed with me"/></label>
        <label htmlFor="review-body">Tell us a little more<textarea id="review-body" required minLength={20} maxLength={1200} disabled={noteSaved} rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What felt considered? What could we do better?"/><span className="review-char-count">{body.length} / 1200</span></label>
        {error && <p className="review-error" role="alert">{error}</p>}
        <p className="review-privacy">{noteSaved ? 'Your note is saved. One last step to close your VELORA session.' : 'Your note is sent privately to the VELORA studio. Your account details remain yours.'}</p>
        <button className="button button-dark review-submit" disabled={busy}>{busy ? noteSaved ? 'Signing you out…' : 'Saving your note…' : noteSaved ? 'Finish signing out' : 'Send note & sign out'} <ArrowRight size={16}/></button>
      </form>
      <button className="review-skip" onClick={signOutNow} disabled={busy}>Skip & sign out</button>
    </div>
  </section>;
}

function MembersPage({ user, loading }: { user: User | null; loading: boolean }) {
  const { products, savedIds } = useStore();
  const savedProducts = products.filter((product) => savedIds.includes(product.id));
  if (loading) return <section className="account-page"><span className="eyebrow">THE VELORA EDIT</span><h1>Opening your<br/><em>private edit.</em></h1></section>;
  if (!user) return <section className="members-gate"><span className="eyebrow">A CLOSER LOOK AT VELORA</span><h1>For the things<br/>you <em>keep close.</em></h1><p>The members’ edit gathers saved pieces, first looks, and notes from the studio in one quiet corner.</p><Link className="button button-dark" to="/login">Log in to enter <ArrowRight size={16}/></Link><p className="account-page-switch">New here? <Link to="/signup">Create your account</Link></p></section>;
  return <section className="members-page"><header className="members-hero"><div><span className="eyebrow">THE VELORA EDIT · ISSUE 01</span><h1>A little more<br/><em>personal.</em></h1><p>A considered corner for the pieces you love, the next small release, and notes from the people who make it.</p><Link className="button button-dark" to="/studio">Make a piece your own <ArrowRight size={16}/></Link></div><div className="members-hero-image"><span>THE ATELIER · A STUDY IN FORM</span></div></header>
    <div className="members-benefits"><article><span>01 / YOUR PERSONAL EDIT</span><h2>Objects to<br/><em>come back to.</em></h2><p>Save the pieces that feel like you. Your favourites stay on this device and in your profile.</p><Link to="/account" className="text-link">Open your profile <ArrowUpRight size={14}/></Link></article><article><span>02 / FIRST LOOK</span><h2>Made in small<br/><em>numbers.</em></h2><p>New studio releases are shared here first, with a closer look at the makers and materials behind them.</p><Link to="/journal" className="text-link">Read studio notes <ArrowUpRight size={14}/></Link></article><article><span>03 / MADE PERSONAL</span><h2>A piece of<br/><em>your own.</em></h2><p>Adjust the finish, tone, and details of select objects in the VELORA Atelier.</p><Link to="/studio" className="text-link">Enter the Atelier <ArrowUpRight size={14}/></Link></article></div>
    <section className="members-saved"><div className="section-heading"><div><span className="eyebrow">YOUR PRIVATE EDIT</span><h2>The pieces you’ve <em>kept.</em></h2></div><Link className="text-link" to="/shop">Discover more <ArrowUpRight size={14}/></Link></div>{savedProducts.length ? <div className="product-grid">{savedProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div> : <div className="saved-empty"><Heart size={20}/><p>Nothing saved just yet. Follow a feeling and tap the heart on any piece.</p><Link className="button button-dark" to="/shop">Explore the collection <ArrowRight size={15}/></Link></div>}</section>
  </section>;
}

function Success() { const navigate = useNavigate(); useEffect(() => { localStorage.removeItem('velora-cart'); }, []); return <section className="success-page"><span className="success-icon"><Check /></span><span className="eyebrow">THANK YOU, BEAUTIFULLY</span><h1>Something lovely<br /><em>is on its way.</em></h1><p>Your order is confirmed. We’ll send the details to your inbox shortly.</p><button className="button button-dark" onClick={() => { window.localStorage.removeItem('velora-cart'); navigate('/'); window.location.reload(); }}>Back to VELORA <ArrowRight size={16} /></button></section>; }

function Newsletter() { const [email, setEmail] = useState(''); const [message, setMessage] = useState('No noise. Unsubscribe whenever.'); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); return <section className="newsletter"><div><span className="eyebrow">A little note now and then</span><h2>Stay close to<br /><em>the good things.</em></h2></div><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMessage(''); try { const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setDone(true); setMessage('You’re on the list. Speak soon.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); } finally { setBusy(false); } }}><label htmlFor="newsletter-email">Occasional letters from the studio. New work, slow living, and other things worth a moment.</label><div className="newsletter-field"><input id="newsletter-email" type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} /><button aria-label="Subscribe" disabled={busy}>{done ? <Check /> : <ArrowRight />}</button></div><span className="newsletter-confirm">{message}</span></form></section>; }

function Footer() { return <footer className="site-footer"><div className="footer-top"><div className="footer-brand"><Link to="/" className="wordmark">VELORA<span>®</span></Link><p>Objects for a life<br />well considered.</p></div><div className="footer-column"><span className="eyebrow">DISCOVER</span><Link to="/shop">All objects</Link><Link to="/about">Our story</Link><Link to="/studio">The Studio</Link><Link to="/journal">Journal</Link></div><div className="footer-column"><span className="eyebrow">HERE TO HELP</span><Link to="/contact">Contact the studio</Link><a href="mailto:studio@velora.studio?subject=Shipping%20and%20returns">Shipping & returns</a><a href="mailto:studio@velora.studio?subject=Care%20guide">Care guide</a></div><div className="footer-social"><a href="https://instagram.com" target="_blank" rel="noreferrer">INSTAGRAM <ArrowUpRight size={14} /></a><span>MADE WITH INTENTION<br />IN NEW YORK & EVERYWHERE</span></div></div><div className="footer-bottom"><span>© 2025 VELORA STUDIO</span><span>OBJECTS FOR THE CONSIDERED LIFE</span><span>PRIVACY &nbsp; · &nbsp; TERMS</span></div></footer>; }
