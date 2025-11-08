# Replace Video Recorder Event Handling with Event Bus

## Task: Refactor user media recorder to use event bus pattern

### Implementation Steps

- [x] Create new `RecordVideoFileCreatedEvent` class in `event-bus.ts`
- [x] Update `record/service.ts` to emit event instead of using callback
- [x] Remove callback listener registration from `record/controls.ts`
- [x] Add event listener in `StudioEventHandler` to handle video file creation
- [x] Test the implementation

