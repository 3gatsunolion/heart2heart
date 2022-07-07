/**
 * Shuffles the array using the Durstenfeld shuffle algorithm.
 *
 * @param cards: the array of 'cards' (or any objects) to be shuffled
 */
export function shuffle(cards: Array<any>): void {
    // Shuffle cards using Durstenfeld shuffle algorithm
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]]
    }
}
