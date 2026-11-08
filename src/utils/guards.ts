/**
 * Kontroly před příkazy. Každá funkce při neúspěchu SAMA odpoví uživateli (ephemeral)
 * a vrátí null - příkaz pak jen udělá `if (!x) return;`.
 * Funguje s odloženou i neodloženou odpovědí (deferReply).
 */
import {
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  type VoiceBasedChannel,
} from "discord.js";
import type { Player } from "lavalink-client";
import { errorEmbed } from "./embeds.js";

export async function replyError(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
  const payload = { embeds: [errorEmbed(message)] };
  try {
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
    else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error("[guards] Nepodařilo se odeslat chybovou odpověď:", err);
  }
}

/** Uživatel musí být ve voice kanálu a bot tam musí mít oprávnění Připojit + Mluvit (a kanál nesmí být plný). */
export async function requireUserVoice(
  interaction: ChatInputCommandInteraction,
): Promise<{ member: GuildMember; channel: VoiceBasedChannel } | null> {
  if (!interaction.inCachedGuild()) {
    await replyError(interaction, "Tento příkaz funguje jen na serveru.");
    return null;
  }
  const member = interaction.member;
  const channel = member.voice.channel;
  if (!channel) {
    await replyError(interaction, "Nejdřív se připoj do hlasového kanálu.");
    return null;
  }
  const me = interaction.guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (!perms?.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.Connect)) {
    await replyError(interaction, `Nemám oprávnění připojit se do kanálu ${channel}.`);
    return null;
  }
  if (!perms.has(PermissionFlagsBits.Speak)) {
    await replyError(interaction, `V kanálu ${channel} nemám oprávnění mluvit.`);
    return null;
  }
  const botAlreadyThere = me?.voice.channelId === channel.id;
  if (!botAlreadyThere && channel.full && !perms.has(PermissionFlagsBits.MoveMembers)) {
    await replyError(interaction, `Kanál ${channel} je plný.`);
    return null;
  }
  return { member, channel };
}

/**
 * Přehrávač na tomto serveru musí existovat a uživatel musí být ve stejném voice kanálu jako bot.
 * Použij u /pause, /resume, /skip, /stop, /volume, /loop, /shuffle, /leave.
 */
export async function requirePlayer(interaction: ChatInputCommandInteraction): Promise<Player | null> {
  if (!interaction.inCachedGuild()) {
    await replyError(interaction, "Tento příkaz funguje jen na serveru.");
    return null;
  }
  const player = interaction.client.lavalink.getPlayer(interaction.guildId);
  if (!player) {
    await replyError(interaction, "Teď nic nehraje.");
    return null;
  }
  const userChannelId = interaction.member.voice.channelId;
  if (!userChannelId || userChannelId !== player.voiceChannelId) {
    await replyError(interaction, "Musíš být ve stejném hlasovém kanálu jako já.");
    return null;
  }
  return player;
}

/** Jen existence přehrávače (pro /queue a /nowplaying - ty smí použít kdokoli). */
export async function requireAnyPlayer(interaction: ChatInputCommandInteraction): Promise<Player | null> {
  if (!interaction.inCachedGuild()) {
    await replyError(interaction, "Tento příkaz funguje jen na serveru.");
    return null;
  }
  const player = interaction.client.lavalink.getPlayer(interaction.guildId);
  if (!player || !player.queue.current) {
    await replyError(interaction, "Teď nic nehraje.");
    return null;
  }
  return player;
}
