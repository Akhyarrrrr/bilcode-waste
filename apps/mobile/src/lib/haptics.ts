import * as Haptics from "expo-haptics";

// Haptics are a nicety; devices without a vibrator must never surface an error.
const quiet = (feedback: Promise<void>) => void feedback.catch(() => undefined);

export const haptic = {
  select: () => quiet(Haptics.selectionAsync()),
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () =>
    quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
