const BASE_URL = "https://api.open-meteo.com/v1/forecast";
export interface ForecastDay {
  date: string;
  precipitationSum: number;
  tempMax: number;
  windMax: number;
}
export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastDay[]> {
  // Build the URL with the parameters you want
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "temperature_2m_max,precipitation_sum,wind_speed_10m_max",
    forecast_days: "7",
    timezone: "auto",
  });
  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const json = await response.json();
  // Map the raw API arrays into clean objects
  return json.daily.time.map((date: string, i: number) => ({
    date,
    precipitationSum: json.daily.precipitation_sum[i],
    tempMax: json.daily.temperature_2m_max[i],
    windMax: json.daily.wind_speed_10m_max[i],
  }));
}