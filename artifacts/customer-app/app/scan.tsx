import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

function WebFallback() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.centered}>
          <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
            <Feather name="camera-off" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Camera not available</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            QR scanning is only supported on iOS and Android. Please use the business code field instead.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.fallbackBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.fallbackBtnText, { color: colors.primaryForeground }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function NativeScanner() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scannedRef = useRef(false);

  const [Camera, setCamera] = useState<any>(null);
  const [permission, setPermission] = useState<any>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("expo-camera").then((mod) => {
      if (cancelled) return;
      setCamera(mod);
      mod.Camera.getCameraPermissionsAsync().then((perm: any) => {
        if (!cancelled) setPermission(perm);
      });
    });
    return () => { cancelled = true; };
  }, []);

  const requestPermission = async () => {
    if (!Camera) return;
    setPermissionRequested(true);
    const perm = await Camera.Camera.requestCameraPermissionsAsync();
    setPermission(perm);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let slug = data.trim();
    try {
      const url = new URL(slug);
      const parts = url.pathname.replace(/^\/+/, "").split("/");
      slug = parts[parts.length - 1] || slug;
    } catch {
      // Not a URL — use raw value as slug
    }
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (slug) {
      router.replace({ pathname: "/business", params: { slug } });
    } else {
      scannedRef.current = false;
    }
  };

  if (!Camera) {
    return (
      <View style={[styles.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff", fontFamily: "Inter_500Medium" }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff", fontFamily: "Inter_500Medium" }}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain !== false;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
        <View style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.centered}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="camera" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Camera Access Needed</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Allow camera access to scan QR codes at the business.
            </Text>
            {canAsk ? (
              <Pressable
                onPress={requestPermission}
                style={[styles.fallbackBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.fallbackBtnText, { color: colors.primaryForeground }]}>Allow Camera</Text>
              </Pressable>
            ) : (
              <Text style={[styles.subtitle, { color: colors.destructive, marginTop: 8 }]}>
                Permission denied. Please enable camera access in your device settings.
              </Text>
            )}
            <Pressable onPress={() => router.back()} style={styles.cancelLink}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const CameraView = Camera.CameraView;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={12}
          >
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <View style={styles.reticleWrap} pointerEvents="none">
        <View style={[styles.reticle, { borderColor: "#fff" }]}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
        </View>
        <Text style={styles.hint}>Align the QR code within the frame</Text>
      </View>
    </View>
  );
}

export default function ScanScreen() {
  if (Platform.OS === "web") {
    return <WebFallback />;
  }
  return <NativeScanner />;
}

const CORNER = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  inner: { flex: 1, paddingHorizontal: 24 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  reticleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: 220,
    height: 220,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderWidth: CORNER_WIDTH,
    borderColor: "transparent",
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 20,
    textAlign: "center",
    opacity: 0.85,
  },
  backBtn: { paddingVertical: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 24, paddingHorizontal: 16 },
  fallbackBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  fallbackBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelLink: { paddingVertical: 8 },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  destructive: {},
});
