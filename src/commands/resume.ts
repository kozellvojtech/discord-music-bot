import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Pokračuje v pozastaveném přehrávání.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (!player.paused) {
      await interaction.reply({
        embeds: [infoEmbed("▶️ Přehrávání není pozastaveno.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await player.resume();
    await interaction.reply({ embeds: [successEmbed("▶️ Přehrávání obnoveno.")] });
  },
} satisfies Command;
