/**
 * VoltCheck — Smartcar Connect Screen (Modal)
 * OAuth flow for Level 2 battery diagnosis.
 *
 * Flow:
 *   1. User sees explanation of what Smartcar access provides
 *   2. Taps "Connect Vehicle" → opens Smartcar OAuth in browser
 *   3. After authorization, deep link returns with auth code
 *   4. Code is exchanged via Cloud Function → vehicle list returned
 *   5. User selects vehicle → returns to scan flow
 */

import {
  VoltBorderRadius,
  VoltColors,
  VoltFontSize,
  VoltShadow,
  VoltSpacing,
} from "@/constants/Theme";
import { getAuthorizationUrl, exchangeAuthCode } from "@/services/smartcar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";

interface SmartcarVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

type ScreenState = "intro" | "connecting" | "exchanging" | "select_vehicle" | "error";

export default function SmartcarConnectScreen() {
  const { t: _t } = useTranslation(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const _params = useLocalSearchParams<{ vin?: string; returnTo?: string }>(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const [screenState, setScreenState] = useState<ScreenState>("intro");
  const [vehicles, setVehicles] = useState<SmartcarVehicle[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Handle deep link callback ──────────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url.includes("callback")) return;

      // Parse the authorization code from the callback URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get("code");
      const error = urlObj.searchParams.get("error");

      if (error) {
        setScreenState("error");
        setErrorMessage(
          error === "access_denied"
            ? "Accesul a fost refuzat. Pentru Level 2 este necesară autorizarea Smartcar."
            : `Eroare Smartcar: ${error}`,
        );
        return;
      }

      if (!code) {
        setScreenState("error");
        setErrorMessage("Nu s-a primit codul de autorizare de la Smartcar.");
        return;
      }

      // Exchange code for tokens via Cloud Function
      setScreenState("exchanging");
      try {
        const result = await exchangeAuthCode(code);
        if (result.vehicles.length > 0) {
          setVehicles(result.vehicles);
          setScreenState("select_vehicle");
        } else {
          setScreenState("error");
          setErrorMessage(
            "Nu am găsit vehicule electrice conectate la contul tău Smartcar. Asigură-te că ai adăugat vehiculul în aplicația producătorului.",
          );
        }
      } catch (err) {
        setScreenState("error");
        // eslint-disable-next-line no-console
        console.error("[SmartcarConnect] Exchange failed:", err);
        setErrorMessage("Conectarea cu Smartcar a eșuat. Te rugăm să încerci din nou.");
      }
    };

    // Listen for deep link callbacks
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened from a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  // ── Open Smartcar OAuth ────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setScreenState("connecting");
    try {
      const authUrl = getAuthorizationUrl();

      if (Platform.OS === "web") {
        window.open(authUrl, "_self");
      } else {
        await Linking.openURL(authUrl);
      }
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      setScreenState("error");
      setErrorMessage("Nu s-a putut deschide pagina de autorizare Smartcar.");
    }
  }, []);

  // ── Select vehicle and return ──────────────────────────────────────────
  const handleSelectVehicle = useCallback(
    (_vehicle: SmartcarVehicle) => {
      // Return to scan flow with selected vehicle info
      router.back();
      // The scan screen can read this from a global store or params
      // For now, we just go back — the pipeline will fetch battery data
      // using the stored Smartcar tokens
    },
    [router],
  );

  // ── Render: Intro State ────────────────────────────────────────────────
  if (screenState === "intro") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={Platform.OS === "web"}
      >
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="car-connected" size={48} color={VoltColors.neonGreen} />
          </View>
          <Text style={styles.heroTitle}>Conectare Smartcar</Text>
          <Text style={styles.heroSubtitle}>
            Pentru analiza Level 2, InspectEV are nevoie de acces la datele vehiculului tău electric
            prin Smartcar — o platformă securizată folosită de peste 200 de producători auto.
          </Text>
        </View>

        {/* What we access — glassmorphism card */}
        <BlurView intensity={Platform.OS === 'web' ? 15 : 30} tint="dark" style={styles.blurCard}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ce date accesăm:</Text>
            <View style={styles.featuresList}>
              {[
                { icon: "battery-heart" as const, text: "Starea de sănătate a bateriei (SoH)" },
                { icon: "lightning-bolt" as const, text: "Capacitatea utilizabilă (kWh)" },
                { icon: "speedometer" as const, text: "Kilometrajul actual" },
                { icon: "ev-plug-type2" as const, text: "Statusul încărcării" },
              ].map((item, i) => (
                <View key={i} style={styles.featureItem}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={VoltColors.neonGreen} />
                  <Text style={styles.featureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </BlurView>

        {/* Security info — glassmorphism card */}
        <BlurView intensity={Platform.OS === 'web' ? 15 : 30} tint="dark" style={styles.blurCard}>
          <View style={[styles.card, styles.securityCard]}>
            <View style={styles.securityHeader}>
              <Ionicons name="shield-checkmark" size={22} color={VoltColors.success} />
              <Text style={styles.securityTitle}>Securitate</Text>
            </View>
            <Text style={styles.securityText}>
              Smartcar folosește OAuth 2.0 — la fel ca Google sau Apple Sign-In. InspectEV nu vede
              niciodată parola contului tău auto. Poți revoca accesul oricând din Setări.
            </Text>
          </View>
        </BlurView>

        {/* Connect button */}
        <TouchableOpacity style={styles.connectButton} onPress={handleConnect} activeOpacity={0.8}>
          <MaterialCommunityIcons name="car-connected" size={22} color={VoltColors.textOnGreen} />
          <Text style={styles.connectButtonText}>Conectează Vehiculul</Text>
        </TouchableOpacity>

        {/* Skip option */}
        <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
          <Text style={styles.skipText}>Înapoi la selecția nivelului</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Render: Connecting / Exchanging ────────────────────────────────────
  if (screenState === "connecting" || screenState === "exchanging") {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={VoltColors.neonGreen} />
        <Text style={styles.loadingTitle}>
          {screenState === "connecting"
            ? "Se deschide Smartcar Connect..."
            : "Se procesează autorizarea..."}
        </Text>
        <Text style={styles.loadingSubtitle}>
          {screenState === "connecting"
            ? "Vei fi redirecționat către pagina de autorizare Smartcar"
            : "Se obțin datele vehiculului tău"}
        </Text>
      </View>
    );
  }

  // ── Render: Vehicle Selection ──────────────────────────────────────────
  if (screenState === "select_vehicle") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={Platform.OS === "web"}
      >
        <View style={styles.heroSection}>
          <Ionicons name="checkmark-circle" size={48} color={VoltColors.success} />
          <Text style={styles.heroTitle}>Conectare reușită!</Text>
          <Text style={styles.heroSubtitle}>
            Selectează vehiculul pentru care dorești analiza Level 2:
          </Text>
        </View>

        {vehicles.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={styles.vehicleCard}
            onPress={() => handleSelectVehicle(vehicle)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="car-electric"
              size={36}
              color={VoltColors.neonGreen}
            />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={styles.vehicleYear}>{vehicle.year || "An necunoscut"}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color={VoltColors.neonGreen} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ── Render: Error State ────────────────────────────────────────────────
  return (
    <View style={styles.centeredContainer}>
      <Ionicons name="alert-circle" size={64} color={VoltColors.error} />
      <Text style={styles.errorTitle}>Eroare</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => setScreenState("intro")}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={20} color={VoltColors.textOnGreen} />
        <Text style={styles.retryButtonText}>Încearcă din nou</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Înapoi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VoltColors.bgPrimary,
  },
  content: {
    paddingHorizontal: VoltSpacing.lg,
    paddingTop: VoltSpacing.xl,
    paddingBottom: 120,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: VoltColors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: VoltSpacing.xl,
  },

  // Hero
  heroSection: {
    alignItems: "center",
    marginBottom: VoltSpacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: VoltColors.neonGreenMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: VoltSpacing.lg,
    borderWidth: 2,
    borderColor: VoltColors.neonGreen,
  },
  heroTitle: {
    fontSize: VoltFontSize.xxl,
    fontWeight: "700",
    color: VoltColors.textPrimary,
    textAlign: "center",
    marginBottom: VoltSpacing.sm,
  },
  heroSubtitle: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Blur wrapper for glassmorphism cards
  blurCard: {
    borderRadius: VoltBorderRadius.lg,
    overflow: "hidden",
    marginBottom: VoltSpacing.md,
  },
  // Card
  card: {
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderRadius: VoltBorderRadius.lg,
    padding: VoltSpacing.lg,
    borderWidth: 1,
    borderColor: VoltColors.border,
  },
  cardTitle: {
    fontSize: VoltFontSize.lg,
    fontWeight: "700",
    color: VoltColors.textPrimary,
    marginBottom: VoltSpacing.md,
  },
  featuresList: {
    gap: VoltSpacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: VoltSpacing.md,
  },
  featureText: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
  },

  // Security
  securityCard: {
    borderColor: "rgba(0, 200, 83, 0.2)",
    backgroundColor: "rgba(0, 200, 83, 0.05)",
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: VoltSpacing.sm,
    marginBottom: VoltSpacing.sm,
  },
  securityTitle: {
    fontSize: VoltFontSize.lg,
    fontWeight: "700",
    color: VoltColors.success,
  },
  securityText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
    lineHeight: 20,
  },

  // Connect button
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: VoltColors.neonGreen,
    borderRadius: VoltBorderRadius.md,
    paddingVertical: VoltSpacing.lg,
    gap: VoltSpacing.sm,
    marginTop: VoltSpacing.md,
    ...VoltShadow.lg,
  },
  connectButtonText: {
    fontSize: VoltFontSize.lg,
    fontWeight: "800",
    color: VoltColors.textOnGreen,
  },

  // Skip
  skipButton: {
    alignItems: "center",
    paddingVertical: VoltSpacing.lg,
  },
  skipText: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textTertiary,
  },

  // Loading
  loadingTitle: {
    fontSize: VoltFontSize.lg,
    fontWeight: "700",
    color: VoltColors.textPrimary,
    marginTop: VoltSpacing.lg,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
    marginTop: VoltSpacing.sm,
    textAlign: "center",
  },

  // Vehicle selection
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: VoltColors.bgSecondary,
    borderRadius: VoltBorderRadius.lg,
    padding: VoltSpacing.lg,
    marginBottom: VoltSpacing.md,
    borderWidth: 1,
    borderColor: VoltColors.border,
    gap: VoltSpacing.md,
    ...VoltShadow.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: VoltFontSize.lg,
    fontWeight: "700",
    color: VoltColors.textPrimary,
  },
  vehicleYear: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
    marginTop: 2,
  },

  // Error
  errorTitle: {
    fontSize: VoltFontSize.xl,
    fontWeight: "700",
    color: VoltColors.textPrimary,
    marginTop: VoltSpacing.lg,
  },
  errorMessage: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
    textAlign: "center",
    marginTop: VoltSpacing.sm,
    lineHeight: 22,
    marginBottom: VoltSpacing.xl,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: VoltColors.neonGreen,
    borderRadius: VoltBorderRadius.md,
    paddingHorizontal: VoltSpacing.xl,
    paddingVertical: VoltSpacing.md,
    gap: VoltSpacing.sm,
  },
  retryButtonText: {
    fontSize: VoltFontSize.md,
    fontWeight: "700",
    color: VoltColors.textOnGreen,
  },
});
