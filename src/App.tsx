import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from '@/components/Header'
import { DropZone } from '@/components/DropZone'
import { processSvgFiles, MAX_FILES, type SvgInput } from '@/lib/svg-files'
import { OptionsPanel } from '@/components/OptionsPanel'
import { Preview } from '@/components/Preview'
import { CodeView } from '@/components/CodeView'
import { SplitView } from '@/components/SplitView'
import { SizeComparison } from '@/components/SizeComparison'
import { ExportPanel } from '@/components/ExportPanel'
import { ColorPalette } from '@/components/ColorPalette'
import { ThumbnailGrid, type ThumbnailItem } from '@/components/ThumbnailGrid'
import { DetailSheet } from '@/components/DetailSheet'
import { extractColors, applyColorOverrides, type ColorInfo } from '@/lib/colors'
import { useTheme } from '@/hooks/useTheme'
import { usePrimaryColor } from '@/hooks/usePrimaryColor'
import { useDownloadSettings } from '@/hooks/useDownloadSettings'
import { useSvgoQueue } from '@/hooks/useSvgoQueue'
import { useHistory } from '@/hooks/useHistory'
import { SettingsDialog } from '@/components/SettingsDialog'
import { getDefaultPluginStates } from '@/lib/svgo-config'
import { Loader2, Plus, Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SvgItem {
  id: string
  filename: string
  original: string
  optimized: string | null
  status: 'pending' | 'optimizing' | 'done' | 'error'
  error?: string
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `svg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function App() {
  const { theme, setTheme } = useTheme()
  const { color: primaryColor, setColor: setPrimaryColor } = usePrimaryColor()
  const { optimizedSuffix, setOptimizedSuffix } = useDownloadSettings()

  const [svgs, setSvgs] = useState<SvgItem[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  type EditState = {
    pluginStates: Record<string, boolean>
    colorOverrides: Record<string, string>
  }
  const {
    state: editState,
    set: setEditState,
    reset: resetEditState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<EditState>({
    pluginStates: getDefaultPluginStates(),
    colorOverrides: {},
  })
  const { pluginStates, colorOverrides } = editState

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const addFilesInputRef = useRef<HTMLInputElement>(null)

  const { optimizeMany, optimizeAppend, cancel } = useSvgoQueue({
    onStart: useCallback((id: string) => {
      setSvgs(prev => prev.map(s => s.id === id ? { ...s, status: 'optimizing' } : s))
    }, []),
    onResult: useCallback((id: string, optimized: string) => {
      setSvgs(prev => prev.map(s => s.id === id ? { ...s, status: 'done', optimized, error: undefined } : s))
    }, []),
    onError: useCallback((id: string, error: string) => {
      setSvgs(prev => prev.map(s => s.id === id ? { ...s, status: 'error', error } : s))
    }, []),
    onDone: useCallback(() => {}, []),
  })

  const runOptimize = useCallback((items: SvgItem[], states: Record<string, boolean>) => {
    cancel()
    if (items.length === 0) return
    setSvgs(prev => prev.map(s => ({ ...s, status: 'pending' as const })))
    optimizeMany(
      items.map(s => ({ id: s.id, svg: s.original })),
      states,
    )
  }, [cancel, optimizeMany])

  const triggerOptimize = useCallback((items: SvgItem[], states: Record<string, boolean>) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runOptimize(items, states), 150)
  }, [runOptimize])

  const handleSvgsInput = useCallback((inputs: SvgInput[]) => {
    const newItems: SvgItem[] = inputs.map(input => ({
      id: makeId(),
      filename: input.filename,
      original: input.svg,
      optimized: null,
      status: 'pending',
    }))
    setSvgs(prev => [...prev, ...newItems])
    // Only optimize the NEW items — existing ones keep their cached result.
    optimizeAppend(
      newItems.map(s => ({ id: s.id, svg: s.original })),
      pluginStates,
    )
  }, [pluginStates, optimizeAppend])

  const handleAddFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const valid = await processSvgFiles(fileList, svgs.length)
    if (valid.length > 0) handleSvgsInput(valid)
  }, [svgs.length, handleSvgsInput])

  const handlePasteInput = useCallback((svg: string) => {
    const item: SvgItem = {
      id: makeId(),
      filename: 'Pasted SVG',
      original: svg,
      optimized: null,
      status: 'pending',
    }
    setSvgs([item])
    triggerOptimize([item], pluginStates)
  }, [pluginStates, triggerOptimize])

  const handlePluginToggle = useCallback((pluginId: string, enabled: boolean) => {
    setEditState(prev => ({
      ...prev,
      pluginStates: { ...prev.pluginStates, [pluginId]: enabled },
    }))
  }, [setEditState])

  const handleResetDefaults = useCallback(() => {
    setEditState(prev => ({ ...prev, pluginStates: getDefaultPluginStates() }))
  }, [setEditState])

  const handleColorChange = useCallback((originalNormalized: string, newColor: string) => {
    setEditState(prev => ({
      ...prev,
      colorOverrides: { ...prev.colorOverrides, [originalNormalized]: newColor },
    }))
  }, [setEditState])

  const handleColorReset = useCallback(() => {
    setEditState(prev => ({ ...prev, colorOverrides: {} }))
  }, [setEditState])

  const handleResetAll = useCallback(() => {
    cancel()
    clearTimeout(debounceRef.current)
    setSvgs([])
    setDetailId(null)
    resetEditState({
      pluginStates: getDefaultPluginStates(),
      colorOverrides: {},
    })
  }, [cancel, resetEditState])

  const hasDefaultEditState =
    Object.keys(colorOverrides).length === 0 &&
    (() => {
      const defaults = getDefaultPluginStates()
      const keys = Object.keys(defaults)
      if (Object.keys(pluginStates).length !== keys.length) return false
      return keys.every(k => pluginStates[k] === defaults[k])
    })()
  const canReset = svgs.length > 0 || !hasDefaultEditState || canUndo || canRedo

  // Trigger re-optimization whenever plugin states change (toggle, reset, undo, redo).
  // Color overrides don't need re-optimization — they're applied as a post-step.
  // An Effect Event reads the latest svgs without re-running on every svgs change.
  const reoptimizeAll = useEffectEvent((states: Record<string, boolean>) => {
    if (svgs.length === 0) return
    triggerOptimize(svgs, states)
  })
  useEffect(() => {
    reoptimizeAll(pluginStates)
  }, [pluginStates])

  // Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo. Ignored when typing in inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Aggregate colors across all optimized SVGs (dedupe by normalized hex).
  const extractedColors = useMemo<ColorInfo[]>(() => {
    const map = new Map<string, ColorInfo>()
    for (const s of svgs) {
      if (!s.optimized) continue
      for (const c of extractColors(s.optimized)) {
        const existing = map.get(c.normalized)
        if (existing) {
          existing.count += c.count
        } else {
          map.set(c.normalized, { ...c })
        }
      }
    }
    return Array.from(map.values())
  }, [svgs])

  // Per-item modified SVG (optimized + color overrides applied).
  const modifiedById = useMemo(() => {
    const out = new Map<string, string | null>()
    const hasOverrides = Object.keys(colorOverrides).length > 0
    for (const s of svgs) {
      if (!s.optimized) {
        out.set(s.id, null)
        continue
      }
      out.set(s.id, hasOverrides ? applyColorOverrides(s.optimized, colorOverrides) : s.optimized)
    }
    return out
  }, [svgs, colorOverrides])

  const totals = useMemo(() => {
    let original = 0
    let optimized = 0
    for (const s of svgs) {
      original += new Blob([s.original]).size
      const m = modifiedById.get(s.id)
      optimized += m ? new Blob([m]).size : 0
    }
    return { original, optimized }
  }, [svgs, modifiedById])

  const pendingCount = svgs.filter(s => s.status === 'pending' || s.status === 'optimizing').length
  const errorItems = svgs.filter(s => s.status === 'error')

  const isBulk = svgs.length > 1
  const isEmpty = svgs.length === 0

  const thumbnailItems: ThumbnailItem[] = svgs.map(s => ({
    id: s.id,
    filename: s.filename,
    originalSize: new Blob([s.original]).size,
    optimizedSize: (() => {
      const m = modifiedById.get(s.id)
      return m ? new Blob([m]).size : 0
    })(),
    displaySvg: modifiedById.get(s.id) ?? null,
    status: s.status,
    error: s.error,
  }))

  const detailItem = detailId ? svgs.find(s => s.id === detailId) : null
  const detailModified = detailItem ? modifiedById.get(detailItem.id) ?? null : null
  const detailOriginalSize = detailItem ? new Blob([detailItem.original]).size : 0
  const detailOptimizedSize = detailModified ? new Blob([detailModified]).size : 0

  // Single-file mode helpers
  const single = !isBulk && svgs.length === 1 ? svgs[0] : null
  const singleModified = single ? modifiedById.get(single.id) ?? null : null

  const bulkExportItems = useMemo(
    () => svgs
      .filter(s => modifiedById.get(s.id))
      .map(s => ({ svg: modifiedById.get(s.id) as string, filename: s.filename })),
    [svgs, modifiedById],
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header
          onReset={handleResetAll}
          canReset={canReset}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {isEmpty ? (
          <main className="flex-1 flex items-center justify-center">
            <DropZone onSvgsInput={handleSvgsInput} onPasteInput={handlePasteInput} />
          </main>
        ) : (
          <main className="flex-1 flex overflow-hidden min-h-0">
            {/* Options Sidebar */}
            <aside className="w-72 border-r flex flex-col shrink-0 min-h-0">
              <OptionsPanel
                pluginStates={pluginStates}
                onPluginToggle={handlePluginToggle}
                onResetDefaults={handleResetDefaults}
              />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {isBulk
                      ? `${svgs.length} files`
                      : single?.filename || 'Pasted SVG'}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={undo}
                      disabled={!canUndo}
                      title="Undo (⌘Z)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={redo}
                      disabled={!canRedo}
                      title="Redo (⇧⌘Z)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      {isBulk
                        ? `Optimizing ${svgs.length - pendingCount + 1}/${svgs.length}…`
                        : 'Optimizing…'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => addFilesInputRef.current?.click()}
                    disabled={svgs.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add files
                  </Button>
                  <input
                    ref={addFilesInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  {isBulk ? (
                    <ExportPanel bulkItems={bulkExportItems} optimizedSuffix={optimizedSuffix} />
                  ) : (
                    <ExportPanel svg={singleModified} filename={single?.filename} optimizedSuffix={optimizedSuffix} />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">
                {svgs.length > 0 && (
                  <SizeComparison
                    originalSize={totals.original}
                    optimizedSize={totals.optimized}
                    label={isBulk ? `Total · ${svgs.length} files` : undefined}
                  />
                )}

                {errorItems.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {errorItems.length === 1
                      ? `Error: ${errorItems[0].error}`
                      : `${errorItems.length} files failed to optimize.`}
                  </div>
                )}

                {extractedColors.length > 0 && (
                  <ColorPalette
                    colors={extractedColors}
                    overrides={colorOverrides}
                    onColorChange={handleColorChange}
                    onReset={handleColorReset}
                  />
                )}

                {isBulk ? (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <ThumbnailGrid
                      items={thumbnailItems}
                      selectedId={detailId}
                      onSelect={setDetailId}
                    />
                  </div>
                ) : (
                  <SplitView
                    top={<CodeView code={singleModified} />}
                    bottom={<Preview svg={singleModified} className="h-full" />}
                  />
                )}
              </div>
            </div>
          </main>
        )}

        {detailItem && (
          <DetailSheet
            open={!!detailId}
            onOpenChange={(open) => { if (!open) setDetailId(null) }}
            filename={detailItem.filename}
            displaySvg={detailModified}
            originalSize={detailOriginalSize}
            optimizedSize={detailOptimizedSize}
            optimizedSuffix={optimizedSuffix}
          />
        )}
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        setTheme={setTheme}
        primaryColor={primaryColor}
        setPrimaryColor={setPrimaryColor}
        optimizedSuffix={optimizedSuffix}
        setOptimizedSuffix={setOptimizedSuffix}
      />
      <Toaster />
    </TooltipProvider>
  )
}
