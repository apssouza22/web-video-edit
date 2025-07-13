# Implement PlayerLayer Interactive Transformations

## Task Overview
Implement comprehensive interactive transformation capabilities for PlayerLayer including visual boundaries, corner handles, and event listeners for position, scale, and rotation transformations.

## Implementation Steps

- [x] Analyze current PlayerLayer structure and layer frame properties
- [x] Implement visual layer boundary marking with selection indicators
- [x] Add transformation handles (corner resize handles and rotation handle)
- [x] Implement pointer event system for interactive transformations
- [x] Add transformation logic for move, scale, and rotate operations
- [x] Integrate transformation updates with layer frame properties
- [x] Add visual feedback during transformations (live preview)
- [x] Test integration with existing player and studio systems
- [x] Add proper cleanup and event management
- [x] Document the new transformation API

## Key Features to Implement
- **Visual Boundaries**: Highlight selected layers with border and handles
- **Corner Handles**: 8 resize handles (4 corners + 4 edges) for scaling
- **Rotation Handle**: Dedicated handle for rotation transformations
- **Move Operation**: Click and drag layer content for repositioning
- **Live Preview**: Real-time visual feedback during transformations
- **Frame Integration**: Update layer's frame properties (x, y, scale, rotation)

## Technical Requirements
- Follow PascalCase class naming and # private methods
- Use event-driven architecture for transformation callbacks
- Maintain compatibility with existing layer system
- Support all layer types (Video, Image, Text, Audio visualization)
- Proper cleanup of event listeners and resources

## API Documentation

### PlayerLayer Class

The enhanced `PlayerLayer` class provides comprehensive interactive transformation capabilities for video layers.

#### Constructor
```javascript
new PlayerLayer(layer, canvas)
```
- `layer` (StandardLayer): The layer to wrap with transformation capabilities
- `canvas` (HTMLCanvasElement): The player canvas for event handling

#### Properties
- `selected` (boolean): Get/set the selection state of the layer
- `layer` (StandardLayer): Access to the underlying layer

#### Methods

##### setTransformCallback(callback)
Set a callback function to be called when the layer is transformed.
```javascript
playerLayer.setTransformCallback((layer) => {
  console.log('Layer transformed:', layer.name);
});
```

##### markLayerArea(ctx)
Render visual boundaries and transformation handles for selected layers.
```javascript
playerLayer.markLayerArea(canvasContext);
```

##### render(ctx, time, playing)
Render the layer content and transformation UI.
```javascript
playerLayer.render(canvasContext, currentTime, isPlaying);
```

##### destroy()
Clean up event listeners and resources.
```javascript
playerLayer.destroy();
```

#### Handle Types
Static constants for different transformation handle types:
- `RESIZE_NW`, `RESIZE_N`, `RESIZE_NE` - Corner and edge resize handles
- `RESIZE_E`, `RESIZE_SE`, `RESIZE_S` - Edge resize handles  
- `RESIZE_SW`, `RESIZE_W` - Corner and edge resize handles
- `ROTATE` - Rotation handle

### VideoPlayer Integration

#### New Methods

##### setSelectedLayer(layer)
Set the currently selected layer for transformation.
```javascript
player.setSelectedLayer(myLayer);
```

##### getSelectedLayer()
Get the currently selected PlayerLayer.
```javascript
const selectedLayer = player.getSelectedLayer();
```

##### addLayerTransformedListener(listener)
Add a listener for layer transformation events.
```javascript
player.addLayerTransformedListener((layer) => {
  // Handle layer transformation
});
```

### VideoStudio Integration

The Studio class automatically integrates with the transformation system:

#### Automatic Integration
- Layer selection in timeline automatically enables transformation UI
- Transformations are reflected in timeline rendering
- All layer types support transformation (Video, Image, Text)

#### Usage Example
```javascript
// Select a layer for transformation
studio.setSelectedLayer(myLayer);

// The layer will now show transformation handles
// Users can drag to move, resize with corner handles, or rotate
```

### Transformation Operations

#### Move Operation
- **Trigger**: Click and drag within layer bounds
- **Cursor**: `move`
- **Updates**: Layer's `x` and `y` frame properties

#### Resize Operations
- **Trigger**: Click and drag resize handles (8 total)
- **Cursors**: `nw-resize`, `n-resize`, `ne-resize`, etc.
- **Updates**: Layer's `scale` property with aspect ratio preservation
- **Minimum Scale**: 0.1 (10% of original size)

#### Rotation Operation
- **Trigger**: Click and drag rotation handle (circular, above layer)
- **Cursor**: `grab`
- **Updates**: Layer's `rotation` property in degrees
- **Visual**: Connected to layer with a line

### Event Flow

1. **Pointer Down**: Hit test determines transformation type
2. **Pointer Move**: Performs real-time transformation calculations
3. **Layer Update**: Updates layer's frame properties via `layer.update()`
4. **Callback**: Triggers transformation callback for external handling
5. **Pointer Up**: Completes transformation and resets cursor

### Visual Feedback

#### Selection Indicators
- **Border**: Dashed blue outline (`#00aaff`)
- **Handles**: Blue squares with white borders
- **Rotation Handle**: Blue circle connected by line

#### Cursors
- Dynamic cursor changes based on hover position
- Appropriate resize cursors for each handle direction
- Move cursor for layer content area
- Grab cursor for rotation handle

### Performance Considerations

- **Event Delegation**: Single event listener per canvas
- **Hit Testing**: Efficient rectangular collision detection
- **Render Caching**: Leverages existing layer render caching
- **Coordinate Conversion**: Proper canvas-to-client coordinate mapping
- **Memory Management**: Proper cleanup of event listeners

### Browser Compatibility

- **Pointer Events**: Uses modern Pointer API for unified touch/mouse handling
- **Canvas 2D**: Standard Canvas 2D API for rendering
- **ES6+ Features**: Private fields (#) and modern JavaScript syntax
- **Event Handling**: Passive event listeners where appropriate
