import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats, ComputedHabit } from '../utils/habitLogic';
import { Habit, PeriodDoc, TaskGroup, UserSettings } from '../types';
import { Plus, ArrowUpDown, X, Layers, FolderPlus } from 'lucide-react';
import { Modal } from '../components/Modal';
import { CategoryDropdown } from '../components/CategoryDropdown';
import { GroupDropdown } from '../components/GroupDropdown';
import { motion, Reorder } from 'motion/react';
import { TaskGroupRow } from '../components/TaskGroupRow';
import { HabitRow } from '../components/HabitRow';
import { cn } from '../utils/cn';

interface TopLevelItem {
  id: string;
  type: 'group' | 'habit';
  group?: TaskGroup;
  groupHabits?: (ComputedHabit & { completed: boolean })[];
  habit?: ComputedHabit & { completed: boolean };
}

function buildTopLevelItems(
  habits: (ComputedHabit & { completed: boolean })[],
  taskGroups: TaskGroup[],
  habitOrder?: string[],
  isReorderMode: boolean = false
): TopLevelItem[] {
  const activeGroups = taskGroups.filter(g => g.habitIds.length > 0);
  const groupedHabitIds = new Set<string>();
  activeGroups.forEach(g => g.habitIds.forEach(id => groupedHabitIds.add(id)));

  const habitMap = new Map<string, ComputedHabit & { completed: boolean }>();
  habits.forEach(h => habitMap.set(h.id, h));

  const groupItems: TopLevelItem[] = activeGroups.map(group => {
    const groupHabits = group.habitIds
      .map(id => habitMap.get(id))
      .filter((h): h is ComputedHabit & { completed: boolean } => !!h);
    return {
      id: group.id,
      type: 'group',
      group,
      groupHabits
    };
  });

  const independentHabits = habits.filter(h => !groupedHabitIds.has(h.id));
  const habitItems: TopLevelItem[] = independentHabits.map(habit => ({
    id: habit.id,
    type: 'habit',
    habit
  }));

  const allItemsMap = new Map<string, TopLevelItem>();
  groupItems.forEach(item => allItemsMap.set(item.id, item));
  habitItems.forEach(item => allItemsMap.set(item.id, item));

  const orderedItems: TopLevelItem[] = [];
  const remainingMap = new Map(allItemsMap);

  if (habitOrder && habitOrder.length > 0) {
    habitOrder.forEach(id => {
      if (remainingMap.has(id)) {
        orderedItems.push(remainingMap.get(id)!);
        remainingMap.delete(id);
      }
    });
  }

  remainingMap.forEach(item => orderedItems.push(item));

  const isItemCompleted = (item: TopLevelItem): boolean => {
    if (item.type === 'habit') return !!item.habit?.completed;
    if (item.type === 'group' && item.groupHabits) {
      return item.groupHabits.length > 0 && item.groupHabits.every(h => h.completed);
    }
    return false;
  };

  if (isReorderMode) {
    return orderedItems;
  }

  const uncheckedItems = orderedItems.filter(item => !isItemCompleted(item));
  const checkedItems = orderedItems.filter(item => isItemCompleted(item));

  return [...uncheckedItems, ...checkedItems];
}

export const TodayPage: React.FC = () => {
  const { user, data, categories } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyDoc, setDailyDoc] = useState<PeriodDoc | null>(null);
  const [weeklyDoc, setWeeklyDoc] = useState<PeriodDoc | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Reordering mode
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localDailyHabits, setLocalDailyHabits] = useState<any[]>([]);
  const [localWeeklyHabits, setLocalWeeklyHabits] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  
  // Grouping mode state
  const [isGroupingModeDaily, setIsGroupingModeDaily] = useState(false);
  const [isGroupingModeWeekly, setIsGroupingModeWeekly] = useState(false);
  const [selectedDailyTaskIds, setSelectedDailyTaskIds] = useState<Set<string>>(new Set());
  const [selectedWeeklyTaskIds, setSelectedWeeklyTaskIds] = useState<Set<string>>(new Set());

  // Task Groups state
  const [dailyTaskGroups, setDailyTaskGroups] = useState<TaskGroup[]>([]);
  const [weeklyTaskGroups, setWeeklyTaskGroups] = useState<TaskGroup[]>([]);

  // Modal for Group Name
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [targetGroupPeriodicity, setTargetGroupPeriodicity] = useState<'daily' | 'weekly'>('daily');

  // Modal for Add Habit / Delete
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean } | null>(null);
  const [newName, setNewName] = useState('');
  const [newPeriodicity, setNewPeriodicity] = useState<'daily' | 'weekly'>('daily');
  const [isOneOff, setIsOneOff] = useState(false);
  const [isAntiTask, setIsAntiTask] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newMultiplicity, setNewMultiplicity] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');

  const dailyKey = getDailyKey();
  const weeklyKey = getWeeklyKey();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [h, d, w, settings] = await Promise.all([
      data.getHabits(user.uid),
      data.getPeriodDoc(user.uid, 'daily', dailyKey),
      data.getPeriodDoc(user.uid, 'weekly', weeklyKey),
      data.getSettings(user.uid)
    ]);
    setHabits(h);

    const loadedDailyGroups = d?.taskGroups ?? settings?.defaultDailyTaskGroups ?? [];
    const loadedDailyOrder = d?.habitOrder ?? settings?.defaultDailyHabitOrder ?? [];

    const loadedWeeklyGroups = w?.taskGroups ?? settings?.defaultWeeklyTaskGroups ?? [];
    const loadedWeeklyOrder = w?.habitOrder ?? settings?.defaultWeeklyHabitOrder ?? [];

    const finalDailyDoc: PeriodDoc = d ? {
      ...d,
      taskGroups: loadedDailyGroups,
      habitOrder: loadedDailyOrder
    } : {
      done: {},
      skippedHabitIds: [],
      oneOffHabits: [],
      taskGroups: loadedDailyGroups,
      habitOrder: loadedDailyOrder,
      updatedAt: new Date()
    };

    const finalWeeklyDoc: PeriodDoc = w ? {
      ...w,
      taskGroups: loadedWeeklyGroups,
      habitOrder: loadedWeeklyOrder
    } : {
      done: {},
      skippedHabitIds: [],
      oneOffHabits: [],
      taskGroups: loadedWeeklyGroups,
      habitOrder: loadedWeeklyOrder,
      updatedAt: new Date()
    };

    setDailyDoc(finalDailyDoc);
    setWeeklyDoc(finalWeeklyDoc);
    setDailyTaskGroups(loadedDailyGroups);
    setWeeklyTaskGroups(loadedWeeklyGroups);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const dailyStats = useMemo(() => 
    computePeriodStats(dailyKey, 'daily', habits, dailyDoc),
    [dailyKey, habits, dailyDoc]
  );
  
  const weeklyStats = useMemo(() => 
    computePeriodStats(weeklyKey, 'weekly', habits, weeklyDoc),
    [weeklyKey, habits, weeklyDoc]
  );

  useEffect(() => {
    setLocalDailyHabits(dailyStats.habits);
  }, [dailyStats.habits]);
  
  useEffect(() => {
    setLocalWeeklyHabits(weeklyStats.habits);
  }, [weeklyStats.habits]);

  const displayDailyHabits = useMemo(() => {
    if (selectedCategoryId === 'all') return localDailyHabits;
    return localDailyHabits.filter(h => h.categoryId === selectedCategoryId);
  }, [localDailyHabits, selectedCategoryId]);

  const displayWeeklyHabits = useMemo(() => {
    if (selectedCategoryId === 'all') return localWeeklyHabits;
    return localWeeklyHabits.filter(h => h.categoryId === selectedCategoryId);
  }, [localWeeklyHabits, selectedCategoryId]);

  // Compute top-level items (groups + independent habits)
  const topLevelDailyItems = useMemo(() => {
    return buildTopLevelItems(displayDailyHabits, dailyTaskGroups, dailyDoc?.habitOrder, isReorderMode);
  }, [displayDailyHabits, dailyTaskGroups, dailyDoc?.habitOrder, isReorderMode]);

  const topLevelWeeklyItems = useMemo(() => {
    return buildTopLevelItems(displayWeeklyHabits, weeklyTaskGroups, weeklyDoc?.habitOrder, isReorderMode);
  }, [displayWeeklyHabits, weeklyTaskGroups, weeklyDoc?.habitOrder, isReorderMode]);

  useEffect(() => {
    if (isAddModalOpen && selectedCategoryId !== 'all') {
      setNewCategoryId(selectedCategoryId);
    }
  }, [isAddModalOpen, selectedCategoryId]);

  // Helper to persist task groups, order, and user settings
  const updateTaskGroupsAndOrderAndSettings = async (
    periodicity: 'daily' | 'weekly',
    groups: TaskGroup[],
    habitOrder?: string[]
  ) => {
    if (!user) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;

    let finalOrder = habitOrder;
    if (!finalOrder) {
      finalOrder = doc?.habitOrder || stats.habits.map(h => h.id);
    }

    const updatePayload: Partial<PeriodDoc> = {
      taskGroups: groups,
      habitOrder: finalOrder
    };

    if (periodicity === 'daily') {
      setDailyTaskGroups(groups);
      setDailyDoc(prev => prev ? { ...prev, ...updatePayload } : null);
    } else {
      setWeeklyTaskGroups(groups);
      setWeeklyDoc(prev => prev ? { ...prev, ...updatePayload } : null);
    }

    await data.updatePeriodDoc(user.uid, periodicity, key, updatePayload);

    const settingsPayload: Partial<UserSettings> = periodicity === 'daily'
      ? { defaultDailyTaskGroups: groups, defaultDailyHabitOrder: finalOrder }
      : { defaultWeeklyTaskGroups: groups, defaultWeeklyHabitOrder: finalOrder };

    await data.updateSettings(user.uid, settingsPayload);
  };

  // --- Task Selection for Grouping ---
  const handleToggleTaskSelection = (id: string, periodicity: 'daily' | 'weekly') => {
    if (periodicity === 'daily') {
      setSelectedDailyTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedWeeklyTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const handleOpenGroupModal = (periodicity: 'daily' | 'weekly') => {
    const selectedIds = periodicity === 'daily' ? selectedDailyTaskIds : selectedWeeklyTaskIds;
    if (selectedIds.size === 0) return;
    setTargetGroupPeriodicity(periodicity);
    setGroupNameInput('');
    setIsGroupModalOpen(true);
  };

  const handleConfirmCreateGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    const periodicity = targetGroupPeriodicity;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    const selectedSet = periodicity === 'daily' ? selectedDailyTaskIds : selectedWeeklyTaskIds;
    const selectedIds: string[] = Array.from(selectedSet);
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;

    if (selectedIds.length === 0) return;

    const newGroup: TaskGroup = {
      id: 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: groupNameInput.trim() || 'New Group',
      habitIds: selectedIds,
      periodicity
    };

    const updatedGroups = [newGroup, ...currentGroups];
    if (periodicity === 'daily') {
      setSelectedDailyTaskIds(new Set());
      setIsGroupingModeDaily(false);
    } else {
      setSelectedWeeklyTaskIds(new Set());
      setIsGroupingModeWeekly(false);
    }

    let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
    const filteredOrder = currentOrder.filter(id => !selectedIds.includes(id));
    const newHabitOrder = [newGroup.id, ...filteredOrder];

    await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups, newHabitOrder);

    setIsGroupModalOpen(false);
    setGroupNameInput('');
  };

  // --- Task Group Operations ---
  const handleToggleGroup = async (group: TaskGroup, periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;

    const groupHabits = stats.habits.filter(h => group.habitIds.includes(h.id));
    if (groupHabits.length === 0) return;

    const isAllDone = groupHabits.every(h => h.completed);
    const targetCompleted = !isAllDone;

    const newDone = { ...(doc?.done || {}) };
    const newSubDone = { ...(doc?.subDone || {}) };

    groupHabits.forEach(h => {
      newDone[h.id] = targetCompleted;
      if (h.multiplicity > 1) {
        newSubDone[h.id] = targetCompleted ? h.multiplicity : 0;
      }
    });

    if (periodicity === 'daily') {
      setDailyDoc(prev => prev ? { ...prev, done: newDone, subDone: newSubDone } : null);
    } else {
      setWeeklyDoc(prev => prev ? { ...prev, done: newDone, subDone: newSubDone } : null);
    }

    await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, subDone: newSubDone });
  };

  const handleUngroup = async (groupId: string, periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;

    const groupToUngroup = currentGroups.find(g => g.id === groupId);
    const updatedGroups = currentGroups.filter(g => g.id !== groupId);

    let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
    const posIndex = currentOrder.indexOf(groupId);
    if (posIndex !== -1 && groupToUngroup) {
      currentOrder.splice(posIndex, 1, ...groupToUngroup.habitIds);
    } else {
      currentOrder = currentOrder.filter(id => id !== groupId);
      if (groupToUngroup) currentOrder.push(...groupToUngroup.habitIds);
    }

    await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups, currentOrder);
  };

  const handleRenameGroup = async (groupId: string, newName: string, periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;
    const updatedGroups = currentGroups.map(g => g.id === groupId ? { ...g, name: newName } : g);

    await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups);
  };

  const handleReorderHabitsInGroup = async (groupId: string, newHabitOrder: string[], periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;
    const updatedGroups = currentGroups.map(g => g.id === groupId ? { ...g, habitIds: newHabitOrder } : g);

    await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups);
  };

  // --- Individual Task Actions ---
  const handleToggle = async (id: string, periodicity: 'daily' | 'weekly', current: boolean) => {
    if (!user || isReorderMode) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    
    const newDone = { ...(doc?.done || {}), [id]: !current };
    const newSubDone = { ...(doc?.subDone || {}) };
    
    const habit = stats.habits.find(h => h.id === id);
    if (habit && habit.multiplicity > 1) {
      newSubDone[id] = !current ? habit.multiplicity : 0;
    }

    const updatedHabits = [...stats.habits].map(h => 
      h.id === id ? { ...h, completed: !current, subDone: !current ? h.multiplicity : 0 } : h
    );

    if (periodicity === 'daily') setLocalDailyHabits(updatedHabits);
    else setLocalWeeklyHabits(updatedHabits);

    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, done: newDone, subDone: newSubDone };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    try {
      await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, subDone: newSubDone });
    } catch (error) {
      console.error("Failed to toggle habit:", error);
      fetchData();
    }
  };

  const handleSubToggle = async (id: string, periodicity: 'daily' | 'weekly', subIndex: number) => {
    if (!user || isReorderMode) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    
    const habit = stats.habits.find(h => h.id === id);
    if (!habit || habit.multiplicity <= 1) return;

    const currentSubDone = habit.subDone;
    let newCount = subIndex < currentSubDone ? subIndex : subIndex + 1;
    
    const isNowDone = newCount === habit.multiplicity;

    const newDone = { ...(doc?.done || {}), [id]: isNowDone };
    const newSubDone = { ...(doc?.subDone || {}), [id]: newCount };

    const updatedHabits = [...stats.habits].map(h => 
      h.id === id ? { ...h, completed: isNowDone, subDone: newCount } : h
    );

    if (periodicity === 'daily') setLocalDailyHabits(updatedHabits);
    else setLocalWeeklyHabits(updatedHabits);

    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, done: newDone, subDone: newSubDone };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    try {
      await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, subDone: newSubDone });
    } catch (error) {
      console.error("Failed to toggle sub-habit:", error);
      fetchData();
    }
  };

  const handleReorderTopLevel = async (newTopLevelItems: TopLevelItem[], periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;
    const newHabitOrder = newTopLevelItems.map(item => item.id);
    await updateTaskGroupsAndOrderAndSettings(periodicity, currentGroups, newHabitOrder);
  };

  const handleDelete = async (id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean) => {
    if (!user) return;
    
    if (isOneOff) {
      const key = periodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOffs = (doc?.oneOffHabits || []).filter(h => h.id !== id);
      const newDone = { ...(doc?.done || {}) };
      const newSubDone = { ...(doc?.subDone || {}) };
      delete newDone[id];
      delete newSubDone[id];

      const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;
      const updatedGroups = currentGroups.map(g => ({
        ...g,
        habitIds: g.habitIds.filter(hid => hid !== id)
      })).filter(g => g.habitIds.length > 0);

      const currentOrder = (doc?.habitOrder || []).filter(hid => hid !== id);

      if (periodicity === 'daily') {
        setLocalDailyHabits(prev => prev.filter(h => h.id !== id));
      } else {
        setLocalWeeklyHabits(prev => prev.filter(h => h.id !== id));
      }

      await data.updatePeriodDoc(user.uid, periodicity, key, { 
        oneOffHabits: newOneOffs, 
        done: newDone, 
        subDone: newSubDone
      });

      await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups, currentOrder);
      fetchData();
    } else {
      setDeleteConfirm({ id, name, periodicity, isOneOff });
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteConfirm) return;
    const { id, periodicity } = deleteConfirm;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    
    const currentGroups = periodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;
    const updatedGroups = currentGroups.map(g => ({
      ...g,
      habitIds: g.habitIds.filter(hid => hid !== id)
    })).filter(g => g.habitIds.length > 0);

    const currentOrder = (doc?.habitOrder || []).filter(hid => hid !== id);

    if (periodicity === 'daily') {
      setLocalDailyHabits(prev => prev.filter(h => h.id !== id));
    } else {
      setLocalWeeklyHabits(prev => prev.filter(h => h.id !== id));
    }

    await data.setHabitDeletedFromPeriodKey(user.uid, id, key);
    await updateTaskGroupsAndOrderAndSettings(periodicity, updatedGroups, currentOrder);

    setDeleteConfirm(null);
    fetchData();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || isSubmitting) return;

    if (selectedGroupId === 'new' && !newGroupName.trim()) {
      setAddError("Please enter a name for the new group");
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      let createdHabitId = '';
      const key = newPeriodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = newPeriodicity === 'daily' ? dailyDoc : weeklyDoc;
      const stats = newPeriodicity === 'daily' ? dailyStats : weeklyStats;

      if (isOneOff) {
        const newId = Math.random().toString(36).substr(2, 9);
        createdHabitId = newId;
        const newOneOff: any = { 
          id: newId, 
          name: newName.trim(),
        };
        if (newCategoryId) newOneOff.categoryId = newCategoryId;
        if (newMultiplicity > 1) newOneOff.multiplicity = newMultiplicity;
        if (isAntiTask) newOneOff.isAntiTask = true;
        
        let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
        const newHabitOrder = [newId, ...currentOrder.filter(hid => hid !== newId)];

        await data.updatePeriodDoc(user.uid, newPeriodicity, key, {
          oneOffHabits: [newOneOff, ...(doc?.oneOffHabits || [])],
          habitOrder: newHabitOrder
        });
        await data.updateSettings(user.uid, newPeriodicity === 'daily'
          ? { defaultDailyHabitOrder: newHabitOrder }
          : { defaultWeeklyHabitOrder: newHabitOrder }
        );
      } else {
        const currentHabits = await data.getHabits(user.uid);
        const minOrder = currentHabits
          .filter(h => h.periodicity === newPeriodicity)
          .reduce((min, h) => Math.min(min, h.order ?? 0), 0);
        
        const habitPayload: any = {
          name: newName.trim(),
          periodicity: newPeriodicity,
          createdAt: new Date(),
          deletedFromPeriodKey: null,
          order: minOrder - 1,
        };
        if (newCategoryId) habitPayload.categoryId = newCategoryId;
        if (newMultiplicity > 1) habitPayload.multiplicity = newMultiplicity;
        if (isAntiTask) habitPayload.isAntiTask = true;

        const newId = await data.addHabit(user.uid, habitPayload);
        createdHabitId = newId;
        
        let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
        const newHabitOrder = [newId, ...currentOrder.filter(hid => hid !== newId)];
        
        await data.updatePeriodDoc(user.uid, newPeriodicity, key, { habitOrder: newHabitOrder });
        await data.updateSettings(user.uid, newPeriodicity === 'daily'
          ? { defaultDailyHabitOrder: newHabitOrder }
          : { defaultWeeklyHabitOrder: newHabitOrder }
        );
      }

      // Process group assignment if specified
      if (createdHabitId) {
        const currentGroups = newPeriodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups;

        if (selectedGroupId === 'new') {
          const createdGroup: TaskGroup = {
            id: 'group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: newGroupName.trim() || 'New Group',
            habitIds: [createdHabitId],
            periodicity: newPeriodicity
          };
          const updatedGroups = [createdGroup, ...currentGroups];

          let currentOrder = (newPeriodicity === 'daily' ? dailyDoc : weeklyDoc)?.habitOrder || [];
          const newHabitOrder = [createdGroup.id, ...currentOrder.filter(id => id !== createdHabitId)];

          await updateTaskGroupsAndOrderAndSettings(newPeriodicity, updatedGroups, newHabitOrder);
        } else if (selectedGroupId) {
          const updatedGroups = currentGroups.map(g => 
            g.id === selectedGroupId 
              ? { ...g, habitIds: [...g.habitIds, createdHabitId] } 
              : g
          );

          let currentOrder = (newPeriodicity === 'daily' ? dailyDoc : weeklyDoc)?.habitOrder || [];
          const newHabitOrder = currentOrder.filter(id => id !== createdHabitId);

          await updateTaskGroupsAndOrderAndSettings(newPeriodicity, updatedGroups, newHabitOrder);
        }
      }

      setNewName('');
      setSelectedGroupId('');
      setNewGroupName('');
      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to add habit:", err);
      setAddError(err.message || "Failed to add habit");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-black/30 dark:text-white/30 font-medium">
        Loading habits...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-32">
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-8">
          <CategoryDropdown
            categories={categories}
            value={selectedCategoryId}
            onChange={(val) => setSelectedCategoryId(val)}
            label="Filter by category"
            allLabel="All categories"
          />
        </div>
      )}

      {/* Daily Habits Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 dark:text-white/30">
            Daily habits
          </h2>
          <div className="flex items-center gap-2">
            {/* Grouping Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                if (isGroupingModeDaily && selectedDailyTaskIds.size > 0) {
                  handleOpenGroupModal('daily');
                } else {
                  setIsGroupingModeDaily(!isGroupingModeDaily);
                  if (isReorderMode) setIsReorderMode(false);
                }
              }}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-1.5",
                isGroupingModeDaily 
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-xs" 
                  : "text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title={isGroupingModeDaily ? "Validate grouping" : "Grouping mode"}
            >
              <Layers size={18} />
              {isGroupingModeDaily && selectedDailyTaskIds.size > 0 && (
                <span className="text-[10px] font-extrabold bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded-md">
                  {selectedDailyTaskIds.size}
                </span>
              )}
            </button>

            {/* Reordering Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsReorderMode(!isReorderMode);
                if (isGroupingModeDaily) setIsGroupingModeDaily(false);
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                isReorderMode 
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-xs" 
                  : "text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title={isReorderMode ? "Exit reorder mode" : "Reorder habits"}
            >
              {isReorderMode ? <X size={18} /> : <ArrowUpDown size={18} />}
            </button>
          </div>
        </div>

        {/* Grouping Mode Active Banner for Daily */}
        {isGroupingModeDaily && (
          <div className="flex items-center justify-between bg-black/5 dark:bg-white/10 p-3 rounded-2xl mb-4 border border-black/10 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold dark:text-white">
              <FolderPlus size={16} />
              <span>{selectedDailyTaskIds.size} task{selectedDailyTaskIds.size === 1 ? '' : 's'} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsGroupingModeDaily(false);
                  setSelectedDailyTaskIds(new Set());
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 dark:text-white hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedDailyTaskIds.size === 0}
                onClick={() => handleOpenGroupModal('daily')}
                className="text-xs font-bold px-4 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-all shadow-xs"
              >
                Group selected
              </button>
            </div>
          </div>
        )}

        <Reorder.Group 
          axis="y" 
          values={topLevelDailyItems} 
          onReorder={(newTopLevel) => handleReorderTopLevel(newTopLevel, 'daily')} 
          className="space-y-3"
        >
          {topLevelDailyItems.map(item => (
            <Reorder.Item key={item.id} value={item} dragListener={isReorderMode}>
              {item.type === 'group' && item.group && item.groupHabits ? (
                <TaskGroupRow
                  group={item.group}
                  habits={item.groupHabits}
                  categories={categories}
                  isReorderMode={isReorderMode}
                  isGroupingMode={isGroupingModeDaily}
                  onToggleGroup={() => handleToggleGroup(item.group!, 'daily')}
                  onToggleHabit={(id, isOneOff, current) => handleToggle(id, 'daily', current)}
                  onSubToggleHabit={(id, isOneOff, idx) => handleSubToggle(id, 'daily', idx)}
                  onDeleteHabit={(id, name, isOneOff) => handleDelete(id, name, 'daily', isOneOff)}
                  onUngroup={() => handleUngroup(item.group!.id, 'daily')}
                  onRenameGroup={(newName) => handleRenameGroup(item.group!.id, newName, 'daily')}
                  onReorderHabitsInGroup={(newHabitOrder) => handleReorderHabitsInGroup(item.group!.id, newHabitOrder, 'daily')}
                />
              ) : item.habit ? (
                <HabitRow
                  habit={item.habit}
                  categories={categories}
                  isReorderMode={isReorderMode}
                  isGroupingMode={isGroupingModeDaily}
                  isSelected={selectedDailyTaskIds.has(item.habit.id)}
                  onSelectToggle={() => handleToggleTaskSelection(item.habit!.id, 'daily')}
                  onToggle={() => handleToggle(item.habit!.id, 'daily', item.habit!.completed)}
                  onSubToggle={(idx) => handleSubToggle(item.habit!.id, 'daily', idx)}
                  onDelete={() => handleDelete(item.habit!.id, item.habit!.name, 'daily', item.habit!.isOneOff)}
                />
              ) : null}
            </Reorder.Item>
          ))}
          {topLevelDailyItems.length === 0 && (
            <p className="text-black/20 dark:text-white/20 italic text-sm">
              {selectedCategoryId === 'all' ? "No daily habits for today" : "No daily habits in this category"}
            </p>
          )}
        </Reorder.Group>
      </section>

      {/* Weekly Habits Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 dark:text-white/30">
            Weekly habits
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isGroupingModeWeekly && selectedWeeklyTaskIds.size > 0) {
                  handleOpenGroupModal('weekly');
                } else {
                  setIsGroupingModeWeekly(!isGroupingModeWeekly);
                  if (isReorderMode) setIsReorderMode(false);
                }
              }}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-1.5",
                isGroupingModeWeekly 
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-xs" 
                  : "text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title={isGroupingModeWeekly ? "Validate grouping" : "Grouping mode"}
            >
              <Layers size={18} />
              {isGroupingModeWeekly && selectedWeeklyTaskIds.size > 0 && (
                <span className="text-[10px] font-extrabold bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded-md">
                  {selectedWeeklyTaskIds.size}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsReorderMode(!isReorderMode);
                if (isGroupingModeWeekly) setIsGroupingModeWeekly(false);
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                isReorderMode 
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-xs" 
                  : "text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title={isReorderMode ? "Exit reorder mode" : "Reorder habits"}
            >
              {isReorderMode ? <X size={18} /> : <ArrowUpDown size={18} />}
            </button>
          </div>
        </div>

        {/* Grouping Mode Active Banner for Weekly */}
        {isGroupingModeWeekly && (
          <div className="flex items-center justify-between bg-black/5 dark:bg-white/10 p-3 rounded-2xl mb-4 border border-black/10 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold dark:text-white">
              <FolderPlus size={16} />
              <span>{selectedWeeklyTaskIds.size} task{selectedWeeklyTaskIds.size === 1 ? '' : 's'} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsGroupingModeWeekly(false);
                  setSelectedWeeklyTaskIds(new Set());
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 dark:text-white hover:bg-black/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedWeeklyTaskIds.size === 0}
                onClick={() => handleOpenGroupModal('weekly')}
                className="text-xs font-bold px-4 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-40 transition-all shadow-xs"
              >
                Group selected
              </button>
            </div>
          </div>
        )}

        <Reorder.Group 
          axis="y" 
          values={topLevelWeeklyItems} 
          onReorder={(newTopLevel) => handleReorderTopLevel(newTopLevel, 'weekly')} 
          className="space-y-3"
        >
          {topLevelWeeklyItems.map(item => (
            <Reorder.Item key={item.id} value={item} dragListener={isReorderMode}>
              {item.type === 'group' && item.group && item.groupHabits ? (
                <TaskGroupRow
                  group={item.group}
                  habits={item.groupHabits}
                  categories={categories}
                  isReorderMode={isReorderMode}
                  isGroupingMode={isGroupingModeWeekly}
                  onToggleGroup={() => handleToggleGroup(item.group!, 'weekly')}
                  onToggleHabit={(id, isOneOff, current) => handleToggle(id, 'weekly', current)}
                  onSubToggleHabit={(id, isOneOff, idx) => handleSubToggle(id, 'weekly', idx)}
                  onDeleteHabit={(id, name, isOneOff) => handleDelete(id, name, 'weekly', isOneOff)}
                  onUngroup={() => handleUngroup(item.group!.id, 'weekly')}
                  onRenameGroup={(newName) => handleRenameGroup(item.group!.id, newName, 'weekly')}
                  onReorderHabitsInGroup={(newHabitOrder) => handleReorderHabitsInGroup(item.group!.id, newHabitOrder, 'weekly')}
                />
              ) : item.habit ? (
                <HabitRow
                  habit={item.habit}
                  categories={categories}
                  isReorderMode={isReorderMode}
                  isGroupingMode={isGroupingModeWeekly}
                  isSelected={selectedWeeklyTaskIds.has(item.habit.id)}
                  onSelectToggle={() => handleToggleTaskSelection(item.habit!.id, 'weekly')}
                  onToggle={() => handleToggle(item.habit!.id, 'weekly', item.habit!.completed)}
                  onSubToggle={(idx) => handleSubToggle(item.habit!.id, 'weekly', idx)}
                  onDelete={() => handleDelete(item.habit!.id, item.habit!.name, 'weekly', item.habit!.isOneOff)}
                />
              ) : null}
            </Reorder.Item>
          ))}
          {topLevelWeeklyItems.length === 0 && (
            <p className="text-black/20 dark:text-white/20 italic text-sm">
              {selectedCategoryId === 'all' ? "No weekly habits for this week" : "No weekly habits in this category"}
            </p>
          )}
        </Reorder.Group>
      </section>

      {/* Floating Add Habit Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* Modal for Group Creation Name */}
      <Modal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        title="Group tasks"
      >
        <form onSubmit={handleConfirmCreateGroup} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
              Group name
            </label>
            <input
              type="text"
              value={groupNameInput}
              onChange={e => setGroupNameInput(e.target.value)}
              className="w-full text-xl font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pb-1 transition-colors"
              placeholder="e.g. Morning Routine, Work Prep..."
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-black/10 dark:border-white/10 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupNameInput.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-black dark:bg-white text-white dark:text-black disabled:opacity-40 hover:opacity-90 transition-all shadow-xs"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Adding Habit */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add habit">
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full text-xl font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pb-1 transition-colors"
              placeholder="Drink water"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNewPeriodicity('daily')}
              className={cn(
                "py-3 rounded-xl border font-bold text-sm transition-all",
                newPeriodicity === 'daily'
                  ? "border-black dark:border-white bg-black/5 dark:bg-white/5 dark:text-white"
                  : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setNewPeriodicity('weekly')}
              className={cn(
                "py-3 rounded-xl border font-bold text-sm transition-all",
                newPeriodicity === 'weekly'
                  ? "border-black dark:border-white bg-black/5 dark:bg-white/5 dark:text-white"
                  : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
              )}
            >
              Weekly
            </button>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Category</label>
              <CategoryDropdown
                categories={categories}
                value={newCategoryId}
                onChange={(val) => setNewCategoryId(val)}
                label=""
              />
            </div>
          )}

          {/* Group selection option */}
          <div className="space-y-2">
            <GroupDropdown
              groups={newPeriodicity === 'daily' ? dailyTaskGroups : weeklyTaskGroups}
              value={selectedGroupId}
              onChange={(val) => {
                setSelectedGroupId(val);
                if (val !== 'new') {
                  setNewGroupName('');
                }
              }}
              label="Group (Optional)"
            />

            {selectedGroupId === 'new' && (
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Enter new group name..."
                required
                className="w-full text-sm font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pt-2 pb-1 transition-colors"
              />
            )}
          </div>

          <div className="flex items-center justify-between py-2 border-t border-black/5 dark:border-white/5">
            <div>
              <div className="font-bold text-sm dark:text-white">One-off task</div>
              <div className="text-xs text-black/40 dark:text-white/40">Only for this date/week</div>
            </div>
            <input
              type="checkbox"
              checked={isOneOff}
              onChange={e => setIsOneOff(e.target.checked)}
              className="w-5 h-5 rounded border-black/20 text-black focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-black/5 dark:border-white/5">
            <div>
              <div className="font-bold text-sm dark:text-white">Anti-task</div>
              <div className="text-xs text-black/40 dark:text-white/40">Completed by default</div>
            </div>
            <input
              type="checkbox"
              checked={isAntiTask}
              onChange={e => setIsAntiTask(e.target.checked)}
              className="w-5 h-5 rounded border-black/20 text-black focus:ring-0"
            />
          </div>

          <div className="space-y-1 py-2 border-t border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-sm dark:text-white">Sub-steps</label>
              <span className="text-xs font-bold text-black/60 dark:text-white/60">{newMultiplicity} {newMultiplicity === 1 ? 'step' : 'steps'}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={newMultiplicity}
              onChange={e => setNewMultiplicity(parseInt(e.target.value))}
              className="w-full accent-black dark:accent-white"
            />
          </div>

          {addError && <p className="text-red-500 text-xs font-bold">{addError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
          >
            {isSubmitting ? "Adding..." : "Add habit"}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        title="Delete habit"
      >
        <div className="space-y-6">
          <p className="text-black/60 dark:text-white/60 text-sm">
            Are you sure you want to delete <strong className="text-black dark:text-white">{deleteConfirm?.name}</strong>?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-black/10 dark:border-white/10 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-xs"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
