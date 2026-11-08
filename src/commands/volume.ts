import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("volume")
  .setDescription("Zobrazí nebo nastaví hlasitost přehrávače (0–150 %).")
  .addIntegerOption((opt) =>
    opt
      .setName("hodnota")
      .setDescription("Hlasitost v procentech (0–150)")
      .setMinValue(0)
      .setMaxValue(150)
      .setRequired(false),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const value = interaction.options.getInteger("hodnota");
    if (value === null) {
      await interaction.reply({
        embeds: [infoEmbed(`🔊 Aktuální hlasitost je **${player.volume} %**.`)],
      });
      return;
    }

    await player.setVolume(value);
    await interaction.reply({
      embeds: [successEmbed(`🔊 Hlasitost nastavena na **${value} %**.`)],
    });
  },
} satisfies Command;
