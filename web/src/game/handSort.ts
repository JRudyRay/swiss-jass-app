export function sortHandForDisplay(hand: any[], trump?: string | null) {
  if (!hand || !hand.length) return hand.slice();
  const trumpSuit = trump || null;

  // Swiss Jass trump order: U(Jack)=20, 9=14, A=11, 10=10, K=4, O(Queen)=3, 8=0, 7=0, 6=0
  // Normal order: A=11, 10=10, K=4, O=3, U=2, 9=0, 8=0, 7=0, 6=0
  const normalRankOrder = ['6', '7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  const trumpRankOrder = ['6', '7', '8', 'O', 'K', '10', 'A', '9', 'U']; // Proper Swiss trump order (best to worst)

  const normalCards = hand.filter((c) => c.suit !== trumpSuit);
  const trumpCards = hand.filter((c) => c.suit === trumpSuit);

  // Sort normal cards by suit, then by rank
  normalCards.sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return normalRankOrder.indexOf(a.rank) - normalRankOrder.indexOf(b.rank);
  });

  // Sort trump cards by proper Swiss trump value (highest first for easy selection)
  trumpCards.sort((a, b) => {
    return trumpRankOrder.indexOf(b.rank) - trumpRankOrder.indexOf(a.rank);
  });

  return [...normalCards, ...trumpCards];
}
