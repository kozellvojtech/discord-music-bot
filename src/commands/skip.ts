import { SlashCommandBuilder } from "discord.js";
import type { Track } from "lavalink-client";
import { addRelatedTracks, isAutoplayEnabled } from "../autoplay.js";
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

    // S autoplay: místo konce rovnou dohledej podobné skladby a přeskoč na ně.
    if (requestedCount > player.queue.tracks.length && isAutoplayEnabled(player) && current) {
      await interaction.deferReply();
      if (player.queue.tracks.length > 0) await player.queue.splice(0, player.queue.tracks.length);
      const added = await addRelatedTracks(player, current as Track).catch(() => 0);
      if (added > 0) {
        await player.skip(1);
        await interaction.editReply({ embeds: [successEmbed(`⏭️ Přeskočeno: **${skippedTitle}**. ♾️ Autoplay pokračuje.`)] });
      } else {
        await player.stopPlaying(true, false);
        await interaction.editReply({
          embeds: [infoEmbed(`⏭️ Přeskočeno: **${skippedTitle}**\nAutoplay nenašel nic podobného, fronta je prázdná.`)],
        });
      }
      return;
    }

    // Přeskočit aktuální + všechny čekající (nebo víc) = vyprázdnit frontu.
    if (requestedCount > player.queue.tracks.length) {
      await player.stopPlaying(true, false);
      const text =
        requestedCount > 1
          ? `⏭️ Přeskočeno vše, co bylo ve frontě.\nFronta je prázdná.`
          : `⏭️ Přeskočeno: **${skippedTitle}**\nFronta je prázdná.`;
      await interaction.reply({ embeds: [infoEmbed(text)] });
      return;
    }

    // player.skip(n) přeskočí aktuální skladbu a n-1 čekajících -> hraje n-tá čekající.
    const skipCount = requestedCount;
    await player.skip(skipCount);

    const message =
      skipCount > 1
        ? `⏭️ Přeskočeno **${skipCount}** skladeb (aktuální: **${skippedTitle}**).`
        : `⏭️ Přeskočeno: **${skippedTitle}**.`;

    await interaction.reply({ embeds: [successEmbed(message)] });
  },
} satisfies Command;
