import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import type { BotEvent, Command } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));

async function importDefaults<T>(folder: string): Promise<T[]> {
  const dir = join(here, folder);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.warn(`[loader] Složka ${folder}/ neexistuje, přeskakuji.`);
    return [];
  }
  const modules: T[] = [];
  for (const file of files.sort()) {
    if (!file.endsWith(".js")) continue;
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: T };
    if (mod.default) modules.push(mod.default);
    else console.warn(`[loader] ${folder}/${file} nemá default export, přeskakuji.`);
  }
  return modules;
}

export function loadCommands(): Promise<Command[]> {
  return importDefaults<Command>("commands");
}

export function loadEvents(): Promise<BotEvent[]> {
  return importDefaults<BotEvent>("events");
}

/**
 * Zaregistruje slash příkazy pro servery z DISCORD_GUILD_ID (projeví se hned, globální registrace trvá až hodinu).
 * Selhání u jednoho serveru (např. bot tam ještě není pozvaný) nezastaví registraci u ostatních.
 */
export async function registerGuildCommands(commands: Command[]): Promise<void> {
  const rest = new REST().setToken(config.discord.token);
  const body = commands.map((c) => c.data);
  let failed = 0;
  for (const guildId of config.discord.guildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(config.discord.clientId, guildId), { body });
      console.log(`[loader] Zaregistrováno ${commands.length} příkazů pro server ${guildId}.`);
    } catch (err) {
      failed++;
      console.error(
        `[loader] Registrace příkazů pro server ${guildId} selhala (je tam bot pozvaný s oprávněním applications.commands?):`,
        err,
      );
    }
  }
  if (failed === config.discord.guildIds.length) {
    throw new Error("Příkazy se nepodařilo zaregistrovat na žádném serveru.");
  }
}
