import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { useSession } from '../SessionContext';
import { API_BASE, apiConfigured } from '../api';
import { Avatar, Card, CardHeader, SoftBadge, dash } from '../kit';
import { Button, colors, ui } from '../ui';

/**
 * Settings screen.
 *
 * Shows the signed-in admin, the API the panel was built against and the
 * sample-data switch — the three things that decide what the console displays
 * and where it reads from.
 */
export default function Settings() {
  const { session, signOut } = useSession();
  const { sampleOn, setSampleOn } = useAdmin();
  const user = session?.user;

  return <View style={{ gap: 18 }}>
    <Card>
      <CardHeader title="Account" right={<SoftBadge label={user?.role ?? 'ADMIN'} tone="purple" />} />
      <View style={[dash.row, { gap: 12 }]}>
        <Avatar name={user?.displayName ?? 'Admin'} size={52} />
        <View style={dash.grow}>
          <Text style={styles.name}>{user?.displayName ?? 'Admin'}</Text>
          <Text style={ui.caption}>{user?.email ?? user?.phone ?? 'no contact on file'}</Text>
        </View>
      </View>
      <View style={styles.kv}><Text style={styles.k}>User ID</Text><Text style={styles.v} numberOfLines={1}>{user?.id ?? '—'}</Text></View>
      <View style={styles.kv}><Text style={styles.k}>Role</Text><Text style={styles.v}>{user?.role ?? '—'}</Text></View>
      <Button title="Sign out" secondary onPress={signOut} />
    </Card>

    <Card>
      <CardHeader title="API connection" right={<SoftBadge label={apiConfigured() ? 'Connected' : 'Not configured'} tone={apiConfigured() ? 'green' : 'amber'} />} />
      <View style={styles.kv}><Text style={styles.k}>Base URL</Text><Text style={styles.v} numberOfLines={1}>{API_BASE || 'not set'}</Text></View>
      <Text style={ui.caption}>Set <Text style={styles.code}>EXPO_PUBLIC_API_BASE_URL</Text> in <Text style={styles.code}>apps/admin-panel/.env</Text>. It is inlined at build time, so restart the dev server after changing it.</Text>
      <Text style={ui.caption}>The backend only allows configured origins — <Text style={styles.code}>CORS_ORIGIN</Text> in <Text style={styles.code}>backend/.env</Text> must include this panel&apos;s origin.</Text>
    </Card>

    <Card>
      <CardHeader title="Sample data" right={<SoftBadge label="Removed" tone="green" />} />
      <Text style={ui.body}>
        The console now shows real figures only. The sample-data toggle used to fill the month-over-month growth line, per-cent deltas and named booking rows; those widgets fall back to live API aggregates instead.
      </Text>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '900', color: colors.ink },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line },
  k: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  v: { fontSize: 12, color: colors.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  code: { fontFamily: 'monospace', color: colors.purple, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#DDD8EC', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.purple },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});
