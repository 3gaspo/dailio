import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc } from '../types';
import { CategoryDropdown } from '../components/CategoryDropdown';
import { getCategoryColor } from '../utils/categoryUtils';
import { motion } from 'motion/react';
import { 
  startOfMonth, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  startOfYear, 
  subDays, 
  max, 
  startOfDay, 
  isBefore,
  startOfISOWeek
} from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const StatisticsPage: React.FC = () => {
  const { user, data, categories, settings } = useApp();
  const [view, setView] = useState<'daily' | 'weekly'>(() => {
    return (localStorage.getItem('dailio_stats_view') as 'daily' | 'weekly') || 'daily';
  });
  const [range, setRange] = useState<'month' | 'year'>('month');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categoryRateTimeframe, setCategoryRateTimeframe] = useState<'week' | 'year'>('week');
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
  const currentStats = computePeriodStats(currentKey, view, habits, periodDocs[currentKey] || null, selectedCategoryId);

  const getChartData = () => {
    const today = new Date();
    const start = range === 'month' ? startOfMonth(today) : startOfYear(today);
    const end = today; // Always end at today as per request
    
    if (view === 'daily') {
      const days = eachDayOfInterval({ start, end });
      return days.map(d => {
        const key = getDailyKey(d);
        const stats = computePeriodStats(key, 'daily', habits, periodDocs[key] || null, selectedCategoryId);
        return {
          name: range === 'month' ? d.getDate().toString() : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ratio: (stats.to_do === 0 || stats.isAbsent) ? 0 : Math.round(stats.ratio * 100),
          to_do: stats.to_do,
          isAbsent: stats.isAbsent
        };
      });
    } else {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map(w => {
        const key = getWeeklyKey(w);
        const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null, selectedCategoryId);
        return {
          name: `W${key.split('-W')[1]}`,
          ratio: (stats.to_do === 0 || stats.isAbsent) ? 0 : Math.round(stats.ratio * 100),
          to_do: stats.to_do,
          isAbsent: stats.isAbsent
        };
      });
    }
  };

  const chartData = getChartData();
  const isDarkMode = settings.theme === 'dark';
  
  const yearRate = (() => {
    if (habits.length === 0) return 0;

    // Find the first entry (earliest habit creation)
    const habitDates = habits.map(h => {
      return h.createdAt instanceof Date 
        ? h.createdAt 
        : (h.createdAt && typeof (h.createdAt as any).toDate === 'function')
          ? (h.createdAt as any).toDate()
          : new Date(h.createdAt as any);
    });
    const firstHabitDate = new Date(Math.min(...habitDates.map(d => d.getTime())));

    // Period of activity: from max(startOfYear, firstEntry) up until yesterday
    const start = max([startOfYear(new Date()), startOfDay(firstHabitDate)]);
    const end = subDays(startOfDay(new Date()), 1);

    if (isBefore(end, start)) return 0;

    let totalRatio = 0;
    let validPeriods = 0;

    if (view === 'daily') {
      const days = eachDayOfInterval({ start, end });
      days.forEach(d => {
        const key = getDailyKey(d);
        const stats = computePeriodStats(key, 'daily', habits, periodDocs[key] || null, selectedCategoryId);
        if (stats.to_do > 0 && !stats.isAbsent) {
          totalRatio += stats.ratio;
          validPeriods++;
        }
      });
    } else {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      weeks.forEach(w => {
        const key = getWeeklyKey(w);
        const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null, selectedCategoryId);
        if (stats.to_do > 0 && !stats.isAbsent) {
          totalRatio += stats.ratio;
          validPeriods++;
        }
      });
    }

    if (validPeriods === 0) return 0;
    return Math.round((totalRatio / validPeriods) * 100);
  })();

  // 1. Compute Category Success Rates (for horizontal histogram)
  const categorySuccessRates = useMemo(() => {
    if (habits.length === 0) return [];

    const categoryMap = new Map<string, { id: string; name: string; color: string; to_do: number; done: number }>();
    
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        color: getCategoryColor(cat),
        to_do: 0,
        done: 0
      });
    });

    const uncategorizedKey = 'uncategorized';
    categoryMap.set(uncategorizedKey, {
      id: uncategorizedKey,
      name: 'Non categorized',
      color: '#6B7280',
      to_do: 0,
      done: 0
    });

    if (categoryRateTimeframe === 'week') {
      if (view === 'daily') {
        // Current day for daily view
        const key = getDailyKey();
        const doc = periodDocs[key] || null;
        if (!doc?.isAbsent) {
          const stats = computePeriodStats(key, 'daily', habits, doc);
          stats.habits.forEach(h => {
            const catId = (h.categoryId && categoryMap.has(h.categoryId)) ? h.categoryId : uncategorizedKey;
            const bucket = categoryMap.get(catId)!;
            bucket.to_do += 1;
            if (h.completed) bucket.done += 1;
          });
        }
      } else {
        // Current week for weekly view
        const key = getWeeklyKey();
        const doc = periodDocs[key] || null;
        if (!doc?.isAbsent) {
          const stats = computePeriodStats(key, 'weekly', habits, doc);
          stats.habits.forEach(h => {
            const catId = (h.categoryId && categoryMap.has(h.categoryId)) ? h.categoryId : uncategorizedKey;
            const bucket = categoryMap.get(catId)!;
            bucket.to_do += 1;
            if (h.completed) bucket.done += 1;
          });
        }
      }
    } else {
      // Year average across the selected view (daily or weekly tasks)
      const habitDates = habits.map(h => {
        return h.createdAt instanceof Date 
          ? h.createdAt 
          : (h.createdAt && typeof (h.createdAt as any).toDate === 'function')
            ? (h.createdAt as any).toDate()
            : new Date(h.createdAt as any);
      });
      const firstHabitDate = habitDates.length > 0 ? new Date(Math.min(...habitDates.map(d => d.getTime()))) : new Date();
      const start = max([startOfYear(new Date()), startOfDay(firstHabitDate)]);
      const end = new Date();

      if (!isBefore(end, start)) {
        if (view === 'daily') {
          const days = eachDayOfInterval({ start, end });
          days.forEach(d => {
            const key = getDailyKey(d);
            const doc = periodDocs[key] || null;
            if (doc?.isAbsent) return;
            const stats = computePeriodStats(key, 'daily', habits, doc);
            stats.habits.forEach(h => {
              const catId = (h.categoryId && categoryMap.has(h.categoryId)) ? h.categoryId : uncategorizedKey;
              const bucket = categoryMap.get(catId)!;
              bucket.to_do += 1;
              if (h.completed) bucket.done += 1;
            });
          });
        } else {
          const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
          weeks.forEach(w => {
            const key = getWeeklyKey(w);
            const doc = periodDocs[key] || null;
            if (doc?.isAbsent) return;
            const stats = computePeriodStats(key, 'weekly', habits, doc);
            stats.habits.forEach(h => {
              const catId = (h.categoryId && categoryMap.has(h.categoryId)) ? h.categoryId : uncategorizedKey;
              const bucket = categoryMap.get(catId)!;
              bucket.to_do += 1;
              if (h.completed) bucket.done += 1;
            });
          });
        }
      }
    }

    const items = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      rate: cat.to_do === 0 ? 0 : Math.round((cat.done / cat.to_do) * 100)
    }));

    // Keep uncategorized if it has tasks or if there are no custom categories
    return items.filter(cat => cat.id !== uncategorizedKey || cat.to_do > 0 || categories.length === 0);
  }, [habits, categories, periodDocs, view, categoryRateTimeframe]);

  // 2. Compute Task Repartition across categories (for Pie chart)
  const categoryPieData = useMemo(() => {
    if (habits.length === 0) return { items: [], total: 0 };

    const categoryMap = new Map<string, { id: string; name: string; color: string; count: number }>();
    
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        color: getCategoryColor(cat),
        count: 0
      });
    });

    const uncategorizedKey = 'uncategorized';
    categoryMap.set(uncategorizedKey, {
      id: uncategorizedKey,
      name: 'Non categorized',
      color: '#6B7280',
      count: 0
    });

    const currentDoc = periodDocs[currentKey] || null;
    const activeHabits = [
      ...habits.filter(h => h.periodicity === view && !h.deletedFromPeriodKey),
      ...(currentDoc?.oneOffHabits || [])
    ];

    activeHabits.forEach(h => {
      const catId = (h.categoryId && categoryMap.has(h.categoryId)) ? h.categoryId : uncategorizedKey;
      const bucket = categoryMap.get(catId)!;
      bucket.count += 1;
    });

    const total = activeHabits.length;
    if (total === 0) return { items: [], total: 0 };

    const items = Array.from(categoryMap.values())
      .filter(cat => cat.count > 0)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        value: cat.count,
        color: cat.color,
        percentage: Math.round((cat.count / total) * 100)
      }));

    return { items, total };
  }, [habits, categories, periodDocs, currentKey, view]);

  if (loading) return <div className="text-center py-20 font-bold text-black/20 dark:text-white/20">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Statistics</h1>
        <p className="text-black/40 dark:text-white/40 mb-8">Please sign in to view your statistics.</p>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold shadow-lg"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-16">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8 dark:text-white">Statistics</h1>
        
        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-1 rounded-2xl mb-12">
          <button
            onClick={() => setView('daily')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'daily' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-black/30 dark:text-white/30"
            )}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'weekly' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-black/30 dark:text-white/30"
            )}
          >
            Weekly
          </button>
        </div>

        <div className="mb-8">
          <CategoryDropdown
            categories={categories}
            value={selectedCategoryId}
            onChange={(val) => setSelectedCategoryId(val)}
            label="Filter by category"
            allLabel="All categories"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-12">
        <div className="bg-black/5 dark:bg-white/5 p-6 rounded-[32px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 block mb-2">Current rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold dark:text-white">{Math.round(currentStats.ratio * 100)}</span>
            <span className="text-xl font-bold text-black/20 dark:text-white/20">%</span>
          </div>
        </div>
        <div className="bg-black/5 dark:bg-white/5 p-6 rounded-[32px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 block mb-2">Year rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold dark:text-white">{yearRate}</span>
            <span className="text-xl font-bold text-black/20 dark:text-white/20">%</span>
          </div>
        </div>
      </div>

      {/* Time Series Area Chart */}
      <section className="bg-black/5 dark:bg-white/5 p-6 rounded-[32px] mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold dark:text-white">Past success rate</h2>
          <div className="flex gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setRange('month')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", range === 'month' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-black/30 dark:text-white/30")}
            >
              Month
            </button>
            <button
              onClick={() => setRange('year')}
              className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", range === 'year' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-black/30 dark:text-white/30")}
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
                  <stop offset="5%" stopColor={isDarkMode ? "#fff" : "#000"} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={isDarkMode ? "#fff" : "#000"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
                interval={range === 'year' ? (view === 'daily' ? 30 : 4) : 4}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-black dark:bg-white text-white dark:text-black px-3 py-2 rounded-xl text-xs font-bold shadow-lg">
                        {data.isAbsent ? 'Absent' : `${payload[0].value}%`}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="ratio" 
                stroke={isDarkMode ? "#fff" : "#000"} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRatio)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Per-Category Horizontal Histogram */}
      <section className="bg-black/5 dark:bg-white/5 p-6 rounded-[32px] mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold dark:text-white">Category rates</h2>
          <div className="flex gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setCategoryRateTimeframe('week')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", 
                categoryRateTimeframe === 'week' 
                  ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" 
                  : "text-black/30 dark:text-white/30"
              )}
            >
              Current
            </button>
            <button
              onClick={() => setCategoryRateTimeframe('year')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", 
                categoryRateTimeframe === 'year' 
                  ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" 
                  : "text-black/30 dark:text-white/30"
              )}
            >
              Year average
            </button>
          </div>
        </div>

        {categorySuccessRates.length === 0 ? (
          <p className="text-black/30 dark:text-white/30 text-xs font-medium py-4 text-center">
            No category tasks found.
          </p>
        ) : (
          <div className="space-y-4">
            {categorySuccessRates.map(cat => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="font-bold text-black/90 dark:text-white/90 truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-black/40 dark:text-white/40 font-medium shrink-0">
                      ({cat.done}/{cat.to_do})
                    </span>
                  </div>
                  <span className="font-bold text-sm text-black dark:text-white shrink-0 ml-2">
                    {cat.to_do === 0 ? '-' : `${cat.rate}%`}
                  </span>
                </div>

                <div className="w-full h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${cat.to_do === 0 ? 0 : Math.max(cat.rate, 3)}%`, 
                      backgroundColor: cat.color 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Category Task Repartition Pie Chart */}
      <section className="bg-black/5 dark:bg-white/5 p-6 rounded-[32px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold dark:text-white">Task distribution</h2>
        </div>

        {categoryPieData.items.length === 0 ? (
          <p className="text-black/30 dark:text-white/30 text-xs font-medium py-8 text-center">
            No active tasks found for this view.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-black text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl border border-white/10 z-50">
                            <div className="flex items-center gap-1.5 mb-0.5 text-white">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: data.color }} />
                              <span className="text-white font-bold">{data.name}</span>
                            </div>
                            <div className="text-white/80 text-[10px] font-medium">
                              {data.value} {data.value === 1 ? 'task' : 'tasks'} ({data.percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={categoryPieData.items}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {categoryPieData.items.map(entry => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-black dark:text-white">{categoryPieData.total}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-black/30 dark:text-white/30">Total</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2.5">
              {categoryPieData.items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-black/5 dark:border-white/5 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="font-bold text-black/90 dark:text-white/90 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-bold text-black/60 dark:text-white/60">
                      {item.value} {item.value === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
