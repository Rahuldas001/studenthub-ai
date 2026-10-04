import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PlaceSummary } from '@studenthub/types';
import { PlaceImage, colors, priceLabel, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';
import { filterPlaces } from '../utils/discovery';

type Message = { id: number; from: 'user' | 'bot'; text: string; time: string };
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const PROMPTS = ['Find a PG under ₹6000', 'Where can I get lunch?', 'Show me a cafe', 'Find a hostel'];

export default function Assistant({ onBack, onPlace }: { onBack: () => void; onPlace: (place: PlaceSummary) => void }) {
  const { places } = useStudent();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: 'bot', text: 'Hey, campus explorer 👋 A little help finding your kind of place. Ask me about PGs, hostels, food or cafés!', time: now() }]);
  const [matches, setMatches] = useState<Record<number, PlaceSummary[]>>({});
  const listRef = useRef<ScrollView>(null);
  const nextId = useRef(1);
  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages, matches]);
  const answer = (text: string) => {
    const query = text.toLowerCase();
    const category = /cafe|coffee|café/.test(query) ? 'CAFE' : /mess|tiffin/.test(query) ? 'MESS' : /food|lunch|restaurant|meal/.test(query) ? 'RESTAURANT' : /hostel/.test(query) ? 'HOSTEL' : /pg|stay|room|home/.test(query) ? 'PG' : 'ALL';
    const budget = query.match(/(?:under|below|budget|less than)\s*₹?\s*([\d,]+)/)?.[1].replace(/,/g, '') ?? '';
    return filterPlaces(places, '', category, budget, 'recommended').slice(0, 3);
  };
  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const results = answer(trimmed);
    const id = nextId.current;
    nextId.current += 1;
    setMessages((current) => [...current,
      { id, from: 'user', text: trimmed, time: now() },
      { id: id + 1, from: 'bot', text: results.length
        ? `Here ${results.length === 1 ? 'is' : 'are'} ${results.length} highly rated match${results.length === 1 ? '' : 'es'}${budgetSuffix(trimmed)}. Check the price unit and details before visiting.`
        : 'No matches in the current listings. Try a higher budget or another category.', time: now() }]);
    setMatches((current) => ({ ...current, [id + 1]: results }));
    setInput('');
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.avatar}><Text style={{ fontSize: 17, color: colors.ink }}>←</Text></Pressable>
      <View style={[styles.avatar, { backgroundColor: colors.pale }]}><Text style={{ fontSize: 17 }}>🤖</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={ui.cardTitle}>StudentHub AI</Text>
        <Text style={[ui.caption, { color: colors.green }]}>● Online · demo</Text>
      </View>
      <Text style={ui.facility}>RULE-BASED</Text>
    </View>
      <Text style={styles.screenTitle}>Your AI Assistant</Text>
    <ScrollView ref={listRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 24 }}>
      {messages.map((message) => <View key={message.id} style={[ui.row, { alignItems: 'flex-end', alignSelf: message.from === 'user' ? 'flex-end' : 'flex-start', gap: 8 }]}>
        {message.from === 'bot' && <View style={[styles.avatar, { backgroundColor: colors.pale, marginBottom: 18 }]}><Text style={{ fontSize: 15 }}>🤖</Text></View>}
        <View style={{ maxWidth: 280, gap: 4 }}>
          <View style={[styles.bubble, message.from === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.bubbleText, message.from === 'user' && { color: '#fff' }]}>{message.text}</Text>
          </View>
          <Text style={[styles.time, { alignSelf: message.from === 'user' ? 'flex-end' : 'flex-start' }]}>{message.time}</Text>
          {(matches[message.id] ?? []).map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`View ${place.name}`} onPress={() => onPlace(place)} style={({ pressed }) => [ui.resultCard, { opacity: pressed ? 0.9 : 1 }]}>
            <PlaceImage uri={place.imageUrl} style={ui.resultThumb} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} style={ui.cardTitle}>{place.name}</Text>
              <Text numberOfLines={1} style={ui.caption}>★ {place.rating.toFixed(1)} · {place.category}</Text>
              <Text style={ui.price}>{priceLabel(place)}{place.priceUnit ? <Text style={ui.caption}> {place.priceUnit}</Text> : null}</Text>
            </View>
          </Pressable>)}
        </View>
      </View>)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {PROMPTS.map((prompt) => <Pressable key={prompt} accessibilityRole="button" onPress={() => ask(prompt)} style={styles.suggestion}>
          <Text style={{ color: colors.purple, fontSize: 12, fontWeight: '700' }}>{prompt}</Text>
        </Pressable>)}
      </ScrollView>
    </ScrollView>
    <View style={styles.inputBar}>
      <TextInput accessibilityLabel="Ask the demo assistant" value={input} onChangeText={setInput} maxLength={300} placeholder="Ask anything…" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={() => ask(input)} returnKeyType="send" />
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!input.trim()} onPress={() => ask(input)} style={({ pressed }) => [styles.send, { opacity: !input.trim() ? 0.4 : pressed ? 0.85 : 1 }]}>
        <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const budgetSuffix = (query: string) => {
  const budget = query.match(/(?:under|below|budget|less than)\s*₹?\s*([\d,]+)/)?.[1].replace(/,/g, '');
  return budget ? ` under ₹${Number(budget).toLocaleString('en-IN')}` : '';
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line },
  screenTitle: { color: colors.purple, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, paddingHorizontal: 18, paddingTop: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: colors.purple, borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  bubbleText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 10, paddingHorizontal: 4 },
  suggestion: { borderRadius: 18, borderWidth: 1, borderColor: colors.purple, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#fff' },
  inputBar: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: 22, minHeight: 46, paddingHorizontal: 16, fontSize: 14, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
});