import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { successEmbed } from "../utils/embeds.js";
import { escapeMarkdown, truncate } from "../utils/format.js";
import { replyError, requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("remove")
  .setDescription("Odebere skladbu z fronty (nebo rozsah skladeb).")
  .addIntegerOption((opt) =>
    opt
      .setName("pozice")
      .setDescription("Pozice skladby ve frontě (číslo z /queue)")
      .setMinValue(1)
      .setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("do")
      .setDescription("Volitelně: odebrat všechno od pozice až do této pozice")
      .setMinValue(1)
      .setRequired(false),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const length = player.queue.tracks.length;
    if (length === 0) {
      await replyError(interaction, "Ve frontě nejsou žádné další skladby.");
      return;
    }

    const from = interaction.options.getInteger("pozice", true);
    const to = interaction.options.getInteger("do") ?? from;
    if (from > length) {
      await replyError(interaction, `Ve frontě je jen ${length} skladeb.`);
      return;
    }
    if (to < from) {
      await replyError(interaction, "Pozice „do“ musí být stejná nebo větší než „pozice“.");
      return;
    }

    const count = Math.min(to, length) - from + 1;
    const removed = player.queue.tracks.slice(from - 1, from - 1 + count);
    await player.queue.splice(from - 1, count);

    const first = removed[0];
    const text =
      count === 1 && first
        ? `🗑️ Odebráno z fronty: **${escapeMarkdown(truncate(first.info.title ?? "Neznámá skladba", 80))}**`
        : `🗑️ Odebráno **${count}** skladeb (pozice ${from}–${from + count - 1}).`;
    await interaction.reply({ embeds: [successEmbed(text)] });
  },
} satisfies Command;
