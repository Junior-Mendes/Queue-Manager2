import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useGetQueueEntry,
  useUpdateQueueEntryStatus,
  useGetAppointment,
  useUpdateAppointmentStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useActiveSession } from "@/context/ActiveSessionContext";
import { LoadingState, ErrorState, EmptyState, PrimaryButton, SecondaryButton } from "@/components/ui";
import { useQueueWebSocket, useAppointmentWebSocket, type WsStatus } from "@/hooks/useTrackingWebSocket";

export default function TrackScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, clearSession, isLoading: sessionLoading } = useActiveSession();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (sessionLoading) return <LoadingState message="Loading session..." />;

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
        <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          <Text style={[styles.noSessionTitle, { color: colors.foreground }]}>No active session</Text>
          <Text style={[styles.noSessionDesc, { color: colors.mutedForeground }]}>
            You have no active queue or appointment.
          </Text>
          <PrimaryButton title="Find a Business" onPress={() => router.replace("/")} icon="search" />
        </View>
      </SafeAreaView>
    );
  }

  if (session.type === "queue") {
    return <QueueTracker
      queueId={session.queueId!}
      entryId={session.id}
      businessName={session.businessName}
      onCancel={() => setShowCancelConfirm(true)}
      showCancel={showCancelConfirm}
      setShowCancel={setShowCancelConfirm}
      onClear={clearSession}
    />;
  }

  return <AppointmentTracker
    appointmentId={session.id}
    businessName={session.businessName}
    onCancel={() => setShowCancelConfirm(true)}
    showCancel={showCancelConfirm}
    setShowCancel={setShowCancelConfirm}
    onClear={clearSession}
  />;
}

function ConnectionStatusBadge({ status }: { status: WsStatus }) {
  const colors = useColors();

  if (status === "connected") {
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.success + "20" }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.statusBadgeText, { color: colors.success }]}>Live</Text>
      </View>
    );
  }

  if (status === "fallback") {
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.warning + "20" }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
        <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Polling</Text>
      </View>
    );
  }

  if (status === "connecting") {
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.mutedForeground }]} />
        <Text style={[styles.statusBadgeText, { color: colors.mutedForeground }]}>Connecting...</Text>
      </View>
    );
  }

  return null;
}

function QueueTracker({
  queueId,
  entryId,
  businessName,
  onCancel,
  showCancel,
  setShowCancel,
  onClear,
}: {
  queueId: string;
  entryId: string;
  businessName?: string;
  onCancel: () => void;
  showCancel: boolean;
  setShowCancel: (v: boolean) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Polling tick — used only as fallback when WebSocket is unavailable
  const [tick, setTick] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");

  const wsStatusResult = useQueueWebSocket(queueId, entryId, {
    enabled: !!queueId && !!entryId,
    onEntryUpdate: useCallback((data: unknown) => {
      queryClient.setQueryData(["/api/queues/entry", queueId, entryId], data);
    }, [queryClient, queueId, entryId]),
    onQueueUpdate: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues/entry", queueId, entryId] });
    }, [queryClient, queueId, entryId]),
  });

  useEffect(() => {
    setWsStatus(wsStatusResult);
  }, [wsStatusResult]);

  // Fallback polling — only active when WebSocket is not connected
  useEffect(() => {
    if (wsStatus !== "fallback") return;
    const iv = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(iv);
  }, [wsStatus]);

  const queryKey = wsStatus === "fallback"
    ? ["/api/queues/entry", queueId, entryId, tick]
    : ["/api/queues/entry", queueId, entryId];

  const { data: entry, isLoading, error, refetch } = useGetQueueEntry(
    queueId,
    entryId,
    { query: { enabled: !!queueId && !!entryId, queryKey } }
  );

  const cancelMutation = useUpdateQueueEntryStatus();

  const handleCancel = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelMutation.mutateAsync({
      queueId,
      id: entryId,
      data: { status: "cancelled" as any },
    });
    await onClear();
    setShowCancel(false);
    router.replace("/");
  };

  if (isLoading) return <LoadingState message="Loading position..." />;
  if (error) return <ErrorState message="Could not load queue status." onRetry={refetch} />;
  if (!entry) return <EmptyState icon="inbox" message="Entry not found." />;

  const isCalled = entry.status === "called" || entry.status === "in_service";
  const isDone = entry.status === "done" || entry.status === "cancelled" || entry.status === "no_show";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.trackTitle, { color: colors.foreground }]}>Your Queue</Text>
            {businessName && <Text style={[styles.trackSub, { color: colors.mutedForeground }]}>{businessName}</Text>}
          </View>
          <ConnectionStatusBadge status={wsStatus} />
        </View>

        <View style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Ticket Number</Text>
          <Text style={[styles.ticketNumber, { color: colors.primary }]}>#{entry.ticketNumber}</Text>
        </View>

        {isCalled ? (
          <View style={[styles.statusBanner, { backgroundColor: colors.success }]}>
            <Feather name="bell" size={24} color={colors.accentForeground} />
            <Text style={[styles.statusBannerText, { color: colors.accentForeground }]}>
              It is your turn!
            </Text>
          </View>
        ) : isDone ? (
          <View style={[styles.statusBanner, { backgroundColor: colors.muted }]}>
            <Text style={[styles.statusBannerText, { color: colors.mutedForeground }]}>
              {entry.status === "done" ? "Service completed" : "Cancelled"}
            </Text>
          </View>
        ) : (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Feather name="users" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {entry.waitingAhead ?? 0} people ahead
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="clock" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Est. wait: {entry.estimatedWaitMinutes ?? 15} min
              </Text>
            </View>
          </View>
        )}

        {!isDone && (
          <>
            {!showCancel ? (
              <SecondaryButton title="Leave Queue" onPress={onCancel} />
            ) : (
              <View style={styles.cancelConfirm}>
                <Text style={[styles.cancelText, { color: colors.destructive }]}>
                  Are you sure you want to leave the queue?
                </Text>
                <PrimaryButton
                  title={cancelMutation.isPending ? "Leaving..." : "Yes, Leave Queue"}
                  onPress={handleCancel}
                  disabled={cancelMutation.isPending}
                />
                <SecondaryButton title="Keep Waiting" onPress={() => setShowCancel(false)} />
              </View>
            )}
          </>
        )}

        {isDone && (
          <PrimaryButton title="Done" onPress={() => router.replace("/")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppointmentTracker({
  appointmentId,
  businessName,
  onCancel,
  showCancel,
  setShowCancel,
  onClear,
}: {
  appointmentId: string;
  businessName?: string;
  onCancel: () => void;
  showCancel: boolean;
  setShowCancel: (v: boolean) => void;
  onClear: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [tick, setTick] = useState(0);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");

  const wsStatusResult = useAppointmentWebSocket(appointmentId, {
    enabled: !!appointmentId,
    onMessage: useCallback((data: unknown) => {
      queryClient.setQueryData(["/api/appointments", appointmentId], data);
    }, [queryClient, appointmentId]),
  });

  useEffect(() => {
    setWsStatus(wsStatusResult);
  }, [wsStatusResult]);

  useEffect(() => {
    if (wsStatus !== "fallback") return;
    const iv = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(iv);
  }, [wsStatus]);

  const queryKey = wsStatus === "fallback"
    ? ["/api/appointments", appointmentId, tick]
    : ["/api/appointments", appointmentId];

  const { data: appt, isLoading, error, refetch } = useGetAppointment(
    appointmentId,
    { query: { enabled: !!appointmentId, queryKey } }
  );

  const cancelMutation = useUpdateAppointmentStatus();

  const handleCancel = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelMutation.mutateAsync({
      id: appointmentId,
      data: { status: "cancelled" as any },
    });
    await onClear();
    setShowCancel(false);
    router.replace("/");
  };

  if (isLoading) return <LoadingState message="Loading appointment..." />;
  if (error) return <ErrorState message="Could not load appointment." onRetry={refetch} />;
  if (!appt) return <EmptyState icon="inbox" message="Appointment not found." />;

  const isDone = appt.status === "done" || appt.status === "cancelled" || appt.status === "no_show";
  const isInService = appt.status === "in_service";
  const scheduled = new Date(appt.scheduledAt);

  const statusLabel: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    in_service: "In Service",
    done: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };
  const statusColor: Record<string, string> = {
    scheduled: colors.warning,
    confirmed: colors.primary,
    in_service: colors.success,
    done: colors.mutedForeground,
    cancelled: colors.destructive,
    no_show: colors.destructive,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.trackTitle, { color: colors.foreground }]}>Your Appointment</Text>
            {businessName && <Text style={[styles.trackSub, { color: colors.mutedForeground }]}>{businessName}</Text>}
          </View>
          <ConnectionStatusBadge status={wsStatus} />
        </View>

        <View style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Date & Time</Text>
          <Text style={[styles.ticketNumber, { color: colors.primary }]}>
            {scheduled.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {"  "}
            {scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusColor[appt.status] + "20", borderColor: statusColor[appt.status] }]}>
          <Text style={[styles.statusPillText, { color: statusColor[appt.status] }]}>
            {statusLabel[appt.status] || appt.status}
          </Text>
        </View>

        {isInService && (
          <View style={[styles.statusBanner, { backgroundColor: colors.success }]}>
            <Feather name="bell" size={24} color={colors.accentForeground} />
            <Text style={[styles.statusBannerText, { color: colors.accentForeground }]}>
              It is your turn!
            </Text>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Feather name="user" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>{appt.clientName}</Text>
          </View>
          {appt.clientPhone && (
            <View style={styles.infoRow}>
              <Feather name="phone" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{appt.clientPhone}</Text>
            </View>
          )}
        </View>

        {!isDone && (
          <>
            {!showCancel ? (
              <SecondaryButton title="Cancel Appointment" onPress={onCancel} />
            ) : (
              <View style={styles.cancelConfirm}>
                <Text style={[styles.cancelText, { color: colors.destructive }]}>
                  Cancel this appointment?
                </Text>
                <PrimaryButton
                  title={cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
                  onPress={handleCancel}
                  disabled={cancelMutation.isPending}
                />
                <SecondaryButton title="Keep Appointment" onPress={() => setShowCancel(false)} />
              </View>
            )}
          </>
        )}

        {isDone && (
          <PrimaryButton title="Done" onPress={() => router.replace("/")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  trackTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  trackSub: { fontSize: 15, fontFamily: "Inter_400Regular" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ticketCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  ticketLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  ticketNumber: { fontSize: 48, fontFamily: "Inter_700Bold" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  statusPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  statusPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cancelConfirm: { gap: 10, marginTop: 8 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 4 },
  noSessionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 8 },
  noSessionDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24 },
});
