---
title: Athletes
---
# Athletes

`client.athletes` manages the authenticated athlete's profile, training plan, and account-level settings, and lists the athletes the caller follows or coaches. Most routes are scoped to a single athlete; `listAthletes` and `updateAthletePlans` operate across athletes.

## Methods

| Method | What it does |
|---|---|
| {@link AthleteService.getAthlete} | Get athlete information (includes sportSettings and custom_items) |
| {@link AthleteService.updateAthlete} | Update athlete information |
| {@link AthleteService.getTrainingPlan} | Get the athlete's training plan |
| {@link AthleteService.updateTrainingPlan} | Change the athlete's training plan |
| {@link AthleteService.updateAthletePlans} | Change training plans for a list of athletes |
| {@link AthleteService.getProfile} | Get athlete profile (public info, shared folders, custom items) |
| {@link AthleteService.getSummary} | Summary information (training load, fitness, categories) for the athlete and followed athletes over a date range |
| {@link AthleteService.listAthletes} | Athletes the caller follows or coaches, including the caller |
| {@link AthleteService.getConnections} | Which devices and platform apps the athlete has connected |
| {@link AthleteService.getSettings} | UI settings for a device class (a map of setting groups, each an open object) |
| {@link AthleteService.disconnectApp} | Disconnect the OAuth app that owns the current access token from the athlete's account |

## Examples

### Summary, connections and device settings

Pull the 90-day fitness/fatigue/form summary, list which devices and apps are connected, and read the desktop UI settings.

{@includeCode ../../../examples/athletes/summary-and-connections.ts#main}

### Coached athletes

List the athletes the API key's owner follows or coaches, then fetch one other athlete's profile.

{@includeCode ../../../examples/athletes/coached-athletes.ts#main}

## Behaviour notes

- {@link AthleteService.listAthletes} requires API-key authentication; it is not available to OAuth app tokens. See [API behaviour](../api-behaviour.md).
- {@link AthleteService.disconnectApp} is irreversible from the API, and the SDK never calls it in its own live tests.
- See [API behaviour](../api-behaviour.md) for the cross-service list.
