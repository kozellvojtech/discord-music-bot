import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { replyError, requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pozastaví aktuální přehrávání.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    // Bez aktuální skladby by pause() rozbil stav přehrávače (pak by /play nespustil přehrávání).
    if (!player.queue.current) {
      await replyError(interaction, "Teď nic nehraje.");
      return;
    }

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
