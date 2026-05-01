type OpenWeatherResponse = {
  weather?: Array<{ icon?: string; description?: string }>;
  main?: {
    temp_min?: number;
    temp_max?: number;
  };
};

export type DashboardWeatherSnapshot = {
  icon: string;
  label: string;
  tempLow: number | null;
  tempHigh: number | null;
};

function mapIconCodeToEmoji(iconCode?: string): string {
  if (!iconCode) return "🌤";

  if (iconCode.startsWith("01")) return "☀️";
  if (iconCode.startsWith("02")) return "🌤";
  if (iconCode.startsWith("03") || iconCode.startsWith("04")) return "☁️";
  if (iconCode.startsWith("09") || iconCode.startsWith("10")) return "🌧";
  if (iconCode.startsWith("11")) return "⛈";
  if (iconCode.startsWith("13")) return "❄️";
  if (iconCode.startsWith("50")) return "🌫";

  return "🌤";
}

export async function getDashboardWeather(zipCode = "08108", countryCode = "US"): Promise<DashboardWeatherSnapshot | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    zip: `${zipCode},${countryCode}`,
    units: "imperial",
    appid: apiKey,
  });

  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OpenWeatherResponse;
    const iconCode = payload.weather?.[0]?.icon;
    const description = payload.weather?.[0]?.description ?? "Forecast";

    return {
      icon: mapIconCodeToEmoji(iconCode),
      label: description.replace(/^\w/, (character) => character.toUpperCase()),
      tempLow: typeof payload.main?.temp_min === "number" ? Math.round(payload.main.temp_min) : null,
      tempHigh: typeof payload.main?.temp_max === "number" ? Math.round(payload.main.temp_max) : null,
    };
  } catch {
    return null;
  }
}
