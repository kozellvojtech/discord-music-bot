import { SlashCommandBuilder } from "discord.js";
import type { Track } from "lavalink-client";
import { addRelatedTracks, isAutoplayEnabled, setAutoplay } from "../autoplay.js";
import type { Command } from "../types.js";
import { infoEmbed, successEmbed } from "../utils/embeds.js";
import { requirePlayer } from "../utils/guards.js";

const data = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription("Když dojde fronta, bot sám pustí podobné skladby.")
  .addStringOption((opt) =>
    opt
      .setName("rezim")
      .setDescription("Zapnout nebo vypnout (bez volby se přepne)")
      .setRequired(false)
      .addChoices({ name: "Zapnout", value: "on" }, { name: "Vypnout", value: "off" }),
  )
  .toJSON();

export default {
  data,
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const choice = interaction.options.getString("rezim");
    const enable = choice ? choice === "on" : !isAutoplayEnabled(player);
    setAutoplay(player, enable);

    if (!enable) {
      await interaction.reply({ embeds: [infoEmbed("♾️ Autoplay **vypnut**. Po dohrání fronty hudba skončí.")] });
      return;
    }

    // Zapnuto ve chvíli, kdy už nic nehraje -> rovnou navaž na poslední skladbu.
    const lastPlayed = player.queue.previous[0] as Track | undefined;
    if (!player.queue.current && player.queue.tracks.length === 0 && lastPlayed) {
      await interaction.deferReply();
      const added = await addRelatedTracks(player, lastPlayed).catch(() => 0);
      if (added > 0) {
        await player.play();
        await interaction.editReply({
          embeds: [successEmbed(`♾️ Autoplay **zapnut**. Navazuji podobnými skladbami (přidáno ${added}).`)],
        });
      } else {
        await interaction.editReply({
          embeds: [infoEmbed("♾️ Autoplay **zapnut**, ale k poslední skladbě jsem nic podobného nenašel. Pusť něco přes /play.")],
        });
      }
      return;
    }

    await interaction.reply({
      embeds: [successEmbed("♾️ Autoplay **zapnut**. Až dojde fronta, pustím podobné skladby.")],
    });
  },
} satisfies Command;
