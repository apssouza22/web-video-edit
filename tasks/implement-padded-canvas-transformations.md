# Implement Padded Canvas for Video Transformations

## Overview
Implement padding for the player canvas to allow video layers to be transformed beyond the visible canvas area while maintaining the same visible video canvas size.

## Implementation Steps

- [x] Create PaddedCanvasManager service for managing padded canvas system with viewport calculations
- [x] Update VideoPlayer class to use padded canvas with viewport rendering
- [x] Update PlayerLayer class to adjust coordinate calculations for padded canvas system  
- [ ] Update CSS styles for canvas container with overflow handling
- [ ] Test integration to ensure transformations work correctly with padding

## Technical Requirements

### PaddedCanvasManager Features:
- Manage padded canvas dimensions (e.g., 2x or 3x the visible size)
- Calculate viewport offset for centering visible area
- Provide coordinate conversion methods between padded and visible coordinates
- Handle canvas resizing with proper padding maintenance

### VideoPlayer Updates:
- Use padded canvas for rendering but only show viewport area
- Implement viewport clipping for visible area
- Update coordinate system for event handling
- Maintain backward compatibility with existing layer system

### PlayerLayer Updates:
- Adjust hit testing for padded coordinate system
- Update transformation calculations for extended canvas area
- Ensure handles and selection UI work correctly with padding
- Maintain proper coordinate conversion for transformations

### CSS Updates:
- Canvas container with overflow hidden for viewport effect
- Proper positioning for padded canvas within visible area
- Responsive design maintenance with aspect ratio support

## Expected Benefits:
- Video layers can be scaled/moved beyond visible canvas boundaries
- Smooth transformations without clipping at canvas edges
- Better user experience for video editing and positioning
- Maintains existing visible canvas size and aspect ratios
