import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { createLavalink } from "./lavalink.js";
import { loadCommands, loadEvents, registerGuildCommands } from "./loader.js";

const client = new Client({
  // Guilds = servery a kanály, GuildVoiceStates = kdo je ve kterém voice kanálu (nutné pro Lavalink i auto-odchod).
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.commands = new Collection();
client.lavalink = createLavalink(client);

const commands = await loadCommands();
for (const command of commands) client.commands.set(command.data.name, command);
console.log(`[bot] Načteno příkazů: ${commands.length}`);

const events = await loadEvents();
for (const event of events) {
  event.register(client);
  console.log(`[bot] Zaregistrovány události: ${event.name}`);
}

client.once(Events.ClientReady, async (ready) => {
  console.log(`[bot] Přihlášen jako ${ready.user.tag}`);
  try {
    await client.lavalink.init({ id: ready.user.id, username: ready.user.username });
  } catch (err) {
    console.error("[bot] Inicializace Lavalinku selhala:", err);
  }
  try {
    await registerGuildCommands(commands);
  } catch (err) {
    console.error("[bot] Registrace příkazů selhala (zkontroluj DISCORD_CLIENT_ID a DISCORD_GUILD_ID):", err);
  }
});

client.on(Events.Error, (err) => console.error("[bot] Chyba klienta:", err));
process.on("unhandledRejection", (reason) => console.error("[bot] Nezachycená chyba (promise):", reason));
process.on("uncaughtException", (err) => console.error("[bot] Nezachycená výjimka:", err));

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bot] ${signal} - vypínám, odpojuji se z voice kanálů...`);
  const players = [...client.lavalink.players.values()];
  await Promise.allSettled(players.map((p) => p.destroy("Bot se vypíná")));
  await client.destroy();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await client.login(config.discord.token);
