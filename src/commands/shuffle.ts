import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("shuffle")
  .setDescription("Náhodně zamíchá skladby ve frontě.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (player.queue.tracks.length < 2) {
      await interaction.reply({
        embeds: [infoEmbed("🔀 Ve frontě musí být alespoň 2 skladby, aby šla zamíchat.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await player.queue.shuffle();
    await interaction.reply({
      embeds: [successEmbed(`🔀 Fronta zamíchána (**${player.queue.tracks.length}** skladeb).`)],
    });
  },
} satisfies Command;
