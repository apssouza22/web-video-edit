# Timeline Layer Reordering Implementation

## Task: Implement drag-and-drop layer reordering in timeline

### Implementation Steps:

- [x] **Step 1: Create LayerReorderHandler Class**
  - [x] Create `/assets/js/timeline/layer-reorder-handler.js`
  - [x] Implement vertical drag detection and drop zone calculation
  - [x] Add visual feedback methods for drop zones and layer preview
  - [x] Use private methods with # prefix following coding standards

- [x] **Step 2: Enhance DragLayerHandler**
  - [x] Add vertical drag mode detection to existing drag.js
  - [x] Implement mode switching between horizontal (time) and vertical (reorder) dragging
  - [x] Integrate LayerReorderHandler for vertical operations
  - [x] Maintain backward compatibility with existing functionality

- [x] **Step 3: Update Timeline Class**
  - [x] Add layer reordering methods to timeline.js
  - [x] Implement visual feedback rendering for drop zones
  - [x] Update event handling to support vertical drag operations
  - [x] Add layer array reordering functionality

- [x] **Step 4: Create Visual Feedback System**
  - [x] Implement drop zone indicators between layers
  - [x] Add layer ghost/preview during drag operation
  - [x] Create smooth visual transitions
  - [x] Add CSS styles for drag feedback

- [x] **Step 5: Integration and Testing**
  - [x] Connect with studio layer management system
  - [x] Ensure synchronization between timeline and sidebar views
  - [x] Test edge cases and performance
  - [x] Verify proper layer order persistence

### Expected Behavior:
- Users can drag layers vertically in timeline to reorder them
- Visual feedback shows valid drop zones between layers
- Layer order changes are reflected in both timeline and sidebar
- Horizontal dragging for time adjustment remains unchanged
- Smooth animations and visual feedback during drag operations
