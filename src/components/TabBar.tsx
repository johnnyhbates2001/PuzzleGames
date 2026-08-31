import { AppLink as Link } from './AppLink'
import { AwardsTabIcon, PlayTabIcon, ShopTabIcon, StatsTabIcon } from './icons'

const TABS = [
  { key: 'play', label: 'Play', Icon: PlayTabIcon, to: '/' },
  { key: 'shop', label: 'Shop', Icon: ShopTabIcon, to: '/shop' },
  { key: 'stats', label: 'Stats', Icon: StatsTabIcon, to: '/stats' },
  { key: 'awards', label: 'Awards', Icon: AwardsTabIcon, to: '/achievements' },
] as const

interface TabBarProps {
  active: (typeof TABS)[number]['key']
}

/** iOS-pill bottom tab bar shown on the four top-level screens (Home/Shop/Stats/Awards) —
 *  not during the Difficulty/Game/Complete push-navigation flow, matching the design. */
export function TabBar({ active }: TabBarProps) {
  const activeIndex = TABS.findIndex((tab) => tab.key === active)

  return (
    <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg shrink-0 rounded-full bg-surface p-1.5 shadow-card">
      {/* Single sliding pill rather than a per-tab background — each <TabBar> mounts
          fresh on every route change (this isn't a persistent element across
          navigations), so it always starts already in the right position; the
          transform transition only ever plays for a tap within the bar itself. */}
      <span
        aria-hidden="true"
        className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-full bg-accent-tint"
        style={{ transform: `translateX(${activeIndex * 100}%)`, transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
      {TABS.map((tab, i) => (
        <Link
          key={tab.key}
          to={tab.to}
          className={`relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors duration-[260ms] ${
            tab.key === active ? 'text-accent' : 'text-ink-muted'
          }`}
        >
          <span
            className="flex leading-none"
            style={{
              transform: i === activeIndex ? 'scale(1.14) translateY(-1px)' : undefined,
              transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <tab.Icon />
          </span>
          <span className="text-[11px] font-semibold">{tab.label}</span>
        </Link>
      ))}
    </div>
  )
}
