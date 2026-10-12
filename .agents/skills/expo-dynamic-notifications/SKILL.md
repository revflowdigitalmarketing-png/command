---
name: expo-dynamic-notifications
description: >-
  Dynamic Island–style notification overlay and deadline reminder engine.
  Provides animated in-app notifications with customizable avatars, symbols,
  duration, actions, and configurable deadline lead-time alerts (hours before deadlines, day before posts).
---

# Expo Dynamic Notifications Skill

This skill defines the specifications, API contract, and behavior for Dynamic Island–style in-app notifications and scheduled deadline reminders, based on the `rit3zh/expo-dynamic-notifications` architecture.

## Repository Reference
The standalone upstream repository is preserved separately in:
`./repo/` (relative to this skill directory).

## Architecture & API Contract

### Notification Object (`IDynamicNotification`)
- `id` (string): Unique identifier for the notification.
- `title` (string): Primary bold heading.
- `message` (string): Secondary explanatory text.
- `avatar` (string, optional): Image URL or letter initial displayed on the left.
- `symbol` (string, optional): Icon indicator (e.g. clock, check, alert, spark).
- `accent` (string, optional): Foreground accent tint (defaults to app design tokens).
- `duration` (number | null, optional): Lifetime in ms (e.g. `4000`), or `null` for persistent until user interaction.
- `onPress` (function, optional): Callback executed when user taps the dynamic island card.
- `deadline` (string | number, optional): Target due date/time associated with the reminder.

### Core Methods
- `trigger(notification)`: Display an animated dynamic island notification. If one is already showing, smoothly morph or queue.
- `dismiss(id?)`: Smoothly retract the notification back into the dynamic island pill.
- `checkUpcomingDeadlines()`: Periodically evaluate pending tasks, deliverables, and promises against user-configured alert lead times.
- `checkContentCalendarReminders()`: Modular stub hook reserved for interpreting client content calendar files once separate instructions are provided.

### Configurable Preferences
- `hoursBeforeDeadline`: Number of hours prior to a due date to trigger an alert (e.g. 1h, 2h, 4h, 12h, 24h).
- `dayBeforePost`: Boolean toggle to alert 1 day prior to scheduled content posts.
- `browserNotifications`: Permission state for HTML5 desktop alerts.
