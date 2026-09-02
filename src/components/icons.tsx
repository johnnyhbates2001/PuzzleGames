interface IconProps {
  size?: number
  className?: string
}

/** Shared stroke-based SVG icon set — see design_handoff_redesign_and_motion/README.md.
 *  Replaces the hand-rolled/emoji glyphs that used to be scattered per call site. */

export function GearIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 19, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 17, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function CheckIcon({ size = 12, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  )
}

export function FlameIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12.6 2.3c.3 3 2.1 4 3.2 5.6 1.5 2.1 1.7 4 1.7 5.1a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.1-4.8.1 1.6.8 2.6 1.7 2.9-.4-3.3.6-6.6 2.3-8.8z" />
    </svg>
  )
}

export function BookIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h6a3 3 0 0 1 3 3v15a2 2 0 0 0-2-2H5z" />
      <path d="M19 3h-4a3 3 0 0 0-3 3v15a2 2 0 0 1 2-2h5z" />
    </svg>
  )
}

export function PlayTabIcon({ size = 21, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" />
    </svg>
  )
}

export function ShopTabIcon({ size = 21, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M12 3.2l2.1 5.6 5.7 2.2-5.7 2.2L12 18.8l-2.1-5.6L4.2 11l5.7-2.2z" />
    </svg>
  )
}

export function StatsTabIcon({ size = 21, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3.5 20h17M7 20v-6.5M12 20V7M17 20v-9.5" />
    </svg>
  )
}

export function FriendsTabIcon({ size = 21, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <circle cx="17" cy="7.5" r="2.4" />
      <path d="M15.2 14.3c2.6.3 4.5 2.5 4.5 5.7" />
    </svg>
  )
}

export function TrophyIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4a3 3 0 0 0 3.5 3.9M17 5.5h3a3 3 0 0 1-3.5 3.9" />
      <path d="M12 14v3M9 21h6M8.5 21c0-2 1-3.2 3.5-3.2s3.5 1.2 3.5 3.2" />
    </svg>
  )
}

export function HelpCircleIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function LockIcon({ size = 17, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9.5" rx="3" />
      <path d="M8.2 11V8.4a3.8 3.8 0 0 1 7.6 0V11" />
    </svg>
  )
}

export function InfinityIcon({ size = 19, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="8.6" cy="12" r="3.7" />
      <circle cx="15.4" cy="12" r="3.7" />
    </svg>
  )
}

export function TimedIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.6V13l2.4 1.6M9 3h6" />
    </svg>
  )
}

export function NoUndoIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h11a4.5 4.5 0 0 1 0 9H9M7.6 5.6L4 9.5l3.6 3.9" />
      <path d="M4 4l16 16" />
    </svg>
  )
}

export function NoHintsIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2 1-1.2 1.8v.3M12 17.2h.01" />
    </svg>
  )
}

export function PerfectRunIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round">
      <path d="M12 3.2l2.1 5.6 5.7 2.2-5.7 2.2L12 18.8l-2.1-5.6L4.2 11l5.7-2.2z" />
    </svg>
  )
}

export function SpeakerIcon({ size = 17, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5v5h4l5.5 4.2V5.3L8 9.5H4z" />
      <path d="M17 8.8a4.6 4.6 0 0 1 0 6.4" />
    </svg>
  )
}

export function VibrationIcon({ size = 17, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="7.5" y="4.5" width="9" height="15" rx="2" />
      <path d="M2.5 9.5v5M21.5 9.5v5" />
    </svg>
  )
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function LightbulbIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 19h5M10.5 21.6h3" />
      <path d="M12 2.8a6.2 6.2 0 0 0-3.3 11.4V16.4h6.6v-2.2A6.2 6.2 0 0 0 12 2.8z" />
    </svg>
  )
}

export function UndoIcon({ size = 19, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h11a4.5 4.5 0 0 1 0 9H9M7.6 5.6L4 9.5l3.6 3.9" />
    </svg>
  )
}

export function EraseIcon({ size = 19, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7h15M9.5 7V4.6h5V7M6.6 7l1 13h8.8l1-13" />
    </svg>
  )
}

export function PencilIcon({ size = 17, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L20 8l-4-4L4 16z" />
    </svg>
  )
}

export function EyeIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function FlagIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 5h11l-2.5 3.5L16 12H5" />
    </svg>
  )
}

export function SparkleIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M12 3.2l2.1 5.6 5.7 2.2-5.7 2.2L12 18.8l-2.1-5.6L4.2 11l5.7-2.2z" />
    </svg>
  )
}

export function ZenIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

export function BoltIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  )
}

export function CrownIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M3.6 18.6h16.8l1.3-10-5.7 3.4L12 4l-4 8-5.7-3.4z" />
    </svg>
  )
}

export function XMarkIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function StarIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 2.5l2.7 6.4 6.9.6-5.2 4.6 1.6 6.8L12 17.3l-6 3.6 1.6-6.8-5.2-4.6 6.9-.6z" />
    </svg>
  )
}

export function TargetIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path fillRule="evenodd" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-3a6 6 0 100-12 6 6 0 000 12z" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  )
}

export function GemIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M6.2 8L12 2.6 17.8 8 12 21.4z" />
    </svg>
  )
}

export function DotMarkerIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <circle cx="12" cy="12" r="7" />
    </svg>
  )
}

export function ChessKingIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M11 2.2h2v2.6h2.4v2h-2.4v1.7c3.4.8 5.6 3.5 5.6 7v1H5.4v-1c0-3.5 2.2-6.2 5.6-7V6.8H8.6v-2H11z" />
      <path d="M4.6 18.5h14.8l.9 3.3H3.7z" />
    </svg>
  )
}

export function AwardsTabIcon({ size = 21, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 4h9v4.8a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 5.2H4.6v.9a3.6 3.6 0 0 0 3.4 3.4M16.5 5.2h2.9v.9a3.6 3.6 0 0 1-3.4 3.4" />
      <path d="M12 13.3V16M9 20h6" />
    </svg>
  )
}
