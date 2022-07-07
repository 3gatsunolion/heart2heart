import { Client, Interaction } from 'discord.js';

export default async function onInteractionCreate(bot: Client, interaction: Interaction) {
    if (interaction.user.bot || !interaction.guild) return

    for (const manager of bot.gameManagers.values()) {
        manager.handleInteraction(interaction)
    }
}
