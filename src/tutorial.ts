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
      { icon: Check, text: 'Tick off habits and their steps' },
      { icon: Repeat, text: 'Weekly habits reset on Monday. Use the counter to log repeats.' },
      { icon: CalendarClock, text: 'One-off tasks are only due today or this week' },
    ],
  },
  {
    icon: Calendar,
    title: 'Calendar',
    actions: [
      { icon: Calendar, text: 'Pick a day or week to review or edit it' },
      { icon: ToggleRight, text: 'Mark a period as absent' },
    ],
    legend: [
      { color: 'var(--color-emerald-500)', text: 'Green · complete' },
      { color: 'var(--color-amber-400)', text: 'Amber · target met, tasks left' },
      { color: 'var(--color-red-500)', text: 'Red · past, target missed' },
      { color: 'var(--ui-section)', text: 'Grey · absent or ungraded' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Statistics',
    actions: [
      { icon: TrendingUp, text: 'Track daily and weekly progress' },
      { icon: PieChart, text: 'Compare completion by category' },
    ],
  },
  {
    icon: Settings,
    title: 'Settings',
    actions: [
      { icon: Target, text: 'Set daily and weekly goals' },
      { icon: Palette, text: 'Manage habit categories' },
      { icon: Download, text: 'Export your progress as CSV' },
    ],
  },
] as const satisfies TutorialPages;
