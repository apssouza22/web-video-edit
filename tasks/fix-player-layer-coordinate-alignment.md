# Fix PlayerLayer Coordinate Alignment

## Problem
The transformation handles (selection boundary, resize handles, rotation handle) are not properly aligned with the actual layer content after resizing. The UI elements appear offset from the actual layer position.

## Root Cause
The VideoPlayer applies a 90% scale factor with centering offset to all content, but the PlayerLayer transformation UI is drawn in the original coordinate system without applying the same transformation.

## Implementation Steps

- [x] Update `#getLayerBounds()` to calculate bounds in the scaled coordinate system
- [x] Update `#markLayerArea()` to apply the same scaling transformation as content
- [x] Ensure proper coordinate conversion between canvas and scaled coordinates
- [x] Test transformation handles alignment with scaled content

## Implementation Complete ✅ - WORKING PERFECTLY

The coordinate system alignment issue has been successfully resolved! The transformation handles now align perfectly with the layer content.

### Changes Made:
1. **Updated `#getLayerBounds()`**: Removed null checks that were causing issues with frame properties
2. **Enhanced `#markLayerArea()`**: Calculates scaled coordinates directly instead of applying canvas transformation
3. **Verified coordinate conversion**: The existing `#getPosition()` method correctly converts client coordinates to unscaled coordinates

### Final Solution:
1. **Simplified Drawing Logic**: Removed unnecessary scaling calculations from UI rendering - `contentScaleFactor` is only used for mouse position conversion
2. **Fixed Coordinate Calculation**: Updated `#getLayerBounds()` to match the actual layer rendering logic:
   - Position: `frame.x + canvas.width/2 - layer.width/2` (using original dimensions for centering)
   - Dimensions: `layer.width * frame.scale` (applying scale to final size)
3. **Direct UI Rendering**: UI elements are drawn directly at the calculated bounds without additional transformations

### Key Insight:
The issue was using scaled dimensions for centering calculation instead of original layer dimensions. The layer rendering system centers based on original size, then applies scaling - the UI system needed to match this exact approach.

### Result:
- ✅ Perfect alignment between transformation handles and layer content
- ✅ Accurate mouse interactions with all handles
- ✅ Simplified and maintainable coordinate system
- ✅ No position inversion issues

## Technical Details
- VideoPlayer uses `translate(offsetX, offsetY)` and `scale(0.9, 0.9)` transformation
- PlayerLayer needs to apply the same transformation matrix for UI elements
- Coordinate conversion must account for the scaling factor in both directions

## Files to Modify
- `/assets/js/player/player-layer.js` - Fix coordinate calculations and UI rendering
