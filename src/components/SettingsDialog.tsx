import { useState } from 'react'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { PRESET_PRIMARY_COLORS } from '@/hooks/usePrimaryColor'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  primaryColor: string | null
  setPrimaryColor: (color: string | null) => void
  optimizedSuffix: boolean
  setOptimizedSuffix: (value: boolean) => void
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

export function SettingsDialog({
  open,
  onOpenChange,
  theme,
  setTheme,
  primaryColor,
  setPrimaryColor,
  optimizedSuffix,
  setOptimizedSuffix,
}: SettingsDialogProps) {
  // Text the user is typing into the hex field. Null means "show the stored color",
  // so the field follows preset clicks and starts fresh each time the dialog opens.
  const [draftHex, setDraftHex] = useState<string | null>(null)
  const customInput = draftHex ?? primaryColor ?? '#000000'

  const selectColor = (color: string | null) => {
    setDraftHex(null)
    setPrimaryColor(color)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setDraftHex(null)
    onOpenChange(next)
  }

  const isPreset = primaryColor !== null && (PRESET_PRIMARY_COLORS as readonly string[]).includes(primaryColor)
  const isDefault = primaryColor === null
  const isCustom = !isDefault && !isPreset

  const handleCustomChange = (value: string) => {
    setDraftHex(value)
    if (isValidHex(value)) setPrimaryColor(value.toLowerCase())
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize SVG Studio.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Theme
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? 'default' : 'outline'}
                onClick={() => setTheme(value)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Primary color
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Used for buttons, toggles, the logo and optimization progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SwatchButton
              ariaLabel="Default (black)"
              selected={isDefault}
              onClick={() => selectColor(null)}
              isDefault
            />
            {PRESET_PRIMARY_COLORS.map(color => (
              <SwatchButton
                key={color}
                ariaLabel={color}
                color={color}
                selected={primaryColor === color}
                onClick={() => selectColor(color)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={isCustom ? customInput : '#000000'}
                onChange={e => handleCustomChange(e.target.value)}
                className="sr-only"
                id="settings-color-picker"
              />
              <label
                htmlFor="settings-color-picker"
                className={cn(
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border text-xs font-medium transition-all hover:border-foreground/30',
                  isCustom && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
                )}
                title="Pick a custom color"
              >
                <ColorWheelIcon />
              </label>
            </div>
            <input
              type="text"
              value={customInput}
              onChange={e => handleCustomChange(e.target.value)}
              placeholder="#000000"
              className="h-9 w-32 rounded-md border bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Custom hex color"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Downloads
          </Label>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="settings-optimized-suffix" className="text-sm">
                Add “-optimized” to file names
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {optimizedSuffix ? 'icon.svg → icon-optimized.svg' : 'icon.svg → icon.svg'}
              </p>
            </div>
            <Switch
              id="settings-optimized-suffix"
              checked={optimizedSuffix}
              onCheckedChange={setOptimizedSuffix}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SwatchButton({
  color,
  selected,
  onClick,
  ariaLabel,
  isDefault = false,
}: {
  color?: string
  selected: boolean
  onClick: () => void
  ariaLabel: string
  isDefault?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        'relative h-9 w-9 rounded-md border transition-all hover:scale-105',
        isDefault && 'bg-foreground',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
    >
      {selected && (
        <Check
          className={cn(
            'absolute inset-0 m-auto h-4 w-4',
            isDefault
              ? 'text-background'
              : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]',
          )}
        />
      )}
    </button>
  )
}

function ColorWheelIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <defs>
        <linearGradient id="cw-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff0000" />
          <stop offset="16%" stopColor="#ffea00" />
          <stop offset="33%" stopColor="#00ff00" />
          <stop offset="50%" stopColor="#00ffea" />
          <stop offset="66%" stopColor="#0000ff" />
          <stop offset="83%" stopColor="#ea00ff" />
          <stop offset="100%" stopColor="#ff0000" />
        </linearGradient>
      </defs>
      <circle cx="8" cy="8" r="6" fill="url(#cw-a)" />
    </svg>
  )
}
