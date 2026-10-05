import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../components/ui';

const HERO = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';

export default function Welcome({ onGetStarted, onExploreAsGuest, onOwner }: { onGetStarted: () => void; onExploreAsGuest: () => void; onOwner: () => void }) {
  const { height } = useWindowDimensions();
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Full-bleed Hero image with top brand badge overlay */}
        <View style={[styles.hero, { height: Math.max(260, Math.round(height * 0.42)) }]}>
          <Image accessibilityLabel="Students near campus" source={{ uri: HERO }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(15, 12, 36, 0.65)', 'transparent', 'rgba(15, 12, 36, 0.4)']} style={StyleSheet.absoluteFill} />

          {/* Top Brand Logo Overlay */}
          <View style={styles.topLogoOverlay}>
            <View style={styles.logoBadge}>
              <LinearGradient colors={['#6D28D9', '#C026D3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoIcon}>
                <Text style={styles.logoSymbol}>⚡</Text>
              </LinearGradient>
              <View>
                <Text style={styles.logoTitle}>StudentHub AI</Text>
                <Text style={styles.logoTagline}>Everything a Student Needs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Sheet */}
        <View style={styles.sheet}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowSymbol}>✦</Text>
            <Text style={styles.eyebrow}>WELCOME TO STUDENTHUB AI</Text>
          </View>

          <Text style={styles.headline}>
            Smart Places.{'\n'}
            Better Choices.
          </Text>
          <Text style={styles.headlineAccent}>Student Life, Simplified.</Text>
          <Text style={styles.body}>
            Find the best hostels, PGs, food, cafes, services and more around your college campus.
          </Text>

          {/* Primary CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            onPress={onGetStarted}
            style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient colors={['#6D28D9', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Get Started  →</Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore as guest"
            onPress={onExploreAsGuest}
            style={({ pressed }) => [styles.guest, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.guestText}>Explore as Guest →</Text>
          </Pressable>

          {/* Business Owners Divider */}
          <View style={styles.ownerRow}>
            <View style={styles.ownerLine} />
            <Text style={styles.ownerTag}>FOR BUSINESS OWNERS</Text>
            <View style={styles.ownerLine} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="List your business"
            onPress={onOwner}
            style={({ pressed }) => [styles.owner, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ownerText}>🏪  List your business →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1 },
  hero: { width: '100%', backgroundColor: colors.purpleDeep, overflow: 'hidden', position: 'relative' },
  topLogoOverlay: { position: 'absolute', top: 20, left: 20, right: 20 },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 12, 36, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSymbol: { fontSize: 18, color: '#fff' },
  logoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  logoTagline: { color: '#C1B8EF', fontSize: 11, fontWeight: '600' },
  sheet: {
    marginTop: -26,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 30,
    paddingBottom: 36,
    gap: 10,
    flexGrow: 1,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrowSymbol: { color: colors.purple, fontSize: 12 },
  eyebrow: { color: colors.purple, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  headline: { color: colors.ink, fontSize: 34, fontWeight: '800', lineHeight: 42, letterSpacing: -0.6 },
  headlineAccent: { color: colors.purple, fontSize: 30, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5, marginTop: 2 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 4 },
  primary: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: colors.purple,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guest: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: '#FAF9FE',
  },
  guestText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  ownerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  ownerTag: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  owner: {
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(109, 40, 217, 0.04)',
  },
  ownerText: { color: colors.purple, fontSize: 15, fontWeight: '700' },
});
