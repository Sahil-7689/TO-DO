import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTasks } from '@/contexts/TasksContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { tasks, isLoading, error, refresh, toggleTask, deleteTask, sync } = useTasks();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  type Category = 'all' | 'today' | 'important' | 'upcoming';
  const [category, setCategory] = useState<Category>('all');

  const counts = useMemo(() => {
    const today = new Date();
    const isSameDay = (iso?: string) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };
    const upcoming = (iso?: string) => iso && new Date(iso) > today;
    return {
      all: tasks.length,
      today: tasks.filter(t => isSameDay(t.dueDate)).length,
      important: tasks.filter(t => t.priority === 'high').length,
      upcoming: tasks.filter(t => upcoming(t.dueDate)).length,
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    const byQuery = tasks.filter(t => t.title.toLowerCase().includes(lower));
    const today = new Date();
    const isSameDay = (iso?: string) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    };
    const upcoming = (iso?: string) => iso && new Date(iso) > today;
    if (category === 'all') return byQuery;
    if (category === 'today') return byQuery.filter(t => isSameDay(t.dueDate));
    if (category === 'important') return byQuery.filter(t => t.priority === 'high');
    return byQuery.filter(t => upcoming(t.dueDate));
  }, [tasks, query, category]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.completed).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const onToggle = async (id: string) => {
    await Haptics.selectionAsync();
    await toggleTask(id);
  };
  const onDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteTask(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/icon.png')} style={styles.headerLogo} contentFit="contain" />
          <Text style={styles.title}>Tasks</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearch(s => !s)} style={styles.headerIcon}>
            <IconSymbol name="magnifyingglass" size={20} color="#111827" />
          </Pressable>
          <Pressable
            onPress={async () => {
              if (isLoggingOut) return;
              setIsLoggingOut(true);
              try {
                await logout();
                await Haptics.selectionAsync();
                router.replace('/login');
              } finally {
                setIsLoggingOut(false);
              }
            }}
            style={[styles.logoutBtn, isLoggingOut && { opacity: 0.6 }]}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out…' : 'Logout'}</Text>
          </Pressable>
        </View>
      </View>
      {showSearch ? (
        <View style={styles.searchWrap}>
          <IconSymbol name="magnifyingglass" size={20} color="#666" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search tasks" style={styles.searchInput} />
        </View>
      ) : null}
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <View style={styles.progressCard}>
        <View style={styles.progressLeft}>
          <View style={styles.progressCircleOuter}>
            <View style={styles.progressCircleInner}>
              <Text style={styles.progressPercent}>{completionRate}%</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressRight}>
          <Text style={styles.progressTitle}>You're doing great!</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
          </View>
          <Text style={styles.progressSub}>Weekly completed: {tasks.filter(t => t.completed).length}/{tasks.length}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {([
          { key: 'all', label: 'All Tasks', icon: 'tray.full', count: counts.all },
          { key: 'today', label: 'Today', icon: 'sun.max', count: counts.today },
          { key: 'important', label: 'Important', icon: 'exclamationmark.circle', count: counts.important },
          { key: 'upcoming', label: 'Upcoming', icon: 'calendar', count: counts.upcoming },
        ] as { key: Category; label: string; icon: any; count: number }[]).map(tab => (
          <Pressable key={tab.key} onPress={() => setCategory(tab.key)} style={[styles.tabChip, category === tab.key && styles.tabChipActive]}>
            <IconSymbol name={tab.icon} size={18} color={category === tab.key ? '#111827' : '#6b7280'} />
            <Text style={[styles.tabText, category === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            <View style={[styles.badge, category === tab.key && styles.badgeActive]}>
              <Text style={[styles.badgeText, category === tab.key && styles.badgeTextActive]}>{tab.count}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={async () => { await refresh(); await sync(); }} />}
        renderItem={({ item }) => (
          <Swipeable
            overshootLeft={false}
            overshootRight={false}
            renderLeftActions={() => (
              <View style={[styles.swipeAction, styles.completeAction]}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                <Text style={styles.swipeText}>Complete</Text>
              </View>
            )}
            renderRightActions={() => (
              <View style={[styles.swipeAction, styles.deleteAction]}>
                <IconSymbol name="trash" size={24} color="#fff" />
                <Text style={styles.swipeText}>Delete</Text>
              </View>
            )}
            onSwipeableOpen={(dir) => {
              if (dir === 'left') onToggle(item.id);
              if (dir === 'right') onDelete(item.id);
            }}
          >
            <View style={styles.taskCard}>
              <Pressable onPress={() => onToggle(item.id)} style={[styles.checkbox, item.completed && styles.checkboxDone]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.completed && styles.taskDone]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.taskMetaRow}>
                  <View style={[styles.priorityDot, item.priority === 'high' ? styles.dotHigh : item.priority === 'medium' ? styles.dotMedium : styles.dotLow]} />
                  {!!item.dueDate && (
                    <Text style={styles.dueText}>{formatDue(item.dueDate)}</Text>
                  )}
                </View>
              </View>
              <Pressable onPress={() => onDelete(item.id)}>
                <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
              </Pressable>
            </View>
          </Swipeable>
        )}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIllustration}>🗒️</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySub}>Tap Add Task to create your first one</Text>
          </View>
        ) : null}
      />
      <AddTaskFloatingButton />
    </View>
  );
}
function AddTaskFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
      {open ? <AddTaskModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | undefined>();
  const [dueChoice, setDueChoice] = useState<'none' | 'today' | 'tomorrow' | 'nextweek'>('none');

  const submit = async () => {
    if (!title.trim()) return;
    const dueDate = computeDueISO(dueChoice);
    await addTask({ title: title.trim(), description: description.trim() || undefined, priority, dueDate });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Add Task</Text>
        <TextInput style={styles.modalInput} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.modalInput, { height: 80 }]} multiline placeholder="Description (optional)" value={description} onChangeText={setDescription} />
        <View style={styles.priorityRow}>
          {(['low','medium','high'] as const).map(p => (
            <Pressable key={p} style={[styles.tag, priority === p && styles.tagActive]} onPress={() => setPriority(p)}>
              <Text style={[styles.tagText, priority === p && styles.tagTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionLabel}>Due date</Text>
        <View style={styles.priorityRow}>
          {(['none','today','tomorrow','nextweek'] as const).map(opt => (
            <Pressable key={opt} style={[styles.tag, dueChoice === opt && styles.tagActive]} onPress={() => setDueChoice(opt)}>
              <Text style={[styles.tagText, dueChoice === opt && styles.tagTextActive]}>{labelForDue(opt)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.modalActions}>
          <Pressable style={[styles.modalBtn, styles.cancel]} onPress={onClose}><Text>Cancel</Text></Pressable>
          <Pressable style={[styles.modalBtn, styles.add]} onPress={submit}><Text style={{ color: 'white' }}>Add</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function computeDueISO(choice: 'none' | 'today' | 'tomorrow' | 'nextweek') {
  const base = new Date();
  if (choice === 'none') return undefined;
  if (choice === 'today') return new Date(base.getFullYear(), base.getMonth(), base.getDate()).toISOString();
  if (choice === 'tomorrow') return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1).toISOString();
  if (choice === 'nextweek') return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7).toISOString();
}

function labelForDue(choice: 'none' | 'today' | 'tomorrow' | 'nextweek') {
  if (choice === 'none') return 'None';
  if (choice === 'today') return 'Today';
  if (choice === 'tomorrow') return 'Tomorrow';
  return 'Next week';
}

function formatDue(iso: string) {
  try {
    const d = new Date(iso);
    return d.toDateString();
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerLogo: { width: 28, height: 28, borderRadius: 6 },
  logoutBtn: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  logoutText: { color: '#111827', fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1 },
  errorBanner: { backgroundColor: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8, marginBottom: 8 },
  progressCard: { flexDirection: 'row', gap: 16, padding: 16, borderRadius: 16, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 12 },
  progressLeft: { alignItems: 'center', justifyContent: 'center' },
  progressCircleOuter: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  progressCircleInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  progressPercent: { fontWeight: '700', color: '#1d4ed8' },
  progressRight: { flex: 1, justifyContent: 'center', gap: 6 },
  progressTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  progressBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#3b82f6' },
  progressSub: { fontSize: 12, color: '#6b7280' },
  tabsRow: { gap: 8, paddingVertical: 8 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f3f4f6' },
  tabChipActive: { backgroundColor: '#dbeafe' },
  tabText: { color: '#6b7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  badge: { marginLeft: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#e5e7eb' },
  badgeActive: { backgroundColor: '#bfdbfe' },
  badgeText: { fontSize: 12, color: '#6b7280' },
  badgeTextActive: { color: '#111827', fontWeight: '600' },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#ffffff', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#9ca3af' },
  checkboxDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  taskTitle: { flex: 1, fontSize: 16, color: '#111827' },
  taskDone: { textDecorationLine: 'line-through', color: '#6b7280' },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  dotHigh: { backgroundColor: '#ef4444' },
  dotMedium: { backgroundColor: '#f59e0b' },
  dotLow: { backgroundColor: '#10b981' },
  dueText: { fontSize: 12, color: '#6b7280' },
  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyIllustration: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptySub: { color: '#6b7280', marginTop: 4 },
  fab: { position: 'absolute', alignSelf: 'center', bottom: 24, paddingHorizontal: 20, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  fabPlus: { color: 'white', fontSize: 24, marginTop: -1 },
  fabLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalBackdrop: { position: 'absolute', inset: 0 as any, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  tag: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  tagText: { color: '#6b7280', textTransform: 'capitalize' },
  tagTextActive: { color: '#1d4ed8' },
  sectionLabel: { fontSize: 12, color: '#6b7280' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  modalBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  cancel: { backgroundColor: '#f3f4f6' },
  add: { backgroundColor: '#3b82f6' },
  swipeAction: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  completeAction: { backgroundColor: '#22c55e' },
  deleteAction: { backgroundColor: '#ef4444', justifyContent: 'flex-end' },
  swipeText: { color: 'white', fontWeight: '600' },
});
