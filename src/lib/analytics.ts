type AnalyticsProperties = Record<string, boolean | number | string | null | undefined>;

type PostHogLike = {
  capture: (eventName: string, properties?: AnalyticsProperties) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") return;
  window.posthog?.capture(eventName, properties);
}
