import { useState, type ReactNode } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import type {
  AdminCollegeSummary,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceStatus,
} from '@studenthub/types';
import { Button, Chip, colors, ui } from '../components/ui';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import { useStudent } from '../context/StudentContext';
import {
  ADMIN_PLACE_FILTERS,
  createAdminCollege,
  deleteAdminPlace,
  moderateAdminPlace,
  setAdminOwnerVerified,
} from '../services/admin';

const errorColor = '#B42338';

/** Moderation status chip, coloured to match the owner dashboard. */
function StatusChip({ status }: { status: PlaceStatus }) {
  const style = status === 'ACTIVE'
    ? { color: colors.greenDark, backgroundColor: '#E9F9F0' }
    : status === 'PENDING'
      ? { color: '#946600', backgroundColor: '#FFF6DC' }
      : status === 'REJECTED'
        ? { color: errorColor, backgroundColor: '#FDECEF' }
        : { color: colors.muted, backgroundColor: colors.bg };
  return <Text style={[ui.facility, { fontWeight: '700', flexShrink: 0 }, style]}>{status}</Text>;
}

/** Big-number tile used by the overview strip. */
function Stat({ label, value, tone = colors.ink }: { label: string; value: number | string; tone?: string }) {
  return <View style={[ui.panel, { flex: 1, minWidth: 132, gap: 4 }]}>
    <Text style={{ fontSize: 26, fontWeight: '800', color: tone }}>{value}</Text>
    <Text style={ui.caption}>{label}</Text>
  </View>;
}

/**
 * One listing row in the moderation queue.
 *
 * Approve/reject/unpublish are offered only when the transition is legal, so
 * the buttons mirror the backend's rules instead of inviting 409s.
 */
function ModerationRow({ place, onDone }: { place: AdminPlaceSummary; onDone: () => void }) {
  const { token } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = (action: () => Promise<unknown>) => {
    setError('');
    setBusy(true);
    action().then(onDone).catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : 'Action failed.')).finally(() => setBusy(false));
  };
  return <View style={ui.panel}>
    <View style={ui.between}>
      <Text style={[ui.cardTitle, { flexShrink: 1 }]}>{place.name}</Text>
      <StatusChip status={place.status} />
    </View>
    <Text style={ui.caption}>{place.category} · {place.address}</Text>
    <Text style={ui.caption}>Owner: {place.ownerName ?? 'Added by StudentHub'}</Text>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text>
      <Text style={ui.facility}>{place.reviewCount} reviews</Text>
      <Text style={ui.facility}>▦ {place.pendingRequests} pending</Text>
      {place.price !== null && <Text style={ui.price}>{place.price}<Text style={ui.caption}> {place.priceUnit ?? ''}</Text></Text>}
    </View>
    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      {place.status !== 'ACTIVE' && <Button title={busy ? '…' : 'Approve'} disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'ACTIVE'))} />}
      {place.status === 'PENDING' && <Button title={busy ? '…' : 'Reject'} secondary disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'REJECTED'))} />}
      {place.status === 'ACTIVE' && <Button title={busy ? '…' : 'Unpublish'} secondary disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'INACTIVE'))} />}
      <Button title={busy ? '…' : 'Delete'} secondary disabled={busy} onPress={() => token && act(async () => { await deleteAdminPlace(token, place.id); })} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: errorColor, fontSize: 12 }}>{error}</Text>}
  </View>;
}


/** Business verification row: toggles the `verified` flag on an owner. */
function OwnerRow({ owner, onDone }: { owner: AdminOwnerSummary; onDone: () => void }) {
  const { token } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = () => {
    if (!token || busy) return;
    setError('');
    setBusy(true);
    setAdminOwnerVerified(token, owner.id, !owner.verified)
      .then(onDone)
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Action failed.'))
      .finally(() => setBusy(false));
  };
  return <View style={ui.panel}>
    <View style={ui.between}>
      <Text style={[ui.cardTitle, { flexShrink: 1 }]}>{owner.businessName}</Text>
      <Text style={[ui.facility, { fontWeight: '700', flexShrink: 0 }, owner.verified
        ? { color: colors.greenDark, backgroundColor: '#E9F9F0' }
        : { color: '#946600', backgroundColor: '#FFF6DC' }]}>{owner.verified ? 'VERIFIED' : 'UNVERIFIED'}</Text>
    </View>
    <Text style={ui.caption}>{owner.displayName}{owner.email ? ` · ${owner.email}` : ''}</Text>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={ui.facility}>{owner.listingCount} listings</Text>
      {owner.phone && <Text style={ui.facility}>{owner.phone}</Text>}
    </View>
    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      <Button
        title={busy ? '…' : owner.verified ? 'Remove verification' : 'Verify business'}
        secondary={owner.verified}
        disabled={busy}
        onPress={act}
      />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: errorColor, fontSize: 12 }}>{error}</Text>}
  </View>;
}

/** College creation form; the API rejects duplicates with a 409. */
function CollegeForm({ onDone }: { onDone: () => void }) {
  const { token } = useAdmin();
  const [name, setName] = useState('');
  const [city, setCity] = useState('Guwahati');
  const [state, setState] = useState('Assam');
  const [latitude, setLatitude] = useState('26.1535');
  const [longitude, setLongitude] = useState('91.6646');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = () => {
    if (!token || busy) return;
    setError('');
    if (name.trim().length < 2) { setError('Add the college name.'); return; }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setError('Latitude must be between -90 and 90.'); return; }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setError('Longitude must be between -180 and 180.'); return; }
    setBusy(true);
    createAdminCollege(token, {
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      latitude: lat,
      longitude: lng,
    })
      .then(() => { setName(''); onDone(); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not add the college.'))
      .finally(() => setBusy(false));
  };
  return <View style={ui.panel}>
    <Text style={ui.heading}>Add a college</Text>
    <Text style={ui.body}>Colleges anchor the launch geography and let listings be grouped by campus.</Text>
    <Text style={ui.cardTitle}>Name</Text>
    <TextInput accessibilityLabel="College name" maxLength={120} value={name} onChangeText={setName} placeholder="e.g. Gauhati University" placeholderTextColor={colors.muted} style={ui.input} />
    <View style={[ui.row, { gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>City</Text>
        <TextInput accessibilityLabel="City" maxLength={80} value={city} onChangeText={setCity} style={ui.input} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>State</Text>
        <TextInput accessibilityLabel="State" maxLength={80} value={state} onChangeText={setState} style={ui.input} />
      </View>
    </View>
    <View style={[ui.row, { gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>Latitude</Text>
        <TextInput accessibilityLabel="Latitude" keyboardType="numbers-and-punctuation" maxLength={12} value={latitude} onChangeText={setLatitude} style={ui.input} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>Longitude</Text>
        <TextInput accessibilityLabel="Longitude" keyboardType="numbers-and-punctuation" maxLength={12} value={longitude} onChangeText={setLongitude} style={ui.input} />
      </View>
    </View>
    <Button title={busy ? 'Saving…' : 'Add college'} disabled={busy} onPress={submit} />
    {!!error && <Text accessibilityRole="alert" style={{ color: errorColor, fontSize: 12 }}>{error}</Text>}
  </View>;
}

/** Read-only college row with its listing count. */
function CollegeRow({ college }: { college: AdminCollegeSummary }) {
  return <View style={ui.panel}>
    <Text style={ui.cardTitle}>{college.name}</Text>
    <Text style={ui.caption}>{college.city}, {college.state} · ⌖ {college.latitude.toFixed(4)}, {college.longitude.toFixed(4)}</Text>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={ui.facility}>{college.placeCount} listings</Text>
      <Text style={ui.facility}>Added {new Date(college.createdAt).toLocaleDateString()}</Text>
    </View>
  </View>;
}

/** Shared page shell: title, back button, scrollable body. */
function AdminShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    <View style={ui.between}>
      <Text style={ui.title}>{title}</Text>
      <Button title="Back" secondary onPress={onBack} />
    </View>
    {children}
  </ScrollView>;
}

/**
 * Admin sign-in gate.
 *
 * Signed-in students/owners are told plainly which account is required rather
 * than being shown a form that would silently fail with a 403.
 */
function AdminGate({ onBack }: { onBack: () => void }) {
  const { authBusy, signIn, session, signOutToWelcome } = useStudent();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const signedIn = Boolean(session);
  return <AdminShell title="Admin Tools" onBack={onBack}>
    <View style={ui.panel}>
      <Text style={ui.heading}>{signedIn ? 'Admin account required' : 'Sign in as an admin'}</Text>
      <Text style={ui.body}>
        {signedIn
          ? 'You are signed in, but this account is not an admin. Sign in with an admin account to moderate listings.'
          : 'The moderation console reviews owner listings, verifies businesses, and manages colleges.'}
      </Text>
      <Text style={ui.cardTitle}>Email or phone</Text>
      <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="admin email or phone" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Password</Text>
      <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} style={ui.input} />
      <Button title={authBusy ? 'Please wait…' : 'Sign in'} onPress={() => {
        setError('');
        if (identifier.trim().length < 3 || !password) { setError('Enter your email or phone and password.'); return; }
        signIn(identifier.trim(), password)
          .then(() => setPassword(''))
          .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Sign-in failed.'));
      }} />
      {!!error && <Text accessibilityRole="alert" style={{ color: errorColor }}>{error}</Text>}
      {signedIn && <Button title="Sign out and return to Welcome" secondary onPress={signOutToWelcome} />}
      <Text style={ui.caption}>Admins need the API (EXPO_PUBLIC_API_BASE_URL). Dev login: demo.admin@studenthub.local / admin-password-123.</Text>
    </View>
  </AdminShell>;
}

/** The three admin surfaces: moderation, businesses, geography. */
function AdminPanel({ onBack }: { onBack: () => void }) {
  const { overview, places, placeCounts, owners, colleges, loading, refresh } = useAdmin();
  const { signOutToWelcome } = useStudent();
  const [tab, setTab] = useState<'queue' | 'owners' | 'colleges'>('queue');
  const [filter, setFilter] = useState('PENDING');
  const activeFilter = ADMIN_PLACE_FILTERS.find((entry) => entry.id === filter);
  const visiblePlaces = activeFilter?.status
    ? places.filter((place) => place.status === activeFilter.status)
    : places;

  return <AdminShell title="Admin Tools" onBack={onBack}>
    {overview && <View style={[ui.row, { flexWrap: 'wrap', gap: 12 }]}>
      <Stat label="Pending review" value={overview.places.PENDING ?? 0} tone={(overview.places.PENDING ?? 0) > 0 ? '#946600' : colors.ink} />
      <Stat label="Live listings" value={overview.places.ACTIVE ?? 0} tone={colors.greenDark} />
      <Stat label="Students" value={overview.users.students} />
      <Stat label="Businesses verified" value={`${overview.ownersVerified}/${overview.ownersTotal}`} />
    </View>}

    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      <Chip label={`Moderation${placeCounts.PENDING ? ` (${placeCounts.PENDING})` : ''}`} selected={tab === 'queue'} onPress={() => setTab('queue')} />
      <Chip label={`Businesses (${owners.length})`} selected={tab === 'owners'} onPress={() => setTab('owners')} />
      <Chip label={`Colleges (${colleges.length})`} selected={tab === 'colleges'} onPress={() => setTab('colleges')} />
      <Chip label="Refresh" onPress={refresh} />
    </View>

    <View style={[ui.between, { gap: 12 }]}>
      <Text style={[ui.caption, { flexShrink: 1 }]}>Signed in as an admin. Signing out returns you to the welcome screen.</Text>
      <Button title="Sign out" secondary onPress={signOutToWelcome} />
    </View>

    {loading && <Text style={ui.caption}>Loading the console…</Text>}

    {!loading && tab === 'queue' && <>
      <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
        {ADMIN_PLACE_FILTERS.map((entry) => (
          <Chip
            key={entry.id}
            label={`${entry.label}${entry.status && placeCounts[entry.status] ? ` (${placeCounts[entry.status]})` : ''}`}
            selected={filter === entry.id}
            onPress={() => setFilter(entry.id)}
          />
        ))}
      </View>
      {visiblePlaces.length === 0
        ? <View style={ui.empty}>
            <Text style={ui.emptyIcon}>✓</Text>
            <Text style={ui.heading}>Nothing here</Text>
            <Text style={[ui.body, { textAlign: 'center' }]}>No listings match this filter right now.</Text>
          </View>
        : visiblePlaces.map((place) => <ModerationRow key={place.id} place={place} onDone={refresh} />)}
    </>}

    {!loading && tab === 'owners' && (owners.length === 0
      ? <View style={ui.empty}>
          <Text style={ui.emptyIcon}>⌂</Text>
          <Text style={ui.heading}>No businesses yet</Text>
          <Text style={[ui.body, { textAlign: 'center' }]}>Owner accounts appear here once they register.</Text>
        </View>
      : owners.map((owner) => <OwnerRow key={owner.id} owner={owner} onDone={refresh} />))}

    {!loading && tab === 'colleges' && <>
      <CollegeForm onDone={refresh} />
      {colleges.map((college) => <CollegeRow key={college.id} college={college} />)}
    </>}
  </AdminShell>;
}

/** Role-aware body: the gate for everyone else, the console for admins. */
function AdminBody({ onBack }: { onBack: () => void }) {
  const { isAdmin } = useAdmin();
  return isAdmin ? <AdminPanel onBack={onBack} /> : <AdminGate onBack={onBack} />;
}

/**
 * Admin panel page.
 *
 * Wraps the console in its own provider so admin fetches run only while this
 * page is open, then picks the gate or the console from the session role.
 */
export default function Admin({ onBack }: { onBack: () => void }) {
  return <AdminProvider>
    <AdminBody onBack={onBack} />
  </AdminProvider>;
}

