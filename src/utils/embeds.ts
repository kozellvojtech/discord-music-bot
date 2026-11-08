/**
 * Sdílené embedy. Základní verze z kostry (T1) - T2 je smí vylepšit,
 * ale NESMÍ měnit názvy a parametry exportovaných funkcí (používá je i src/events/).
 */
import { EmbedBuilder } from "discord.js";
import type { Player, Track, UnresolvedTrack } from "lavalink-client";
import type { Requester } from "../types.js";
import { escapeMarkdown, formatDuration, progressBar, truncate } from "./format.js";

export const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
} as const;

function requesterOf(track: Track | UnresolvedTrack): Requester | null {
  return (track.requester as Requester | undefined) ?? null;
}

function trackLink(track: Track | UnresolvedTrack): string {
  const title = escapeMarkdown(truncate(track.info.title ?? "Neznámá skladba", 80));
  return track.info.uri ? `[${title}](${track.info.uri})` : title;
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${message}`);
}

export function infoEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.primary).setDescription(message);
}

/** Embed "Právě hraje" - posílá ho src/events/playerEvents.ts i příkaz /nowplaying. */
export function nowPlayingEmbed(player: Player, track: Track): EmbedBuilder {
  const requester = requesterOf(track);
  const isStream = track.info.isStream;
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: "🎶 Právě hraje" })
    .setDescription(`**${trackLink(track)}**\n${escapeMarkdown(track.info.author ?? "")}`)
    .addFields(
      {
        name: "Průběh",
        value: isStream
          ? "🔴 LIVE"
          : `${progressBar(player.position, track.info.duration)}\n\`${formatDuration(player.position)} / ${formatDuration(track.info.duration)}\``,
      },
      { name: "Hlasitost", value: `${player.volume} %`, inline: true },
      { name: "Ve frontě", value: `${player.queue.tracks.length}`, inline: true },
      { name: "Opakování", value: repeatLabel(player.repeatMode), inline: true },
    );
  if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
  if (requester) embed.setFooter({ text: `Přidal(a): ${requester.username}`, iconURL: requester.avatarUrl ?? undefined });
  return embed;
}

/** Embed "Přidáno do fronty" pro jednu skladbu. */
export function trackAddedEmbed(track: Track | UnresolvedTrack, position: number): EmbedBuilder {
  const requester = requesterOf(track);
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: "➕ Přidáno do fronty" })
    .setDescription(`**${trackLink(track)}**\n${escapeMarkdown(track.info.author ?? "")}`)
    .addFields(
      { name: "Délka", value: formatDuration(track.info.duration, track.info.isStream), inline: true },
      { name: "Pozice", value: position === 0 ? "Hraje hned" : `#${position}`, inline: true },
    );
  if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
  if (requester) embed.setFooter({ text: `Přidal(a): ${requester.username}`, iconURL: requester.avatarUrl ?? undefined });
  return embed;
}

/** Embed "Přidán playlist / album". */
export function playlistAddedEmbed(
  name: string,
  tracks: (Track | UnresolvedTrack)[],
  url: string | undefined,
  artworkUrl: string | undefined,
): EmbedBuilder {
  const total = tracks.reduce((sum, t) => sum + (t.info.duration ?? 0), 0);
  const first = tracks[0];
  const requester = first ? requesterOf(first) : null;
  const title = escapeMarkdown(truncate(name, 80));
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: "📃 Přidán playlist" })
    .setDescription(`**${url ? `[${title}](${url})` : title}**`)
    .addFields(
      { name: "Skladeb", value: `${tracks.length}`, inline: true },
      { name: "Celková délka", value: formatDuration(total), inline: true },
    );
  const art = artworkUrl ?? first?.info.artworkUrl ?? undefined;
  if (art) embed.setThumbnail(art);
  if (requester) embed.setFooter({ text: `Přidal(a): ${requester.username}`, iconURL: requester.avatarUrl ?? undefined });
  return embed;
}

export function repeatLabel(mode: Player["repeatMode"]): string {
  switch (mode) {
    case "track":
      return "🔂 Skladba";
    case "queue":
      return "🔁 Fronta";
    default:
      return "Vypnuto";
  }
}
