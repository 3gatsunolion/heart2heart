import { GAMES, INFORMATION } from './constants';
import { CommandCategory } from './types';

export function getCommandCategoryEmoji(category: CommandCategory): string {
    switch (category) {
        case (GAMES):
            return '🎮'
        case (INFORMATION):
            return '📑'
        default:
            return '⚙️'
    }
}
