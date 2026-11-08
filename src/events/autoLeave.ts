import { type Client, Events, type SendableChannels } from "discord.js";
import { config } from "../config.js";
import type { BotEvent } from "../types.js";
import { infoEmbed } from "../utils/embeds.js";

const idleTimers = new Map<string, NodeJS.Timeout>();
const emptyChannelTimers = new Map<string, NodeJS.Timeout>();

function clearIdleTimer(guildId: string): void {
  const timer = idleTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    idleTimers.delete(guildId);
  }
}

function clearEmptyChannelTimer(guildId: string): void {
  const timer = emptyChannelTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    emptyChannelTimers.delete(guildId);
  }
}

async function getSendableChannel(
  client: Client,
  channelId: string | null | undefined,
): Promise<SendableChannels | null> {
  if (!channelId) return null;
  try {
    const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));
    return channel?.isSendable() ? channel : null;
  } catch {
    return null;
  }
}

function countHumansInVoice(client: Client, guildId: string, voiceChannelId: string): number {
  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(voiceChannelId) ?? client.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isVoiceBased()) return 0;
  return channel.members.filter((member) => !member.user.bot).size;
}

async function leaveEmptyChannel(client: Client, guildId: string): Promise<void> {
  emptyChannelTimers.delete(guildId);
  const player = client.lavalink.getPlayer(guildId);
  if (!player || !player.voiceChannelId) return;

  if (countHumansInVoice(client, guildId, player.voiceChannelId) > 0) return;

  const textChannel = await getSendableChannel(client, player.textChannelId);
  if (textChannel) {
    await textChannel.send({ embeds: [infoEmbed("Všichni odešli, odcházím 👋")] }).catch((err: unknown) => {
      console.warn(`[autoLeave] Nepodařilo se odeslat zprávu o odchodu (${guildId}):`, err);
    });
  }

  await player.destroy("Prázdný kanál").catch((err: unknown) => {
    console.warn(`[autoLeave] Nepodařilo se zrušit přehrávač (${guildId}):`, err);
  });
}

export default {
  name: "autoLeave",
  register(client) {
    client.lavalink.on("queueEnd", (player) => {
      const { guildId } = player;
      clearIdleTimer(guildId);

      const timer = setTimeout(() => {
        idleTimers.delete(guildId);
        void (async () => {
          const currentPlayer = client.lavalink.getPlayer(guildId);
          if (!currentPlayer || currentPlayer.playing || currentPlayer.queue.current) return;

          const textChannel = await getSendableChannel(client, currentPlayer.textChannelId);
          if (textChannel) {
            await textChannel
              .send({ embeds: [infoEmbed("Fronta je delší dobu prázdná, odcházím 👋")] })
              .catch((err: unknown) => {
                console.warn(`[autoLeave] Nepodařilo se odeslat zprávu o prázdné frontě (${guildId}):`, err);
              });
          }

          await currentPlayer.destroy("Prázdná fronta").catch((err: unknown) => {
            console.warn(`[autoLeave] Nepodařilo se zrušit přehrávač po prázdné frontě (${guildId}):`, err);
          });
        })();
      }, config.player.idleTimeoutSeconds * 1_000);

      idleTimers.set(guildId, timer);
    });

    client.lavalink.on("trackStart", (player) => {
      clearIdleTimer(player.guildId);
    });

    client.lavalink.on("playerDestroy", (player) => {
      clearIdleTimer(player.guildId);
      clearEmptyChannelTimer(player.guildId);
    });

    client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
      if (newState.id === client.user?.id && newState.channelId === null) {
        return;
      }

      const guildId = newState.guild.id;
      const player = client.lavalink.getPlayer(guildId);
      if (!player || !player.voiceChannelId) return;

      const humans = countHumansInVoice(client, guildId, player.voiceChannelId);
      if (humans > 0) {
        clearEmptyChannelTimer(guildId);
        return;
      }

      if (emptyChannelTimers.has(guildId)) return;

      const timeoutMs = config.player.emptyChannelTimeoutSeconds * 1_000;
      const timer = setTimeout(() => {
        void leaveEmptyChannel(client, guildId);
      }, timeoutMs);

      emptyChannelTimers.set(guildId, timer);
    });
  },
} satisfies BotEvent;
