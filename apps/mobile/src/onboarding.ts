export const onboardingKey = "bilcode.onboarding.v1";
export const onboardingMarker = "completed";

export const entryDestination = (authenticated: boolean, completed: boolean) =>
  authenticated ? "(tabs)" : completed ? "auth" : "onboarding";

export async function loadOnboarding(
  read: (key: string) => Promise<string | null>,
) {
  return (await read(onboardingKey)) === onboardingMarker;
}

export async function finishOnboarding(
  write: (key: string, value: string) => Promise<void>,
) {
  await write(onboardingKey, onboardingMarker);
  return true;
}
