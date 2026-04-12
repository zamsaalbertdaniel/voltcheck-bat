/**
 * InspectEV — 404 Not Found Screen
 */

import { VoltBorderRadius, VoltColors, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagină negăsită' }} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="compass-outline" size={48} color={VoltColors.textTertiary} />
        </View>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>Această pagină nu există.</Text>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Înapoi la InspectEV</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VoltColors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: VoltSpacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: VoltColors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: VoltSpacing.lg,
  },
  title: {
    fontSize: VoltFontSize.xxxl,
    fontWeight: '800',
    color: VoltColors.textPrimary,
  },
  subtitle: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
    marginTop: VoltSpacing.sm,
    marginBottom: VoltSpacing.xl,
  },
  button: {
    backgroundColor: VoltColors.neonGreen,
    borderRadius: VoltBorderRadius.md,
    paddingHorizontal: VoltSpacing.xl,
    paddingVertical: VoltSpacing.md,
  },
  buttonText: {
    fontSize: VoltFontSize.md,
    fontWeight: '700',
    color: VoltColors.textOnGreen,
  },
});
