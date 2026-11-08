import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Zastaví přehrávání a vymaže frontu (bot zůstane v kanálu).")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    await player.stopPlaying(true, false);
    await interaction.reply({
      embeds: [successEmbed("⏹️ Přehrávání zastaveno a fronta vymazána.")],
    });
  },
} satisfies Command;
