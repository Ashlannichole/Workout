import { IconToday, IconBuild, IconPlan, IconHistory } from './Icons.jsx'

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'build', label: 'Build', Icon: IconBuild },
  { id: 'plan', label: 'Plan', Icon: IconPlan },
  { id: 'history', label: 'History', Icon: IconHistory },
]

export default function TabBar({ route, onNavigate }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className="tab"
          aria-current={route === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  )
}
