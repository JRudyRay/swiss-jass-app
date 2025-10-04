/**
 * Swiss Jass Card Asset Manifest
 * 
 * This file documents the Swiss Jass card rendering system.
 * Cards are currently rendered using custom SVG graphics that represent
 * authentic Swiss Jass cultural symbols and traditions.
 * 
 * SUITS (4):
 * - Eicheln (Acorns) - Brown #8B4513 - Represents strength & endurance
 * - Schellen (Bells) - Gold #FFD700 - Represents community & tradition
 * - Rosen (Roses) - Red #DC143C - Represents love & passion
 * - Schilten (Shields) - Dark Slate #2F4F4F - Represents protection & military
 * 
 * RANKS (9 per suit = 36 cards total):
 * Number cards: 6, 7, 8, 9, 10
 * Court cards: U (Unter/Jack), O (Ober/Officer), K (König/King)
 * Ace: A (As/Ace)
 * 
 * CARD RENDERING APPROACH:
 * 1. SVG Components (Current): Custom-designed SVG graphics in SwissCardSVG.tsx
 *    - Suit icons with cultural authenticity
 *    - Court figures with Swiss styling (Unter, Ober, König)
 *    - Programmatic rendering (no external assets needed)
 * 
 * 2. Future Enhancement Options:
 *    a) Public Domain Images:
 *       - Source: Wikimedia Commons, Swiss National Museum archives
 *       - License: CC0, Public Domain Mark
 *       - Format: PNG or SVG, 300x450px recommended
 *       - Directory: web/src/assets/cards/swiss/
 *    
 *    b) Commercial Card Decks:
 *       - AG Müller (Swiss playing card manufacturer since 1828)
 *       - Requires licensing agreement
 *       - Authentic historical designs
 * 
 * CARD ID FORMAT:
 * {rank}_{suit} (e.g., "A_eicheln", "U_schellen", "6_rosen")
 * 
 * IMPLEMENTATION NOTES:
 * - Cards are responsive and scale with container size
 * - Trump indicators use gold crown symbol (♔)
 * - Selected cards use blue highlight (#3B82F6)
 * - Playable cards show green border (#10b981) and pulse animation
 * - Point values displayed for high-value cards (10+ points)
 * 
 * CULTURAL AUTHENTICITY:
 * Swiss Jass cards differ from standard French/German playing cards:
 * - Four unique suits with cultural symbolism
 * - Court card hierarchy: Unter (servant) < Ober (officer) < König (king)
 * - No Queen card (replaced by Ober)
 * - Card values and rankings change based on trump contract
 * 
 * ACCESSIBILITY:
 * - High contrast suit colors for visibility
 * - Clear rank labels (top and bottom, rotated 180°)
 * - SVG graphics scale without pixelation
 * - Color-blind friendly combinations
 * 
 * PERFORMANCE:
 * - SVG rendering is lightweight (~2-3KB per card)
 * - No external image loading (instant render)
 * - Supports offline play without asset downloads
 * 
 * ATTRIBUTION:
 * Card designs created specifically for Swiss Jass App
 * Based on traditional Swiss Jass card patterns and cultural heritage
 * © 2025 Swiss Jass App - Open source implementation
 * 
 * LICENSE:
 * SVG components are part of the Swiss Jass App open source project
 * License: MIT (or project license)
 * Free to use, modify, and distribute with attribution
 */

export const SWISS_CARD_MANIFEST = {
  version: '1.0.0',
  renderingEngine: 'SVG',
  totalCards: 36,
  suits: [
    {
      id: 'eicheln',
      name: 'Eicheln',
      nameEn: 'Acorns',
      symbol: 'acorn',
      color: '#8B4513',
      culturalMeaning: 'Strength & endurance',
      component: 'SuitIcon'
    },
    {
      id: 'schellen',
      name: 'Schellen',
      nameEn: 'Bells',
      symbol: 'bell',
      color: '#FFD700',
      culturalMeaning: 'Community & tradition',
      component: 'SuitIcon'
    },
    {
      id: 'rosen',
      name: 'Rosen',
      nameEn: 'Roses',
      symbol: 'rose',
      color: '#DC143C',
      culturalMeaning: 'Love & passion',
      component: 'SuitIcon'
    },
    {
      id: 'schilten',
      name: 'Schilten',
      nameEn: 'Shields',
      symbol: 'shield',
      color: '#2F4F4F',
      culturalMeaning: 'Protection & military',
      component: 'SuitIcon'
    }
  ],
  ranks: [
    { id: '6', name: 'Sächsi', type: 'number', order: 0 },
    { id: '7', name: 'Sibni', type: 'number', order: 1 },
    { id: '8', name: 'Achti', type: 'number', order: 2 },
    { id: '9', name: 'Nüni', type: 'number', order: 3 },
    { id: '10', name: 'Zähni', type: 'number', order: 4 },
    { id: 'U', name: 'Unter', nameEn: 'Jack', type: 'court', order: 5, component: 'CourtFigure' },
    { id: 'O', name: 'Ober', nameEn: 'Officer', type: 'court', order: 6, component: 'CourtFigure' },
    { id: 'K', name: 'König', nameEn: 'King', type: 'court', order: 7, component: 'CourtFigure' },
    { id: 'A', name: 'As', nameEn: 'Ace', type: 'number', order: 8 }
  ],
  pointValues: {
    trump: { U: 20, '9': 14, A: 11, '10': 10, K: 4, O: 3, '8': 0, '7': 0, '6': 0 },
    normal: { A: 11, '10': 10, K: 4, O: 3, U: 2, '9': 0, '8': 0, '7': 0, '6': 0 },
    obenabe: { A: 11, K: 4, O: 3, U: 2, '10': 10, '9': 0, '8': 8, '7': 0, '6': 0 },
    undenufe: { '6': 11, '7': 0, '8': 8, '9': 0, '10': 10, U: 2, O: 3, K: 4, A: 0 }
  },
  trumpHierarchy: ['U', '9', 'A', 'K', 'O', '10', '8', '7', '6'],
  normalHierarchy: ['A', 'K', 'O', 'U', '10', '9', '8', '7', '6'],
  credits: {
    designer: 'Swiss Jass App Team',
    year: 2025,
    license: 'MIT',
    inspiration: 'Traditional Swiss Jass playing cards',
    authenticity: 'Based on historical Swiss card patterns and cultural heritage'
  }
};

export default SWISS_CARD_MANIFEST;
