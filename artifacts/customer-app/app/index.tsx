import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetPublicBusiness } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { AppInput, PrimaryButton, ErrorState } from "@/components/ui";

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const trimmed = code.trim().toLowerCase();
  const { data: business, isLoading, error } = useGetPublicBusiness(
    trimmed,
    { query: { enabled: submitted && !!trimmed, retry: false, queryKey: ["/public/businesses", trimmed] } }
  );

  const handleLookup = () => {
    if (!trimmed) return;
    Haptics.selectionAsync();
    setSubmitted(true);
  };

  if (business && submitted) {
    // Navigate immediately when found
    router.push({
      pathname: "/business",
      params: { slug: trimmed, name: business.name },
    });
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="scissors" size={32} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Enter the business code to join the queue or book an appointment
          </Text>

          <View style={styles.form}>
            <AppInput
              placeholder="Business code (e.g. main-street)"
              value={code}
              onChangeText={(t) => {
                setCode(t);
                setSubmitted(false);
              }}
              maxLength={40}
            />
            <PrimaryButton
              title="Find Business"
              onPress={handleLookup}
              disabled={!trimmed || isLoading}
              icon="search"
            />
          </View>

          {submitted && isLoading && (
            <Text style={[styles.status, { color: colors.mutedForeground }]}>
              Searching...
            </Text>
          )}

          {submitted && error && (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                Business not found. Please check the code and try again.
              </Text>
            </View>
          )}

          {submitted && !isLoading && !business && !error && (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                Business not found. Please check the code and try again.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  iconWrap: { alignItems: "center", marginBottom: 24 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  form: { gap: 12 },
  status: { marginTop: 16, textAlign: "center", fontFamily: "Inter_500Medium" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
