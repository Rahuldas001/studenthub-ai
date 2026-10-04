import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../components/ui';

const HERO = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';

/**
 * First screen: full-bleed campus photo with a white bottom sheet.
 * "Get Started" continues to sign-up/sign-in; "Explore as Guest" skips accounts;
 * "List your business" opens owner (business) registration in Auth.
 */
export default function Welcome({ onGetStarted, onExploreAsGuest, onOwner }: { onGetStarted: () => void; onExploreAsGuest: () => void; onOwner: () => void }) {
  const { height } = useWindowDimensions();
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} bounces={false}>
      <View style={[styles.hero, { height: Math.max(240, Math.round(height * 0.44)) }]}>
        <Image accessibilityLabel="Students near campus" source={{ uri: HERO }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      <View style={styles.sheet}>
        <Text style={styles.eyebrow}>WELCOME TO STUDENTHUB AI</Text>
        <Text style={styles.headline}>Smart Places.{'\n'}Better Choices.</Text>
        <Text style={styles.headlineAccent}>Student Life, Simplified.</Text>
        <Text style={styles.body}>Find the best hostels, PGs, food, cafes, services and more around your college.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onGetStarted} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.primaryText}>Get Started  →</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Explore as guest" onPress={onExploreAsGuest} style={styles.guest}>
          <Text style={styles.guestText}>Explore as Guest</Text>
        </Pressable>
        <View style={styles.ownerRow}>
          <View style={styles.ownerLine} />
          <Text style={styles.ownerTag}>FOR BUSINESS OWNERS</Text>
          <View style={styles.ownerLine} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="List your business" onPress={onOwner} style={({ pressed }) => [styles.owner, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.ownerText}>🏪  List your business →</Text>
        </Pressable>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1 },
  hero: { width: '100%', backgroundColor: colors.pale, overflow: 'hidden' },
  sheet: { marginTop: -26, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 30, paddingBottom: 36, gap: 10, flexGrow: 1 },
  eyebrow: { color: colors.purple, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  headline: { color: colors.ink, fontSize: 34, fontWeight: '800', lineHeight: 42, letterSpacing: -0.6 },
  headlineAccent: { color: colors.purple, fontSize: 30, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5, marginTop: 2 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 6 },
  primary: { backgroundColor: colors.purple, borderRadius: 999, minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: 18, shadowColor: colors.purple, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guest: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  guestText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  ownerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  ownerTag: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  owner: { minHeight: 50, borderRadius: 999, borderWidth: 1.5, borderColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ownerText: { color: colors.purple, fontSize: 15, fontWeight: '700' },
});