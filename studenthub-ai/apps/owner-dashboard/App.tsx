import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerExtrasProvider } from './src/OwnerExtrasContext';
import { OwnerProvider, useOwner } from './src/OwnerContext';
import { SessionProvider, useSession } from './src/SessionContext';
import Dashboard from './src/screens/Dashboard';
import Onboarding from './src/screens/Onboarding';
import SignIn from './src/screens/SignIn';
import { Button, colors } from './src/ui';

/**
 * Standalone owner dashboard (web, port 8082).
 *
 * Role gate mirrors the mobile app's Owner screen: visitors and student
 * accounts get the sign-in/registration panel, OWNER accounts without a
 * business profile get onboarding, and complete owner accounts get the
 * dashboard — the same screens the in-app owner tools mount, in the same order.
 */
function OwnerApp() {
  const { session, hydrated, signOut } = useSession();
  const { profile, loading } = useOwner();
  const isOwner = session?.user.role === 'OWNER';

  return <View style={styles.app}>
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={{ fontSize: 20 }}>🏪</Text></View>
          <View>
            <Text style={styles.brand}>StudentHub <Text style={{ color: colors.purple }}>Owner</Text></Text>
            <Text style={styles.tagline}>Business dashboard</Text>
          </View>
        </View>
        {isOwner && <Button title="Sign out" secondary onPress={signOut} />}
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!hydrated
        ? <Text style={styles.body}>Loading your session…</Text>
        : !session || !isOwner
          ? <SignIn />
          : loading
            ? <Text style={styles.body}>Loading your dashboard…</Text>
            : !profile
              ? <Onboarding />
              : <><Dashboard /><Text style={styles.note}>Only ACTIVE listings appear in student discovery. Edits send an ACTIVE listing back to PENDING review.</Text></>}
    </ScrollView>
  </View>;
}

export default function App() {
  return <SessionProvider>
    <OwnerProvider>
      <OwnerExtrasProvider>
        <OwnerApp />
      </OwnerExtrasProvider>
    </OwnerProvider>
  </SessionProvider>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line },
  headerInner: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 17, fontWeight: '800', color: colors.ink },
  tagline: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  content: { maxWidth: 960, width: '100%', alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 40 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
