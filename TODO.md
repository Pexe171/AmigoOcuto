# TODO: Add drawDateTime and moderatorEmail to events with scheduled email reminders

## Backend Changes
- [ ] Update database schema: Add `drawDateTime` (DATETIME) and `moderatorEmail` (TEXT) columns to events table in `server/src/config/sqliteDatabase.ts`.
- [ ] Update `EventRecord` interface in `server/src/database/eventRepository.ts` to include `drawDateTime` and `moderatorEmail`.
- [ ] Update repository functions (`insertEvent`, `updateEvent`) in `server/src/database/eventRepository.ts` to handle new fields.
- [ ] Modify `eventSchema` and `createEvent` in `server/src/services/eventService.ts` to accept and validate `drawDateTime` and `moderatorEmail`.
- [ ] Add node-cron dependency to `server/package.json` and install it.
- [ ] Create `sendDrawReminderEmail` function in `server/src/services/emailService.ts` for sending reminder emails to moderators.
- [ ] Add function to get events needing reminders in `server/src/database/eventRepository.ts`.
- [ ] Set up cron job in `server/src/server.ts` to check every minute and send reminders for events where drawDateTime has passed.

## Testing
- [ ] Test: Create an event with drawDateTime and moderatorEmail, simulate time passing, verify reminder email is sent.
