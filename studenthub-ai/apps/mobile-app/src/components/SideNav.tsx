import { Pressable, Text, View } from 'react-native';
import { colors } from './ui';

export interface SideNavProps {
  /** Current selection: a tab id, or a page type. */
  active: string;
  onSelect: (id: string) => void;
}

const items = [
  { id: 'discover', icon: '⌂', label: 'Home' },
  { id: 'saved', icon: '♡', label: 'Saved' },
  { id: 'bookings', icon: '▦', label: 'Bookings' },
  { id: 'history', icon: '⏱', label: 'History' },
  { id: 'assistant', icon: '✦', label: 'AI Assistant' },
  { id: 'owner', icon: '⚙', label: 'Owner Tools' },
  { id: 'admin', icon: '⚖', label: 'Admin Panel' },
  { id: 'profile', icon: '☺', label: 'Profile' },
] as const;

function NavList({ active, onSelect }: SideNavProps) {
  return <>
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandIcon}>⌂</Text></View>
      <View>
        <Text style={styles.brandName}>StudentHub</Text>
        <Text style={styles.brandCaption}>Guwahati, Assam</Text>
      </View>
    </View>
    <View style={styles.list}>
      {items.map((item) => {
        const selected = active === item.id;
        return <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected }}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [styles.item, selected && styles.itemActive, pressed && styles.itemPressed]}
        >
          <View style={[styles.itemIcon, selected && styles.itemIconActive]}>
            <Text style={[styles.itemIconText, selected && { color: colors.purple }]}>{item.icon}</Text>
          </View>
          <Text style={[styles.itemLabel, selected && styles.itemLabelActive]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={styles.foot}>Made for student life ♡</Text>
  </>;
}

/** Persistent rail for wide screens (web landscape / tablets). */
export function Sidebar(props: SideNavProps) {
  return <View style={styles.sidebar}>
    <NavList {...props} />
  </View>;
}

const styles = {
  sidebar: { width: 248, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#EEEBF5', padding: 16, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingHorizontal: 6 },
  brandMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center' },
  brandIcon: { color: '#fff', fontSize: 20, fontWeight: '800' },
  brandName: { fontSize: 16, fontWeight: '800', color: '#1F1B3A' },
  brandCaption: { fontSize: 11, color: '#8A87A0' },
  list: { gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderRadius: 13, paddingHorizontal: 10 },
  itemActive: { backgroundColor: '#F3EFFF' },
  itemPressed: { opacity: 0.75 },
  itemIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6FB' },
  itemIconActive: { backgroundColor: '#fff' },
  itemIconText: { fontSize: 17, color: '#8A87A0' },
  itemLabel: { fontSize: 14, fontWeight: '700', color: '#8A87A0' },
  itemLabelActive: { color: '#6D28D9' },
  foot: { fontSize: 11, color: '#8A87A0', paddingHorizontal: 6 },
} as const;