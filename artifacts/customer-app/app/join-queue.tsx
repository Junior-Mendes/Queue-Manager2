import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetPublicBusiness,
  useListQueues,
  useJoinQueue,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useActiveSession } from "@/context/ActiveSessionContext";
import { AppInput, PrimaryButton, SecondaryButton, LoadingState, ErrorState } from "@/components/ui";

export default function JoinQueueScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug, serviceId: preSelectedServiceId, name } = useLocalSearchParams<{
    slug: string;
    serviceId?: string;
    name?: string;
  }>();
  const { setSession } = useActiveSession();

  const [step, setStep] = useState<"service" | "professional" | "details">(
    preSelectedServiceId ? "professional" : "service"
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preSelectedServiceId || "");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const { data: business, isLoading: loadingBusiness } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  const { data: queues, isLoading: loadingQueues } = useListQueues(
    { businessId: business?.id || "", date: today },
    { query: { enabled: !!business?.id, queryKey: ["/api/queues", business?.id, today] } }
  );

  const joinQueue = useJoinQueue();

  const activeQueue = queues?.find(
    (q: any) =>
      q.status === "open" &&
      (selectedServiceId ? q.serviceId === selectedServiceId : true) &&
      (selectedProfessionalId ? q.professionalId === selectedProfessionalId : true)
  );

  const services = business?.services || [];
  const professionals = business?.professionals || [];

  const handleJoin = async () => {
    if (!activeQueue || !clientName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const entry = await joinQueue.mutateAsync({
        queueId: activeQueue.id,
        data: {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          serviceId: selectedServiceId || undefined,
          professionalId: selectedProfessionalId || undefined,
        },
      });
      await setSession({
        type: "queue",
        id: entry.id,
        queueId: activeQueue.id,
        businessSlug: slug,
        businessName: name || business?.name,
      });
      router.replace({ pathname: "/track", params: { from: "join" } });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (loadingBusiness) return <LoadingState message="Loading..." />;
  if (!business) return <ErrorState message="Business not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Join the Queue
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {name || business.name}
          </Text>

          {/* Step indicator */}
          <View style={styles.steps}>
            {["Service", "Professional", "Details"].map((label, idx) => {
              const active =
                (step === "service" && idx === 0) ||
                (step === "professional" && idx === 1) ||
                (step === "details" && idx === 2);
              const done =
                (step === "professional" && idx === 0) ||
                (step === "details" && idx <= 1);
              return (
                <View key={label} style={[styles.stepDotWrap, { flex: 1 }]}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: done || active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {done ? (
                      <Feather name="check" size={12} color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.stepNum, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: active ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {step === "service" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a service</Text>
              {services.length === 0 && (
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>No services available</Text>
              )}
              {services.map((s: any) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedServiceId(s.id);
                    setStep("professional");
                  }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.optionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>{s.name}</Text>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                        {s.durationMinutes} min
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {step === "professional" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a professional (optional)</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedProfessionalId("");
                  setStep("details");
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: selectedProfessionalId === "" ? colors.primary : colors.card,
                    borderColor: selectedProfessionalId === "" ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    { color: selectedProfessionalId === "" ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  Any available
                </Text>
              </Pressable>
              {professionals.map((p: any) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedProfessionalId(p.id);
                    setStep("details");
                  }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: selectedProfessionalId === p.id ? colors.primary : colors.card,
                      borderColor: selectedProfessionalId === p.id ? colors.primary : colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: selectedProfessionalId === p.id ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDesc,
                      { color: selectedProfessionalId === p.id ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {p.role}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {step === "details" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your details</Text>
              {!activeQueue && !loadingQueues && (
                <View style={styles.noQueue}>
                  <Feather name="x-circle" size={32} color={colors.destructive} />
                  <Text style={[styles.noQueueText, { color: colors.destructive }]}>
                    No open queue matches your selection. Try a different professional or service.
                  </Text>
                </View>
              )}
              <AppInput placeholder="Your name" value={clientName} onChangeText={setClientName} maxLength={50} />
              <AppInput
                placeholder="Phone (optional)"
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
              <PrimaryButton
                title={joinQueue.isPending ? "Joining..." : "Join Queue"}
                onPress={handleJoin}
                disabled={!clientName.trim() || !activeQueue || joinQueue.isPending}
              />
              {joinQueue.isError && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  Failed to join queue. Please try again.
                </Text>
              )}
            </View>
          )}

          {step !== "service" && (
            <SecondaryButton
              title="Back"
              onPress={() => {
                Haptics.selectionAsync();
                setStep(step === "details" ? "professional" : "service");
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Pressable } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 24 },
  steps: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 8 },
  stepDotWrap: { alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8 },
  optionCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  optionRow: { flexDirection: "row", alignItems: "center" },
  optionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  noQueue: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noQueueText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 8 },
});
