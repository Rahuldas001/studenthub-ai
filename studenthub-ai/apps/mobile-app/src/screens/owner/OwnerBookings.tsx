import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OwnerVisitRequest, VisitRequestStatus } from '@studenthub/types';
import { Button, Empty, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { fetchOwnerVisitRequests, updateOwnerVisitRequest } from '../../services/owner';
import { IconButton, Notice, OptionRow, OwnerTopBar, kit, shortDate, shortDateTime, type OwnerNav } from './OwnerKit';

/**
 * Screen 5 - booking requests inbox.
 *
 * Confirm / cancel / complete are real API transitions, and the counts come from
 * the same endpoint that feeds the dashboard badge, so the tab bar, dashboard
 * and this screen never disagree.
 */

type Filter = 'ALL' | VisitRequestStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'PENDING', label: 'New' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'ALL', label: 'All' },
];

const REQUEST_META: Record<VisitRequestStatus, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'New', bg: '#FFF6DC', fg: '#946600' },
  CONFIRMED: { label: 'Confirmed', bg: '#E7F7EE', fg: colors.greenDark },
  COMPLETED: { label: 'Completed', bg: colors.pale, fg: colors.purple },
  CANCELLED: { label: 'Cancelled', bg: '#FEECEC', fg: '#B42318' },
};

export default function OwnerBookings({ nav }: { nav: OwnerNav }) {
  const { token, refresh } = useOwner();
  const [status, setStatus] = useState<Filter>('PENDING');
  const [requests, setRequests] = useState<OwnerVisitRequest[]>([]);
  const [counts, setCounts] = useState<Partial<Record<VisitRequestStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError('');
    fetchOwnerVisitRequests(token, status === 'ALL' ? undefined : { status })
      .then((inbox) => { setRequests(inbox.requests); setCounts(inbox.counts); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not load booking requests.'))
      .finally(() => setLoading(false));
  }, [token, status]);

  useEffect(load, [load]);

  const act = (requestId: string, next: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    if (!token) return;
    setBusyId(requestId);
    setError('');
    updateOwnerVisitRequest(token, requestId, next)
      .then(() => { load(); refresh(); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'That update failed.'))
      .finally(() => setBusyId(''));
  };
  const dial = (phone: string) => { void Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`); };
  const chat = (phone: string) => { void Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`); };

  return <ScrollView contentContainerStyle={kit.body}>
    <OwnerTopBar
      title="Booking requests"
      subtitle={`${counts.PENDING ?? 0} new · ${counts.CONFIRMED ?? 0} confirmed · ${counts.COMPLETED ?? 0} completed`}
      right={<IconButton icon="↻" label="Refresh requests" onPress={load} />}
    />

    <OptionRow<Filter>
      options={FILTERS.map((item) => ({
        id: item.id,
        label: item.id === 'ALL' ? 'All' : `${item.label}${counts[item.id as VisitRequestStatus] ? ` (${counts[item.id as VisitRequestStatus]})` : ''}`,
      }))}
      value={status}
      onChange={setStatus}
    />

    <Notice title="Call students directly" text="StudentHub passes the student's phone number with each request. Confirm before the visit so they get a status update on their Bookings tab." />
    {error ? <Text style={kit.error}>{error}</Text> : null}

    {!requests.length && !loading ? <Empty icon="▤" title={status === 'PENDING' ? 'No new requests' : 'Nothing here yet'}
      body={status === 'PENDING' ? 'Students who request a visit from your listing show up here within seconds.' : 'Try another filter to see the rest of your visit requests.'}>
      <View style={[ui.row, { gap: 10, flexWrap: 'wrap' }]}>
        <Button title="Refresh" onPress={load} />
        <Button title="All requests" secondary onPress={() => setStatus('ALL')} />
      </View>
    </Empty> : null}

    {requests.map((request) => {
      const meta = REQUEST_META[request.status];
      const busy = busyId === request.id;
      return <View key={request.id} style={[ui.panel, { gap: 12 }]}>
        <View style={ui.between}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text style={ui.cardTitle}>{request.name}</Text>
            <Text style={ui.caption}>{request.placeName}</Text>
          </View>
          <View style={[kit.pill, { backgroundColor: meta.bg }]}><Text style={[kit.pillText, { color: meta.fg }]}>{meta.label}</Text></View>
        </View>

        <View style={styles.details}>
          <Text style={styles.detail}>☎ {request.phone}</Text>
          <Text style={styles.detail}>⌚ {request.preferredDate ? `Preferred ${shortDate(request.preferredDate)}` : 'Wants a callback'}</Text>
          <Text style={styles.detail}>✎ Received {shortDateTime(request.createdAt)}</Text>
        </View>
        {request.note ? <Text style={styles.note}>“{request.note}”</Text> : null}

        <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
          <Button title="Call" secondary onPress={() => dial(request.phone)} />
          <Button title="WhatsApp" secondary onPress={() => chat(request.phone)} />
        </View>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
          {request.status === 'PENDING' ? <>
            <Button title={busy ? '…' : 'Confirm visit'} onPress={() => act(request.id, 'CONFIRMED')} />
            <Button title={busy ? '…' : 'Decline'} secondary onPress={() => act(request.id, 'CANCELLED')} />
          </> : null}
          {request.status === 'CONFIRMED' ? <>
            <Button title={busy ? '…' : 'Mark completed'} onPress={() => act(request.id, 'COMPLETED')} />
            <Button title={busy ? '…' : 'Cancel'} secondary onPress={() => act(request.id, 'CANCELLED')} />
          </> : null}
          {request.status === 'COMPLETED' || request.status === 'CANCELLED'
            ? <Text style={ui.caption}>Closed. Students see this status in their own Bookings tab.</Text>
            : null}
        </View>
      </View>;
    })}

    <Button title="Back to home" secondary onPress={() => nav.tab('home')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  details: { gap: 4, backgroundColor: colors.bg, borderRadius: 14, padding: 12 },
  detail: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  note: { fontSize: 13, color: colors.ink, fontStyle: 'italic', lineHeight: 20 },
});

