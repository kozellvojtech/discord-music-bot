import { type Client, DiscordAPIError, RESTJSONErrorCodes, type SendableChannels } from "discord.js";
import type { BotEvent } from "../types.js";
import { errorEmbed, infoEmbed, nowPlayingEmbed } from "../utils/embeds.js";
import { escapeMarkdown, truncate } from "../utils/format.js";

/** Mapa guildId -> ID poslední "Právě hraje" zprávy. */
const nowPlayingMessages = new Map<string, string>();

async function getSendableChannel(
  client: Client,
  channelId: string | null | undefined,
): Promise<SendableChannels | null> {
  if (!channelId) return null;
  try {
    const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));
    return channel?.isSendable() ? channel : null;
  } catch (err) {
    if (
      err instanceof DiscordAPIError &&
      (err.code === RESTJSONErrorCodes.MissingAccess ||
        err.code === RESTJSONErrorCodes.MissingPermissions ||
        err.code === RESTJSONErrorCodes.UnknownChannel)
    ) {
      return null;
    }
    console.warn(`[playerEvents] Nepodařilo se načíst kanál ${channelId}:`, err);
    return null;
  }
}

async function deleteMessageSafely(
  client: Client,
  channelId: string | null | undefined,
  messageId: string,
): Promise<void> {
  const channel = await getSendableChannel(client, channelId);
  if (!channel || !("messages" in channel)) return;

  await channel.messages.delete(messageId).catch((err: unknown) => {
    if (
      err instanceof DiscordAPIError &&
      (err.code === RESTJSONErrorCodes.UnknownMessage ||
        err.code === RESTJSONErrorCodes.MissingAccess ||
        err.code === RESTJSONErrorCodes.MissingPermissions)
    ) {
      return;
    }
    console.warn(`[playerEvents] Nepodařilo se smazat zprávu ${messageId}:`, err);
  });
}

export default {
  name: "playerEvents",
  register(client) {
    client.lavalink.on("trackStart", (player, track) => {
      if (!track) return;

      void (async () => {
        const previousMessageId = nowPlayingMessages.get(player.guildId);
        const channel = await getSendableChannel(client, player.textChannelId);
        if (!channel) return;

        const sent = await channel
          .send({ embeds: [nowPlayingEmbed(player, track)] })
          .catch((err: unknown) => {
            console.warn(`[playerEvents] Nepodařilo se odeslat now-playing zprávu (${player.guildId}):`, err);
            return null;
          });
        if (!sent) return;

        const currentStoredId = nowPlayingMessages.get(player.guildId);
        const shouldDeletePrevious = previousMessageId !== undefined && currentStoredId === previousMessageId;
        nowPlayingMessages.set(player.guildId, sent.id);

        if (shouldDeletePrevious) {
          await deleteMessageSafely(client, player.textChannelId, previousMessageId);
        }
      })();
    });

    client.lavalink.on("trackError", (player, track, payload) => {
      console.warn(`[playerEvents] Chyba skladby na serveru ${player.guildId}:`, payload);

      void (async () => {
        const channel = await getSendableChannel(client, player.textChannelId);
        if (!channel) return;

        const title = escapeMarkdown(track?.info.title ?? "Neznámá skladba");
        const reason = payload.exception?.message ? escapeMarkdown(truncate(payload.exception.message, 200)) : null;
        const text = reason
          ? `Skladbu se nepodařilo přehrát: **${title}**\nDůvod: ${reason}`
          : `Skladbu se nepodařilo přehrát: **${title}**`;

        await channel.send({ embeds: [errorEmbed(text)] }).catch((err: unknown) => {
          console.warn(`[playerEvents] Nepodařilo se odeslat chybovou zprávu (${player.guildId}):`, err);
        });
      })();
    });

    client.lavalink.on("trackStuck", (player, track, payload) => {
      console.warn(
        `[playerEvents] Skladba se zasekla na serveru ${player.guildId} (${payload.thresholdMs} ms):`,
        track?.info.title,
      );

      void (async () => {
        const channel = await getSendableChannel(client, player.textChannelId);
        if (!channel) return;

        const title = escapeMarkdown(track?.info.title ?? "Neznámá skladba");
        await channel
          .send({ embeds: [infoEmbed(`⚠️ Skladba **${title}** se zasekla a přeskakuje se.`)] })
          .catch((err: unknown) => {
            console.warn(`[playerEvents] Nepodařilo se odeslat zprávu o zaseknutí (${player.guildId}):`, err);
          });
      })();
    });

    client.lavalink.on("playerDestroy", (player) => {
      const messageId = nowPlayingMessages.get(player.guildId);
      if (!messageId) return;
      nowPlayingMessages.delete(player.guildId);
      void deleteMessageSafely(client, player.textChannelId, messageId);
    });

    client.lavalink.on("playerSocketClosed", (player, payload) => {
      console.warn(
        `[playerEvents] Voice socket uzavřen (server ${player.guildId}): kód=${payload.code}, důvod=${payload.reason || "neuveden"}`,
      );
    });
  },
} satisfies BotEvent;
