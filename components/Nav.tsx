import type { View } from '@/types/fitness';

const icons: Record<string, string> = { dashboard: '⌂', workout: '↗', diet: '◒', calendar: '□', progress: '⌁', profile: '○' };
const items: Array<[View, string]> = [['dashboard', 'Today'], ['workout', 'Workout'], ['diet', 'Nutrition'], ['calendar', 'Calendar'], ['progress', 'Progress']];

export function Nav({ active, onNavigate, mobile = false }: { active: View; onNavigate: (view: View) => void; mobile?: boolean }) {
  const visibleItems = items;
  return <nav className={mobile ? 'mobile-nav' : 'nav'}>{visibleItems.map(([view, label]) => <button key={view} className={active === view ? 'active' : ''} onClick={() => onNavigate(view)}><span className="nav-icon">{icons[view]}</span>{label}</button>)}{mobile && <button className={active === 'profile' ? 'active' : ''} onClick={() => onNavigate('profile')}><span className="nav-icon">{icons.profile}</span>Profile</button>}</nav>;
}
