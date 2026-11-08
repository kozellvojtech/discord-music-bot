import type {
  ChatInputCommandInteraction,
  Client,
  Collection,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { LavalinkManager } from "lavalink-client";

/** Kdo skladbu přidal - ukládá se do track.requester (viz requesterTransformer v lavalink.ts). */
export interface Requester {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/** Jeden slash příkaz. Každý soubor v src/commands/ exportuje `default` tohoto typu. */
export interface Command {
  /** Definice příkazu - typicky `new SlashCommandBuilder()...toJSON()`. */
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/** Jedna skupina událostí. Každý soubor v src/events/ exportuje `default` tohoto typu. */
export interface BotEvent {
  /** Krátký název pro log. */
  name: string;
  /** Zaregistruje posluchače na `client` a/nebo `client.lavalink`. Volá se jednou při startu, před přihlášením. */
  register(client: Client): void;
}

declare module "discord.js" {
  interface Client {
    lavalink: LavalinkManager;
    commands: Collection<string, Command>;
  }
}
