import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { queueEmbed } from "../utils/embeds.js";
import { requireAnyPlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Zobrazí aktuální frontu skladeb.")
  .addIntegerOption((opt) =>
    opt
      .setName("strana")
      .setDescription("Číslo strany fronty")
      .setMinValue(1)
      .setRequired(false),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requireAnyPlayer(interaction);
    if (!player) return;

    const page = interaction.options.getInteger("strana") ?? 1;
    await interaction.reply({ embeds: [queueEmbed(player, page)] });
  },
} satisfies Command;
