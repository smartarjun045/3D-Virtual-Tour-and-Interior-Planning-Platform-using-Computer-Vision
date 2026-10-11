import { useState, useMemo, useCallback } from 'react'

/* ─────────────────────────────────────────────────────
   AI Interior Advisor — Furniture Suggestion Engine
   Gives user two outputs: 1) User's Pick, 2) AI Suggestion
   ───────────────────────────────────────────────────── */

interface FurnitureItem {
  id: string
  name: string
  category: string
  style: string
  color: string
  material: string
  price: number
  icon: string
  description: string
  matchScore?: number
  reasons?: string[]
}

interface RoomConfig {
  name: string
  size: 'small' | 'medium' | 'large'
  style: string
  budget: 'economy' | 'mid-range' | 'premium'
  colorTheme: string
}

/** The furniture catalog */
const CATALOG: FurnitureItem[] = [
  // Chairs
  { id: 'chair-modern-1', name: 'Nordic Lounge Chair', category: 'Chair', style: 'Modern', color: '#d4c4a8', material: 'Fabric + Oak', price: 18500, icon: '🪑', description: 'Clean-lined lounge chair with solid oak legs and muted linen upholstery.' },
  { id: 'chair-classic-1', name: 'Chesterfield Armchair', category: 'Chair', style: 'Classic', color: '#6b4423', material: 'Leather', price: 32000, icon: '🪑', description: 'Tufted leather armchair with rolled arms and deep button detailing.' },
  { id: 'chair-minimal-1', name: 'Wire Frame Chair', category: 'Chair', style: 'Minimal', color: '#2c2c2c', material: 'Steel + Cushion', price: 12000, icon: '🪑', description: 'Geometric wire-frame dining chair with a removable seat pad.' },
  { id: 'chair-boho-1', name: 'Rattan Accent Chair', category: 'Chair', style: 'Bohemian', color: '#c8a96e', material: 'Natural Rattan', price: 14500, icon: '🪑', description: 'Hand-woven rattan tub chair, bringing warmth and organic texture.' },
  { id: 'chair-ergonomic-1', name: 'ErgoFlex Office Chair', category: 'Chair', style: 'Modern', color: '#444444', material: 'Mesh + Alloy', price: 28000, icon: '🪑', description: 'Adjustable ergonomic desk chair with lumbar support and breathable mesh.' },

  // Sofas
  { id: 'sofa-modern-1', name: 'Modular L-Shape Sofa', category: 'Sofa', style: 'Modern', color: '#8b9daa', material: 'Performance Fabric', price: 65000, icon: '🛋️', description: 'Configurable sectional sofa with deep seating and stain-resistant fabric.' },
  { id: 'sofa-classic-1', name: 'Velvet Tuxedo Sofa', category: 'Sofa', style: 'Classic', color: '#2d5a4e', material: 'Velvet', price: 78000, icon: '🛋️', description: 'Art-deco inspired three-seater with channel tufting and brass legs.' },
  { id: 'sofa-minimal-1', name: 'Low-Profile Daybed', category: 'Sofa', style: 'Minimal', color: '#e8ddd0', material: 'Linen + Walnut', price: 42000, icon: '🛋️', description: 'Japanese-inspired daybed with a floating walnut platform base.' },

  // Tables
  { id: 'table-dining-1', name: 'Live Edge Dining Table', category: 'Table', style: 'Rustic', color: '#7a5c3e', material: 'Solid Wood + Steel', price: 45000, icon: '🪵', description: 'Reclaimed wood dining table with a live-edge slab and industrial legs.' },
  { id: 'table-modern-1', name: 'Glass Oval Table', category: 'Table', style: 'Modern', color: '#d4e4ef', material: 'Tempered Glass + Chrome', price: 38000, icon: '🪵', description: 'Sleek oval dining table with tempered glass top and chrome pedestal.' },
  { id: 'table-coffee-1', name: 'Marble Coffee Table', category: 'Table', style: 'Premium', color: '#f0ede8', material: 'Italian Marble + Brass', price: 52000, icon: '🪵', description: 'Statement piece with a Calacatta marble surface and brushed brass frame.' },
  { id: 'table-work-1', name: 'Standing Desk Pro', category: 'Table', style: 'Modern', color: '#3c3c3c', material: 'Bamboo + Alloy', price: 34000, icon: '🪵', description: 'Height-adjustable standing desk with a natural bamboo work surface.' },

  // Beds
  { id: 'bed-platform-1', name: 'Floating Platform Bed', category: 'Bed', style: 'Minimal', color: '#b9a88f', material: 'Engineered Wood', price: 48000, icon: '🛏️', description: 'Cantilevered platform bed that appears to float above the floor.' },
  { id: 'bed-upholstered-1', name: 'Velvet Wingback Bed', category: 'Bed', style: 'Classic', color: '#5a6e8f', material: 'Velvet + Hardwood', price: 72000, icon: '🛏️', description: 'Grand wingback headboard bed in deep navy velvet with solid frame.' },

  // Lighting
  { id: 'lamp-pendant-1', name: 'Cluster Pendant Light', category: 'Lighting', style: 'Modern', color: '#d4aa6d', material: 'Brass + Glass', price: 15000, icon: '💡', description: 'Multi-globe pendant with hand-blown glass shades on a brass fixture.' },
  { id: 'lamp-floor-1', name: 'Arc Floor Lamp', category: 'Lighting', style: 'Modern', color: '#c0c0c0', material: 'Steel + Linen', price: 12000, icon: '💡', description: 'Sweeping arc lamp with an oversized linen drum shade.' },

  // Storage
  { id: 'shelf-wall-1', name: 'Modular Wall Shelves', category: 'Storage', style: 'Minimal', color: '#3d3d3d', material: 'Steel + Plywood', price: 16000, icon: '📦', description: 'Interchangeable wall-mount shelving units in matte black steel.' },
  { id: 'cabinet-1', name: 'Mid-Century Credenza', category: 'Storage', style: 'Retro', color: '#9a6b3a', material: 'Walnut + Brass', price: 42000, icon: '📦', description: 'Sliding-door sideboard with a warm walnut finish and brass hairpin legs.' },

  // Rugs
  { id: 'rug-wool-1', name: 'Hand-Knotted Wool Rug', category: 'Rug', style: 'Bohemian', color: '#c8a96e', material: 'New Zealand Wool', price: 25000, icon: '🟫', description: 'Dense, hand-knotted area rug with tribal-inspired patterns.' },
  { id: 'rug-minimal-1', name: 'Flatweave Jute Rug', category: 'Rug', style: 'Minimal', color: '#d7c9a8', material: 'Natural Jute', price: 9800, icon: '🟫', description: 'Simple, eco-friendly jute rug that adds warmth without visual clutter.' },
]

/** AI recommendation rules */
const STYLE_COMPATIBILITY: Record<string, string[]> = {
  'Modern': ['Modern', 'Minimal', 'Premium'],
  'Classic': ['Classic', 'Retro', 'Premium'],
  'Minimal': ['Minimal', 'Modern'],
  'Bohemian': ['Bohemian', 'Rustic', 'Retro'],
  'Industrial': ['Modern', 'Rustic', 'Minimal'],
  'Scandinavian': ['Minimal', 'Modern'],
}

const BUDGET_LIMITS: Record<string, number> = {
  'economy': 25000,
  'mid-range': 55000,
  'premium': 120000,
}

const ROOM_ESSENTIALS: Record<string, string[]> = {
  'Living Room': ['Sofa', 'Chair', 'Table', 'Lighting', 'Rug'],
  'Bedroom': ['Bed', 'Lighting', 'Storage', 'Rug'],
  'Dining Room': ['Table', 'Chair', 'Lighting'],
  'Home Office': ['Table', 'Chair', 'Lighting', 'Storage'],
  'Kitchen': ['Table', 'Chair', 'Lighting'],
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

/** Score and suggest alternatives for a given user pick */
function getAISuggestions(userPick: FurnitureItem, roomConfig: RoomConfig): FurnitureItem[] {
  const compatibleStyles = STYLE_COMPATIBILITY[roomConfig.style] || [roomConfig.style]
  const budgetLimit = BUDGET_LIMITS[roomConfig.budget]

  return CATALOG
    .filter(item => item.category === userPick.category && item.id !== userPick.id)
    .map(item => {
      let score = 0
      const reasons: string[] = []

      // Style match
      if (compatibleStyles.includes(item.style)) {
        score += 35
        reasons.push(`Matches your ${roomConfig.style} aesthetic`)
      }
      // Budget fit
      if (item.price <= budgetLimit) {
        score += 25
        reasons.push(`Within ${roomConfig.budget} budget`)
      }
      // Price-performance
      if (item.price < userPick.price * 0.85) {
        score += 15
        reasons.push(`${Math.round((1 - item.price / userPick.price) * 100)}% more affordable`)
      }
      // Room size match
      if (roomConfig.size === 'small' && item.style === 'Minimal') {
        score += 10
        reasons.push('Space-efficient for compact rooms')
      }
      if (roomConfig.size === 'large' && item.style === 'Classic') {
        score += 10
        reasons.push('Fills a large room gracefully')
      }
      // Material variety
      if (item.material !== userPick.material) {
        score += 5
        reasons.push('Adds textural variety')
      }

      return { ...item, matchScore: Math.min(score, 98), reasons }
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
}

type AdvisorView = 'configure' | 'pick' | 'compare'

export default function InteriorAdvisor() {
  const [view, setView] = useState<AdvisorView>('configure')
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    name: 'Living Room',
    size: 'medium',
    style: 'Modern',
    budget: 'mid-range',
    colorTheme: '#e8ddd0',
  })
  const [selectedItems, setSelectedItems] = useState<FurnitureItem[]>([])
  const [activeCategory, setActiveCategory] = useState('Chair')
  const [compareItem, setCompareItem] = useState<FurnitureItem | null>(null)

  const categories = useMemo(() => [...new Set(CATALOG.map(c => c.category))], [])

  const filteredCatalog = useMemo(() =>
    CATALOG.filter(item => item.category === activeCategory),
    [activeCategory]
  )

  const suggestions = useMemo(() => {
    if (!compareItem) return []
    return getAISuggestions(compareItem, roomConfig)
  }, [compareItem, roomConfig])

  const topSuggestion = suggestions[0] || null

  const toggleItem = useCallback((item: FurnitureItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(p => p.id === item.id)
      if (exists) return prev.filter(p => p.id !== item.id)
      return [...prev, item]
    })
  }, [])

  const totalPrice = useMemo(() => selectedItems.reduce((sum, item) => sum + item.price, 0), [selectedItems])

  const essentials = ROOM_ESSENTIALS[roomConfig.name] || ['Chair', 'Table', 'Lighting']
  const missingCategories = essentials.filter(cat =>
    !selectedItems.some(item => item.category === cat)
  )

  return (
    <section className="page-section interior-advisor">
      {/* Header */}
      <div className="ia-header">
        <div>
          <p className="eyebrow">INTERIOR DESIGN ADVISOR</p>
          <h2>Design with intelligent recommendations.</h2>
          <p className="ia-subtitle">Select furniture for your room. Our recommendation engine analyzes your choices and suggests alternatives that better fit your style, budget and space.</p>
        </div>
        {view !== 'configure' && (
          <div className="ia-header-stats">
            <div className="ia-mini-stat">
              <small>ITEMS SELECTED</small>
              <b>{selectedItems.length}</b>
            </div>
            <div className="ia-mini-stat">
              <small>TOTAL ESTIMATE</small>
              <b>{formatINR(totalPrice)}</b>
            </div>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <div className="ia-tabs">
        <button className={view === 'configure' ? 'active' : ''} onClick={() => setView('configure')}>
          <span>01</span> Room Setup
        </button>
        <button className={view === 'pick' ? 'active' : ''} onClick={() => setView('pick')}>
          <span>02</span> Pick Furniture
        </button>
        <button className={view === 'compare' ? 'active' : ''} onClick={() => setView('compare')} disabled={selectedItems.length === 0}>
          <span>03</span> Compare & Suggest
        </button>
      </div>

      {/* CONFIGURE */}
      {view === 'configure' && (
        <div className="ia-configure">
          <div className="ia-config-form">
            <p className="eyebrow">ROOM CONFIGURATION</p>
            <h3>Tell us about your room.</h3>

            <label className="ia-field">
              <span>Room type</span>
              <select value={roomConfig.name} onChange={e => setRoomConfig(prev => ({ ...prev, name: e.target.value }))}>
                <option>Living Room</option>
                <option>Bedroom</option>
                <option>Dining Room</option>
                <option>Home Office</option>
                <option>Kitchen</option>
              </select>
            </label>

            <label className="ia-field">
              <span>Room size</span>
              <div className="ia-size-buttons">
                {(['small', 'medium', 'large'] as const).map(s => (
                  <button key={s} className={roomConfig.size === s ? 'active' : ''} onClick={() => setRoomConfig(prev => ({ ...prev, size: s }))}>
                    {s === 'small' ? '< 150 sq ft' : s === 'medium' ? '150–300 sq ft' : '> 300 sq ft'}
                  </button>
                ))}
              </div>
            </label>

            <label className="ia-field">
              <span>Design style</span>
              <div className="ia-style-grid">
                {['Modern', 'Classic', 'Minimal', 'Bohemian', 'Industrial', 'Scandinavian'].map(style => (
                  <button key={style} className={`ia-style-chip ${roomConfig.style === style ? 'active' : ''}`} onClick={() => setRoomConfig(prev => ({ ...prev, style }))}>
                    {style}
                  </button>
                ))}
              </div>
            </label>

            <label className="ia-field">
              <span>Budget per item</span>
              <div className="ia-size-buttons">
                {(['economy', 'mid-range', 'premium'] as const).map(b => (
                  <button key={b} className={roomConfig.budget === b ? 'active' : ''} onClick={() => setRoomConfig(prev => ({ ...prev, budget: b }))}>
                    {b === 'economy' ? '< ₹25K' : b === 'mid-range' ? '₹25K–55K' : '₹55K+'}
                  </button>
                ))}
              </div>
            </label>

            <label className="ia-field">
              <span>Color theme</span>
              <div className="ia-color-swatches">
                {['#e8ddd0', '#d4e4ef', '#dfe8d0', '#ede0d4', '#d4d4e8', '#2c2c2c'].map(c => (
                  <button key={c} className={roomConfig.colorTheme === c ? 'picked' : ''} style={{ background: c }} onClick={() => setRoomConfig(prev => ({ ...prev, colorTheme: c }))} />
                ))}
              </div>
            </label>

            <button className="button ia-continue" onClick={() => setView('pick')}>
              Continue to furniture <span>→</span>
            </button>
          </div>

          <aside className="ia-config-preview">
            <div className="ia-config-summary">
              <div className="ia-summary-icon">✦</div>
              <p className="eyebrow">DESIGN ADVISOR READY</p>
              <h3>What happens next?</h3>
              <ol>
                <li><span>01</span><div><b>Browse furniture</b><p>Pick items from our curated catalog.</p></div></li>
                <li><span>02</span><div><b>Get smart recommendations</b><p>For every piece you choose, we recommend an alternative that fits your style, space and budget better.</p></div></li>
                <li><span>03</span><div><b>Compare side by side</b><p>See "Your Pick" vs "Recommended Selection" — with reasons, pricing and compatibility score.</p></div></li>
              </ol>
            </div>
          </aside>
        </div>
      )}

      {/* PICK FURNITURE */}
      {view === 'pick' && (
        <div className="ia-picker">
          {/* Category sidebar */}
          <aside className="ia-categories">
            <p className="eyebrow">CATEGORIES</p>
            {categories.map(cat => (
              <button key={cat} className={`ia-cat-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                <span>{CATALOG.find(c => c.category === cat)?.icon}</span>
                {cat}
                {selectedItems.some(i => i.category === cat) && <i className="ia-cat-check">✓</i>}
              </button>
            ))}

            {/* Missing essentials notice */}
            {missingCategories.length > 0 && (
              <div className="ia-missing-notice">
                <p className="eyebrow">RECOMMENDED FOR {roomConfig.name.toUpperCase()}</p>
                <small>Add: {missingCategories.join(', ')}</small>
              </div>
            )}
          </aside>

          {/* Product grid */}
          <div className="ia-product-area">
            <div className="ia-product-header">
              <h3>{activeCategory}s for your {roomConfig.name}</h3>
              <span>{filteredCatalog.length} options</span>
            </div>
            <div className="ia-product-grid">
              {filteredCatalog.map(item => {
                const isSelected = selectedItems.some(s => s.id === item.id)
                return (
                  <div key={item.id} className={`ia-product-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleItem(item)}>
                    <div className="ia-product-visual" style={{ background: item.color }}>
                      <span className="ia-product-emoji">{item.icon}</span>
                      {isSelected && <span className="ia-selected-badge">✓ Selected</span>}
                    </div>
                    <div className="ia-product-info">
                      <b>{item.name}</b>
                      <small className="ia-product-style">{item.style} · {item.material}</small>
                      <p className="ia-product-desc">{item.description}</p>
                      <div className="ia-product-bottom">
                        <b className="ia-product-price">{formatINR(item.price)}</b>
                        <button className={`ia-add-btn ${isSelected ? 'added' : ''}`} onClick={e => { e.stopPropagation(); toggleItem(item) }}>
                          {isSelected ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom action */}
            {selectedItems.length > 0 && (
              <div className="ia-picker-footer">
                <div>
                  <b>{selectedItems.length} items selected</b>
                  <small>Total: {formatINR(totalPrice)}</small>
                </div>
                <button className="button" onClick={() => { setCompareItem(selectedItems[0]); setView('compare') }}>
                  Get recommendations <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPARE — User Pick vs AI Suggestion */}
      {view === 'compare' && (
        <div className="ia-compare">
          {/* Item selector strip */}
          <div className="ia-compare-strip">
            <p className="eyebrow">YOUR SELECTED ITEMS — TAP TO COMPARE</p>
            <div className="ia-compare-items">
              {selectedItems.map(item => (
                <button
                  key={item.id}
                  className={`ia-compare-chip ${compareItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => setCompareItem(item)}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Side by side comparison */}
          {compareItem && topSuggestion && (
            <div className="ia-versus">
              {/* User's Pick */}
              <div className="ia-versus-card ia-user-pick">
                <div className="ia-versus-label">
                  <span className="ia-label-badge user">YOUR PICK</span>
                </div>
                <div className="ia-versus-visual" style={{ background: compareItem.color }}>
                  <span>{compareItem.icon}</span>
                </div>
                <h3>{compareItem.name}</h3>
                <p className="ia-versus-style">{compareItem.style} · {compareItem.material}</p>
                <p className="ia-versus-desc">{compareItem.description}</p>
                <div className="ia-versus-price">
                  <b>{formatINR(compareItem.price)}</b>
                </div>
                <div className="ia-versus-traits">
                  <span><b>Style</b> {compareItem.style}</span>
                  <span><b>Material</b> {compareItem.material}</span>
                  <span><b>Category</b> {compareItem.category}</span>
                </div>
              </div>

              {/* VS badge */}
              <div className="ia-vs-divider">
                <span>VS</span>
              </div>

              {/* Recommended Suggestion */}
              <div className="ia-versus-card ia-ai-pick">
                <div className="ia-versus-label">
                  <span className="ia-label-badge ai">✦ RECOMMENDED SELECTION</span>
                  <span className="ia-match-score">{topSuggestion.matchScore}% match</span>
                </div>
                <div className="ia-versus-visual" style={{ background: topSuggestion.color }}>
                  <span>{topSuggestion.icon}</span>
                </div>
                <h3>{topSuggestion.name}</h3>
                <p className="ia-versus-style">{topSuggestion.style} · {topSuggestion.material}</p>
                <p className="ia-versus-desc">{topSuggestion.description}</p>
                <div className="ia-versus-price">
                  <b>{formatINR(topSuggestion.price)}</b>
                  {topSuggestion.price < compareItem.price && (
                    <em className="ia-savings">Save {formatINR(compareItem.price - topSuggestion.price)}</em>
                  )}
                </div>

                {/* Recommendations Reasons */}
                <div className="ia-reasons">
                  <p className="eyebrow">WHY THIS SELECTION</p>
                  {topSuggestion.reasons?.map((reason, i) => (
                    <div key={i} className="ia-reason">
                      <span>✦</span>
                      <small>{reason}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* More alternatives */}
          {suggestions.length > 1 && (
            <div className="ia-more-suggestions">
              <p className="eyebrow">CURATED ALTERNATIVES</p>
              <div className="ia-alt-grid">
                {suggestions.slice(1, 4).map(alt => (
                  <div key={alt.id} className="ia-alt-card">
                    <div className="ia-alt-visual" style={{ background: alt.color }}>
                      <span>{alt.icon}</span>
                    </div>
                    <div>
                      <b>{alt.name}</b>
                      <small>{alt.style} · {formatINR(alt.price)}</small>
                      <div className="ia-alt-score">
                        <i style={{ width: `${alt.matchScore}%` }} />
                        <span>{alt.matchScore}%</span>
                      </div>
                    </div>
                    <button className="outline-button small" onClick={() => {
                      setSelectedItems(prev => prev.map(p => p.id === compareItem?.id ? alt : p))
                      setCompareItem(alt)
                    }}>
                      Swap
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final output summary */}
          <div className="ia-final-output">
            <div className="ia-output-header">
              <span className="ia-output-icon">✦</span>
              <div>
                <p className="eyebrow">FINAL DESIGN OUTPUT</p>
                <h3>Your curated interior plan</h3>
              </div>
            </div>
            <div className="ia-output-split">
              {/* Response 1: User's selection */}
              <div className="ia-output-panel ia-output-user">
                <div className="ia-output-label">
                  <span className="ia-label-badge user">RESPONSE 1</span>
                  <b>Your Selections</b>
                </div>
                <div className="ia-output-items">
                  {selectedItems.map(item => (
                    <div key={item.id} className="ia-output-item">
                      <span style={{ background: item.color }}>{item.icon}</span>
                      <div>
                        <b>{item.name}</b>
                        <small>{item.category} · {formatINR(item.price)}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ia-output-total">
                  <span>Total</span>
                  <b>{formatINR(totalPrice)}</b>
                </div>
              </div>

              {/* Response 2: Recommended selection */}
              <div className="ia-output-panel ia-output-ai">
                <div className="ia-output-label">
                  <span className="ia-label-badge ai">RESPONSE 2</span>
                  <b>Curated & Optimized Plan</b>
                </div>
                <div className="ia-output-items">
                  {selectedItems.map(item => {
                    const aiAlt = getAISuggestions(item, roomConfig)[0]
                    const final = aiAlt || item
                    const isSwapped = aiAlt && aiAlt.id !== item.id
                    return (
                      <div key={item.id} className={`ia-output-item ${isSwapped ? 'ia-swapped' : ''}`}>
                        <span style={{ background: final.color }}>{final.icon}</span>
                        <div>
                          <b>{final.name}</b>
                          <small>{final.category} · {formatINR(final.price)}{isSwapped ? ' · Recommended swap' : ''}</small>
                        </div>
                        {isSwapped && <i className="ia-swap-badge">✦</i>}
                      </div>
                    )
                  })}
                </div>
                <div className="ia-output-total">
                  <span>Total</span>
                  <b>{formatINR(selectedItems.reduce((sum, item) => {
                    const aiAlt = getAISuggestions(item, roomConfig)[0]
                    return sum + (aiAlt?.price || item.price)
                  }, 0))}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
