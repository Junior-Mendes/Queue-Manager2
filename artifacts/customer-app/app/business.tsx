import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetPublicBusiness } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { LoadingState, ErrorState } from "@/components/ui";

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
  );
}

function ServiceCard({ service, onPress }: { service: any; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="scissors" size={18} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{service.name}</Text>
          {service.description && (
            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {service.description}
            </Text>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardDuration, { color: colors.primary }]}>{service.durationMinutes}m</Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

function ProfessionalCard({ prof, onPress }: { prof: any; onPress: () => void }) {
  const colors = useColors();
  const initials = prof.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{prof.name}</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{prof.role}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function BusinessScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();

  const { data: business, isLoading, error, refetch } = useGetPublicBusiness(slug || "", {
    query: { enabled: !!slug, queryKey: ["/public/businesses", slug] },
  });

  if (isLoading) return <LoadingState message="Loading business..." />;
  if (error || !business) return <ErrorState message="Could not load business." onRetry={refetch} />;

  const displayName = name || business.name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{displayName}</Text>
        {business.description && (
          <Text style={[styles.headerDesc, { color: colors.mutedForeground }]}>{business.description}</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/join-queue", params: { slug, name: displayName } });
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Feather name="list" size={20} color={colors.primaryForeground} />
            <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Join Queue</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/book", params: { slug, name: displayName } });
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Feather name="calendar" size={20} color={colors.accentForeground} />
            <Text style={[styles.actionText, { color: colors.accentForeground }]}>Book Appointment</Text>
          </Pressable>
        </View>

        <SectionTitle title="Services" />
        {business.services?.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No services available</Text>
        )}
        {business.services?.map((s: any) => (
          <ServiceCard
            key={s.id}
            service={s}
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/join-queue", params: { slug, serviceId: s.id, name: displayName } });
            }}
          />
        ))}

        <SectionTitle title="Professionals" />
        {business.professionals?.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No professionals listed</Text>
        )}
        {business.professionals?.map((p: any) => (
          <ProfessionalCard
            key={p.id}
            prof={p}
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/book", params: { slug, professionalId: p.id, name: displayName } });
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  headerDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 12 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardDuration: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
