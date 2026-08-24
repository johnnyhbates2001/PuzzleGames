import { Link } from 'react-router-dom'

const TABS = [
  { key: 'play', label: 'Play', icon: '▦', to: '/' },
  { key: 'shop', label: 'Shop', icon: '✦', to: '/shop' },
  { key: 'stats', label: 'Stats', icon: '◷', to: '/stats' },
  { key: 'awards', label: 'Awards', icon: '🏆', to: '/achievements' },
] as const

interface TabBarProps {
  active: (typeof TABS)[number]['key']
}

/** iOS-pill bottom tab bar shown on the four top-level screens (Home/Shop/Stats/Awards) —
 *  not during the Difficulty/Game/Complete push-navigation flow, matching the design. */
export function TabBar({ active }: TabBarProps) {
  return (
    <div className="mt-auto flex shrink-0 rounded-full bg-surface p-1.5 shadow-card">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition ${
            tab.key === active ? 'bg-accent-tint text-accent' : 'text-ink-muted'
          }`}
        >
          <span className="text-base leading-none">{tab.icon}</span>
          <span className="text-[11px] font-semibold">{tab.label}</span>
        </Link>
      ))}
    </div>
  )
}
