import { ScreenBoundary } from './ScreenBoundary';
import type { ReactNode } from 'react';
import { CheckCircle2, Calendar, BarChart3, Settings } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useApp } from '../providers/AppProvider';
import { StateFeedback, DataLoadError } from './StateFeedback';
const AuthWindow = lazy(() => import('./AuthWindow').then(module => ({ default: module.AuthWindow })));
import { BottomNavigation } from './BottomNavigation';
import { TutorialProvider } from '@3gaspo/app-ui/Tutorial';
import { tutorialPages } from '../tutorial';

const items = [
  { to: '/today', icon: CheckCircle2, label: 'Today' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/statistics', icon: BarChart3, label: 'Statistics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, loadError } = useApp();
  return (
    <TutorialProvider appName="Dailio" accountId={user?.uid ?? null} homePath="/today" ready={!loadError} pages={tutorialPages}>
      <div className="app-shell bg-ui-page text-ui-text font-sans transition-colors duration-300">
        {!user && <ScreenBoundary><Suspense fallback={<StateFeedback kind="loading" />}><AuthWindow /></Suspense></ScreenBoundary>}
        <main className="app-page">{loadError ? <DataLoadError /> : children}</main>
        <BottomNavigation items={items} />
      </div>
    </TutorialProvider>
  );
}
