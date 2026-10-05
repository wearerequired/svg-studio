import { useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { formatBytes, calculateSavings, cn } from '@/lib/utils'

export interface ThumbnailItem {
  id: string
  filename: string
  originalSize: number
  optimizedSize: number
  /** SVG content rendered in the thumbnail (already color-overridden). */
  displaySvg: string | null
  status: 'pending' | 'optimizing' | 'done' | 'error'
  error?: string
}

interface ThumbnailGridProps {
  items: ThumbnailItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ThumbnailGrid({ items, selectedId, onSelect }: ThumbnailGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {items.map(item => (
        <ThumbnailCard
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </div>
  )
}

interface ThumbnailCardProps {
  item: ThumbnailItem
  selected: boolean
  onSelect: () => void
}

function ThumbnailCard({ item, selected, onSelect }: ThumbnailCardProps) {
  const { displaySvg } = item

  // The blob URL lives exactly as long as the <img> shows this SVG: created when the
  // ref attaches, revoked by the ref cleanup (React 19) on change or unmount.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (!img || !displaySvg) return
    const url = URL.createObjectURL(new Blob([displaySvg], { type: 'image/svg+xml' }))
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [displaySvg])

  const savings = calculateSavings(item.originalSize, item.optimizedSize)
  const isPending = item.status === 'pending' || item.status === 'optimizing'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group flex flex-col rounded-lg border bg-card text-left overflow-hidden',
        'transition-all hover:border-primary/50 hover:shadow-sm',
        selected && 'border-primary ring-2 ring-primary/30',
      )}
    >
      <div
        className="relative aspect-square w-full bg-[repeating-conic-gradient(#d4d4d4_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] overflow-hidden"
      >
        {item.status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 p-2 text-center">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-[10px] text-destructive line-clamp-2">{item.error ?? 'Error'}</span>
          </div>
        ) : displaySvg ? (
          <img
            ref={imgRef}
            alt={item.filename}
            className="h-full w-full object-contain p-3"
          />
        ) : null}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2 border-t bg-background/50">
        <span className="text-xs font-medium truncate" title={item.filename}>
          {item.filename}
        </span>
        <div className="flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground">
          <span>{formatBytes(item.optimizedSize)}</span>
          {item.status === 'done' && savings > 0 && (
            <span className="font-medium text-primary">−{savings}%</span>
          )}
        </div>
      </div>
    </button>
  )
}
