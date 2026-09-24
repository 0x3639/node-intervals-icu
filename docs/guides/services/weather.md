---
title: Weather
---
# Weather

`client.weather` reads the athlete's weather forecast and manages the location used to generate it. All routes are athlete-scoped.

## Methods

| Method | What it does |
|---|---|
| {@link WeatherService.getForecast} | Get weather forecast for the athlete's location |
| {@link WeatherService.getWeatherConfig} | Get weather configuration (location) |
| {@link WeatherService.updateWeatherConfig} | Update weather configuration (set location) |

## Examples

### Forecast and config

Fetch the athlete's weather forecast and print the first entry's fields, then fetch the weather configuration used to generate it.

{@includeCode ../../../examples/weather/forecast-and-config.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
