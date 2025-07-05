# Frame Object Management Improvement

## Task: Replace Float32Array with Frame Objects in FrameService

### Implementation Steps:

- [x] Create a new `Frame` class with properties: x, y, scale, rotation, anchor, frame
- [x] Update the `FrameService` to use an array of Frame objects instead of Float32Array
- [x] Update all frame operations (interpolation, getFrame, etc.) to work with the new Frame objects
- [x] Ensure backward compatibility and maintain all existing functionality
- [ ] Update tests to work with the new Frame structure

### Benefits:
- Better code readability with named properties instead of array indices
- Type safety and better IDE support
- Easier to extend with additional frame properties
- More maintainable and self-documenting code
