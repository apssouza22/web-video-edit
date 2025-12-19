# Landing Page Assets

This directory contains media assets for the landing page.

## Directory Structure

```
assets/landing/
├── screenshots/          # Screenshots from the editor
│   ├── editor-interface.png    # Media upload tab
│   ├── timeline-view.png       # Timeline with clips
│   └── ai-features.png         # AI features (transcription/speech)
├── hero-demo.mp4        # Hero section demo video (10-15s loop)
├── feature-text-edit.gif       # Text-based editing demo
├── feature-ai-tools.gif        # AI tools showcase
├── feature-local.gif           # Local processing demo
└── og-image.png         # Open Graph image for social sharing (1200x630px)
```

## How to Create Assets

### 1. Screenshots

Run the editor and capture screenshots:

```bash
npm start
# Navigate to http://localhost:8001/
```

**Recommended screenshots:**
- **editor-interface.png**: Media tab with upload area visible
- **timeline-view.png**: Timeline with multiple video/audio tracks
- **ai-features.png**: Transcription or Speech tab showing AI features

**Tips:**
- Use full editor view at 1920x1080 or similar
- Ensure content is visible and professional-looking
- Crop to focus on relevant UI elements
- Optimize images (use WebP with PNG fallback)

### 2. Demo Video (hero-demo.mp4)

Create a short video showing the editor in action:

**Content:**
- Upload a video file
- Show transcript generation
- Demonstrate text-based editing
- Add text overlay or effect
- Preview the result

**Specifications:**
- Duration: 10-15 seconds
- Format: MP4 (H.264)
- Resolution: 1920x1080 or 1280x720
- Should loop seamlessly
- Optimize for web (use ffmpeg or similar)

**Example ffmpeg optimization:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k hero-demo.mp4
```

### 3. Feature GIFs (Optional)

Create animated GIFs showcasing specific features:

**feature-text-edit.gif:**
- Show transcription appearing
- Demonstrate deleting words from transcript
- Show video updating accordingly

**feature-ai-tools.gif:**
- Show TTS voice synthesis
- Demonstrate video search
- Show AI analysis results

**feature-local.gif:**
- Show timeline editing
- Multiple tracks in action
- Real-time preview

**Tips:**
- Keep file size under 5MB per GIF
- Use tools like ScreenToGif, LICEcap, or Kap
- Optimize with gifski or similar tools

### 4. Open Graph Image (og-image.png)

Create a social sharing image:

**Specifications:**
- Size: 1200x630px
- Format: PNG or JPG
- Content: App logo + tagline + screenshot
- Should look good on Facebook, Twitter, LinkedIn

**Content suggestions:**
- "Smart WebVideoFlow" title
- "Edit Videos Like You Edit Text"
- Screenshot of the editor
- Key features or icons

## Placeholder Status

Currently, the landing page uses placeholders for media:

- ✅ Hero demo: Using CSS placeholder (ready for video)
- ✅ Feature cards: Using inline SVG icons
- ❌ Step visuals: Using SVG icons (screenshots recommended)
- ❌ Open Graph image: Not yet created

## Next Steps

1. Capture screenshots from the running editor
2. Create hero demo video showing key workflow
3. (Optional) Create animated GIFs for feature cards
4. Create Open Graph image for social sharing
5. Optimize all assets for web delivery

## Asset Guidelines

- **Images**: Use WebP with PNG/JPG fallback
- **Videos**: Use MP4 (H.264) with appropriate compression
- **GIFs**: Keep under 5MB, use modern formats like WebP animation if possible
- **File names**: Use kebab-case, descriptive names
- **Alt text**: Update HTML with descriptive alt text for accessibility

## Current Landing Page Status

The landing page is **functional** with placeholders. Adding real screenshots and demo videos will significantly enhance the user experience and conversion rate.
