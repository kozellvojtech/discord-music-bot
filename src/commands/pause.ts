import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pozastaví aktuální přehrávání.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    if (player.paused) {
      await interaction.reply({
        embeds: [infoEmbed("⏸️ Přehrávání už je pozastaveno.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await player.pause();
    await interaction.reply({ embeds: [successEmbed("⏸️ Přehrávání pozastaveno.")] });
  },
} satisfies Command;
