import { SlashCommandBuilder } from "discord.js";
import type { Player } from "lavalink-client";
import { config } from "../config.js";
import type { Command } from "../types.js";
import { playlistAddedEmbed, trackAddedEmbed } from "../utils/embeds.js";
import { replyError, requireUserVoice } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Přehraje skladbu nebo playlist z odkazu či podle názvu.")
  .addStringOption((opt) =>
    opt
      .setName("dotaz")
      .setDescription("Název skladby nebo odkaz (YouTube, Spotify, …)")
      .setRequired(true)
      .setMaxLength(500),
  )
  .toJSON();

async function cleanupEmptyNewPlayer(player: Player | undefined, createdNew: boolean): Promise<void> {
  if (!createdNew || !player) return;
  if (!player.queue.current && player.queue.tracks.length === 0) {
    try {
      await player.destroy("Nic se nepřidalo");
    } catch {
      // Ignorujeme chybu při úklidu.
    }
  }
}

export default {
  data,
  async execute(interaction) {
    const voice = await requireUserVoice(interaction);
    if (!voice) return;

    await interaction.deferReply();

    const guildId = voice.channel.guild.id;
    const existingPlayer = interaction.client.lavalink.getPlayer(guildId);
    if (existingPlayer?.voiceChannelId && existingPlayer.voiceChannelId !== voice.channel.id) {
      await replyError(interaction, "Už hraju v jiném kanálu.");
      return;
    }

    if (existingPlayer && existingPlayer.queue.tracks.length >= config.player.maxQueueSize) {
      await replyError(
        interaction,
        `Fronta je plná (maximálně ${config.player.maxQueueSize} skladeb).`,
      );
      return;
    }

    const query = interaction.options.getString("dotaz", true).trim();
    const isUrl = /^https?:\/\//i.test(query);
    const createdNew = !existingPlayer;
    let player: Player | undefined;

    try {
      player = interaction.client.lavalink.createPlayer({
        guildId,
        voiceChannelId: voice.channel.id,
        textChannelId: interaction.channelId,
        selfDeaf: true,
        selfMute: false,
        volume: config.player.defaultVolume,
      });

      if (!player.connected) {
        await player.connect();
      }

      const result = await player.search(
        isUrl ? { query } : { query, source: "ytmsearch" },
        interaction.user,
      );

      if (result.loadType === "error") {
        await cleanupEmptyNewPlayer(player, createdNew);
        await replyError(
          interaction,
          `Chyba při načítání: ${result.exception?.message ?? "Neznámá chyba"}`,
        );
        return;
      }

      if (result.loadType === "empty" || result.tracks.length === 0) {
        await cleanupEmptyNewPlayer(player, createdNew);
        await replyError(interaction, "Nic jsem nenašel.");
        return;
      }

      const remainingSpace = config.player.maxQueueSize - player.queue.tracks.length;
      if (remainingSpace <= 0) {
        await cleanupEmptyNewPlayer(player, createdNew);
        await replyError(
          interaction,
          `Fronta je plná (maximálně ${config.player.maxQueueSize} skladeb).`,
        );
        return;
      }

      if (result.loadType === "playlist") {
        const tracksToAdd = result.tracks.slice(0, remainingSpace);
        await player.queue.add(tracksToAdd);
        const embed = playlistAddedEmbed(
          result.playlist?.name ?? "Playlist",
          tracksToAdd,
          isUrl ? query : undefined,
          result.playlist?.thumbnail,
        );
        if (!player.playing && !player.paused) {
          await player.play();
        }
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const firstTrack = result.tracks[0];
      if (!firstTrack) {
        await cleanupEmptyNewPlayer(player, createdNew);
        await replyError(interaction, "Nic jsem nenašel.");
        return;
      }

      const wasIdle = !player.playing && !player.paused && !player.queue.current;
      await player.queue.add(firstTrack);
      const position = wasIdle ? 0 : player.queue.tracks.length;
      const embed = trackAddedEmbed(firstTrack, position);

      if (!player.playing && !player.paused) {
        await player.play();
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[play] Chyba při zpracování příkazu /play:", err);
      await cleanupEmptyNewPlayer(player, createdNew);
      await replyError(interaction, "Při přehrávání došlo k neočekávané chybě.");
    }
  },
} satisfies Command;
