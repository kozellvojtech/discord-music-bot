/** Milisekundy -> "3:07" nebo "1:02:45". Živé streamy -> "🔴 LIVE". */
export function formatDuration(ms: number | undefined | null, isStream = false): string {
  if (isStream) return "🔴 LIVE";
  if (!ms || ms < 0 || !Number.isFinite(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Zkrátí text na `max` znaků a přidá "…". */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

/** Textový ukazatel průběhu, např. "▬▬▬🔘▬▬▬▬▬▬". */
export function progressBar(positionMs: number, durationMs: number, size = 15): string {
  if (!durationMs || durationMs <= 0) return "▬".repeat(size);
  const ratio = Math.min(Math.max(positionMs / durationMs, 0), 1);
  const index = Math.min(size - 1, Math.round(ratio * (size - 1)));
  return `${"▬".repeat(index)}🔘${"▬".repeat(size - index - 1)}`;
}

/** Bezpečný text pro Markdown v embedech (hranaté závorky by rozbily odkazy). */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_`~|[\]])/g, "\\$1");
}
