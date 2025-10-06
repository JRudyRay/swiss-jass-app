# 🎨 Card Image System Upgrade

## What Changed

The Swiss Jass app now supports **authentic card images** with automatic SVG fallback!

### New Features

1. **Real Card Images** 
   - Use actual Swiss Jass card images from https://jassverzeichnis.ch
   - PNG format with proper naming convention
   - Automatic fallback to SVG graphics if images not found

2. **Smart Loading**
   - Image loading state with "Loading..." indicator
   - Error handling with automatic SVG fallback
   - No broken images - always shows something

3. **Download Helper Script**
   - Run `npm run check-cards` to verify downloaded images
   - Shows progress: "Found: 12/36 (33%)"
   - Lists missing files

## How to Use Real Card Images

### Step 1: Download Images

1. Visit: https://jassverzeichnis.ch/deutsche-jasskarten/
2. For each card:
   - Right-click the card image
   - Select "Save image as..."
   - Save to `web/public/assets/cards/`
   - Use naming format: `{suit}_{rank}.png`

### Step 2: Name Files Correctly

**Examples:**
- Eichel Ass → `eicheln_A.png`
- Schellen König → `schellen_K.png`  
- Rosen Zehner → `rosen_10.png`
- Schilten Under → `schilten_U.png`

**All 36 required files:**

```
eicheln_A.png   eicheln_K.png   eicheln_O.png   eicheln_U.png
eicheln_10.png  eicheln_9.png   eicheln_8.png   eicheln_7.png   eicheln_6.png

rosen_A.png     rosen_K.png     rosen_O.png     rosen_U.png
rosen_10.png    rosen_9.png     rosen_8.png     rosen_7.png     rosen_6.png

schellen_A.png  schellen_K.png  schellen_O.png  schellen_U.png
schellen_10.png schellen_9.png  schellen_8.png  schellen_7.png  schellen_6.png

schilten_A.png  schilten_K.png  schilten_O.png  schilten_U.png
schilten_10.png schilten_9.png  schilten_8.png  schilten_7.png  schilten_6.png
```

### Step 3: Verify Download

```bash
cd web
npm run check-cards
```

**Expected output:**
```
🃏 Swiss Jass Card Image Checker

═══════════════════════════════════════════════════════════

📋 Expected Files (36 total):

✅ eicheln_A.png
✅ eicheln_K.png
✅ eicheln_O.png
...
❌ schilten_6.png - MISSING

═══════════════════════════════════════════════════════════

📊 Summary:
   Found: 30/36
   Missing: 6/36
   Progress: 83%
```

### Step 4: Test in Browser

1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Cards should show real images!

## Technical Details

### File Structure

```
web/
├── public/
│   └── assets/
│       └── cards/
│           ├── README.md (download instructions)
│           ├── .gitkeep (ensures folder exists)
│           ├── eicheln_A.png
│           ├── eicheln_K.png
│           └── ... (36 total)
├── src/
│   ├── SwissCard.tsx (updated with image support)
│   └── components/
│       └── SwissCardSVG.tsx (fallback graphics)
└── scripts/
    └── check-card-images.js (verification tool)
```

### How It Works

```typescript
// SwissCard.tsx automatically:
1. Try to load PNG image from /assets/cards/{suit}_{rank}.png
2. Show "Loading..." while image loads
3. If image fails → automatically switch to SVG fallback
4. User never sees broken images!
```

### SVG Fallback

Even without downloaded images, the game works perfectly using SVG graphics:
- ✅ All suits render correctly (Eicheln, Schellen, Rosen, Schilten)
- ✅ Court figures shown (Unter, Ober, König)
- ✅ Authentic Swiss styling
- ✅ Fully playable

## Image Specifications

**Recommended:**
- Format: PNG with transparency
- Size: 300x450px (2:3 aspect ratio)
- Quality: High resolution
- File size: < 200KB per card

**Optimization:**
```bash
# Optional: Compress images
npm install -g imagemin-cli imagemin-pngquant
cd web/public/assets/cards
imagemin *.png --plugin=pngquant --out-dir=.
```

## License & Attribution

**Source**: https://jassverzeichnis.ch/deutsche-jasskarten/
**Credit**: Schweizer Jassverzeichnis

⚠️ **Important**: 
- Check website terms of use before commercial use
- Add attribution footer: "Card images: Schweizer Jassverzeichnis"
- Consider purchasing official cards for commercial projects

## Troubleshooting

**Images not showing?**
1. Check browser console for 404 errors
2. Verify filenames match exactly (case-sensitive!)
3. Ensure files are in `public/assets/cards/` folder
4. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

**Wrong card showing?**
- Double-check naming: `{suit}_{rank}.png`
- Suit names: `eicheln`, `rosen`, `schellen`, `schilten` (lowercase)
- Ranks: `A`, `K`, `O`, `U`, `10`, `9`, `8`, `7`, `6` (uppercase for letters)

**SVG fallback showing instead?**
- Image file may be corrupt
- Check file extension is `.png` not `.PNG` or `.jpg`
- Verify image size isn't 0 bytes

## Benefits

✅ **Authentic Experience** - Real Swiss Jass cards from professional source
✅ **Offline Ready** - Images cached by browser
✅ **Fast Loading** - Small PNG files load quickly
✅ **Graceful Degradation** - SVG fallback ensures game always works
✅ **Easy Updates** - Replace any card image without code changes

## Future Enhancements

- [ ] Card back design for face-down cards
- [ ] Multiple card deck themes (French vs. German)
- [ ] High-DPI retina images (@2x variants)
- [ ] WebP format for even smaller files
- [ ] Animated card flip transitions
