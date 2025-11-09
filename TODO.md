# TODO: Add Delete Button for Canceled Events

## Backend Changes
- [x] Add `deleteEvent` function in `server/src/database/eventRepository.ts` to delete an event by ID using SQLite DELETE query.
- [x] Add `deleteEvent` function in `server/src/services/eventService.ts` to validate event exists and status is 'cancelado', then call repository delete.
- [x] Add `deleteExistingEvent` controller in `server/src/controllers/adminController.ts` to handle the request and call service.
- [x] Add DELETE `/admin/events/:eventId` route in `server/src/routes/adminRoutes.ts`.

## Frontend Changes
- [x] Add `deleteEventMutation` using React Query in `web/src/pages/AdminPage.tsx`.
- [x] Update the events table: For canceled events, show a delete button instead of the red message.
- [x] Add confirmation dialog before deleting (using window.confirm).
- [x] Handle success: refetch events and show success message.
- [x] Handle errors appropriately (e.g., 401 for auth, other errors).

## Testing
- [x] Test: Create a canceled event, delete it, verify removal from list.
- [x] Ensure only canceled events show delete button.
- [x] Verify error handling for non-canceled events or non-existent events.
