/**
 * Autoplay: když dojde fronta a je zapnutý /autoplay, přidá podobné skladby z YouTube Mixu.
 * Spotify a jiné zdroje se nejdřív dohledají na YouTube Music, aby šlo Mix načíst.
 */
import type { Player, Track } from "lavalink-client";
import type { Requester } from "./types.js";

const AUTOPLAY_KEY = "autoplay";
/** Kolik skladeb přidat najednou (další dávka přijde, až zase dojdou). */
const BATCH_SIZE = 5;

export const AUTOPLAY_REQUESTER: Requester = { id: "autoplay", username: "Autoplay", avatarUrl: null };

export function isAutoplayEnabled(player: Player): boolean {
  return player.getData(AUTOPLAY_KEY) === true;
}

export function setAutoplay(player: Player, enabled: boolean): void {
  player.setData(AUTOPLAY_KEY, enabled);
}

function normalize(title: string | undefined): string {
  return (title ?? "")
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/official|video|audio|lyrics?|hd|4k|remaster(ed)?/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Najde podobné skladby k `seed` a přidá je na konec fronty. Vrací počet přidaných. */
export async function addRelatedTracks(player: Player, seed: Track): Promise<number> {
  let videoId = seed.info.sourceName === "youtube" ? seed.info.identifier : undefined;
  if (!videoId) {
    const found = await player.search(
      { query: `${seed.info.author ?? ""} ${seed.info.title ?? ""}`.trim(), source: "ytmsearch" },
      AUTOPLAY_REQUESTER,
    );
    videoId = found.tracks[0]?.info.identifier;
  }
  if (!videoId) return 0;

  const mix = await player.search(
    { query: `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}` },
    AUTOPLAY_REQUESTER,
  );

  // Neopakuj nic, co právě hrálo, nedávno hrálo nebo už čeká ve frontě.
  const known = [seed, ...player.queue.previous, ...player.queue.tracks];
  const seenIds = new Set<string>([videoId, ...known.map((t) => t.info.identifier ?? "")]);
  const seenTitles = new Set<string>(known.map((t) => normalize(t.info.title)));

  const picked: Track[] = [];
  for (const track of mix.tracks as Track[]) {
    if (picked.length >= BATCH_SIZE) break;
    if (track.info.isStream) continue;
    const title = normalize(track.info.title);
    if (seenIds.has(track.info.identifier) || seenTitles.has(title)) continue;
    seenIds.add(track.info.identifier);
    seenTitles.add(title);
    picked.push(track);
  }
  if (picked.length > 0) await player.queue.add(picked);
  return picked.length;
}

/** Napojuje se do LavalinkManageru jako playerOptions.onEmptyQueue.autoPlayFunction. */
export async function autoPlayFunction(player: Player, lastTrack: Track | null | undefined): Promise<void> {
  if (!isAutoplayEnabled(player) || !lastTrack) return;
  try {
    const added = await addRelatedTracks(player, lastTrack);
    if (added === 0) console.warn(`[autoplay] Pro „${lastTrack.info.title}“ se nenašly žádné podobné skladby.`);
  } catch (err) {
    console.warn("[autoplay] Hledání podobných skladeb selhalo:", err);
  }
}
