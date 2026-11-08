import { SlashCommandBuilder } from "discord.js";
import type { RepeatMode } from "lavalink-client";
import type { Command } from "../types.js";
import { repeatLabel, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("loop")
  .setDescription("Nastaví režim opakování.")
  .addStringOption((opt) =>
    opt
      .setName("rezim")
      .setDescription("Režim opakování")
      .setRequired(true)
      .addChoices(
        { name: "Vypnuto", value: "off" },
        { name: "Skladba", value: "track" },
        { name: "Fronta", value: "queue" },
      ),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const mode = interaction.options.getString("rezim", true) as RepeatMode;
    await player.setRepeatMode(mode);
    await interaction.reply({
      embeds: [successEmbed(`Opakování nastaveno na: **${repeatLabel(mode)}**.`)],
    });
  },
} satisfies Command;
