# DOM Setup Checklist for Studio Tests

Quick reference for setting up DOM elements required by external dependencies.

## Essential Elements (Required for VideoStudio)

```javascript
beforeEach(() => {
  document.body.innerHTML = `
    <!-- Canvas -->
    <div id="video-canvas"></div>
    
    <!-- Timeline -->
    <div id="timeline_content"></div>
    
    <!-- Timeline Preview -->
    <div id="cursor_preview" style="display: none;">
      <canvas width="100" height="100"></canvas>
      <div></div>
    </div>
    
    <!-- Timeline Buttons -->
    <button id="delete-button">Delete</button>
    <button id="split-button">Split</button>
    <button id="clone-button">Clone</button>
    
    <!-- Timeline Zoom -->
    <input id="timeline_zoom_slider" type="range" min="1" max="10" value="2" />
    
    <!-- Export -->
    <button id="export">Export</button>
    
    <!-- Other UI -->
    <div id="header"></div>
    <div id="layers"></div>
    <div id="speed-control-item"></div>
    <input id="filepicker" type="file" />
    
    <!-- Loading Popup -->
    <div id="loading-popup" style="display: none;">
      <div id="loading-title">Loading Media...</div>
      <div id="loading-current-file"></div>
      <div id="loading-progress-fill" style="width: 0%;"></div>
      <div id="loading-progress-text">0%</div>
    </div>
  `;
});
```

## Browser API Mocks

```javascript
// Prevent infinite animation loops
global.requestAnimationFrame = jest.fn((callback) => 1) as any;

// Mock dialogs
global.alert = jest.fn();

// Mock fetch for loading projects
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([])
  })
) as any;
```

## Quick Validation

✅ **Canvas Package**
- [ ] `#video-canvas` exists

✅ **Timeline Package**  
- [ ] `#timeline_content` exists
- [ ] `#cursor_preview` exists with `<canvas>` and `<div>` children
- [ ] Timeline buttons exist: `#delete-button`, `#split-button`, `#clone-button`
- [ ] `#timeline_zoom_slider` exists (optional but recommended)

✅ **Studio UI**
- [ ] `#export` button exists
- [ ] `#filepicker` input exists
- [ ] `#loading-popup` and children exist

## Common Errors and Fixes

### Error: "Cannot read properties of null (reading 'querySelector')"
**Cause:** Missing DOM element or incorrect parent-child relationship

**Fix:** Check that:
1. Element ID is spelled correctly
2. Parent element contains required children
3. Element is added in `beforeEach()` before creating component

### Error: "Cannot read properties of null (reading 'addEventListener')"
**Cause:** Missing button or input element

**Fix:** Ensure all timeline buttons and controls are present

### Error: Canvas context errors
**Cause:** Missing canvas element or incorrect structure

**Fix:** Ensure `#cursor_preview` contains a `<canvas>` element

## By Package

### @/canvas → Needs:
- `#video-canvas`

### @/timeline → Needs:
- `#timeline_content`
- `#cursor_preview` (with canvas + div)
- `#delete-button`, `#split-button`, `#clone-button`
- `#timeline_zoom_slider`

### @/media → Needs:
- No direct DOM requirements

### @/video/muxer → Needs:
- No direct DOM requirements

### @/transcription → Needs:
- No direct DOM requirements

## See Also

- **[EXTERNAL-DEPENDENCIES.md](./EXTERNAL-DEPENDENCIES.md)** - Complete reference
- **[MOCKING-STRATEGY.md](./MOCKING-STRATEGY.md)** - Mocking strategy
- **[README.md](./README.md)** - General test documentation

