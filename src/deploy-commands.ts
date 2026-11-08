/**
 * Ruční registrace slash příkazů: `npm run deploy-commands` (po `npm run build`).
 * Normálně to není potřeba - bot příkazy registruje sám při každém startu.
 */
import { loadCommands, registerGuildCommands } from "./loader.js";

try {
  const commands = await loadCommands();
  await registerGuildCommands(commands);
  process.exit(0);
} catch (err) {
  console.error("[deploy] Registrace příkazů selhala:", err);
  process.exit(1);
}
