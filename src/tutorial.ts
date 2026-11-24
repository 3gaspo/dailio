import { BarChart3, Calendar, CalendarClock, Check, CheckCircle2, Download, Palette, PieChart, Plus, Repeat, Settings, Target, ToggleRight, TrendingUp } from 'lucide-react';
import type { TutorialPages } from '@3gaspo/app-ui/Tutorial';

export const tutorialPages = [
  {
    logo: '/dailio.svg',
    title: 'Build a routine',
    description: 'Track daily and weekly habits, tick off tasks and see how often you reach your goals.',
  },
  {
    icon: CheckCircle2,
    title: 'Today',
    actions: [
      { icon: Plus, text: 'Add a habit or task', primary: true },
      { icon: Check, text: 'Tick off habits and steps' },
      { icon: Repeat, text: 'Weekly habits reset Monday' },
      { icon: CalendarClock, text: 'One-off lasts a day or week' },
    ],
  },
  {
    icon: Calendar,
    title: 'Calendar',
    actions: [
      { icon: Calendar, text: 'Pick a day or week to edit' },
      { icon: ToggleRight, text: 'Mark a period as absent' },
    ],
    legend: [
      { color: 'var(--color-emerald-500)', colourName: 'Green', text: 'All complete' },
      { color: 'var(--color-amber-400)', colourName: 'Amber', text: 'Goal met' },
      { color: 'var(--color-red-500)', colourName: 'Red', text: 'Past, below goal' },
      { color: 'var(--ui-section)', colourName: 'Grey', text: 'No score' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Statistics',
    actions: [
      { icon: TrendingUp, text: 'Track daily or weekly trends' },
      { icon: PieChart, text: 'Compare category rates' },
    ],
  },
  {
    icon: Settings,
    title: 'Settings',
    actions: [
      { icon: Target, text: 'Set daily and weekly goals' },
      { icon: Palette, text: 'Manage habit categories' },
      { icon: Download, text: 'Export progress as CSV' },
    ],
  },
] as const satisfies TutorialPages;
