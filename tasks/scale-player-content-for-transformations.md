# Scale Player Content for Transformations

## Objective
Scale all content drawn in the player context by 90% (10% reduction) to create space around the content for layer transformation handles and UI elements.

## Implementation Steps

- [x] Add scale factor property to VideoPlayer class
- [x] Modify renderLayers() method to apply scaling transformation
- [x] Center the scaled content within the canvas
- [x] Test transformation handles work correctly with scaled content
- [x] Verify export functionality maintains correct scaling

## Technical Details

### Scale Factor
- Content scale: 0.9 (90% of original size)
- Margin created: 5% on each side (10% total)

### Canvas Transformations
- Apply scale transformation before rendering layers
- Translate to center the scaled content
- Preserve existing DPR scaling

### Compatibility
- Maintain compatibility with existing layer rendering
- Ensure transformation system works with scaled coordinates
- Preserve aspect ratio functionality
