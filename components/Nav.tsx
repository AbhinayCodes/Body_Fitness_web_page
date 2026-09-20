import { CalendarDays, ChartNoAxesCombined, Dumbbell, LayoutDashboard, UserRound, Utensils, type LucideIcon } from 'lucide-react';
import type { View } from '@/types/fitness';

const icons: Record<View, LucideIcon> = { dashboard: LayoutDashboard, workout: Dumbbell, diet: Utensils, calendar: CalendarDays, progress: ChartNoAxesCombined, profile: UserRound };
const items: Array<[View, string]> = [['dashboard', 'Today'], ['workout', 'Workout'], ['diet', 'Nutrition'], ['calendar', 'Calendar'], ['progress', 'Progress']];

export function Nav({ active, onNavigate, mobile = false }: { active: View; onNavigate: (view: View) => void; mobile?: boolean }) {
  const visibleItems: Array<[View, string]> = mobile ? [...items, ['profile', 'Profile']] : items;
  return <nav className={mobile ? 'mobile-nav' : 'nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>{visibleItems.map(([view, label]) => {
    const Icon = icons[view];
    return <button key={view} className={active === view ? 'active' : ''} aria-current={active === view ? 'page' : undefined} onClick={() => onNavigate(view)}><Icon className="nav-icon" size={19} aria-hidden="true" /><span>{label}</span></button>;
  })}</nav>;
}
