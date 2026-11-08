import type { Client, User } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import { config } from "./config.js";
import type { Requester } from "./types.js";

/** Převede discord.js User (nebo už hotový Requester) na malý objekt uložený u skladby. */
function toRequester(input: unknown): Requester {
  const user = input as Partial<User> & Partial<Requester>;
  if (user && typeof user.id === "string" && "username" in user && typeof user.displayAvatarURL === "function") {
    return {
      id: user.id,
      username: (user as User).globalName ?? (user as User).username,
      avatarUrl: (user as User).displayAvatarURL({ size: 64 }),
    };
  }
  return {
    id: typeof user?.id === "string" ? user.id : "unknown",
    username: typeof user?.username === "string" ? user.username : "neznámý",
    avatarUrl: typeof user?.avatarUrl === "string" ? user.avatarUrl : null,
  };
}

/**
 * Vytvoří LavalinkManager a napojí ho na discord.js klienta.
 * - sendToShard: Lavalink -> Discord (připojení do voice kanálu)
 * - raw: Discord -> Lavalink (VOICE_STATE_UPDATE / VOICE_SERVER_UPDATE, nutné pro zvuk i DAVE)
 * - init: volá se v index.ts po události clientReady
 */
export function createLavalink(client: Client): LavalinkManager {
  const manager = new LavalinkManager({
    nodes: [
      {
        id: "main",
        host: config.lavalink.host,
        port: config.lavalink.port,
        authorization: config.lavalink.password,
        secure: false,
        // Lavalink při prvním startu stahuje pluginy -> zkoušej se připojit déle.
        retryAmount: 30,
        retryDelay: 5_000,
        // Výchozí true volá ws.close(500), což knihovna ws odmítne výjimkou a shodí proces.
        closeOnError: false,
      },
    ],
    sendToShard: (guildId, payload) => {
      client.guilds.cache.get(guildId)?.shard?.send(payload);
    },
    autoSkip: true,
    autoSkipOnResolveError: true,
    emitNewSongsOnly: false,
    playerOptions: {
      defaultSearchPlatform: "ytmsearch",
      applyVolumeAsFilter: false,
      clientBasedPositionUpdateInterval: 1_000,
      requesterTransformer: toRequester,
      onDisconnect: {
        // Když bota někdo vyhodí z kanálu, přehrávač zruš (žádné "duchy").
        destroyPlayer: true,
      },
      // Odchod při prázdné frontě řeší src/events/autoLeave.ts (kvůli zprávě do kanálu).
    },
    queueOptions: {
      maxPreviousTracks: 10,
    },
  });

  client.on("raw", (data) => {
    void manager.sendRawData(data).catch((err: unknown) => {
      console.error("[lavalink] sendRawData selhalo:", err);
    });
  });

  manager.nodeManager.on("connect", (node) => {
    console.log(`[lavalink] Uzel "${node.id}" připojen.`);
    // Když se /v4/info při připojení nepovede načíst, uzel by zůstal "připojený" bez info a hledání by selhávalo.
    if (!node.info) {
      void (async () => {
        for (let attempt = 1; attempt <= 10 && !node.info; attempt++) {
          try {
            node.info = await node.fetchInfo();
            console.log(`[lavalink] Info uzlu "${node.id}" načteno (pokus ${attempt}).`);
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 3_000));
          }
        }
        if (!node.info) console.error(`[lavalink] Info uzlu "${node.id}" se nepodařilo načíst.`);
      })();
    }
  });
  manager.nodeManager.on("disconnect", (node, reason) =>
    console.warn(`[lavalink] Uzel "${node.id}" odpojen:`, reason),
  );
  manager.nodeManager.on("reconnecting", (node) =>
    console.log(`[lavalink] Znovu se připojuji k uzlu "${node.id}"...`),
  );
  manager.nodeManager.on("error", (node, error) =>
    console.error(`[lavalink] Chyba uzlu "${node.id}":`, error?.message ?? error),
  );

  return manager;
}
