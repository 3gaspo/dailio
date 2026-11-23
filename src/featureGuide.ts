import type { FeatureSection } from '@3gaspo/app-ui/Tutorial';

export const featureGuide = [
  {
    title: 'Daily, weekly and one-off tasks',
    entries: [
      { title: 'Daily and weekly habits', text: 'Use the add button on Today. Daily habits get a new checklist each day. Weekly habits use the same checklist from Monday to Sunday, with fresh progress each Monday.' },
      { title: 'One-off tasks', text: 'Enable One-off task when adding something that only needs to be done today or this week. Use the Daily or Weekly option to choose which period it belongs to.' },
      { title: 'Checklist and counters', text: 'Tick a habit when you finish it. A habit can require up to ten steps. Weekly tasks without multiple steps can count each repetition. The counter lets you add or undo a repetition.' },
      { title: 'Anti-tasks', text: 'Use an anti-task for something you want to avoid. It starts complete on active days or weeks. Record it if you slip, or set a threshold with multiple steps.' },
    ],
  },
  {
    title: 'Organise and edit habits',
    entries: [
      { title: 'Categories and groups', text: 'Give habits coloured categories and filter Today by category. Group habits in each period to collect things you usually do together, and use the reorder control to arrange them.' },
      { title: 'Skip or remove', text: 'Skip a recurring habit for the current period or remove it from that period onward while keeping earlier results. Removing a one-off task applies only to that day or week.' },
      { title: 'Edit your routine', text: 'Update the name, category, steps or other options from the habit’s edit action. Today shows the current day and week at the same time.' },
    ],
  },
  {
    title: 'Calendar and colour key',
    entries: [
      { title: 'Days and weeks', text: 'Daily opens the month grid. Weekly shows the year’s Monday-starting weeks. Select a square to view or update the tasks for that period.' },
      { title: 'Green, amber and red', text: 'Green means all required completion points were reached for the current or a past period. Amber means the goal was reached with items still to do. Red means a past, active period ended below the goal.' },
      { title: 'Grey and dots', text: 'Grey covers absences, periods with no tasks due, or periods without a colour result yet. Past periods with no logged activity are treated as absent unless you mark them active. A dot marks an active square with remaining work.' },
      { title: 'Mark an absence', text: 'Use Absent in the period details when you were away. You can turn it off later to count the period again.' },
    ],
  },
  {
    title: 'Statistics and goals',
    entries: [
      { title: 'Completion rate', text: 'Each completed habit counts as one point. A weekly task with a repetition counter can earn more than one. A multi-step habit earns one point when all required steps are complete. Absent periods are excluded from progress averages.', formula: 'Completion rate = completion points ÷ tasks due' },
      { title: 'Compare progress', text: 'Switch between daily and weekly statistics, follow your success rate over time and compare rates and task counts by category. The current rate is compared with its matching goal.' },
      { title: 'Choose your goals', text: 'Set separate daily and weekly objectives in Settings. These determine the progress targets and the Calendar’s amber and red states.' },
    ],
  },
  {
    title: 'Settings, export and resets',
    entries: [
      { title: 'Appearance, categories and account', text: 'Change the theme, add or delete habit categories and choose their colours. Sign out from Settings. A local session stores data in the browser, while Firebase data follows your account.' },
      { title: 'Export progress', text: 'Download the daily and weekly counters as CSV for periods from the start of the current year.' },
      { title: 'Reset data', text: 'Clear History removes recorded day and week data. Reset All also clears your routine and restores the starting settings and categories.' },
    ],
  },
] as const satisfies readonly FeatureSection[];
