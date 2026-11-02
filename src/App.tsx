import { ScreenBoundary } from './components/ScreenBoundary';
import { StateFeedback } from './components/StateFeedback';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/Today';
const CalendarPage = lazy(() => import('./pages/Calendar').then(module => ({ default: module.CalendarPage })));
const StatisticsPage = lazy(() => import('./pages/Statistics').then(module => ({ default: module.StatisticsPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then(module => ({ default: module.SettingsPage })));

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <ScreenBoundary><Suspense fallback={<StateFeedback kind="loading" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          </Suspense></ScreenBoundary>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}
