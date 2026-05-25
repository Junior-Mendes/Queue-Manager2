import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetPublicBusiness,
  useGetAvailableSlots,
  useCreateAppointment,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useActiveSession } from "@/context/ActiveSessionContext";
import { AppInput, PrimaryButton, SecondaryButton, LoadingState, ErrorState } from "@/components/ui";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function BookScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug, professionalId: preProfId, name } = useLocalSearchParams<{
    slug: string;
    professionalId?: string;
    name?: string;
  }>();
  const { setSession } = useActiveSession();

  const [step, setStep] = useState<"service" | "professional" | "date" | "time" | "details">(
    preProfId ? "service" : "service"
  );
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(preProfId || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const { data: business, isLoading: loadingBusiness } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  const { data: slots, isLoading: loadingSlots } = useGetAvailableSlots(
    {
      businessId: business?.id || "",
      serviceId: selectedServiceId || undefined,
      professionalId: selectedProfessionalId || undefined,
      date: selectedDate,
    },
    {
      query: {
        enabled: !!business?.id && !!selectedDate,
        queryKey: ["/api/appointments/available-slots", business?.id, selectedServiceId, selectedProfessionalId, selectedDate],
      },
    }
  );

  const createAppointment = useCreateAppointment();

  const services = business?.services || [];
  const professionals = business?.professionals || [];

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const handleBook = async () => {
    if (!business?.id || !clientName.trim() || !selectedTime || !selectedDate) return;
    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const appt = await createAppointment.mutateAsync({
        data: {
          businessId: business.id,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || undefined,
          serviceId: selectedServiceId || undefined,
          professionalId: selectedProfessionalId || undefined,
          scheduledAt,
        },
      });
      await setSession({
        type: "appointment",
        id: appt.id,
        businessSlug: slug,
        businessName: name || business.name,
      });
      router.replace({ pathname: "/track", params: { from: "book" } });
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
          <Text style={[styles.title, { color: colors.foreground }]}>Book Appointment</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{name || business.name}</Text>

          {step === "service" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a service</Text>
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
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{s.durationMinutes} min</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {step === "professional" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a professional</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedProfessionalId("");
                  setStep("date");
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
                <Text style={[styles.optionTitle, { color: selectedProfessionalId === "" ? colors.primaryForeground : colors.foreground }]}>
                  Any available
                </Text>
              </Pressable>
              {professionals.map((p: any) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedProfessionalId(p.id);
                    setStep("date");
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
                  <Text style={[styles.optionTitle, { color: selectedProfessionalId === p.id ? colors.primaryForeground : colors.foreground }]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.optionDesc, { color: selectedProfessionalId === p.id ? colors.primaryForeground : colors.mutedForeground }]}>
                    {p.role}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {step === "date" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pick a date</Text>
              <View style={styles.dateGrid}>
                {dates.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedDate(d);
                      setStep("time");
                    }}
                    style={({ pressed }) => [
                      styles.dateBtn,
                      {
                        backgroundColor: selectedDate === d ? colors.primary : colors.card,
                        borderColor: selectedDate === d ? colors.primary : colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateDay,
                        { color: selectedDate === d ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                    <Text
                      style={[
                        styles.dateNum,
                        { color: selectedDate === d ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {new Date(d).getDate()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "time" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Available times for {formatDateLabel(selectedDate)}
              </Text>
              {loadingSlots && <Text style={{ color: colors.mutedForeground }}>Loading times...</Text>}
              {!loadingSlots && slots && slots.length === 0 && (
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>No available slots</Text>
              )}
              <View style={styles.timeGrid}>
                {slots?.map((slot: any) => (
                  <Pressable
                    key={slot.time}
                    onPress={() => {
                      if (!slot.available) return;
                      Haptics.selectionAsync();
                      setSelectedTime(slot.time);
                      setStep("details");
                    }}
                    disabled={!slot.available}
                    style={({ pressed }) => [
                      styles.timeBtn,
                      {
                        backgroundColor: selectedTime === slot.time ? colors.primary : slot.available ? colors.card : colors.muted,
                        borderColor: selectedTime === slot.time ? colors.primary : colors.border,
                        opacity: pressed && slot.available ? 0.9 : slot.available ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        {
                          color: selectedTime === slot.time ? colors.primaryForeground : slot.available ? colors.foreground : colors.mutedForeground,
                        },
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "details" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Confirm for {formatDateLabel(selectedDate)} at {selectedTime}
              </Text>
              <AppInput placeholder="Your name" value={clientName} onChangeText={setClientName} maxLength={50} />
              <AppInput
                placeholder="Phone (optional)"
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
              <PrimaryButton
                title={createAppointment.isPending ? "Booking..." : "Confirm Appointment"}
                onPress={handleBook}
                disabled={!clientName.trim() || createAppointment.isPending}
              />
              {createAppointment.isError && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  Failed to book. Please try again.
                </Text>
              )}
            </View>
          )}

          {step !== "service" && (
            <SecondaryButton
              title="Back"
              onPress={() => {
                Haptics.selectionAsync();
                const backMap: Record<string, string> = {
                  professional: "service",
                  date: "professional",
                  time: "date",
                  details: "time",
                };
                setStep((backMap[step] || "service") as any);
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 24 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  optionCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  optionRow: { flexDirection: "row", alignItems: "center" },
  optionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dateNum: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 8 },
});
