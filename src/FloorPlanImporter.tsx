import { useState, useRef, useCallback, useEffect } from 'react'
import BlueprintEditor from './BlueprintEditor'
import ThreeFloorplannerViewer from './ThreeFloorplannerViewer'
import { recognizeFloorPlanWithAi, type AiRecognitionResult } from './floorPlanAiRecognizer'

/** Formats accepted by the floor-plan import workflow. */
const ACCEPTED_MIME = '.rvt,.ifc,.skp,.dwg,.dxf,.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,image/webp,application/pdf'

const FORMAT_LABELS: Record<string, string> = {
  rvt: 'Autodesk Revit (.rvt)',
  ifc: 'IFC OpenBIM (.ifc)',
  skp: 'Trimble SketchUp (.skp)',
  dwg: 'AutoCAD Blueprint (.dwg)',
  dxf: 'Drawing Exchange (.dxf)',
  pdf: 'Architectural PDF (.pdf)',
  jpg: 'High-Res Floorplan (.jpg)',
  jpeg: 'Floorplan Image (.jpeg)',
  png: 'Floorplan Blueprint (.png)',
  webp: 'WebP Blueprint (.webp)',
  glb: '3D Binary Model (.glb)',
  gltf: '3D Scene (.gltf)',
}

interface DetectedElement {
  type: 'room' | 'wall' | 'opening' | 'staircase' | 'fixture'
  label: string
  confidence: number
}

interface ParseResult {
  filename: string
  fileType: string
  formatDescription: string
  fileSize: string
  rooms: number
  walls: number
  openings: number
  elements: DetectedElement[]
  thumbnail: string | null
}

type ImportStage = 'upload' | 'parsing' | 'analysis' | 'preview' | 'editing'
type AiProviderOption = 'auto' | 'gemini' | 'openai'

export interface ImportedPlanPayload {
  title: string
  area: number
  beds: number
  baths: number
  planJson: string
  aiProvider?: string
  aiModel?: string
  rawBlueprint?: any
}

export default function FloorPlanImporter({ onComplete }: { onComplete?: (payload: ImportedPlanPayload) => void }) {

  const [stage, setStage] = useState<ImportStage>('upload')
  const [selectedProvider, setSelectedProvider] = useState<AiProviderOption>('auto')
  const [providerStatus, setProviderStatus] = useState<{ gemini: boolean; openai: boolean }>({ gemini: true, openai: true })
  const [file, setFile] = useState<File | null>(null)
  const [aiResult, setAiResult] = useState<AiRecognitionResult | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [converting, setConverting] = useState(false)
  const [convertedPlan, setConvertedPlan] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [parseProgress, setParseProgress] = useState(1)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch backend provider status on mount
  useEffect(() => {
    fetch('/api/floorplan/status')
      .then(res => res.json())
      .then(data => {
        if (data?.providers) {
          setProviderStatus({
            gemini: Boolean(data.providers.gemini?.configured),
            openai: Boolean(data.providers.openai?.configured)
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setStage('parsing')
    setParseProgress(1)

    // Generate a local preview where the browser can display the source format.
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf' || f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPdfPreview(url)
    }

    // Progress step ticks for user feedback
    const t1 = setTimeout(() => setParseProgress(2), 250)
    const t2 = setTimeout(() => setParseProgress(3), 550)
    const t3 = setTimeout(() => setParseProgress(4), 850)

    try {
      const aiRes = await recognizeFloorPlanWithAi(f, selectedProvider)
      setAiResult(aiRes)

      setParseResult({
        filename: f.name,
        fileType: ext.toUpperCase(),
        formatDescription: FORMAT_LABELS[ext] || `${ext.toUpperCase()} Plan`,
        fileSize: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${(f.size / 1024).toFixed(1)} KB`,
        rooms: aiRes.rooms.length,
        walls: aiRes.rawBlueprint.walls.length,
        openings: aiRes.openings.length,
        elements: aiRes.rooms.map(r => ({
          type: (r.type === 'bedroom' || r.type === 'living' || r.type === 'dining' || r.type === 'kitchen') ? 'room' : r.type === 'bathroom' ? 'fixture' : 'opening',
          label: `${r.name} (${r.dimensions})`,
          confidence: r.confidence
        })),
        thumbnail: null
      })

      setConvertedPlan(aiRes.blueprintPlan)

      setTimeout(() => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        setStage('analysis')
      }, 1100)
    } catch (err) {
      console.error('Recognition error:', err)
      setParseResult(null)
      setStage('upload')
      window.alert(err instanceof Error ? err.message : 'Recognition failed. Please try another image.')
    }
  }, [selectedProvider])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const startConversion = useCallback(() => {
    setConverting(true)
    setTimeout(() => {
      setConvertedPlan(aiResult?.blueprintPlan || convertedPlan || 'plan_50x30_bungalow')
      setConverting(false)
      setStage('preview')
    }, 1200)
  }, [aiResult, convertedPlan])

  const openEditor = useCallback(() => {
    setStage('editing')
  }, [])

  const handleSaveToProperties = useCallback(() => {
    if (!convertedPlan) return
    const bedCount = aiResult?.rooms.filter(r => r.type === 'bedroom').length || 3
    const bathCount = aiResult?.rooms.filter(r => r.type === 'bathroom').length || 2
    const cleanFileName = file?.name ? file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Imported 3D Home'
    const title = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1)
    
    onComplete?.({
      title: title || 'Imported 3D Home',
      area: aiResult?.totalAreaSqFt || 1450,
      beds: bedCount,
      baths: bathCount,
      planJson: convertedPlan,
      aiProvider: aiResult?.aiProvider,
      aiModel: aiResult?.aiModel,
      rawBlueprint: aiResult?.rawBlueprint
    })
  }, [convertedPlan, aiResult, file, onComplete])

  return (
    <section className="page-section floorplan-importer">
      {/* Header */}
      <div className="fpi-header">
        <div>
          <p className="eyebrow">FLOOR PLAN IMPORT HUB</p>
          <h2>Import any floor plan into 3D.</h2>
          <p className="fpi-subtitle">
            Upload Revit, IFC, SketchUp, AutoCAD, PDF, or JPG floor plans to detect rooms, walls and openings — then convert into an editable 3D model.
          </p>
        </div>
        <div className="fpi-supported">
          <p className="eyebrow">ALL SUPPORTED FORMATS</p>
          <div className="fpi-format-tags">
            {['.RVT', '.IFC', '.SKP', '.DWG', '.DXF', '.PDF', '.JPG', '.PNG'].map(fmt => (
              <span key={fmt} className="fpi-format-tag">{fmt}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="fpi-steps">
        {(['upload', 'parsing', 'analysis', 'preview', 'editing'] as ImportStage[]).map((s, i) => (
          <div key={s} className={`fpi-step ${stage === s ? 'active' : ''} ${(['upload', 'parsing', 'analysis', 'preview', 'editing'].indexOf(stage) > i) ? 'done' : ''}`}>
            <span>{i + 1}</span>
            <small>{['Upload', 'Parse', 'Analyze', 'Preview', 'Edit'][i]}</small>
          </div>
        ))}
      </div>

      {/* STAGE: Upload */}
      {stage === 'upload' && (
        <div className="fpi-upload-area">
          <div
            className={`fpi-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept={ACCEPTED_MIME} onChange={onFileSelect} style={{ display: 'none' }} />
            <div className="fpi-drop-icon">
              <span className="fpi-drop-arrow">↑</span>
              <div className="fpi-drop-rings">
                <i /><i /><i />
              </div>
            </div>
            <h3>Drop your floor plan here</h3>
            <p>or click to browse files</p>
            <small>.rvt · .ifc · .skp · .dwg · .dxf · .pdf · .jpg · .png — up to 50 MB</small>
          </div>

          {/* Supported architectural sources */}
          <div className="fpi-quick-sources">
            <p className="eyebrow">SUPPORTED ARCHITECTURAL SOURCES</p>
            <div className="fpi-source-cards">
              {[
                ['R', 'revit', 'Autodesk Revit (.rvt)', 'Native BIM models & project sheets'],
                ['I', 'ifc', 'IFC / OpenBIM (.ifc)', 'Industry-standard BIM exchange'],
                ['S', 'sketchup', 'Trimble SketchUp (.skp)', '3D architectural layouts'],
                ['A', 'autocad', 'AutoCAD (.dwg / .dxf)', '2D vector blueprints & CAD plans'],
                ['P', 'pdf', 'PDF floor plan (.pdf)', 'Architectural drawings & spec sheets'],
                ['J', 'image', 'Floor plan image (.jpg, .png)', 'Scanned plans & raster blueprints'],
              ].map(([icon, className, title, subtitle]) => (
                <button className="fpi-source-card" onClick={() => fileRef.current?.click()} key={className}>
                  <span className={`fpi-source-icon ${className}`}>{icon}</span>
                  <div><b>{title}</b><small>{subtitle}</small></div><i>→</i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAGE: Parsing */}
      {stage === 'parsing' && (
        <div className="fpi-parsing">
          <div className="fpi-parse-visual">
            <div className="fpi-scan-animation">
              <div className="fpi-scan-grid">
                {Array.from({ length: 48 }, (_, i) => (
                  <i key={i} style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
              <div className="fpi-scan-line" />
            </div>
          </div>
          <div className="fpi-parse-info">
            <div className="fpi-parse-spinner" />
            <h3>Analyzing floor plan with Computer Vision…</h3>
            <p>
              Spatial vectorization and geometric synthesis in <b>{file?.name}</b>
            </p>
            <div className="fpi-parse-steps">
              <span className={parseProgress >= 1 ? 'done' : ''}>
                {parseProgress >= 1 ? '✓' : '○'} Floor plan ingested & vectorized
              </span>
              <span className={parseProgress === 2 ? 'active' : parseProgress > 2 ? 'done' : ''}>
                {parseProgress > 2 ? '✓' : parseProgress === 2 ? '◌' : '○'} Running Computer Vision Engine…
              </span>
              <span className={parseProgress === 3 ? 'active' : parseProgress > 3 ? 'done' : ''}>
                {parseProgress > 3 ? '✓' : parseProgress === 3 ? '◌' : '○'} Extracting room polygons, dimensions & openings
              </span>
              <span className={parseProgress >= 4 ? 'active' : ''}>
                {parseProgress >= 4 ? '◌' : '○'} Synthesizing 3D CAD Blueprint geometry
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE: Analysis */}
      {stage === 'analysis' && parseResult && (
        <div className="fpi-analysis">
          <div className="fpi-analysis-left">


            {/* File info card */}
            <div className="fpi-file-card">
              <div className="fpi-file-icon">{parseResult.fileType}</div>
              <div>
                <b>{parseResult.filename}</b>
                <small>{parseResult.fileSize} · {parseResult.formatDescription}</small>
              </div>
              <span className="fpi-file-check">✓</span>
            </div>

            {/* Detection stats */}
            <div className="fpi-detection-stats">
              <p className="eyebrow">RECOGNIZED ARCHITECTURAL ELEMENTS</p>
              <div className="fpi-stat-row">
                <div className="fpi-stat">
                  <b>{parseResult.rooms}</b>
                  <small>Rooms</small>
                </div>
                <div className="fpi-stat">
                  <b>{parseResult.walls}</b>
                  <small>Walls</small>
                </div>
                <div className="fpi-stat">
                  <b>{parseResult.openings}</b>
                  <small>Openings</small>
                </div>
              </div>
            </div>

            {/* Detected elements list */}
            <div className="fpi-elements">
              <p className="eyebrow">ARCHITECTURAL BREAKDOWN</p>
              {parseResult.elements.map((el, i) => (
                <div key={i} className={`fpi-element fpi-el-${el.type}`}>
                  <span className="fpi-el-badge">{el.type === 'room' ? '⊞' : el.type === 'opening' ? '◫' : '◇'}</span>
                  <div>
                    <b>{el.label}</b>
                    <small>{el.type} · {(el.confidence * 100).toFixed(0)}% confidence</small>
                  </div>
                  <div className="fpi-confidence-bar">
                    <i style={{ width: `${el.confidence * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="fpi-analysis-actions">
              <button className="button" onClick={startConversion} disabled={converting}>
                {converting ? 'Converting…' : 'Convert to 3D model'} <span>→</span>
              </button>
              <button className="outline-button" onClick={() => { setStage('upload'); setFile(null); setParseResult(null); setPdfPreview(null) }}>
                Upload different file
              </button>
            </div>
          </div>

          {/* Preview area */}
          <div className="fpi-analysis-right">
            <p className="eyebrow">FLOOR PLAN PREVIEW</p>
            {pdfPreview ? (
              <div className="fpi-preview-frame">
                {file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={pdfPreview} title="Floor plan preview" className="fpi-pdf-frame" />
                ) : (
                  <img src={pdfPreview} alt="Floor plan" className="fpi-img-preview" />
                )}
              </div>
            ) : (
              <div className="fpi-preview-placeholder">
                <div className="fpi-preview-wireframe">
                  {parseResult.elements.filter(e => e.type === 'room').map((room, i) => (
                    <div key={i} className="fpi-wireframe-room" style={{
                      gridColumn: `${(i % 3) + 1}`,
                      gridRow: `${Math.floor(i / 3) + 1}`,
                    }}>
                      <span>{room.label}</span>
                    </div>
                  ))}
                </div>
                <small>Schematic view of detected layout</small>
              </div>
            )}

            {converting && (
              <div className="fpi-converting-overlay">
                <div className="fpi-convert-spinner" />
                <b>Building 3D model…</b>
                <small>Generating walls, floors and ceilings from your plan</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE: Preview */}
      {stage === 'preview' && convertedPlan && (
        <div className="fpi-preview-stage">
          <div className="fpi-preview-header">
            <div>
              <span className="fpi-success-badge">✓ 3DFloorplanner Geometry Ready</span>
              <h3>Generated 3D Home Structure</h3>
              <p>Procedural walls, extruded floor geometries, and openings synthesized from Computer Vision architectural scan.</p>
            </div>
            <div className="fpi-preview-actions">
              <button className="button" style={{ background: '#10b981' }} onClick={handleSaveToProperties}>
                ✓ Add to Properties & Marketplace <span>→</span>
              </button>
              <button className="button" onClick={openEditor}>Open 2D/3D CAD Studio <span>→</span></button>
              <button className="outline-button" onClick={() => { setStage('upload'); setFile(null); setParseResult(null); setConvertedPlan(null); setPdfPreview(null) }}>Import another plan</button>
            </div>
          </div>
          <div className="fpi-preview-canvas">
            <ThreeFloorplannerViewer 
              blueprint={aiResult?.rawBlueprint}
              plotDimensions={aiResult?.plotDimensions}
              totalAreaSqFt={aiResult?.totalAreaSqFt}
              onOpenFullCadStudio={openEditor}
            />
          </div>
        </div>
      )}

      {/* STAGE: Editing */}
      {stage === 'editing' && convertedPlan && (
        <div className="fpi-editing-stage">
          <div className="fpi-editing-header">
            <div>
              <p className="eyebrow">IMPORTED PLAN · 3D CAD STUDIO</p>
              <h2>Customize your imported plan.</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="outline-button" onClick={() => setStage('preview')}>← Back to preview</button>
              <button className="button" style={{ background: '#10b981' }} onClick={handleSaveToProperties}>
                Save & Add to Properties <span>→</span>
              </button>
            </div>
          </div>
          <div className="fpi-editing-canvas">
            <BlueprintEditor
              plan={convertedPlan}
              rawBlueprint={aiResult?.rawBlueprint}
              onSave={handleSaveToProperties}
            />
          </div>
        </div>
      )}
    </section>
  )
}

