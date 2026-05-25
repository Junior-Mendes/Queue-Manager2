import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Feather name="alert-circle" size={48} color={colors.destructive} />
      <Text style={[styles.errorText, { color: colors.foreground }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Feather name={icon as any} size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: disabled ? colors.muted : colors.primary,
          opacity: pressed && !disabled ? 0.9 : 1,
        },
      ]}
    >
      {icon && <Feather name={icon as any} size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
      <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryBtn,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          opacity: pressed && !disabled ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[styles.secondaryBtnText, { color: colors.secondaryForeground }]}>{title}</Text>
    </Pressable>
  );
}

export function AppInput({
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "phone-pad";
  maxLength?: number;
}) {
  const colors = useColors();
  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      maxLength={maxLength}
      placeholderTextColor={colors.mutedForeground}
      style={[
        styles.input,
        {
          backgroundColor: colors.card,
          color: colors.foreground,
          borderColor: colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 16, fontSize: 14, fontFamily: "Inter_500Medium" },
  errorText: { marginTop: 16, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { marginTop: 16, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
