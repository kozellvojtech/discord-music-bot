import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { escapeMarkdown, truncate } from "../utils/format.js";
import { replyError, requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Přeskočí aktuální skladbu (nebo zadaný počet skladeb).")
  .addIntegerOption((opt) =>
    opt
      .setName("pocet")
      .setDescription("Kolik skladeb přeskočit (1–100)")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const current = player.queue.current;
    if (!current && player.queue.tracks.length === 0) {
      await replyError(interaction, "Teď nic nehraje.");
      return;
    }

    const skippedTitle = escapeMarkdown(truncate(current?.info.title ?? "Neznámá skladba", 80));
    const requestedCount = interaction.options.getInteger("pocet") ?? 1;

    if (player.queue.tracks.length === 0) {
      await player.stopPlaying(true, false);
      await interaction.reply({
        embeds: [infoEmbed(`⏭️ Přeskočeno: **${skippedTitle}**\nFronta je prázdná.`)],
      });
      return;
    }

    const skipCount = Math.min(requestedCount, player.queue.tracks.length);
    await player.skip(skipCount);

    const message =
      skipCount > 1
        ? `⏭️ Přeskočeno **${skipCount}** skladeb (aktuální: **${skippedTitle}**).`
        : `⏭️ Přeskočeno: **${skippedTitle}**.`;

    await interaction.reply({ embeds: [successEmbed(message)] });
  },
} satisfies Command;
