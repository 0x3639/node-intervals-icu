---
title: Services
children:
  - ./services/athletes.md
  - ./services/activities.md
  - ./services/events.md
  - ./services/wellness.md
  - ./services/workouts.md
  - ./services/sport-settings.md
  - ./services/folders.md
  - ./services/gear.md
  - ./services/chats.md
  - ./services/weather.md
  - ./services/routes.md
  - ./services/custom-items.md
  - ./services/shared-events.md
  - ./services/performance.md
  - ./services/search.md
  - ./services/analytics.md
---
# Services

Every API operation is reachable through a service accessor on {@link IntervalsClient}: `client.athletes`, `client.activities`, and so on. Each page below describes one service, lists its methods with links into the reference, and shows a few realistic examples. Athlete-scoped methods take an optional trailing `athleteId`; without it the client's configured athlete (default `'0'`, the authenticated user) is used.
