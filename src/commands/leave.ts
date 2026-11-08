import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Odpojí bota z hlasového kanálu a zruší frontu.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    await player.destroy("Příkaz /leave");
    await interaction.reply({
      embeds: [infoEmbed("👋 Odpojuji se z hlasového kanálu. Měj se!")],
    });
  },
} satisfies Command;
