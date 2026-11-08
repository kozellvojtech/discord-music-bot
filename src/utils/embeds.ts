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

/** Embed se seznamem skladeb ve frontě (stránkovaný po 10 skladbách). */
export function queueEmbed(player: Player, requestedPage = 1): EmbedBuilder {
  const perPage = 10;
  const tracks = player.queue.tracks;
  const current = player.queue.current;
  const totalPages = Math.max(1, Math.ceil(tracks.length / perPage));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * perPage;
  const slice = tracks.slice(start, start + perPage);

  const lines: string[] = [];
  if (current) {
    const req = requesterOf(current);
    const dur = formatDuration(current.info.duration, current.info.isStream);
    const who = req ? ` • ${escapeMarkdown(req.username)}` : "";
    lines.push(`**Právě hraje:**\n🎶 **${trackLink(current)}** \`[${dur}]\`${who}\n`);
  }

  if (slice.length === 0) {
    lines.push("*Ve frontě nejsou žádné další skladby.*");
  } else {
    lines.push("**Další ve frontě:**");
    for (let i = 0; i < slice.length; i++) {
      const track = slice[i];
      if (!track) continue;
      const req = requesterOf(track);
      const dur = formatDuration(track.info.duration, track.info.isStream);
      const who = req ? ` • ${escapeMarkdown(req.username)}` : "";
      lines.push(`\`${start + i + 1}.\` ${trackLink(track)} \`[${dur}]\`${who}`);
    }
  }

  const queueDuration = tracks.reduce((sum, t) => sum + (t.info.isStream ? 0 : (t.info.duration ?? 0)), 0);
  const currentRemaining =
    current && !current.info.isStream ? Math.max(0, (current.info.duration ?? 0) - player.position) : 0;
  const totalDuration = queueDuration + currentRemaining;

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: "📜 Fronta přehrávání" })
    .setDescription(lines.join("\n"))
    .addFields(
      { name: "Ve frontě", value: `${tracks.length} skladeb`, inline: true },
      { name: "Celková délka", value: formatDuration(totalDuration), inline: true },
      { name: "Opakování", value: repeatLabel(player.repeatMode), inline: true },
    )
    .setFooter({ text: `Strana ${page} / ${totalPages}` });

  if (current?.info.artworkUrl) embed.setThumbnail(current.info.artworkUrl);
  return embed;
}

