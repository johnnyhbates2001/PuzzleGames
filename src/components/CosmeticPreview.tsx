import type { CosmeticCategory } from '../cosmetics'
import { QueensMarkerGlyph } from './QueensMarkerGlyph'
import { FlameIcon } from './icons'

const ACCENT_SWATCH: Record<string, string> = {
  coral: 'oklch(64% 0.18 30)',
  emerald: 'oklch(62% 0.16 155)',
  sky: 'oklch(66% 0.14 240)',
  rose: 'oklch(66% 0.16 355)',
  'diamond-chrome': 'linear-gradient(135deg,#B9E3FF,#7DAAD1,#E6F4FF)',
  'master-gold': 'linear-gradient(135deg,#FDE68A,#D4AF37,#FFF3C4)',
}

const CONFETTI_EMOJI: Record<string, string> = {
  'century-burst': '💯',
  'puzzle-master-shower': '👑',
  'collectors-rain': '🎨',
}

const SOUND_EMOJI: Record<string, string> = {
  chimes: '🎵',
  'unstoppable-beat': '🥁',
  'flawless-hush': '🤫',
}

function ZipLineSwatch({ id }: { id: string }) {
  const base = 'h-1.5 w-[70%] rounded-full bg-accent'
  if (id === 'dashed')
    return (
      <div
        className="h-1.5 w-[70%] rounded-full"
        style={{ background: 'repeating-linear-gradient(90deg, var(--color-accent) 0 8px, transparent 8px 14px)' }}
      />
    )
  if (id === 'dotted')
    return (
      <div
        className="h-1.5 w-[70%] rounded-full"
        style={{ background: 'repeating-linear-gradient(90deg, var(--color-accent) 0 4px, transparent 4px 10px)' }}
      />
    )
  if (id === 'glow') return <div className={base} style={{ boxShadow: '0 0 10px 2px var(--color-accent)' }} />
  if (id === 'braided')
    return (
      <div
        className="h-1.5 w-[70%] rounded-full"
        style={{ background: 'repeating-linear-gradient(45deg, var(--color-accent) 0 3px, var(--color-bg) 3px 6px)' }}
      />
    )
  if (id === 'pulse') return <div className={`${base} anim-zip-pulse`} />
  return <div className={base} />
}

function SudokuDigitSwatch({ id }: { id: string }) {
  const style =
    id === 'rounded'
      ? { fontFamily: "ui-rounded, 'SF Pro Rounded', sans-serif", fontWeight: 600 }
      : id === 'mono'
        ? { fontFamily: "'Courier New', monospace", fontWeight: 700 }
        : id === 'handwritten'
          ? { fontFamily: 'cursive', fontStyle: 'italic' as const, fontWeight: 600 }
          : id === 'neon'
            ? { textShadow: '0 0 8px currentColor, 0 0 2px currentColor', fontWeight: 800 }
            : id === 'serif'
              ? { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600 }
              : { fontWeight: 800 }
  return (
    <span className="text-3xl leading-none text-accent" style={style}>
      8
    </span>
  )
}

function PatchesBadgeSwatch({ id }: { id: string }) {
  const style =
    id === 'circle'
      ? { borderRadius: '50%' }
      : id === 'hexagon'
        ? { clipPath: 'polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0% 50%)' }
        : id === 'star'
          ? { clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }
          : id === 'diamond'
            ? { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }
            : id === 'scallop'
            ? {
                clipPath:
                  'polygon(50% 0%,61% 15%,78% 8%,80% 27%,97% 33%,88% 50%,97% 67%,80% 73%,78% 92%,61% 85%,50% 100%,39% 85%,22% 92%,20% 73%,3% 67%,12% 50%,3% 33%,20% 27%,22% 8%,39% 15%)',
              }
            : { borderRadius: '20%' }
  return <div className="size-[42%] bg-accent" style={style} />
}

function NonogramTextureSwatch({ id }: { id: string }) {
  const style =
    id === 'crosshatch'
      ? {
          backgroundImage:
            'repeating-linear-gradient(45deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 8px)',
        }
      : id === 'dot-grid'
        ? { backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.22) 20%, transparent 21%)', backgroundSize: '8px 8px' }
        : id === 'stipple'
          ? { backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.3) 12%, transparent 13%)', backgroundSize: '4px 4px' }
          : id === 'gradient'
          ? { backgroundImage: 'linear-gradient(135deg, var(--color-accent), oklch(66% 0.17 300))' }
          : id === 'glow'
            ? { boxShadow: '0 0 12px 3px var(--color-accent)' }
            : {}
  return <div className="absolute inset-0 rounded-[9px] bg-accent" style={style} />
}

function WordleTileSwatch({ id }: { id: string }) {
  const style: React.CSSProperties =
    id === 'bold-sans'
      ? { fontFamily: 'Arial Black, sans-serif', fontWeight: 900 }
      : id === 'retro-type'
        ? { fontFamily: "'Courier New', monospace", fontWeight: 700 }
        : id === 'gradient-flip'
          ? { background: 'linear-gradient(135deg, var(--color-accent), oklch(66% 0.17 300))', color: 'white' }
          : id === 'neon-glow'
            ? { textShadow: '0 0 8px currentColor, 0 0 2px currentColor', fontWeight: 800 }
            : { fontWeight: 800 }
  const isGradient = id === 'gradient-flip'
  return (
    <div
      className="flex size-8 items-center justify-center rounded-[6px] border-2 border-accent text-lg leading-none text-accent"
      style={isGradient ? style : undefined}
    >
      <span style={isGradient ? { color: 'white' } : style}>W</span>
    </div>
  )
}

function ConfettiSwatch({ id }: { id: string }) {
  const emoji = CONFETTI_EMOJI[id]
  if (emoji) return <span className="text-2xl leading-none">{emoji}</span>
  if (id === 'ribbons')
    return (
      <div className="flex items-center gap-1">
        {['#FCA5A5', '#86EFAC', '#7DD3FC', '#FDE68A'].map((c) => (
          <span key={c} className="h-3.5 w-1.5 rounded-[1px]" style={{ backgroundColor: c }} />
        ))}
      </div>
    )
  return (
    <div className="flex items-center gap-1.5">
      {['#F9A8D4', '#A5B4FC', '#FDBA74', '#5EEAD4'].map((c) => (
        <span key={c} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}

function CelebrationSwatch({ id }: { id: string }) {
  if (id === 'streak-flame') return <FlameIcon size={26} className="text-accent" />
  if (id === 'rocket-launch') return <span className="text-2xl leading-none">🚀</span>
  if (id === 'shockwave') return <div className="size-4 rounded-full border-[3px] border-accent" />
  return <span className="text-2xl leading-none">🎉</span>
}

function SoundPackSwatch({ id }: { id: string }) {
  const emoji = SOUND_EMOJI[id]
  if (emoji) return <span className="text-2xl leading-none">{emoji}</span>
  return (
    <div className="flex items-end gap-[3px]">
      {[0.6, 0.9, 0.45, 0.75].map((h, i) => (
        <span key={i} className="w-1 rounded-[1px] bg-accent" style={{ height: `${h * 26}px` }} />
      ))}
    </div>
  )
}

function AccentThemeSwatch({ id }: { id: string }) {
  const value = ACCENT_SWATCH[id] ?? 'var(--color-accent)'
  return <div className="size-8 rounded-full" style={{ background: value }} />
}

const ICON_PACK_STYLE: Record<string, React.CSSProperties> = {
  'retro-arcade': { background: 'repeating-linear-gradient(90deg,#2E1065 0 6px,#7C3AED 6px 12px)' },
  'minimal-mono': { background: '#1C1C1C' },
  'all-rounder': { background: 'linear-gradient(135deg,#7DD3FC 25%,#86EFAC 25% 50%,#FDE68A 50% 75%,#F9A8D4 75%)' },
  'puzzle-master': { background: 'linear-gradient(160deg,#1C1917,#D97706)' },
}

function IconPackSwatch({ id }: { id: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[22%]" style={ICON_PACK_STYLE[id]}>
      {id === 'minimal-mono' && <span className="size-[40%] rounded-[22%] bg-[#F4F4F5]" />}
      {id === 'puzzle-master' && <span className="text-lg leading-none">👑</span>}
    </div>
  )
}

/** Renders the small preview box for one cosmetic tile in the Shop — everything here is
 *  CSS-only per the Shop Expansion handoff's fidelity note (no new image/audio assets).
 *  `id` is the item id, or the category's implicit default (e.g. 'classic') for the
 *  categories that have one — see cosmetics.ts. */
export function CosmeticPreview({ category, id }: { category: CosmeticCategory; id: string }) {
  switch (category) {
    case 'queensMarker':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <QueensMarkerGlyph marker={id} className="size-8 text-accent" />
        </div>
      )
    case 'zipLineStyle':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <ZipLineSwatch id={id} />
        </div>
      )
    case 'sudokuDigitStyle':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <SudokuDigitSwatch id={id} />
        </div>
      )
    case 'patchesBadgeShape':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <PatchesBadgeSwatch id={id} />
        </div>
      )
    case 'nonogramTexture':
      return (
        <div className="relative aspect-square overflow-hidden rounded-[9px]">
          <NonogramTextureSwatch id={id} />
        </div>
      )
    case 'wordleTileStyle':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <WordleTileSwatch id={id} />
        </div>
      )
    case 'confetti':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <ConfettiSwatch id={id} />
        </div>
      )
    case 'celebration':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <CelebrationSwatch id={id} />
        </div>
      )
    case 'soundPack':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <SoundPackSwatch id={id} />
        </div>
      )
    case 'accentTheme':
      return (
        <div className="flex aspect-square items-center justify-center rounded-[9px] bg-accent-tint">
          <AccentThemeSwatch id={id} />
        </div>
      )
    case 'iconPack':
      return (
        <div className="relative aspect-square overflow-hidden rounded-[9px]">
          <IconPackSwatch id={id} />
        </div>
      )
    default:
      return <div className="aspect-square rounded-[9px] bg-accent-tint" />
  }
}
