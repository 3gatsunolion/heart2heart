import {
    CLUBS,
    SPADES,
    DIAMONDS,
    HEARTS,
    NUMBERED,
    ANIMAL_COMPANION,
    MONARCH,
    JESTER,
    ATTACK_PHASE,
    JESTER_PHASE,
    SUFFER_DAMAGE_PHASE,
} from './constants';

export type Suit = typeof CLUBS | typeof SPADES | typeof DIAMONDS | typeof HEARTS

export type CardType = typeof NUMBERED | typeof ANIMAL_COMPANION | typeof MONARCH | typeof JESTER

export type TurnPhase = typeof ATTACK_PHASE | typeof JESTER_PHASE | typeof SUFFER_DAMAGE_PHASE
