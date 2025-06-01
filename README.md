# Web Video Edit

WebVideoEdit is a browser-based video editor that lets you perform basic video edition directly on the browser - no downloads or installations required.

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

## Credits
This project couldn't have been done without the excellent work of Bram Wasti and their projects 'mebm' and 'jott'.

To get the source code for Bram Wasti's 'mebm', visit [the GitHub repository](https://github.com/bwasti/mebm/).