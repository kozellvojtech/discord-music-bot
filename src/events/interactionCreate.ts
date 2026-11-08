import { type ChatInputCommandInteraction, Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { replyError } from "../utils/guards.js";

async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await replyError(interaction, `Neznámý příkaz \`/${interaction.commandName}\`.`);
    return;
  }

  console.log(`[cmd] /${interaction.commandName} od ${interaction.user.tag}`);

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[cmd] Chyba při provádění příkazu /${interaction.commandName}:`, err);
    await replyError(interaction, "Něco se pokazilo…");
  }
}

export default {
  name: "interactionCreate",
  register(client) {
    client.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      void handleChatInputCommand(interaction);
    });
  },
} satisfies BotEvent;
