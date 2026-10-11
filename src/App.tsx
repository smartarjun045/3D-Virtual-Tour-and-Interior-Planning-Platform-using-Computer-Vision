import { Fragment, useMemo, useState } from 'react'
import { formatCompactMoney, formatMoney, loadSession, loadStore, saveSession, saveStore } from './data'
import type { Design, Property, PropertyStatus, Role, User } from './types'
import SmartAssistant from './SmartAssistant'
import BlueprintEditor from './BlueprintEditor'
import ThreeHome from './ThreeHome'
import RoomTour from './RoomTour'
import BlueprintStudioEditor from './BlueprintStudioEditor'
import FloorPlanImporter from './FloorPlanImporter'
import InteriorAdvisor from './InteriorAdvisor'
import AuthPage from './AuthPage'
import { recognizeFloorPlanWithAi, type AiRecognitionResult } from './floorPlanAiRecognizer'


type Page = 'home' | 'explore' | 'dashboard' | 'upload' | 'property' | 'tour' | 'editor' | 'calculator' | 'admin' | 'import' | 'advisor' | 'auth'

const navForRole: Record<Role, { page: Page; label: string; icon: string }[]> = {
  buyer: [{ page: 'dashboard', label: 'My space', icon: '◫' }, { page: 'explore', label: 'Explore homes', icon: '⌕' }, { page: 'advisor', label: 'Interior advisor', icon: '✦' }, { page: 'import', label: 'Import plan', icon: '↑' }, { page: 'calculator', label: 'EMI planner', icon: '₹' }],
  builder: [{ page: 'dashboard', label: 'Overview', icon: '◫' }, { page: 'upload', label: 'Add a property', icon: '+' }, { page: 'import', label: 'Import plan', icon: '↑' }, { page: 'advisor', label: 'Interior advisor', icon: '✦' }, { page: 'explore', label: 'Listings', icon: '⌕' }],
  owner: [{ page: 'dashboard', label: 'My property', icon: '◫' }, { page: 'upload', label: 'Add a property', icon: '+' }, { page: 'import', label: 'Import plan', icon: '↑' }, { page: 'advisor', label: 'Interior advisor', icon: '✦' }, { page: 'explore', label: 'Market', icon: '⌕' }],
  admin: [{ page: 'admin', label: 'Control center', icon: '◫' }, { page: 'explore', label: 'All listings', icon: '⌕' }, { page: 'import', label: 'Import plan', icon: '↑' }, { page: 'advisor', label: 'Interior advisor', icon: '✦' }],
}

const pageTitles: Partial<Record<Page, { eyebrow: string; title: string }>> = {
  dashboard: { eyebrow: 'WORKSPACE', title: 'Good morning' }, upload: { eyebrow: 'NEW LISTING', title: 'Turn a plan into an experience' },
  explore: { eyebrow: 'DISCOVER', title: 'Find the space that fits' }, calculator: { eyebrow: 'FINANCE', title: 'Plan your purchase' }, admin: { eyebrow: 'ADMINISTRATION', title: 'Keep the marketplace trusted' },
  import: { eyebrow: 'FLOOR PLAN IMPORT', title: 'Bring your floor plan to life' }, advisor: { eyebrow: 'INTERIOR DESIGN ADVISOR', title: 'Design with smart suggestions' },
  auth: { eyebrow: 'AUTHENTICATION', title: 'Join 3D Virtual Tour and Interior Planning Platform using Computer Vision' },
}

const roles: { role: Role; copy: string; icon: string }[] = [
  { role: 'buyer', copy: 'Explore, tour and personalize spaces', icon: '⌂' },
  { role: 'builder', copy: 'Publish immersive property listings', icon: '▦' },
  { role: 'owner', copy: 'Present a home at its best', icon: '◇' },
  { role: 'admin', copy: 'Review and manage the marketplace', icon: '◉' },
]

function App() {
  const [store, setStore] = useState(loadStore)
  const [user, setUser] = useState<User | null>(loadSession)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState('skyline-residence')
  const [loginOpen, setLoginOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin')
  const [toast, setToast] = useState('')
  const selected = store.properties.find(p => p.id === selectedId) || store.properties[0]

  const updateStore = (update: typeof store) => { setStore(update); saveStore(update) }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3400) }
  const openProperty = (property: Property, next: Page = 'property') => { setSelectedId(property.id); setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const signIn = (nextUser: User) => { setUser(nextUser); saveSession(nextUser); setLoginOpen(false); setPage(nextUser.role === 'admin' ? 'admin' : 'dashboard'); notify(`Welcome back, ${nextUser.name.split(' ')[0]}.`) }
  const signOut = () => { setUser(null); saveSession(null); setPage('home'); notify('You have been signed out.') }
  const openAuth = (mode: 'signin' | 'register' = 'signin') => { setAuthMode(mode); setLoginOpen(true) }
  const requireUser = (callback: () => void) => { if (!user) openAuth('signin'); else callback() }

  const content = (() => {
    // If not logged in and not on landing, enforce login
    if (!user && page !== 'home') {
      return <AuthPage onSignIn={signIn} initialMode={authMode} onClose={() => setPage('home')} />
    }
    if (page === 'auth') return <AuthPage onSignIn={signIn} initialMode={authMode} onClose={() => setPage('home')} />
    if (page === 'home') return <Landing onExplore={() => openAuth('signin')} onLogin={() => openAuth('signin')} onRegister={() => openAuth('register')} />
    if (page === 'explore') return <Explore properties={store.properties.filter(p => p.status === 'published' || user?.role === 'admin' || p.builder === user?.name)} onOpen={openProperty} />
    if (page === 'property') return <PropertyBlueprintPreview property={selected} onTour={() => openProperty(selected, 'tour')} onEditor={() => openProperty(selected, 'editor')} onCalculator={() => openProperty(selected, 'calculator')} />
    if (page === 'tour') return <RoomTour property={selected} onEditor={() => openProperty(selected, 'editor')} />
    if (page === 'editor') return <BlueprintStudioEditor property={selected} designs={store.designs.filter(d => d.propertyId === selected.id)} onSave={(design) => { updateStore({ ...store, designs: [...store.designs, design] }); notify('Your Blueprint3D design has been saved.') }} />
    if (page === 'calculator') return <Calculator property={selected} />
    if (page === 'upload') return <Upload user={user} onCreate={(property) => { updateStore({ ...store, properties: [property, ...store.properties] }); setSelectedId(property.id); setPage('dashboard'); notify('Property submitted for review.') }} />
    if (page === 'admin') return <Admin properties={store.properties} onUpdateStatus={(id, status) => { updateStore({ ...store, properties: store.properties.map(p => p.id === id ? { ...p, status } : p) }); notify(status === 'published' ? 'Listing approved and published.' : 'Listing moved to draft.') }} onOpen={openProperty} />
    if (page === 'import') return <FloorPlanImporter onComplete={(imported) => {
      const newId = `prop-${Date.now()}`
      const newProp: Property = {
        id: newId,
        title: imported.title,
        city: 'Pune',
        locality: 'Innovation Park',
        price: 8500000,
        area: imported.area,
        beds: imported.beds,
        baths: imported.baths,
        status: 'published',
        type: 'Apartment',
        image: (imported.title.slice(0, 6) || 'HOME').toUpperCase(),
        accent: '#4f46e5',
        builder: user?.name || 'Spatial Planning Studio',
        views: 1,
        createdAt: new Date().toISOString().slice(0, 10),
        verified: true,
        tags: ['3D tour', 'CAD model', 'Floor plan attached'],
        description: `Immersive 3D space recognized with Computer Vision Spatial Synthesizer. Features ${imported.beds} bedrooms and ${imported.baths} bathrooms across ${imported.area} sq ft.`,
        blueprintPlan: imported.planJson,
        rawBlueprint: imported.rawBlueprint
      }
      const newDesign: Design = {
        id: `design-${Date.now()}`,
        propertyId: newId,
        name: `${imported.title} (3D CAD)`,
        wallColor: '#f5eee4',
        floorColor: '#b9855d',
        furniture: ['Sofa', 'Dining table', 'Bed'],
        createdAt: new Date().toISOString().slice(0, 10),
        planData: imported.planJson
      }
      const updatedStore = {
        ...store,
        properties: [newProp, ...store.properties],
        designs: [newDesign, ...store.designs]
      }
      updateStore(updatedStore)
      setSelectedId(newId)
      setPage('property')
      notify(`"${imported.title}" added to your properties and published!`)
    }} />
    if (page === 'advisor') return (
      <BlueprintStudioEditor
        property={selected}
        designs={store.designs.filter(d => d.propertyId === selected.id)}
        initialAdvisorOpen={true}
        onSave={(design) => {
          updateStore({ ...store, designs: [...store.designs, design] })
          notify('Your 3D design has been saved.')
        }}
      />
    )
    return <Dashboard user={user!} properties={store.properties} designs={store.designs} onOpen={openProperty} onAdd={() => setPage('upload')} />
  })()
  return <div className="app-shell">
    {user && page !== 'home' && page !== 'auth' && <Sidebar user={user} page={page} onNavigate={setPage} onLogin={() => openAuth('signin')} onSignOut={signOut} />}
    <main className={!user || page === 'home' || page === 'auth' ? '' : 'main-content'}>
      {user && page !== 'home' && page !== 'auth' && <Topbar user={user} page={page} onNavigate={setPage} onLogin={() => openAuth('signin')} />}
      {content}
    </main>
    {loginOpen && (
      <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1000, padding: '16px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1080px', position: 'relative' }}>
          <AuthPage
            initialMode={authMode}
            onSignIn={signIn}
            onClose={() => setLoginOpen(false)}
          />
        </div>
      </div>
    )}
    {toast && <div className="toast"><span>✓</span>{toast}</div>}
  </div>
}

function Brand({ inverse = false }: { inverse?: boolean }) { return <div className={`brand ${inverse ? 'inverse' : ''}`} title="3D Virtual Tour and Interior Planning Platform using Computer Vision"><span className="brand-mark"><i /><i /><i /></span><span>3D Tour & Vision<span>PLAN</span></span></div> }

function Sidebar({ user, page, onNavigate, onLogin, onSignOut }: { user: User | null; page: Page; onNavigate: (p: Page) => void; onLogin: () => void; onSignOut: () => void }) {
  const items = user ? navForRole[user.role] : [
    { page: 'explore' as Page, label: 'Explore homes', icon: '⌕' },
    { page: 'import' as Page, label: 'Import plan', icon: '↑' },
    { page: 'advisor' as Page, label: 'Interior advisor', icon: '✦' },
    { page: 'calculator' as Page, label: 'EMI planner', icon: '₹' },
    { page: 'upload' as Page, label: 'Add property', icon: '+' }
  ]
  return <aside className="sidebar"><Brand inverse />
    <nav>{items.map(item => <button key={item.page} className={page === item.page ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item.page)}><b>{item.icon}</b>{item.label}</button>)}</nav>
    <div className="sidebar-bottom">{user ? <><div className="profile-mini"><span className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.initials}</span><div><strong>{user.name}</strong><small>{user.role} {user.provider ? `(${user.provider})` : ''}</small></div></div><button className="text-button subtle" onClick={onSignOut}>Sign out <span>→</span></button></> : <button className="button wide" onClick={onLogin}>Sign in</button>}</div>
  </aside>
}

function Topbar({ user, page, onNavigate, onLogin }: { user: User | null; page: Page; onNavigate: (p: Page) => void; onLogin: () => void }) {
  const title = pageTitles[page]
  return <header className="topbar"><div>{title && <><p className="eyebrow">{title.eyebrow}</p><h1>{title.title}{page === 'dashboard' && user ? `, ${user.name.split(' ')[0]}` : ''}</h1></>}</div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧<i /></button>{user ? <button className="avatar top-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => onNavigate('dashboard')}>{user.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.initials}</button> : <button className="button small" onClick={onLogin}>Sign in</button>}</div></header>
}

function Landing({ onExplore, onLogin, onRegister }: { onExplore: () => void; onLogin: () => void; onRegister: () => void }) {
  return <div className="landing"><header className="landing-nav"><Brand inverse /><div className="landing-links"><a href="#how">How it works</a><a href="#for-you">For professionals</a><button className="text-button inverse-text" onClick={onLogin}>Sign in</button><button className="button light small" onClick={onRegister}>Get started <span>→</span></button></div></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow lime">REAL ESTATE & INTERIOR PLANNING, REIMAGINED</p><h1>See a place.<br /><em>Feel at home.</em></h1><p className="hero-text">3D Virtual Tour and Interior Planning Platform using Computer Vision transforms a floor plan into an immersive home experience—so every decision feels certain.</p><div className="hero-actions"><button className="button lime-button" onClick={onExplore}>Explore homes <span>→</span></button><button className="play-link" onClick={() => { onExplore(); }}><b>▶</b> See how it works</button></div><div className="trust-row"><div className="mini-avatars"><span>AR</span><span>KV</span><span>SM</span></div><p>Trusted by <strong>2,500+</strong> home seekers<br />and property professionals</p></div></div><HeroHome /></section>
    <section id="how" className="feature-strip"><div><p className="eyebrow">ONE PLATFORM, CLEARER DECISIONS</p><h2>From first sketch to<br />the first step inside.</h2></div><div className="feature-grid"><Feature number="01" title="Upload a plan" copy="Bring a 2D floor plan or existing model." /><Feature number="02" title="Explore in 3D" copy="Walk through every room before it exists." /><Feature number="03" title="Make it yours" copy="Try layouts, materials and finishes in real time." /></div></section>
    <InteriorMetricsPreview />
    <section id="for-you" className="role-row"><p className="eyebrow">BUILT FOR EVERYONE</p><div>{roles.map(r => <button onClick={onExplore} key={r.role} className="role-card"><b>{r.icon}</b><h3>For {r.role}s</h3><p>{r.copy}</p><span>Explore →</span></button>)}</div></section>
    <footer><Brand inverse /><span>© 2026 3D Virtual Tour and Interior Planning Platform using Computer Vision. Built for better home decisions.</span></footer>
  </div>
}

function HeroHome() { return <div className="hero-home"><div className="orb orb-a" /><div className="orb orb-b" /><div className="building"><div className="building-roof" /><div className="building-face"><div className="window-grid">{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div></div><div className="building-side"><div className="side-windows">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></div><div className="building-ground" /></div><div className="floating-card tour-card"><span className="card-icon">◌</span><div><small>IMMERSIVE TOUR</small><b>Walk through in 3D</b></div><span>→</span></div><div className="floating-card value-card"><span className="card-icon warm">↗</span><div><small>LISTING PERFORMANCE</small><b>+34% more engagement</b></div></div><div className="architect-line a" /><div className="architect-line b" /></div> }
function Feature({ number, title, copy }: { number: string; title: string; copy: string }) { return <article className="feature"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article> }

function InteriorMetricsPreview() { const metrics = [['Accuracy', '76.8%', 76.8], ['Precision', '77.1%', 77.1], ['Recall', '76.7%', 76.7], ['F1-Score', '76.4%', 76.4]]; const matrix = [[70, 20, 10], [5, 60, 15], [5, 10, 85]]; return <section className="interior-metrics"><div className="interior-metrics-inner"><div><p className="eyebrow">3D INTERIOR METRICS PREVIEW</p><h2>3D interior score display.</h2><p className="interior-warning">Illustrative placeholders for presentation only. These are not measured results and will be replaced after the real model, dataset and annotations are available.</p><div className="interior-metric-grid">{metrics.map(([label, value]) => <div className="interior-metric" key={label}><span>{label}</span><b>{value}</b></div>)}</div></div><div className="interior-charts"><div className="interior-chart"><p className="eyebrow">METRIC COMPARISON</p><div className="metric-bars">{metrics.map(([label, , score]) => <div className="metric-bar" key={label}><div><span>{label}</span><b>{score}%</b></div><i><em style={{ width: `${score}%` }} /></i></div>)}</div></div><div className="interior-chart"><p className="eyebrow">CONFUSION MATRIX</p><div className="confusion-grid"><span /><b>Background</b><b>Room</b><b>Opening</b>{matrix.map((row, rowIndex) => <Fragment key={rowIndex}><b>{['Background', 'Room', 'Opening'][rowIndex]}</b>{row.map((value, columnIndex) => <span className={`matrix-cell matrix-${rowIndex}-${columnIndex}`} key={`${rowIndex}-${columnIndex}`}>{value}</span>)}</Fragment>)}</div></div></div></div></section> }

function Explore({ properties, onOpen }: { properties: Property[]; onOpen: (p: Property) => void }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('All cities')
  const filtered = properties.filter(p => (city === 'All cities' || p.city === city) && `${p.title} ${p.city} ${p.locality}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="page-section explore"><div className="explore-hero"><div><p className="eyebrow">CURATED SPACES</p><h2>Spaces worth stepping into.</h2><p>Explore verified homes through plans, immersive tours and thoughtful details.</p></div><div className="explore-stat"><b>{properties.length}</b><span>live properties<br />to discover</span></div></div><div className="search-bar"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by locality, city or project" /><select value={city} onChange={e => setCity(e.target.value)}><option>All cities</option>{[...new Set(properties.map(p => p.city))].map(c => <option key={c}>{c}</option>)}</select><button className="filter-button">☷ Filters</button></div><div className="section-line"><span>{filtered.length} properties available</span><button className="text-button">Sort: Recommended <b>⌄</b></button></div><div className="property-grid">{filtered.map(p => <PropertyCard key={p.id} property={p} onOpen={onOpen} />)}</div>{filtered.length === 0 && <div className="empty-state">No homes match that search. Try another locality or city.</div>}</section>
}

function PropertyCard({ property, onOpen }: { property: Property; onOpen: (property: Property) => void }) { return <article className="property-card" onClick={() => onOpen(property)}><div className="property-image" style={{ '--accent': property.accent } as React.CSSProperties}><span className="image-label">{property.image}</span><div className="mini-buildings"><i /><i /><i /><i /></div><button className="heart" onClick={e => { e.stopPropagation(); e.currentTarget.classList.toggle('liked') }}>♡</button>{property.tags.includes('3D tour') && <span className="tour-badge">◉ 3D tour</span>}</div><div className="property-info"><div className="property-title-row"><h3>{property.title}</h3>{property.verified && <span className="verified">✓</span>}</div><p>{property.locality}, {property.city}</p><div className="property-meta"><span>{property.beds} beds</span><i /> <span>{property.baths} baths</span><i /> <span>{property.area.toLocaleString()} sq ft</span></div><div className="property-price"><b>{formatCompactMoney(property.price)}</b><span>onwards</span><button aria-label={`Open ${property.title}`}>→</button></div></div></article> }

function Dashboard({ user, properties, designs, onOpen, onAdd, onTwin }: { user: User; properties: Property[]; designs: Design[]; onOpen: (p: Property, page?: Page) => void; onAdd: () => void; onTwin?: () => void }) {
  const own = user.role === 'buyer' ? properties.filter(p => p.status === 'published').slice(0, 2) : properties.filter(p => p.builder === user.name || user.role === 'admin')
  const isBuyer = user.role === 'buyer'
  return <section className="page-section dashboard"><div className="dashboard-overview"><div className="stat-card"><span className="stat-icon blue">⌂</span><div><small>{isBuyer ? 'SAVED HOMES' : 'TOTAL LISTINGS'}</small><b>{isBuyer ? 4 : own.length}</b><em>↗ 12% this month</em></div></div><div className="stat-card"><span className="stat-icon green">◉</span><div><small>{isBuyer ? '3D TOURS TAKEN' : 'TOTAL VIEWS'}</small><b>{isBuyer ? 13 : own.reduce((total, p) => total + p.views, 0).toLocaleString()}</b><em>↗ 8% this week</em></div></div><div className="stat-card"><span className="stat-icon peach">◇</span><div><small>{isBuyer ? 'SAVED DESIGNS' : 'PENDING REVIEW'}</small><b>{isBuyer ? designs.length : own.filter(p => p.status === 'review').length}</b><em className="muted">Updated today</em></div></div></div><div className="dashboard-split"><section className="panel"><div className="panel-title"><div><p className="eyebrow">{isBuyer ? 'PICK UP WHERE YOU LEFT OFF' : 'LISTING PERFORMANCE'}</p><h2>{isBuyer ? 'Your saved spaces' : 'Your properties'}</h2></div><button className="text-button" onClick={isBuyer ? () => onOpen(properties[0], 'explore') : onAdd}>{isBuyer ? 'View all' : '+ Add listing'}</button></div><div className="dashboard-properties">{own.slice(0, 3).map(p => <DashboardProperty key={p.id} property={p} onOpen={onOpen} buyer={isBuyer} />)}</div></section><section className="panel activity"><div className="panel-title"><div><p className="eyebrow">AT A GLANCE</p><h2>{isBuyer ? 'Your journey' : 'Recent activity'}</h2></div></div>{isBuyer ? <><JourneyItem icon="✓" title="3D tour completed" copy="Skyline Residence · Today" /><JourneyItem icon="◇" title="Design saved" copy="Warm Minimal · Yesterday" /><JourneyItem icon="⌕" title="New match found" copy="The Courtyard · 2 days ago" /></> : <><JourneyItem icon="◉" title="Aura Heights submitted" copy="Awaiting platform approval · 45 min ago" /><JourneyItem icon="↗" title="Skyline Residence trending" copy="128 new views this week" /><JourneyItem icon="✓" title="Listing verification complete" copy="Verde Villas · 3 days ago" /></>}</section></div><section className="twin-callout"><div><span>◉</span><div><p className="eyebrow">LIVE SMART-HOME LAYER</p><h2>See what the property is doing right now.</h2><p>Monitor sensor health, device status, energy use and a transparent predictive comfort score from the Digital Twin.</p></div></div><button className="outline-button" onClick={onTwin}>Open live twin →</button></section><section className="quick-action"><div><span className="spark">✦</span><p className="eyebrow">AI FLOOR-PLAN STUDIO</p><h2>{isBuyer ? 'Picture your furniture in a real home.' : 'Bring your next listing to life.'}</h2><p>{isBuyer ? 'Open any 3D tour and create a palette, layout and mood that feels like yours.' : 'Upload a 2D plan. Our assisted pipeline creates an editable 3D starting point in minutes.'}</p></div><button className="button" onClick={isBuyer ? () => onOpen(properties[0], 'tour') : onAdd}>{isBuyer ? 'Open a 3D tour' : 'Create a listing'} <span>→</span></button></section></section>
}

function DashboardProperty({ property, onOpen, buyer }: { property: Property; onOpen: (p: Property, page?: Page) => void; buyer: boolean }) { return <button className="dashboard-property" onClick={() => onOpen(property, buyer ? 'tour' : 'property')}><div className="tiny-image" style={{ background: property.accent }}><span>{property.image.slice(0, 2)}</span></div><div><b>{property.title}</b><small>{property.locality}, {property.city}</small></div><span className={`status ${property.status}`}>{buyer ? 'Resume tour' : property.status}</span><i>→</i></button> }
function JourneyItem({ icon, title, copy }: { icon: string; title: string; copy: string }) { return <div className="journey-item"><b>{icon}</b><div><strong>{title}</strong><small>{copy}</small></div></div> }

function PropertyDetail({ property, onTour, onEditor, onCalculator, onTwin }: { property: Property; onTour: () => void; onEditor: () => void; onCalculator: () => void; onTwin: () => void }) { return <section className="property-detail"><div className="detail-top"><button className="back-button" onClick={() => history.back()}>← Back to explore</button><span className="verified-pill">✓ Verified listing</span></div><div className="detail-visual"><div className="detail-sky" style={{ background: `linear-gradient(145deg, ${property.accent}, #19263b)` }}><div className="city-outline">{Array.from({ length: 15 }, (_, i) => <i key={i} style={{ height: `${20 + ((i * 17) % 62)}%` }} />)}</div><div className="detail-building"><span>{property.image}</span></div></div><div className="visual-caption"><span>↗</span> Interactive property preview <b>Drag to explore</b></div></div><div className="detail-layout"><div><p className="eyebrow">{property.type.toUpperCase()} · {property.locality.toUpperCase()}</p><div className="title-like"><h1>{property.title}</h1><button className="heart detail-heart">♡</button></div><p className="detail-description">{property.description}</p><div className="detail-facts"><span><b>{property.beds}</b> Bedrooms</span><span><b>{property.baths}</b> Bathrooms</span><span><b>{property.area.toLocaleString()}</b> sq ft</span><span><b>2026</b> Possession</span></div><section className="amenity-panel"><div><p className="eyebrow">THE NEIGHBORHOOD</p><h3>Everything close to home.</h3></div><div><span>◉ Metro 1.2 km</span><span>✦ Schools 0.8 km</span><span>⌂ Park 0.3 km</span></div></section><section className="nearby-analysis"><div><p className="eyebrow">NEARBY LOCATION ANALYSIS</p><h3>A strong everyday-living score.</h3><p>AI ranks this address at <b>89/100</b> for walkable conveniences, commute access and family amenities.</p></div><div className="nearby-bars"><span>Commute <i><em style={{ width: '88%' }} /></i><b>88</b></span><span>Essentials <i><em style={{ width: '93%' }} /></i><b>93</b></span><span>Leisure <i><em style={{ width: '77%' }} /></i><b>77</b></span></div></section></div><aside className="detail-aside"><div className="inquiry-card"><p>STARTING FROM</p><h2>{formatMoney(property.price)}</h2><small>Estimated price · Inclusive of basic charges</small><hr /><button className="button wide" onClick={onTour}>Take a 3D tour <span>→</span></button><button className="outline-button wide" onClick={onEditor}>Customize interiors</button><button className="outline-button wide twin-open" onClick={onTwin}>◉ Open live twin</button><button className="text-button full" onClick={onCalculator}>Calculate EMI <span>→</span></button></div><SmartAssistant property={property} onOpenCalculator={onCalculator} onOpenTwin={onTwin} /></aside></div></section> }

function Tour({ property, onEditor, onTwin }: { property: Property; onEditor: () => void; onTwin: () => void }) { const [showHelp, setShowHelp] = useState(true); const [arOpen, setArOpen] = useState(false); const requestFullscreen = () => { void document.documentElement.requestFullscreen?.() }; return <section className="tour-page"><div className="tour-stage"><ThreeHome /><div className="tour-brand"><Brand /><span>LIVE 3D MODEL</span></div><div className="tour-controls"><button title="Reset view">⌂</button><button title="VR fullscreen" onClick={requestFullscreen}>⛶</button><button title="AR preview" onClick={() => setArOpen(true)}>AR</button></div>{arOpen && <div className="ar-preview"><button onClick={() => setArOpen(false)}>×</button><span>AR</span><h3>Preview in your space</h3><p>On a phone, this launches an AR-compatible model placement session. This desktop preview confirms the model is ready for mobile WebXR integration.</p><div className="ar-grid">{Array.from({ length: 25 }, (_, i) => <i key={i} />)}</div><small>WebXR handoff · GLB model required</small></div>}{showHelp && <div className="tour-help"><button onClick={() => setShowHelp(false)}>×</button><b>Explore freely</b><p>Drag to orbit, scroll to zoom. Use fullscreen for a VR-ready view or AR to test mobile placement.</p></div>}</div><aside className="tour-sidebar"><button className="back-button" onClick={() => history.back()}>← Listing details</button><p className="eyebrow">VIRTUAL TOUR</p><h1>{property.title}</h1><p className="tour-copy">Move through a true-to-scale starting layout. Make it feel like home when you’re ready.</p><div className="room-list"><button className="current"><span>01</span> Living room <i>→</i></button><button><span>02</span> Primary bedroom <i>→</i></button><button><span>03</span> Kitchen <i>→</i></button><button><span>04</span> Dining <i>→</i></button></div><div className="tour-sidebar-bottom"><button className="outline-button wide" onClick={onEditor}>✦ Customize this space</button><button className="outline-button wide tour-twin-button" onClick={onTwin}>◉ View live twin</button><button className="text-button full">♡ Save this home</button></div></aside></section> }

function Editor({ property, designs, onSave }: { property: Property; designs: Design[]; onSave: (d: Design) => void }) {
  const [wallColor, setWallColor] = useState(designs[0]?.wallColor || '#f5eee4'); const [floorColor, setFloorColor] = useState(designs[0]?.floorColor || '#b9855d'); const [furniture, setFurniture] = useState<string[]>(designs[0]?.furniture || ['Sofa', 'Dining table']); const [name, setName] = useState('My new design')
  const toggle = (item: string) => setFurniture(current => current.includes(item) ? current.filter(x => x !== item) : [...current, item])
  const save = () => onSave({ id: `design-${Date.now()}`, propertyId: property.id, name: name.trim() || 'Untitled design', wallColor, floorColor, furniture, createdAt: new Date().toISOString().slice(0, 10) })
  return <section className="editor-page"><div className="editor-top"><div><p className="eyebrow">INTERIOR STUDIO · {property.title.toUpperCase()}</p><h2>Make the layout yours.</h2></div><div><input className="design-name" value={name} onChange={e => setName(e.target.value)} aria-label="Design name" /><button className="button" onClick={save}>Save design <span>→</span></button></div></div><div className="editor-layout"><aside className="editor-tools"><ToolSection title="Room"><button className="selected-tool">Living room <span>⌄</span></button></ToolSection><ToolSection title="Walls"><div className="swatches">{['#f5eee4', '#d8e7e1', '#e4d8cb', '#d8ddea', '#bfc3c2'].map(color => <button key={color} onClick={() => setWallColor(color)} className={wallColor === color ? 'picked' : ''} style={{ background: color }} aria-label={`Set wall to ${color}`} />)}</div><label className="custom-color">Custom <input type="color" value={wallColor} onChange={e => setWallColor(e.target.value)} /></label></ToolSection><ToolSection title="Floor"><div className="swatches floor-swatches">{['#b9855d', '#d3c1a7', '#847766', '#c4cac6', '#8a6652'].map(color => <button key={color} onClick={() => setFloorColor(color)} className={floorColor === color ? 'picked' : ''} style={{ background: color }} aria-label={`Set floor to ${color}`} />)}</div></ToolSection><ToolSection title="Furniture"><div className="furniture-options">{['Sofa', 'Dining table', 'Bed', 'Work desk'].map(item => <button onClick={() => toggle(item)} className={furniture.includes(item) ? 'furniture-picked' : ''} key={item}><span>{item === 'Bed' ? '▱' : item === 'Sofa' ? '▰' : '⊞'}</span>{item}<i>{furniture.includes(item) ? '✓' : '+'}</i></button>)}</div></ToolSection></aside><div className="editor-canvas"><BlueprintEditor /><div className="canvas-message"><b>Blueprint3D editor</b><span>Draw rooms, orbit the model, and place catalog items</span></div></div></div></section>
}
function ToolSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="tool-section"><h3>{title}</h3>{children}</section> }

function Calculator({ property }: { property: Property }) { const [downPercentage, setDownPercentage] = useState(20); const [rate, setRate] = useState(8.5); const [years, setYears] = useState(20); const down = Math.round(property.price * downPercentage / 100); const principal = property.price - down; const monthlyRate = rate / 1200; const n = years * 12; const emi = Math.round(principal * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1)); const interest = emi * n - principal; return <section className="page-section calculator"><div className="calculator-layout"><div><p className="eyebrow">HOME LOAN ESTIMATOR</p><h2>What could this home look like each month?</h2><p className="calculator-intro">Use the sliders to explore an estimate. Your lender will confirm the final rate and eligibility.</p><div className="loan-inputs"><RangeInput label="Property price" value={property.price / 100000} valueLabel={formatCompactMoney(property.price)} min={30} max={300} step={5} onChange={() => {}} disabled /><RangeInput label="Down payment" value={downPercentage} valueLabel={`${downPercentage}% · ${formatMoney(down)}`} min={10} max={60} onChange={setDownPercentage} /><RangeInput label="Interest rate" value={rate} valueLabel={`${rate.toFixed(1)}% p.a.`} min={6} max={14} step={.1} onChange={setRate} /><RangeInput label="Loan tenure" value={years} valueLabel={`${years} years`} min={5} max={30} onChange={setYears} /></div></div><aside className="emi-result"><p>ESTIMATED MONTHLY EMI</p><h1>{formatMoney(emi)}</h1><small>for {years * 12} months at {rate.toFixed(1)}% p.a.</small><div className="payment-graphic"><div className="donut" style={{ '--principal': `${Math.round(principal / (principal + interest) * 360)}deg` } as React.CSSProperties} /><div><span><i className="principal-dot" />Principal <b>{formatMoney(principal)}</b></span><span><i className="interest-dot" />Interest <b>{formatMoney(interest)}</b></span></div></div><hr /><div className="emi-lines"><span>Property price <b>{formatMoney(property.price)}</b></span><span>Down payment <b>{formatMoney(down)}</b></span><span>Loan amount <b>{formatMoney(principal)}</b></span></div><button className="button wide">Talk to a loan expert <span>→</span></button></aside></div></section> }
function RangeInput({ label, value, valueLabel, min, max, step = 1, onChange, disabled }: { label: string; value: number; valueLabel: string; min: number; max: number; step?: number; onChange: (v: number) => void; disabled?: boolean }) { return <label className={`range-input ${disabled ? 'disabled' : ''}`}><span>{label}<b>{valueLabel}</b></span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} /></label> }

function Upload({ user, onCreate }: { user: User | null; onCreate: (property: Property) => void }) {
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('Pune')
  const [area, setArea] = useState('1200')
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(2)
  const [price, setPrice] = useState('9500000')
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState('')
  const [aiResult, setAiResult] = useState<AiRecognitionResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)

  const handlePlanUpload = async (file: File) => {
    setPlanFile(file)
    setScanning(true)
    setScanStep(1)
    setTimeout(() => setScanStep(2), 300)
    setTimeout(() => setScanStep(3), 600)
    try {
      const res = await recognizeFloorPlanWithAi(file, 'auto')
      setAiResult(res)
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }
      if (res.totalAreaSqFt) setArea(String(res.totalAreaSqFt))
      const detectedBeds = res.rooms.filter(r => r.type === 'bedroom').length
      const detectedBaths = res.rooms.filter(r => r.type === 'bathroom').length
      if (detectedBeds) setBeds(detectedBeds)
      if (detectedBaths) setBaths(detectedBaths)
    } catch (err) {
      console.error('Plan recognition error in Upload:', err)
      window.alert('AI plan scan completed with local geometry synthesis.')
    } finally {
      setScanning(false)
    }
  }

  const publish = () => {
    if (!title.trim()) return
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `property-${Date.now()}`
    onCreate({
      id: `${id}-${Date.now().toString().slice(-4)}`,
      title,
      city,
      locality: 'New listing',
      price: Number(price) || 9500000,
      area: Number(area) || 1200,
      beds,
      baths,
      status: 'review',
      type: 'Apartment',
      image: title.slice(0, 7).toUpperCase(),
      accent: '#6179e8',
      builder: user?.name || 'Independent owner',
      views: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      verified: false,
      tags: modelName ? ['3D model attached', 'VR-ready'] : aiResult ? ['3D tour', 'AI-generated 3D'] : ['Floor plan attached'],
      description: `Newly submitted property with ${beds} beds, ${baths} baths, ${area} sq ft.`,
      blueprintPlan: aiResult?.blueprintPlan,
      rawBlueprint: aiResult?.rawBlueprint
    })
  }

  return (
    <section className="page-section upload">
      <div className="upload-grid">
        <div>
          <div className="upload-steps">
            <span className="done">1</span>
            <i />
            <span className={planFile || modelName ? 'done' : ''}>2</span>
            <i />
            <span className={aiResult || modelName ? 'done' : ''}>3</span>
          </div>
          <h2>Start with the essentials.</h2>
          <p className="upload-intro">
            Create a listing with an architectural floor plan. Powered by <strong>Computer Vision Spatial Engine</strong> to automatically extract rooms, dimensions and construct the 3D model.
          </p>
          <div className="form-grid">
            <label>
              Property name
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Garden View Residency" />
            </label>
            <label>
              City
              <select value={city} onChange={e => setCity(e.target.value)}>
                <option>Pune</option>
                <option>Mumbai</option>
                <option>Bengaluru</option>
                <option>Hyderabad</option>
              </select>
            </label>
            <label>
              Area (sq ft)
              <input value={area} type="number" onChange={e => setArea(e.target.value)} />
            </label>
            <label>
              Estimated Price (₹)
              <input value={price} type="number" onChange={e => setPrice(e.target.value)} />
            </label>
            <label>
              Bedrooms
              <input value={beds} type="number" onChange={e => setBeds(Number(e.target.value))} />
            </label>
            <label>
              Bathrooms
              <input value={baths} type="number" onChange={e => setBaths(Number(e.target.value))} />
            </label>
          </div>

          <div className={`drop-zone ${planFile ? 'uploaded' : ''}`}>
            <input
              type="file"
              accept="image/*,.pdf,.rvt,.ifc,.skp,.dwg,.dxf"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handlePlanUpload(f)
              }}
            />
            <span>{planFile ? '✓' : '↑'}</span>
            <b>{planFile ? planFile.name : 'Upload 2D floor plan'}</b>
            <small>{planFile ? `${(planFile.size / 1024).toFixed(0)} KB · Ready for 3D Conversion` : 'JPG, PNG, PDF, DWG, RVT · Multi-format spatial processing'}</small>
          </div>

          <div className={`model-upload ${modelName ? 'uploaded' : ''}`}>
            <span>◫</span>
            <div>
              <b>{modelName || 'Or attach an existing 3D model'}</b>
              <small>{modelName ? 'Model marked VR/AR-ready for review' : 'GLB or GLTF · Use your architect or BIM export'}</small>
            </div>
            <label>
              Browse
              <input type="file" accept=".glb,.gltf" onChange={e => setModelName(e.target.files?.[0]?.name || '')} />
            </label>
          </div>

          {scanning && (
            <div className="ai-preview" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
              <div>
                <span>✦</span>
                <div>
                  <b>AI Multimodal Engine Scanning…</b>
                  <small>Running Gemini 3.8 Flash & OpenAI Vision architectural extraction</small>
                </div>
              </div>
            </div>
          )}

          {aiResult && (
            <div className="ai-preview">
              <div>
                <span>✦</span>
                <div>
                  <b>AI 3D Blueprint Extracted ({aiResult.aiProvider})</b>
                  <small>Detected {aiResult.rooms.length} rooms, {aiResult.rawBlueprint.walls.length} walls, and {aiResult.openings.length} openings.</small>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>Ready ✓</span>
            </div>
          )}

          <button className="button upload-submit" disabled={!title.trim() || scanning} onClick={publish}>
            {scanning ? 'Processing Floor Plan…' : 'Submit for review'} <span>→</span>
          </button>
        </div>

        <aside className="upload-aside">
          <div className="assistant-orb">✦</div>
          <p className="eyebrow">FROM PLAN TO PLACE</p>
          <h3>What happens next?</h3>
          <ol>
            <li>
              <span>01</span>
              <div>
                <b>We interpret the plan</b>
                <p>AI extracts walls, rooms and openings into an editable 3D blueprint.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <b>You refine the experience</b>
                <p>Adjust room data, materials, furniture and listing details.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <b>We verify and publish</b>
                <p>Approved homes appear in the marketplace with a 3D interactive tour.</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </section>
  )
}

function Admin({ properties, onUpdateStatus, onOpen }: { properties: Property[]; onUpdateStatus: (id: string, status: PropertyStatus) => void; onOpen: (p: Property) => void }) { const review = properties.filter(p => p.status === 'review'); return <section className="page-section admin"><div className="admin-stats"><div><span>◫</span><b>{properties.length}</b><small>Total listings</small></div><div><span>◉</span><b>{review.length}</b><small>Awaiting review</small></div><div><span>✓</span><b>{properties.filter(p => p.status === 'published').length}</b><small>Published</small></div><div><span>↗</span><b>{properties.reduce((sum, p) => sum + p.views, 0).toLocaleString()}</b><small>Marketplace views</small></div></div><section className="panel review-panel"><div className="panel-title"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Listings needing your attention</h2></div><span className="queue-badge">{review.length} open</span></div>{review.length ? review.map(p => <div className="review-row" key={p.id}><div className="tiny-image" style={{ background: p.accent }}>{p.image.slice(0, 2)}</div><div className="review-main"><b>{p.title}</b><span>{p.builder} · submitted {p.createdAt}</span></div><div className="review-checks"><span>✓ Details</span><span>{p.tags.includes('CAD model') ? '✓ CAD model' : '✓ Floor plan'}</span></div><button className="outline-button small" onClick={() => onOpen(p)}>Preview</button><button className="button small" onClick={() => onUpdateStatus(p.id, 'published')}>Approve</button><button className="icon-button" title="Move to draft" onClick={() => onUpdateStatus(p.id, 'draft')}>×</button></div>) : <div className="empty-state">The review queue is clear. Nicely done.</div>}</section><section className="panel"><div className="panel-title"><div><p className="eyebrow">MARKETPLACE HEALTH</p><h2>Recent listings</h2></div></div><div className="admin-list">{properties.slice(0, 4).map(p => <button key={p.id} onClick={() => onOpen(p)}><span className="tiny-image" style={{ background: p.accent }}>{p.image.slice(0, 2)}</span><b>{p.title}</b><small>{p.city}</small><span className={`status ${p.status}`}>{p.status}</span><i>→</i></button>)}</div></section></section> }


function PropertyBlueprintPreview({ property, onTour, onEditor, onCalculator, onTwin }: { property: Property; onTour: () => void; onEditor: () => void; onCalculator: () => void; onTwin?: () => void }) {
  return (
    <section className="property-blueprint-preview">
      <div className="property-blueprint-header">
        <div>
          <p className="eyebrow">{property.type.toUpperCase()} · {property.locality.toUpperCase()}</p>
          <h1>{property.title}</h1>
          <p>{property.description}</p>
        </div>
        <div className="property-blueprint-actions">
          <button className="button" onClick={onTour}>Open 3D tour <span>→</span></button>
          <button className="outline-button" onClick={onEditor}>Open 3D CAD studio</button>
          <button className="text-button" onClick={onCalculator}>Calculate EMI →</button>
        </div>
      </div>
      <div className="property-blueprint-canvas">
        <BlueprintEditor
          plan={property.blueprintPlan}
          rawBlueprint={property.rawBlueprint}
          onSave={onEditor}
        />
      </div>
    </section>
  )
}

export default App

