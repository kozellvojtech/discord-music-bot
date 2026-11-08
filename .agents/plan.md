# Plán: soukromý Discord hudební bot

## Cíl
Discord bot (Node 24 LTS + TypeScript + discord.js 14.28) s Lavalinkem v Docker Compose. Přehrává YouTube, YouTube Music a Spotify (přes LavaSrc -> YouTube). Slash příkazy jen pro testovací server.

## Ověřený stav (8. 11. 2026)
| Komponenta | Verze | Poznámka |
|---|---|---|
| Lavalink | 4.2.2 (Docker image, NE alpine) | DAVE od 4.2.0; libdave vyžaduje glibc >= 2.35, alpine (musl) proto nepoužít |
| youtube-plugin | snapshot `2be8e54` (17. 9. 2026) | poslední release 1.18.2 je kvůli SABR rozbitý; verze v .env (`YT_PLUGIN_VERSION`), `snapshot: true` |
| yt-cipher | kontejner vzdáleného cipher serveru | doporučeno maintainerem pluginu; jen v Docker síti |
| LavaSrc | 4.8.3 | fix Spotify `/playlists/{id}/items` nutný pro nové Spotify aplikace |
| lavalink-client | 2.11.0 | DAVE od 2.9.7 |
| discord.js | 14.28.1 | |

Rizika:
- YouTube SABR: plugin zatím SABR neumí přehrát (žádný release). Mitigace: snapshot + remote cipher + pořadí klientů (MUSIC pro hledání; ANDROID_VR, TV, IOS, WEB pro přehrávání) + volitelný OAuth (vedlejší Google účet) a volitelný poToken. Vše přepínatelné v .env.
- Spotify Development Mode (od 2/2026): vlastník aplikace musí mít Premium. Skladby a alba fungují s Client ID/Secret. Playlisty cizích uživatelů vracejí v Dev Mode jen metadata bez skladeb -> playlisty nemusí jít. Volitelná nouzovka: LavaSrc `preferAnonymousToken` (token webového přehrávače, šedá zóna ToS), výchozí vypnuto.
- Docker na tomto PC není nainstalovaný -> uživatel nainstaluje Docker Desktop, jinak nejde ověřit běh v kontejnerech.

## Struktura
```
discord-music-bot/
  docker-compose.yml, Dockerfile, .env.example, .gitignore, .dockerignore, README.md
  lavalink/application.yml
  package.json, tsconfig.json
  src/
    index.ts            klient, načtení příkazů, start
    config.ts           načtení a kontrola .env
    lavalink.ts         LavalinkManager (DAVE, uzel přes Docker DNS)
    types.ts            rozhraní Command
    deploy-commands.ts  registrace příkazů do guildy
    commands/*.ts       play, pause, resume, skip, stop, queue, nowplaying, volume, loop, shuffle, leave
    events/             interactionCreate.ts, playerEvents.ts, autoLeave.ts
    utils/embeds.ts, utils/format.ts, utils/guards.ts
```

## Úkoly (upraveno po kritice Argon High)
| # | Úkol | Kdo | Soubory | Závisí na |
|---|---|---|---|---|
| T0 | Instalace Docker Desktop (WSL2) | uživatel | - | - |
| T1 | Kostra a kontrakty: package.json, tsconfig, .gitignore, config.ts, types.ts, lavalink.ts (raw voice -> sendRawData, init v clientReady, retry), index.ts (dynamické načítání commands/ a events/, intent GuildVoiceStates, registrace guild příkazů při startu, SIGTERM/SIGINT), deploy-commands.ts, utils/guards.ts (hlas. kanál + Connect/Speak), utils/format.ts, utils/embeds.ts (základní verze) | vedoucí (Opus) | uvedené | - |
| T2 | 11 příkazů (/play s deferReply), vylepšení embedů | Argon | src/commands/**, src/utils/embeds.ts | T1 |
| T3 | Události: interactionCreate, playerEvents (now playing, ošetření 10008), autoLeave (prázdný kanál / prázdná fronta, časy z .env) | Argon | src/events/** | T1 |
| T4 | Docker: Dockerfile (multi-stage, USER node), .dockerignore, compose (bridge síť bez `ports` u lavalink a yt-cipher, každé službě jen její proměnné, healthchecky ověřené v image, depends_on healthy, volume na pluginy), lavalink/application.yml (přepínače `enabled: ${...:false}`) | vedoucí (Opus) | docker-compose.yml, Dockerfile, .dockerignore, lavalink/** | - |
| T5 | .env.example s komentáři, README návod (Discord portál, Spotify, Docker Desktop, CasaOS, aktualizace pluginu, OAuth přes `docker compose logs`) | Flash | README.md, .env.example | T1, T4 |
| T6 | Review celku | Argon High (jen čtení) | - | T2-T5 |
| T7 | Sloučení, `npm run build`, `docker compose up`, test přehrávání | vedoucí + uživatel (test v Discordu) | - | T6 |

Paralelně: T2 + T3 (worktree), mezitím T4. T5 po T4. Pořadí slučování: T4 -> T2 -> T3 -> T5.
Kontrolní body: po T1 build; po T2+T3 build; po T4 `docker compose config` a spuštění.
Zamítnuto z kritiky: zúžení MVP (uživatel chce všech 11 příkazů).
