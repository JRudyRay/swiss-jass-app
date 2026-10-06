# 🎯 Quick Visual Testing Checklist

**Print this and check off as you test!**

---

## ✅ 1. Error Boundary (5 min)

### Setup
```javascript
// In browser console:
localStorage.setItem('jassUser', '{invalid}');
location.reload();
```

### Check
- [ ] See ⚠️ icon
- [ ] See "Oops! Something went wrong" title  
- [ ] See friendly error message
- [ ] See "Try Again" button
- [ ] See "Go Home" button
- [ ] Technical details are collapsible
- [ ] Click "Try Again" works
- [ ] Click "Go Home" works

### Cleanup
```javascript
localStorage.clear();
location.reload();
```

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 2. Loading - Game Creation (5 min)

### Steps
1. Login
2. Play game to 1000 points (or set to 100)
3. Click "Play Again"

### Check
- [ ] Button shows spinner
- [ ] Shows "Creating..." text
- [ ] Button is disabled
- [ ] Opacity reduces to 0.7
- [ ] Cursor is "not-allowed"
- [ ] Spinner rotates smoothly
- [ ] Button returns to normal

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 3. Loading - Table Creation (3 min)

### Steps
1. Go to Tables tab
2. Click "Create table"

### Check
- [ ] Button shows "Creating…"
- [ ] Button is disabled
- [ ] Background grays out
- [ ] Returns to normal after creation

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 4. Loading - Friends Refresh (3 min)

### Steps
1. Go to Friends tab
2. Click "Refresh"

### Check
- [ ] Loading component appears
- [ ] Large spinner visible
- [ ] "Loading friends..." text shows
- [ ] Spinner rotates continuously
- [ ] Text pulses (fades in/out)
- [ ] Centered layout

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 5. Empty State - Tables (3 min)

### Steps
1. Fresh account or delete tables
2. Go to Tables tab

### Check
- [ ] See 🎴 icon (large)
- [ ] See "No Active Tables" title
- [ ] See helpful description
- [ ] See "+ Create First Table" button
- [ ] Button creates table when clicked
- [ ] Empty state disappears after creation

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 6. Empty State - Friends (3 min)

### Steps
1. Fresh account or no friends
2. Go to Friends tab

### Check
- [ ] See 👥 icon
- [ ] See "No Friends Yet" title
- [ ] See helpful description
- [ ] Layout is centered
- [ ] Matches table empty state style

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 7. Animations (5 min)

### Spinner
- [ ] Rotates smoothly (360° in 0.8s)
- [ ] No stuttering
- [ ] 60fps (check DevTools Performance)

### Pulse Text
- [ ] "Loading..." text fades
- [ ] 2-second cycle
- [ ] Smooth ease-in-out

### Buttons
- [ ] Hover effects smooth
- [ ] 0.2s transition
- [ ] Disabled state correct

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 8. Keyboard Navigation (5 min)

### Test
1. Use Tab key only (no mouse)
2. Navigate error boundary
3. Navigate buttons

### Check
- [ ] Tab moves between elements
- [ ] Focus indicators visible
- [ ] Enter activates buttons
- [ ] No keyboard traps
- [ ] Logical tab order

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 9. Mobile Responsive (5 min)

### Test DevTools → Device Toolbar
- **iPhone SE (375px)**:
  - [ ] Error screen fits
  - [ ] Buttons tap-friendly (44px)
  - [ ] Text readable
  - [ ] No horizontal scroll

- **iPad (768px)**:
  - [ ] Layout adjusts
  - [ ] Spacing appropriate
  - [ ] Buttons sized well

- **Desktop (1920px)**:
  - [ ] Not too wide
  - [ ] Centered properly
  - [ ] Max-width works

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## ✅ 10. Color Contrast (3 min)

### Check (DevTools → Elements → Styles)
- [ ] Error title: contrast ≥4.5:1
- [ ] Error message: contrast ≥4.5:1
- [ ] Button text: contrast ≥4.5:1
- [ ] Loading text: contrast ≥4.5:1

**Time**: _____ min  
**Result**: ☐ Pass ☐ Fail  
**Notes**: _________________________________

---

## 📊 TOTAL SCORE

**Tests Passed**: ____ / 10  
**Total Time**: ____ minutes  
**Overall**: ☐ PASS ☐ FAIL

---

## 🐛 BUGS FOUND

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## 💡 IMPROVEMENTS

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## ✍️ SIGN-OFF

**Tester**: ________________  
**Date**: October 4, 2025  
**Status**: ☐ Approved ☐ Needs Work

---

## 🎯 Next Steps

If all tests pass:
- [ ] Document any minor issues
- [ ] Proceed to Phase 2 or Quick Wins
- [ ] Update CHANGELOG.md

If tests fail:
- [ ] Fix critical bugs first
- [ ] Re-test affected areas
- [ ] Update components as needed

---

**Good luck with testing!** 🚀
