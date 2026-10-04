import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { Card, CardHeader, ProgressBar, StatCard, dash } from '../kit';
import { Empty, colors, ui } from '../ui';
import type { AdminTab } from './Dashboard';

/**
 * Users screen.
 *
 * The backend groups accounts by role in `GET /api/admin/overview`; this screen
 * renders that breakdown plus the owner roster from `GET /api/admin/owners`.
 */
export default function Users({ go }: { go: (tab: AdminTab) => void }) {
  const { overview, owners } = useAdmin();
  if (!overview) return <Empty icon="⚠" title="Users unavailable" body="Waiting on GET /api/admin/overview. Check the backend, then refresh." />;

  const total = overview.users.students + overview.users.owners + overview.users.admins;
  const rows = [
    { label: 'Students', count: overview.users.students, color: colors.blue },
    { label: 'Business owners', count: overview.users.owners, color: colors.purple },
    { label: 'Admins', count: overview.users.admins, color: colors.pink },
  ];

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="👥" tone="blue" label="Total Users" value={total.toLocaleString('en-IN')} note="All registered accounts" />
      <StatCard icon="🎓" tone="green" label="Students" value={overview.users.students.toLocaleString('en-IN')} note="Discovering places" onPress={() => go('listings')} />
      <StatCard icon="🏢" tone="purple" label="Owners" value={overview.users.owners.toLocaleString('en-IN')} note={`${overview.ownersVerified} verified`} onPress={() => go('businesses')} />
      <StatCard icon="🛡️" tone="pink" label="Admins" value={overview.users.admins.toLocaleString('en-IN')} note="Console access" />
    </View>

    <Card>
      <CardHeader title="Accounts by role" />
      {rows.map((row) => <View key={row.label} style={styles.block}>
        <View style={styles.head}><Text style={styles.label}>{row.label}</Text><Text style={styles.value}>{row.count}</Text></View>
        <ProgressBar fraction={total ? row.count / total : 0} color={row.color} />
      </View>)}
      <Text style={ui.caption}>Counts come from GET /api/admin/overview, grouped by role.</Text>
    </Card>

    <Card>
      <CardHeader title="Business owners" action="Verify" onAction={() => go('businesses')} />
      {owners.length === 0
        ? <Text style={ui.caption}>No owner accounts yet.</Text>
        : owners.slice(0, 8).map((owner) => <View key={owner.id} style={styles.ownerRow}>
          <View style={dash.grow}>
            <Text style={styles.name} numberOfLines={1}>{owner.displayName}</Text>
            <Text style={ui.caption} numberOfLines={1}>{owner.businessName} · {owner.email ?? owner.phone ?? 'no contact on file'}</Text>
          </View>
          <Text style={styles.count}>{owner.listingCount} listing{owner.listingCount === 1 ? '' : 's'}</Text>
        </View>)}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  value: { fontSize: 12.5, fontWeight: '800', color: colors.purple },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontSize: 13, fontWeight: '800', color: colors.ink },
  count: { fontSize: 11, color: colors.muted, fontWeight: '700' },
});
