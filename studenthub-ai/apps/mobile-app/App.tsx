import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { PlaceSummary } from '@studenthub/types';
import { colors } from './src/components/ui';
import { StudentProvider, useStudent } from './src/context/StudentContext';
import { Bookings, History, Profile, Saved } from './src/screens/Activity';
import { Sidebar } from './src/components/SideNav';
import Assistant from './src/screens/Assistant';
import Admin from './src/screens/Admin';
import Auth from './src/screens/Auth';
import Campus from './src/screens/Campus';
import Discover from './src/screens/Discover';
import PlaceDetails from './src/screens/PlaceDetails';
import Owner from './src/screens/Owner';
import OwnerLanding from './src/screens/owner/OwnerLanding';
import Welcome from './src/screens/Welcome';

const tabs = [
  { id: 'discover', label: 'Home', icon: '⌂' },
  { id: 'saved', label: 'Saved', icon: '♡' },
  { id: 'bookings', label: 'Bookings', icon: '▦' },
  { id: 'profile', label: 'Profile', icon: '☺' },
] as const;
type Tab = typeof tabs[number]['id'];

function TabButton({ item, active, onPress }: { item: (typeof tabs)[number]; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}>
    <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}><Text style={[styles.icon, active && styles.active]}>{item.icon}</Text></View>
    <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
  </Pressable>;
}

type Page = { type: 'assistant' } | { type: 'place'; place: PlaceSummary } | { type: 'owner' } | { type: 'admin' } | { type: 'history' } | { type: 'campus' };

function StudentApp() {
  const { hydrated, hasLaunched, completeWelcome, trackRecent, session } = useStudent();
  /** Welcome, the business welcome, sign-in, and the app — in that order, once per device. */
  const [stage, setStage] = useState<'welcome' | 'owner' | 'auth' | 'app'>('welcome');
  /** Which sign-up Auth opens: student (Get Started) or owner (List your business). */
  const [authIntent, setAuthIntent] = useState<'student' | 'owner'>('student');
  /** Auth opens as registration or sign-in depending on the button that led here. */
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [gated, setGated] = useState(false);
  const [tab, setTab] = useState<Tab>('discover');
  const [pages, setPages] = useState<Page[]>([]);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const page = pages[pages.length - 1];
  const selectTab = (next: Tab) => { setTab(next); setPages([]); };
  const enterApp = (page?: Page) => { completeWelcome(); setStage('app'); if (page) setPages([page]); };
  // Once storage hydrates, skip Welcome when already completed on this device.
  useEffect(() => {
    if (hydrated && !gated) {
      setGated(true);
      if (hasLaunched) setStage('app');
    }
  }, [hydrated, hasLaunched, gated]);
  /**
   * Role-driven landing: an OWNER session opens the owner dashboard — after any
   * sign-in path (Get Started, List your business, Profile) and on relaunch
   * with a stored session. Student and guest sessions stay on the home tabs,
   * and never sit on the owner screen (sign-out from it falls back to Home).
   */
  const sessionRole = session?.user.role ?? null;
  const ownerId = session && sessionRole === 'OWNER' ? session.user.id : null;
  useEffect(() => {
    if (!hydrated) return;
    if (ownerId) { setPages([{ type: 'owner' }]); return; }
    setPages((current) => (current[current.length - 1]?.type === 'owner' ? [] : current));
  }, [hydrated, ownerId, sessionRole]);
  const openAssistant = useCallback(() => setPages([{ type: 'assistant' }]), []);
  const openPlace = (place: PlaceSummary) => { trackRecent(place); setPages((current) => [...current, { type: 'place', place }]); };
  /** Sidebar navigation: tabs clear the page stack; pages replace it. */
  const navigate = (id: string) => {
    if (id === 'assistant') { setPages([{ type: 'assistant' }]); return; }
    if (id === 'owner') { setPages([{ type: 'owner' }]); return; }
    if (id === 'admin') { setPages([{ type: 'admin' }]); return; }
    if (id === 'history') { setPages([{ type: 'history' }]); return; }
    selectTab(id as Tab);
  };
  const navId = page?.type === 'place' || !page ? tab : page.type;
  const goBack = useCallback(() => {
    // Auth backs up to where it came from: the business welcome for owners, the student welcome otherwise.
    if (stage === 'auth') { setStage(authIntent === 'owner' ? 'owner' : 'welcome'); return true; }
    if (stage === 'owner') { setStage('welcome'); return true; }
    if (stage === 'welcome') return false;
    if (pages.length) { setPages((current) => current.slice(0, -1)); return true; }
    if (tab !== 'discover') { setTab('discover'); return true; }
    return false;
  }, [pages.length, tab, stage, authIntent]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack]);

  const showWelcome = stage === 'welcome';
  const showAuth = stage === 'auth';
  const showBusinessWelcome = stage === 'owner';
  return <SafeAreaView style={[styles.safeArea, (showWelcome || showBusinessWelcome) && { backgroundColor: '#150F33' }]}>
    <StatusBar style={showWelcome || showBusinessWelcome ? 'light' : 'dark'} />
    {showWelcome ? <Welcome onGetStarted={() => { setAuthIntent('student'); setAuthMode('signup'); setStage('auth'); }} onExploreAsGuest={() => enterApp()} onOwner={() => { setAuthIntent('owner'); setStage('owner'); }} />
      : showBusinessWelcome ? <OwnerLanding
          onBack={() => setStage('welcome')}
          onCreate={() => { setAuthIntent('owner'); setAuthMode('signup'); setStage('auth'); }}
          onSignIn={() => { setAuthIntent('owner'); setAuthMode('login'); setStage('auth'); }}
          onDashboard={() => enterApp()}
        />
      : showAuth ? <Auth intent={authIntent} initialMode={authMode} onAuthenticated={() => enterApp()} onGuest={() => enterApp()} onBack={() => setStage(authIntent === 'owner' ? 'owner' : 'welcome')} />
      : !hydrated ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.purple} />
      <Text accessibilityLiveRegion="polite">Loading your saved activity…</Text>
    </View> : <View style={[styles.shell, wide && styles.shellWide]}>
      {wide && <Sidebar active={navId} onSelect={navigate} />}
      <View style={styles.screen}>
        {page?.type === 'owner' ? <Owner key="owner" onBack={goBack} />
          : page?.type === 'admin' ? <Admin key="admin" onBack={goBack} />
          : page?.type === 'history' ? <History onPlace={openPlace} onExplore={() => selectTab('discover')} />
          : page?.type === 'campus' ? <Campus key="campus" onBack={goBack} onContinue={goBack} />
          : page?.type === 'place' ? <PlaceDetails key={page.place.id} place={page.place} onBack={goBack} onBookings={() => selectTab('bookings')} />
          : page?.type === 'assistant' ? <Assistant onBack={goBack} onPlace={openPlace} />
          : tab === 'saved' ? <Saved onPlace={openPlace} onExplore={() => selectTab('discover')} />
          : tab === 'bookings' ? <Bookings onPlace={openPlace} onExplore={() => selectTab('discover')} />
          : tab === 'profile' ? <Profile onOpenSaved={() => selectTab('saved')} onOpenBookings={() => selectTab('bookings')} onOpenHistory={() => setPages((current) => [...current, { type: 'history' }])} />
          : <Discover onPlace={openPlace} onAssistant={() => setPages([{ type: 'assistant' }])} onCampus={() => setPages([{ type: 'campus' }])} />}
      </View>
      {!page && !wide && <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.slice(0, 2).map((item) => <TabButton key={item.id} item={item} active={tab === item.id} onPress={() => selectTab(item.id)} />)}
        <Pressable accessibilityRole="button" accessibilityLabel="Open AI assistant" onPress={openAssistant} style={({ pressed }) => [styles.plus, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.plusIcon}>＋</Text>
        </Pressable>
        {tabs.slice(2).map((item) => <TabButton key={item.id} item={item} active={tab === item.id} onPress={() => selectTab(item.id)} />)}
      </View>}
    </View>}
  </SafeAreaView>;
}

export default function App() {
  return <StudentProvider><StudentApp /></StudentProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0 },
  shell: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  shellWide: { flexDirection: 'row', maxWidth: 1100, gap: 0 },
  screen: { flex: 1, minHeight: 0 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 16 },
  tabIconWrap: { minWidth: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: colors.pale },
  plus: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginTop: -22, shadowColor: colors.purple, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  plusIcon: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: -2 },
  icon: { color: colors.muted, fontSize: 24 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  active: { color: colors.purple },
});
