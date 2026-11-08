import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { nowPlayingEmbed } from "../utils/embeds.js";
import { replyError, requireAnyPlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("nowplaying")
  .setDescription("Zobrazí informace o právě hrané skladbě.")
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requireAnyPlayer(interaction);
    if (!player) return;

    const current = player.queue.current;
    if (!current) {
      await replyError(interaction, "Teď nic nehraje.");
      return;
    }

    await interaction.reply({ embeds: [nowPlayingEmbed(player, current)] });
  },
} satisfies Command;
