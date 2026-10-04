import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminProvider } from './src/AdminContext';
import { SessionProvider, useSession } from './src/SessionContext';
import Dashboard from './src/screens/Dashboard';
import SignIn from './src/screens/SignIn';
import { colors, ui } from './src/ui';

/**
 * Standalone admin panel (web, port 8083).
 *
 * Role gate mirrors the in-app console (`apps/mobile-app/src/screens/Admin.tsx`):
 * visitors and signed-in non-admin accounts get the sign-in gate, ADMIN
 * accounts get the console — the same four surfaces (overview, moderation,
 * businesses, colleges) the in-app panel mounts over the same `/api/admin/*`
 * data. There is no admin self-registration: admins are ordinary accounts
 * with `role: ADMIN`.
 */
function AdminApp() {
  const { session, hydrated } = useSession();
  const isAdmin = session?.user.role === 'ADMIN';

  if (!hydrated) {
    return <View style={styles.center}><Text style={ui.body}>Loading your session…</Text></View>;
  }

  if (!session || !isAdmin) return (
    <ScrollView contentContainerStyle={styles.gate} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={{ fontSize: 22 }}>🎓</Text></View>
        <View style={{ flexShrink: 1 }}>
          <Text style={ui.title}>StudentHub <Text style={{ color: colors.purple }}>AI</Text></Text>
          <Text style={ui.body}>Admin console — moderation, verification and analytics.</Text>
        </View>
      </View>
      <SignIn />
    </ScrollView>
  );

  return (
    <AdminProvider>
      <Dashboard />
    </AdminProvider>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AdminApp />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  gate: { flexGrow: 1, justifyContent: 'center', gap: 20, padding: 24, backgroundColor: colors.bg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
});