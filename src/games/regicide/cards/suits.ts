import { CLUBS, SPADES, DIAMONDS, HEARTS } from '../constants';
import { Suit } from '../types';

export function getSuitEmoji(suit: Suit) {
    switch (suit) {
        case CLUBS:
            return '♣️'
        case SPADES:
            return '♠️'
        case DIAMONDS:
            return '♦️'
        default:
            return '❤️'
    }
}

export function getSuits(): Suit[] {
    return [HEARTS, DIAMONDS, SPADES, CLUBS]
}
