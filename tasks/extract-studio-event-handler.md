# Extract Studio Event Handler

Task: Create a new class and move all the event setup from the studio.ts into the new class

## Implementation Steps

- [ ] Create `StudioEventHandler` class in `src/studio/studio-event-handler.ts`
  - [ ] Add private fields for eventBus and eventUnsubscribers
  - [ ] Add constructor accepting VideoStudio instance
  - [ ] Add init() method to set up all event listeners
  - [ ] Add destroy() method to clean up subscriptions

- [ ] Move event handling logic from `VideoStudio` to `StudioEventHandler`
  - [ ] Move all event bus subscriptions from `#setupEventBusListeners()`
  - [ ] Keep business logic methods in `VideoStudio` (make them public where needed)

- [ ] Update `VideoStudio` class to use `StudioEventHandler`
  - [ ] Remove `#eventBus` and `#eventUnsubscribers` fields
  - [ ] Add `eventHandler` field
  - [ ] Initialize `eventHandler` in constructor
  - [ ] Update `destroy()` method to call handler's destroy
  - [ ] Remove `#setupEventBusListeners()` method

- [ ] Verify the refactoring works correctly


