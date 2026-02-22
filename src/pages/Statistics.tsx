import React, { useEffect, useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc } from '../types';
import { motion } from 'motion/react';
import { startOfMonth, eachDayOfInterval, eachWeekOfInterval, startOfYear, endOfMonth } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export const StatisticsPage: React.FC = () => {
  const { user, data } = useApp();
  const [view, setView] = useState<'daily' | 'weekly'>(() => {
    return (localStorage.getItem('dailio_stats_view') as 'daily' | 'weekly') || 'daily';
  });
  const [range, setRange] = useState<'month' | 'year'>('month');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [periodDocs, setPeriodDocs] = useState<Record<string, PeriodDoc>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('dailio_stats_view', view);
  }, [view]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const h = await data.getHabits(user.uid);
    setHabits(h);
    
    const docs: Record<string, PeriodDoc> = {};
    const start = startOfYear(new Date());
    const end = new Date();

    if (view === 'daily') {
      const days = eachDayOfInterval({ start, end });
      await Promise.all(days.map(async d => {
        const key = getDailyKey(d);
        const doc = await data.getPeriodDoc(user.uid, 'daily', key);
        if (doc) docs[key] = doc;
      }));
    } else {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      await Promise.all(weeks.map(async w => {
        const key = getWeeklyKey(w);
        const doc = await data.getPeriodDoc(user.uid, 'weekly', key);
        if (doc) docs[key] = doc;
      }));
    }
    setPeriodDocs(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, view]);

  const currentKey = view === 'daily' ? getDailyKey() : getWeeklyKey();
  const currentStats = computePeriodStats(currentKey, view, habits, periodDocs[currentKey] || null);

  const getChartData = () => {
    const today = new Date();
    const start = range === 'month' ? startOfMonth(today) : startOfYear(today);
    const end = today; // Always end at today as per request
    
    if (view === 'daily') {
      const days = eachDayOfInterval({ start, end });
      return days.map(d => {
        const key = getDailyKey(d);
        const stats = computePeriodStats(key, 'daily', habits, periodDocs[key] || null);
        return {
          name: range === 'month' ? d.getDate().toString() : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ratio: stats.to_do === 0 ? 0 : Math.round(stats.ratio * 100),
          to_do: stats.to_do
        };
      });
    } else {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map(w => {
        const key = getWeeklyKey(w);
        const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null);
        return {
          name: `W${key.split('-W')[1]}`,
          ratio: stats.to_do === 0 ? 0 : Math.round(stats.ratio * 100),
          to_do: stats.to_do
        };
      });
    }
  };

  const chartData = getChartData();
  
  const yearRate = (() => {
    // Always calculate year rate based on the full year up to today
    const start = startOfYear(new Date());
    const end = new Date();
    let totalRatio = 0;
    let validPeriods = 0;

    if (view === 'daily') {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        const key = getDailyKey(d);
        const stats = computePeriodStats(key, 'daily', habits, periodDocs[key] || null);
        if (stats.to_do > 0) {
          totalRatio += stats.ratio;
          validPeriods++;
        }
      });
    } else {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      weeks.forEach(w => {
        const key = getWeeklyKey(w);
        const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null);
        if (stats.to_do > 0) {
          totalRatio += stats.ratio;
          validPeriods++;
        }
      });
    }

    if (validPeriods === 0) return 0;
    return Math.round((totalRatio / validPeriods) * 100);
  })();

  if (loading) return <div className="text-center py-20 font-bold text-black/20">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Statistics</h1>
        <p className="text-black/40 mb-8">Please sign in to view your statistics.</p>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="px-8 py-4 bg-black text-white rounded-2xl font-bold shadow-lg"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Statistics</h1>
        
        <div className="flex items-center justify-between bg-black/5 p-1 rounded-2xl mb-12">
          <button
            onClick={() => setView('daily')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'daily' ? "bg-white shadow-sm text-black" : "text-black/30"
            )}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'weekly' ? "bg-white shadow-sm text-black" : "text-black/30"
            )}
          >
            Weekly
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-12">
        <div className="bg-black/5 p-6 rounded-[32px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 block mb-2">Current rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{Math.round(currentStats.ratio * 100)}</span>
            <span className="text-xl font-bold text-black/20">%</span>
          </div>
        </div>
        <div className="bg-black/5 p-6 rounded-[32px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 block mb-2">Year rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{yearRate}</span>
            <span className="text-xl font-bold text-black/20">%</span>
          </div>
        </div>
      </div>

      <section className="bg-black/5 p-6 rounded-[32px]">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold">Past success rate</h2>
          <div className="flex gap-2 bg-black/5 p-1 rounded-xl">
            <button
              onClick={() => setRange('month')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", range === 'month' ? "bg-white shadow-sm text-black" : "text-black/30")}
            >
              Month
            </button>
            <button
              onClick={() => setRange('year')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", range === 'year' ? "bg-white shadow-sm text-black" : "text-black/30")}
            >
              Year
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(0,0,0,0.2)' }}
                interval={range === 'year' ? (view === 'daily' ? 30 : 4) : 4}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black text-white px-3 py-2 rounded-xl text-xs font-bold">
                        {payload[0].value}%
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="ratio" 
                stroke="#000" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRatio)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
