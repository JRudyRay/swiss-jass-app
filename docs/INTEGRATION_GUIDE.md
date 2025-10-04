# Quick Integration Guide - New UX Components

## How to Use the New Design System

### 1. Victory Modal Integration

Add to `JassGame.tsx`:

```tsx
import VictoryModal from './components/VictoryModal';

// In your component state:
const [showVictory, setShowVictory] = useState(false);
const [winningTeam, setWinningTeam] = useState<number>(1);

// When game ends (replace existing match finished logic):
if (t1 >= maxPoints || t2 >= maxPoints) {
  setWinningTeam(t1 >= maxPoints ? 1 : 2);
  setShowVictory(true);
  setMatchFinished(true);
}

// In your JSX return:
<VictoryModal
  isOpen={showVictory}
  winningTeam={winningTeam}
  teamNames={teamNames}
  finalScores={{ team1: gameState?.scores?.team1 || 0, team2: gameState?.scores?.team2 || 0 }}
  roundHistory={roundHistory}
  onPlayAgain={() => {
    setShowVictory(false);
    startNewGame();
  }}
  onClose={() => {
    setShowVictory(false);
    setTab('rankings');
  }}
/>
```

### 2. Toast Notifications

Add to `JassGame.tsx`:

```tsx
import Toast from './components/Toast';

// In your component state:
const [toast, setToast] = useState<{ message: string; type: 'default' | 'success' | 'error' | 'warning' } | null>(null);

// Replace setMessage() calls with:
setToast({ message: 'Your message here', type: 'success' });

// In your JSX return:
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    duration={3000}
    onClose={() => setToast(null)}
  />
)}

// Examples:
setToast({ message: 'Card played successfully!', type: 'success' });
setToast({ message: 'Invalid move', type: 'error' });
setToast({ message: 'Choose trump first', type: 'warning' });
setToast({ message: 'It\'s your turn', type: 'default' });
```

### 3. Game Header

Replace the existing header in `JassGame.tsx`:

```tsx
import GameHeader from './components/GameHeader';

// Replace your current header JSX with:
<GameHeader
  lang={lang}
  onLangChange={setLang}
  onLogout={handleLogout}
  username={user?.username}
/>
```

### 4. Using CSS Classes

Apply the new design system classes to existing elements:

```tsx
// Glassmorphism effect:
<div className="glassmorphism" style={{ padding: '1rem', borderRadius: '12px' }}>
  Content with blur effect
</div>

// Buttons:
<button className="btn btn-primary">Primary Action</button>
<button className="btn btn-secondary">Cancel</button>
<button className="btn btn-accent">Highlighted</button>
<button className="btn btn-danger">Delete</button>

// Animations:
<div className="fade-in">Fades in on mount</div>
<div className="slide-in-up">Slides up on mount</div>
<div className="scale-in">Scales in on mount</div>

// Card hover effect (if not using game-card class):
<div className="card-hover" style={{ /* your styles */ }}>
  Hovers with elevation
</div>
```

### 5. Score Display Enhancement

Replace score display with new classes:

```tsx
<div className="score-board">
  <div className="score-card team-1">
    <div className="score-label">{teamNames[1]}</div>
    <div className="score-value">{gameState?.scores?.team1 || 0}</div>
    <div className="score-subtitle">Points</div>
  </div>
  
  <div className="score-card team-2">
    <div className="score-label">{teamNames[2]}</div>
    <div className="score-value">{gameState?.scores?.team2 || 0}</div>
    <div className="score-subtitle">Points</div>
  </div>
</div>
```

### 6. Trump Display Enhancement

```tsx
<div className={`trump-display ${!currentTrump ? 'no-trump' : ''}`}>
  <div className="trump-label">Current Trump</div>
  <div className="trump-value">
    {currentTrump && (
      <>
        <span className="trump-symbol">{suitSymbols[currentTrump]}</span>
        <span>{currentTrump.toUpperCase()}</span>
      </>
    )}
    {!currentTrump && <span>Not Selected</span>}
  </div>
</div>
```

### 7. Player Position Cards

For the game table players:

```tsx
<div className="player-position north">
  <div className={`player-info ${gameState?.currentPlayer === northPlayer?.id ? 'active' : ''} ${gameState?.dealer === northPlayer?.id ? 'dealer' : ''}`}>
    <div className="player-name">
      {northPlayer?.name}
      <span className="player-badge">{northPlayer?.id}</span>
    </div>
    <div className="player-stats">
      <span className={`team-badge team-${northPlayer?.team}`}>
        Team {northPlayer?.team}
      </span>
      <span>{northPlayer?.hand?.length || 0} cards</span>
      <span>{getTricksCount(northPlayer)} tricks</span>
    </div>
  </div>
</div>
```

### 8. Game Table with 3D Effect

Wrap your game table in the new container:

```tsx
<div className="game-table-container">
  <div className="game-table">
    {/* Player positions */}
    <div className="player-position north">{/* North player */}</div>
    <div className="player-position south">{/* South player */}</div>
    <div className="player-position west">{/* West player */}</div>
    <div className="player-position east">{/* East player */}</div>
    
    {/* Trick area */}
    <div className="trick-area">
      {/* Current trick cards */}
    </div>
  </div>
</div>
```

### 9. Card Hand Display

Use the player-hand class for smooth dealing animation:

```tsx
<div className="player-hand">
  {hand.map((card, index) => (
    <div key={card.id}>
      <SwissCard
        card={card}
        isSelected={selectedCard === card.id}
        isPlayable={legalCards.some(c => c.id === card.id)}
        onClick={() => handleCardClick(card.id)}
      />
    </div>
  ))}
</div>
```

## CSS Variables Usage

Access design tokens in inline styles:

```tsx
<div style={{
  backgroundColor: 'var(--color-swiss-red)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  transition: 'var(--transition-base)'
}}>
  Styled with design tokens
</div>
```

## Animation Examples

### Custom Animations

```tsx
// Stagger cards on deal:
hand.map((card, index) => (
  <div
    key={card.id}
    style={{
      animation: 'cardDeal 500ms ease-out backwards',
      animationDelay: `${index * 50}ms`
    }}
  >
    <SwissCard card={card} />
  </div>
))

// Pulse effect on current player:
<div style={{
  animation: gameState?.currentPlayer === playerId ? 'pulse 2s infinite' : 'none'
}}>
  {playerName}
</div>

// Glow effect on trump cards:
<div style={{
  animation: card.isTrump ? 'glow 2s infinite' : 'none'
}}>
  <SwissCard card={card} />
</div>
```

## Responsive Design Tips

Use CSS classes that automatically adapt:

```tsx
// Automatically responsive:
<div className="game-table-container">
  {/* Perspective adjusts based on screen size */}
</div>

// Mobile-specific overrides:
<div style={{
  fontSize: 'clamp(12px, 2vw, 16px)', // Responsive font
  padding: 'clamp(8px, 2vw, 16px)'    // Responsive padding
}}>
  Scales with viewport
</div>
```

## Testing Checklist

After integration:
- [ ] Test victory modal with different winning scores
- [ ] Verify toast notifications don't stack awkwardly
- [ ] Check game header on mobile (language switcher)
- [ ] Validate 3D table perspective on all screen sizes
- [ ] Ensure card animations don't lag on slower devices
- [ ] Test keyboard navigation through all interactive elements
- [ ] Verify color contrast in all UI states
- [ ] Check that all buttons have proper hover states

## Performance Tips

1. **Lazy load Victory Modal**: Only import when needed
```tsx
const VictoryModal = React.lazy(() => import('./components/VictoryModal'));
```

2. **Memoize expensive components**:
```tsx
const MemoizedCard = React.memo(SwissCard);
```

3. **Debounce toast messages**:
```tsx
const debouncedToast = useCallback(
  debounce((message, type) => setToast({ message, type }), 300),
  []
);
```

## Common Issues

### Issue: Animations lag on mobile
**Solution**: Add to your CSS:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Issue: Cards overlap on small screens
**Solution**: The responsive design already handles this, but you can adjust:
```tsx
<div className="player-hand" style={{
  gap: window.innerWidth < 480 ? 'var(--space-1)' : 'var(--space-3)'
}}>
```

### Issue: Victory modal text too long
**Solution**: Truncate or use ellipsis:
```css
.victory-stat-row span {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## Next Steps

1. **Integrate components one at a time** (start with Toast)
2. **Test thoroughly** at each step
3. **Adjust colors/spacing** to match your preference
4. **Add sound effects** for enhanced feedback
5. **Implement dark mode** using CSS variables
6. **Collect user feedback** and iterate

---

**Questions?** Check `docs/UX_DESIGN_SYSTEM.md` for comprehensive documentation.

**Need help?** All components are fully typed with TypeScript for IntelliSense support.
