# Swiss Jass Card Images

## 📥 Downloading Card Images from jassverzeichnis.ch

### Manual Download Instructions

1. **Visit the card images page**: https://jassverzeichnis.ch/deutsche-jasskarten/

2. **Download each card image**:
   - Right-click on each card image
   - Select "Save image as..."
   - Save to this directory (`web/public/assets/cards/`)

3. **Naming Convention** (use these exact filenames):

   **Eicheln (Acorns)**:
   - `eicheln_A.png` - Ass (Ace)
   - `eicheln_K.png` - König (King)
   - `eicheln_O.png` - Ober (Officer)
   - `eicheln_U.png` - Under (Jack/Buur)
   - `eicheln_10.png` - Banner/Zehner (10)
   - `eicheln_9.png` - Neuner (9)
   - `eicheln_8.png` - Achter (8)
   - `eicheln_7.png` - Siebner (7)
   - `eicheln_6.png` - Sechser (6)

   **Rosen (Roses)**:
   - `rosen_A.png`
   - `rosen_K.png`
   - `rosen_O.png`
   - `rosen_U.png`
   - `rosen_10.png`
   - `rosen_9.png`
   - `rosen_8.png`
   - `rosen_7.png`
   - `rosen_6.png`

   **Schellen (Bells)**:
   - `schellen_A.png`
   - `schellen_K.png`
   - `schellen_O.png`
   - `schellen_U.png`
   - `schellen_10.png`
   - `schellen_9.png`
   - `schellen_8.png`
   - `schellen_7.png`
   - `schellen_6.png`

   **Schilten (Shields)**:
   - `schilten_A.png`
   - `schilten_K.png`
   - `schilten_O.png`
   - `schilten_U.png`
   - `schilten_10.png`
   - `schilten_9.png`
   - `schilten_8.png`
   - `schilten_7.png`
   - `schilten_6.png`

   **Total: 36 card images**

4. **Card Back** (optional):
   - `card_back.png` - Design for face-down cards

### Alternative: Use Browser Developer Tools

1. Open https://jassverzeichnis.ch/deutsche-jasskarten/ in Chrome/Firefox
2. Open Developer Tools (F12)
3. Go to Network tab
4. Filter by "Images"
5. Refresh the page
6. Find card images in the list
7. Right-click each image → "Open in new tab" → Save

### Image Specifications

- **Format**: PNG (preferred) or JPG
- **Recommended Size**: 300x450px or similar aspect ratio (2:3)
- **Quality**: High resolution for crisp display
- **Transparency**: PNG with transparent background (if available)

## 📜 License & Attribution

**Source**: https://jassverzeichnis.ch/deutsche-jasskarten/
**Credit**: Schweizer Jassverzeichnis

Make sure to:
1. Check the website's terms of use for image licensing
2. Add proper attribution in your app
3. Consider purchasing official cards if for commercial use

## 🔄 After Download

Once you've downloaded all 36 card images:

1. **Verify file structure**:
   ```
   web/public/assets/cards/
   ├── eicheln_A.png
   ├── eicheln_K.png
   ├── eicheln_O.png
   ├── eicheln_U.png
   ├── eicheln_10.png
   ├── eicheln_9.png
   ├── eicheln_8.png
   ├── eicheln_7.png
   ├── eicheln_6.png
   ├── rosen_A.png
   ├── ... (all 36 cards)
   └── card_back.png (optional)
   ```

2. **Test the images** in the app
3. **Optimize images** (if needed) using tools like:
   - ImageOptim (Mac)
   - TinyPNG (online)
   - imagemin (Node.js)

4. **Update SwissCard.tsx** to use real images instead of SVG placeholders

## 🎨 Fallback Strategy

The app will automatically fall back to SVG graphics if images are not found, ensuring the game works even without downloaded images.
