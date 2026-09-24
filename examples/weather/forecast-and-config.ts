/**
 * Fetch the athlete's weather forecast and print the first entry's fields,
 * then fetch the weather configuration (location) used to generate it. Does
 * not change the account: every call is a read.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/weather/forecast-and-config.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const weather = await client.weather.getForecast();
const first = weather.forecasts?.[0];
if (!first) {
  console.log('No forecast available for this athlete');
} else {
  console.log(`Forecast for ${first.time ?? 'unknown time'}: temp=${first.temp ?? 'n/a'} feels_like=${first.feels_like ?? 'n/a'} humidity=${first.humidity ?? 'n/a'}`);
}

const config = await client.weather.getWeatherConfig();
console.log(`Location: ${config.location_name ?? 'not set'} (${config.latitude ?? 'n/a'}, ${config.longitude ?? 'n/a'})`);
// #endregion main
