# Web Video Edit

WebVideoEdit is a browser-based video editor that lets you perform basic video edition directly on the browser - no downloads or installations required.
<img src="assets/image.png" alt="Web Video Edit demo" width="500">
## Demo
You can try the demo at [WebEdit Demo](https://apssouza22.github.io/web-video-edit/index.html#https://apssouza22.github.io/web-video-edit/assets/example.json).

## Installation
WebEdit is a web application that uses vanilla JavaScript, HTML, and CSS. 

### Running with npm and http-server
1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to http://localhost:8080

Alternatively, you can use any server, such as Python's built-in HTTP server.

## Testing

This project includes comprehensive unit tests for all service classes using Jest.

### Running Tests

```bash
# Run all tests
npm test

## Features
- Press `space` to pause or play the preview.
- Select layers to manipulate them (click on the Timeline or sidebar).
  - Pinch the screen or trackpad or use `shift + scroll` to enlarge or shrink text and images.
  - Drag to move text and images.
- Importing
  - Drag-n-drop to import videos, images, or audio files.
  - Click the "Media..." button to add videos, images, or audio files.
  - Paste URLs to hosted media (only some domains)
- Exporting
  - Click the "Export" button.
  - Click "Download" to save the `.webm` video.
