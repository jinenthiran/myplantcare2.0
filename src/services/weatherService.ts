export interface WeatherData {
  temperature: number; // Celsius
  humidity: number;    // Percentage
  uvIndex: number;     // UV Index (0 - 12+)
  precipitation: number; // mm
  condition: string;
  rainExpected: boolean;
  locationName: string;
  adjustmentPercentage: number;
  wateringAdvice: string;
  environmentRecommendations: {
    indoor: string;
    balcony: string;
    greenhouse: string;
    outdoor: string;
  };
}

export async function fetchLocalWeather(lat?: number, lon?: number): Promise<WeatherData> {
  let latitude = lat;
  let longitude = lon;
  let locationName = 'Current Location';

  const defaultLat = 13.0827;
  const defaultLon = 80.2707;

  if (latitude === undefined || longitude === undefined) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      locationName = 'Detected GPS Location';
    } catch {
      latitude = defaultLat;
      longitude = defaultLon;
      locationName = 'Chennai, Tamil Nadu (Default)';
    }
  }

  try {
    const res = await fetch(
      `/api/weather?lat=${latitude}&lon=${longitude}&city=${encodeURIComponent(locationName)}`
    );
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    const current = data.current || {};

    const temp = Number(current.temperatureC ?? 28);
    const humidity = Number(current.humidityPercent ?? 65);
    const precip = Number(current.precipitationMm ?? 0);
    const rainProb = Number(current.rainProbabilityPercent ?? 0);
    const uvIndex = Number(current.uvIndex ?? (temp > 30 ? 9 : temp > 24 ? 6 : 3));

    let condition = 'Clear & Pleasant';
    if (precip > 0.2 || rainProb > 60) condition = 'Rainy Showers';
    else if (temp > 33) condition = 'Hot & Sunny';
    else if (humidity > 80) condition = 'Humid & Damp';

    const rainExpected = precip > 0.2 || rainProb > 60;

    let adjustment = 0;
    let advice = 'Standard watering schedule is optimal for current conditions.';

    if (rainExpected) {
      adjustment = -100;
      advice = 'Rain detected! Skip watering today to prevent overhydration and root rot.';
    } else if (temp > 33 && humidity < 40) {
      adjustment = +35;
      advice = 'High heat and low humidity detected. Increase watering frequency by 35% and check topsoil moisture daily.';
    } else if (temp > 30) {
      adjustment = +20;
      advice = 'Warm weather conditions. Increase watering by 20% to keep soil adequately hydrated.';
    } else if (humidity > 75 && temp < 24) {
      adjustment = -30;
      advice = 'High humidity and cool temperatures slow evaporation. Reduce watering by 30% to avoid fungal issues.';
    }

    // Environment-specific plant care recommendations
    const envRecs = {
      indoor: temp > 29 
        ? 'Indoor AC/cooling active: Ensure tropical foliage is misted daily to prevent dry tip burn.' 
        : 'Indoor conditions stable: Standard indirect light and bi-weekly soil checks are optimal.',
      balcony: uvIndex >= 8 
        ? 'Extreme UV Index (>8): Provide 40% shade cloth or retract sun-sensitive balcony plants during peak afternoon hours.' 
        : 'Balcony conditions favorable: Suitable for direct sun-loving herbs and flowering shrubs.',
      greenhouse: humidity > 75 
        ? 'High greenhouse humidity: Increase cross-ventilation fans to prevent powdery mildew and fungal rot.' 
        : 'Greenhouse optimal: Maintain thermal retention and automated irrigation timers.',
      outdoor: rainExpected 
        ? 'Rain forecast: Ensure garden beds have clear drainage channels to prevent waterlogging.' 
        : temp > 33 
        ? 'Heatwave outdoor alert: Apply deep mulch layer around root zones and water before 8 AM.' 
        : 'Outdoor conditions normal: Favorable for general garden maintenance and weeding.',
    };

    return {
      temperature: temp,
      humidity,
      uvIndex,
      precipitation: precip,
      condition,
      rainExpected,
      locationName,
      adjustmentPercentage: adjustment,
      wateringAdvice: advice,
      environmentRecommendations: envRecs,
    };
  } catch (err) {
    return {
      temperature: 29.5,
      humidity: 68,
      uvIndex: 7,
      precipitation: 0,
      condition: 'Tropical Climate',
      rainExpected: false,
      locationName: 'Chennai, Tamil Nadu',
      adjustmentPercentage: 0,
      wateringAdvice: 'Weather service offline. Maintaining standard regional watering schedule.',
      environmentRecommendations: {
        indoor: 'Maintain standard indoor humidity and indirect light.',
        balcony: 'Monitor afternoon sun intensity.',
        greenhouse: 'Check ventilation and soil moisture.',
        outdoor: 'Standard seasonal plant care applies.',
      },
    };
  }
}
