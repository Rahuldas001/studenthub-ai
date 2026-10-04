import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { AdminCollegeSummary } from '@studenthub/types';
import { useAdmin } from '../AdminContext';
import { createAdminCollege } from '../admin';
import { collegeInputFrom, emptyCollegeDraft, validateCollegeDraft, type CollegeDraft } from '../adminExtras';
import { Button, Empty, colors, ui } from '../ui';

/** College creation form; the API rejects duplicates with a 409. */
function CollegeForm({ onDone }: { onDone: () => void }) {
  const { token } = useAdmin();
  const [draft, setDraft] = useState<CollegeDraft>(emptyCollegeDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof CollegeDraft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!token || busy) return;
    setError('');
    const problem = validateCollegeDraft(draft);
    if (problem) { setError(problem); return; }
    setBusy(true);
    createAdminCollege(token, collegeInputFrom(draft))
      .then(() => { setDraft((current) => ({ ...current, name: '' })); onDone(); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not add the college.'))
      .finally(() => setBusy(false));
  };

  return <View style={ui.panel}>
    <Text style={ui.heading}>Add a college</Text>
    <Text style={ui.body}>Colleges anchor the launch geography and let listings be grouped by campus.</Text>
    <Text style={ui.cardTitle}>Name</Text>
    <TextInput accessibilityLabel="College name" maxLength={120} value={draft.name} onChangeText={set('name')} placeholder="e.g. Gauhati University" placeholderTextColor={colors.muted} style={ui.input} />
    <View style={[ui.row, { gap: 12 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={ui.cardTitle}>City</Text>
        <TextInput accessibilityLabel="City" maxLength={80} value={draft.city} onChangeText={set('city')} placeholder="City" placeholderTextColor={colors.muted} style={ui.input} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={ui.cardTitle}>State</Text>
        <TextInput accessibilityLabel="State" maxLength={80} value={draft.state} onChangeText={set('state')} placeholder="State" placeholderTextColor={colors.muted} style={ui.input} />
      </View>
    </View>
    <View style={[ui.row, { gap: 12 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={ui.cardTitle}>Latitude</Text>
        <TextInput accessibilityLabel="Latitude" keyboardType="numbers-and-punctuation" maxLength={12} value={draft.latitude} onChangeText={set('latitude')} placeholder="26.1535" placeholderTextColor={colors.muted} style={ui.input} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={ui.cardTitle}>Longitude</Text>
        <TextInput accessibilityLabel="Longitude" keyboardType="numbers-and-punctuation" maxLength={12} value={draft.longitude} onChangeText={set('longitude')} placeholder="91.6646" placeholderTextColor={colors.muted} style={ui.input} />
      </View>
    </View>
    <Button title={busy ? 'Saving…' : 'Add college'} disabled={busy} onPress={submit} />
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 12 }}>{error}</Text>}
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

/** The geography tab: add form above the college list. */
export default function Colleges() {
  const { colleges, refresh } = useAdmin();
  return <View style={{ gap: 16 }}>
    <CollegeForm onDone={refresh} />
    {colleges.length === 0
      ? <Empty icon="🎓" title="No colleges yet" body="Add the first campus to anchor student discovery." />
      : colleges.map((college) => <CollegeRow key={college.id} college={college} />)}
  </View>;
}