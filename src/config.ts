/**
 * Načtení konfigurace z proměnných prostředí (.env předává Docker Compose).
 * Chybějící povinné hodnoty ukončí bota se srozumitelnou chybou.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[config] Chybí povinná proměnná prostředí ${name}. Doplň ji do souboru .env.`);
    process.exit(1);
  }
  return value;
}

function optionalInt(name: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < min || value > max) {
    console.warn(`[config] ${name}="${raw}" je neplatné, používám ${fallback}.`);
    return fallback;
  }
  return value;
}

export const config = {
  discord: {
    token: required("DISCORD_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
    guildId: required("DISCORD_GUILD_ID"),
  },
  lavalink: {
    host: process.env.LAVALINK_HOST?.trim() || "lavalink",
    port: optionalInt("LAVALINK_PORT", 2333, 1, 65535),
    password: required("LAVALINK_PASSWORD"),
  },
  player: {
    /** Výchozí hlasitost nového přehrávače (0-150). */
    defaultVolume: optionalInt("DEFAULT_VOLUME", 80, 0, 150),
    /** Po kolika sekundách odejít, když je fronta prázdná. */
    idleTimeoutSeconds: optionalInt("IDLE_TIMEOUT_SECONDS", 180, 10),
    /** Po kolika sekundách odejít, když ve voice kanálu nezůstal žádný člověk. */
    emptyChannelTimeoutSeconds: optionalInt("EMPTY_CHANNEL_TIMEOUT_SECONDS", 60, 0),
    /** Maximální počet skladeb ve frontě (ochrana proti obřím playlistům). */
    maxQueueSize: optionalInt("MAX_QUEUE_SIZE", 500, 1),
  },
} as const;
