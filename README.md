# Discord Music Bot

Jednoduchý a spolehlivý soukromý hudební bot pro Discord s podporou YouTube a Spotify, běžící v Docker Compose.

---

## 1. Co to je

Tento projekt je soukromý hudební bot pro Discord postavený na moderní knihovně discord.js a audio serveru Lavalink. Bot běží kompletně v izolovaných Docker kontejnerech, takže na svůj počítač nebo server nemusíš instalovat Node.js ani Javu. O samotné přehrávání a dešifrování zvuku z YouTube a Spotify se stará Lavalink spolu s pomocnou službou yt-cipher. Celý systém je navržen tak, aby byl stabilní, bezpečný a snadno udržovatelný i pro začátečníky.

### Schéma architektury

```
Discord <-> bot (Node.js) <-> Lavalink (+ youtube-plugin, LavaSrc) <-> yt-cipher
```

### Seznam dostupných příkazů

- `/play` – Vyhledá skladbu nebo přehraje zadaný odkaz z YouTube či Spotify a zařadí skladbu do fronty.
- `/pause` – Pozastaví právě hrající skladbu.
- `/resume` – Znovu spustí dříve pozastavenou skladbu.
- `/skip` – Přeskočí aktuálně hrající skladbu a spustí další v pořadí.
- `/stop` – Zastaví přehrávání, smaže celou frontu a vyresetuje přehrávač.
- `/queue` – Zobrazí přehledný seznam všech skladeb aktuálně čekajících ve frontě.
- `/nowplaying` – Zobrazí podrobné informace o právě přehrávané skladbě včetně grafického ukazatele času.
- `/volume` – Umožňuje upravit hlasitost přehrávání v rozsahu 0 až 150 %.
- `/loop` – Přepíná režim opakování mezi vypnutým stavem, opakováním jedné skladby a opakováním celé fronty.
- `/shuffle` – Náhodně promíchá pořadí zbývajících skladeb ve frontě.
- `/leave` – Odpojí bota z hlasového kanálu a vymaže frontu přehrávače.

---

## 2. Co budeš potřebovat

Před začátkem si připrav následující věci:

1. **Discord účet a vlastní server**: Potřebuješ Discord server, na kterém máš administrátorská práva pro přidávání botů.
2. **Spotify účet s předplatným Premium**: Od února 2026 Spotify vyžaduje Premium účet pro vytváření a běh vývojářských aplikací v režimu Development Mode.
3. **Docker**:
   - Pokud používáš Windows, nainstaluj si **Docker Desktop**.
   - Pokud používáš domácí server s **CasaOS**, Docker je již připraven a součástí systému.

---

## 3. Krok 1: Discord Developer Portal

Všechny potřebné klíče pro komunikaci bota s Discordem získáš v oficiálním portálu.

1. Otevři v prohlížeči [Discord Developer Portal](https://discord.com/developers/applications).
2. Přihlas se ke svému Discord účtu.
3. Vpravo nahoře klikni na tlačítko **New Application**.
4. Zadej libovolný název (například `MujHudebniBot`), potvrď podmínky a klikni na **Create**.
5. V levém menu otevři záložku **General Information**:
   - Najdi položku **Application ID**.
   - Klikni na tlačítko **Copy**.
   - Tuto hodnotu si ulož, přijde do proměnné `DISCORD_CLIENT_ID` v souboru `.env`.
6. V levém menu přejdi do záložky **Bot**:
   - Klikni na tlačítko **Reset Token** a volbu potvrď.
   - Klikni na **Copy** a token si ulož. Přijde do proměnné `DISCORD_TOKEN`.
   - Tento token nikomu neukazuj ani neposílej. Pokud by unikl, okamžitě ho na stejném místě resetuj.
   - Vypni přepínač **Public Bot** (chceme soukromého bota pouze pro tvůj server).
   - Sekci *Privileged Gateway Intents* nech vypnutou. Bot tyto rozšířené pravomoci nepotřebuje.
7. Nastavení instalace a pozvání bota na server:
   - V záložce **Installation** nastav volbu **Install Link** na `None` (když je Public Bot vypnutý, Discord toto nastavení vyžaduje).
   - V levém menu přejdi do **OAuth2** -> **URL Generator**.
   - V sekci **Scopes** zaškrtni dvě pole: `bot` a `applications.commands`.
   - V nově zobrazené sekci **Bot Permissions** zaškrtni následující oprávnění:
     - View Channels
     - Send Messages
     - Embed Links
     - Read Message History
     - Connect
     - Speak
     - Use Voice Activity
   - Dole na stránce se vygeneruje odkaz v poli **Generated URL**.
   - Klikni na **Copy**, otevři tento odkaz v nové záložce prohlížeče, vyber svůj server a klikni na **Authorize** (Autorizovat).
8. Získání ID tvého Discord serveru:
   - Otevři aplikaci Discord na svém počítači.
   - Přejdi do **Nastavení uživatele** (ozubené kolečko vlevo dole) -> **Pokročilé**.
   - Zapni přepínač **Režim vývojáře**.
   - Vrať se na Discord, klikni pravým tlačítkem myši na ikonu svého serveru v levém pruhu a zvol **Kopírovat ID serveru**.
   - Tuto hodnotu si ulož do proměnné `DISCORD_GUILD_ID`.

---

## 4. Krok 2: Spotify Developer Dashboard

Aby bot uměl načítat a převádět odkazy ze Spotify, potřebuje vlastní aplikaci v rozhraní Spotify.

1. Otevři v prohlížeči [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Přihlas se svým Spotify účtem, který má aktivní předplatné **Premium**, a odsouhlas vývojářské podmínky.
3. Klikni na tlačítko **Create app**.
4. Vyplň formulář:
   - **App name**: libovolný název (například `Discord Bot`).
   - **App description**: krátký popis (například `Hudebni bot`).
   - **Redirect URIs**: zadej přesně adresu `http://127.0.0.1:8888/callback` (bot toto přesměrování sice nepotřebuje, ale formulář Spotify vyžaduje platnou URL).
   - V sekci **Which API/SDKs are you planning to use?** zaškrtni **Web API**.
   - Zaškrtnutím potvrď souhlas s podmínkami a klikni na tlačítko **Save**.
5. Na stránce své nově vytvořené aplikace klikni na tlačítko **Settings**:
   - V sekci *Basic Information* zkopíruj hodnotu **Client ID** a ulož ji do `SPOTIFY_CLIENT_ID`.
   - Klikni na odkaz **View client secret**, zkopíruj zobrazený tajný klíč a ulož ho do `SPOTIFY_CLIENT_SECRET`.
6. Běžní uživatelé na tvém Discord serveru se do Spotify přihlašovat nemusí. Bot používá tato vývojářská data samostatně na pozadí.
7. **Omezení Development Mode**: V tomto vývojářském režimu bez problémů funguje vyhledávání i přehrávání jednotlivých skladeb a celých alb. U playlistů je to horší: Spotify v tomto režimu vrací skladby jen z playlistů, které patří přihlášenému uživateli. Bot se ale tvým účtem nepřihlašuje (používá jen Client ID a Secret), takže playlist může přijít prázdný - i ten tvůj. Možné řešení tohoto omezení najdeš v kapitole 10 (Pokročilé).

---

## 5. Krok 3: Instalace Dockeru

### Varianta A: Windows

1. Stáhni si instalátor z oficiální stránky [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Spusť instalátor a během instalace ponechej zaškrtnutou volbu **Use WSL 2 instead of Hyper-V**.
3. Po dokončení instalace restartuj počítač.
4. Po startu Windows spusť aplikaci Docker Desktop a počkej, až se v levém dolním rohu rozsvítí zelená ikona s nápisem **Engine running**.
5. Otevři PowerShell a zkontroluj správnost instalace spuštěním těchto příkazů:

```bash
docker version
```

```bash
docker compose version
```

### Varianta B: CasaOS (domácí server)

1. Docker i Docker Compose jsou v systému CasaOS již předinstalované.
2. Vytvoř na serveru složku pro bota (například `/DATA/AppData/discord-music-bot`).
3. Nahraj do této složky všechny soubory projektu (můžeš využít webovou aplikaci *Soubory* v CasaOS, příkaz `scp` nebo `git clone`).
4. Veškeré příkazy spouštěj ze složky projektu přes SSH terminál nebo vestavěný webový terminál v CasaOS.
5. Upozornění: Nedoporučujeme bota vytvářet přes tlačítko "Custom Install" ve webovém rozhraní CasaOS, protože se kód bota staví z lokálního souboru `Dockerfile`.

---

## 6. Krok 4: Nastavení .env

Konfigurace bota se načítá ze souboru `.env`. Pro začátek si vytvoř kopii připravené šablony.

1. Zkopíruj soubor `.env.example` do nového souboru s názvem `.env`.

Na Windows (v PowerShellu):
```bash
Copy-Item .env.example .env
```

Na Linuxu / CasaOS:
```bash
cp .env.example .env
```

2. Otevři nově vytvořený soubor `.env` ve svém oblíbeném textovém editoru (např. Poznámkový blok, VS Code nebo nano).
3. Doplň získané hodnoty:
   - `DISCORD_TOKEN`: token tvého bota.
   - `DISCORD_CLIENT_ID`: ID tvé aplikace z Discord portálu.
   - `DISCORD_GUILD_ID`: ID tvého Discord serveru. Víc serverů odděl čárkou: `DISCORD_GUILD_ID=111...,222...` (bot musí být na každý z nich pozvaný odkazem z kapitoly 3).
   - `SPOTIFY_CLIENT_ID`: klientské ID ze Spotify dashboardu.
   - `SPOTIFY_CLIENT_SECRET`: klientský tajný klíč ze Spotify dashboardu.
   - Ostatní hodnoty můžeš ponechat ve výchozím nastavení, nebo upravit hesla `LAVALINK_PASSWORD` a `YT_CIPHER_TOKEN` na libovolné náhodné řetězce.
4. Ulož soubor.
5. Důležité upozornění: Soubor `.env` nikdy nenahrávej na GitHub ani do veřejných úložišť. Obsahuje tvé soukromé přístupy. Soubor je chráněn záznamem v `.gitignore`.

---

## 7. Krok 5: Spuštění

1. V terminálu přejdi do kořenové složky projektu.
2. Spusť celou sadu kontejnerů na pozadí:

```bash
docker compose up -d --build
```

3. První spuštění může trvat 1 až 3 minuty. Během této doby Docker stahuje potřebné obrazy a Lavalink si stahuje pluginy z internetu.
4. Zkontroluj průběžné logy všech běžících služeb:

```bash
docker compose logs -f
```

Pokud tě zajímají pouze podrobné logy Lavalinku, spusť:

```bash
docker compose logs -f lavalink
```

5. Úspěšné spuštění poznáš podle následujících řádků v logu služby `bot`:
   - `Přihlášen jako...`
   - `Uzel "main" připojen`
   - `Zaregistrováno 11 příkazů`
6. Otevři Discord, připoj se do libovolného hlasového kanálu na svém serveru a vyzkoušej bota příkazem:
   `/play never gonna give you up`
7. Užitečné příkazy pro správu bota:

Zastavení všech služeb:
```bash
docker compose down
```

Restart po úpravě nastavení v souboru `.env`:
```bash
docker compose up -d
```

Nový překlad a restart po změně zdrojového kódu bota:
```bash
docker compose up -d --build
```

---

## 8. Aktualizace YouTube pluginu

YouTube pravidelně provádí změny ve svém přehrávači. Aktualizace pluginu je nejčastějším krokem, když YouTube videa náhle přestanou hrát.

### Kde hledat nové verze

- Oficiální vydané verze (Releases): [youtube-source releases](https://github.com/lavalink-devs/youtube-source/releases)
- Nejnovější vývojové verze (Commits): [youtube-source commits](https://github.com/lavalink-devs/youtube-source/commits/main)

### Postup aktualizace

1. Pokud vyšel nový oficiální release (například `1.19.0`), uprav v souboru `.env` řádky:
   ```env
   YT_PLUGIN_VERSION=1.19.0
   YT_PLUGIN_SNAPSHOT=false
   ```
2. Pokud je oprava zatím dostupná pouze jako vývojový commit, zkopíruj celý 40místný hash daného commitu a nastav:
   ```env
   YT_PLUGIN_VERSION=2be8e542d3f6f178e048dca565892684c2e40177
   YT_PLUGIN_SNAPSHOT=true
   ```
3. Znovu spusť kontejner Lavalink, aby se nová verze pluginu stáhla:

```bash
docker compose up -d --force-recreate lavalink
```

4. Zkontroluj logy a ověř, že se nový plugin v pořádku načetl:

```bash
docker compose logs -f lavalink
```

Stejným způsobem můžeš v souboru `.env` upravovat i proměnné `LAVALINK_VERSION` a `LAVASRC_VERSION`. Pro stažení novějších verzí základních Docker obrazů použij:

```bash
docker compose pull
```

---

## 9. YouTube OAuth (volitelné)

Pokud YouTube začne blokovat požadavky z tvé IP adresy a v logu Lavalinku se objeví hláška `"Sign in to confirm you're not a bot"` nebo `"This video requires login"`, je potřeba aktivovat přihlášení přes YouTube OAuth.

> [!WARNING]
> Pro přihlášení použij výhradně **vedlejší (sekundární) Google účet**. Při přehrávání většího množství hudby hrozí ze strany společnosti Google dočasné nebo trvalé zablokování účtu.

### Postup spárování

1. Otevři soubor `.env`, nastav `YT_OAUTH_ENABLED=true` a hodnotu `YT_OAUTH_REFRESH_TOKEN=` ponech prázdnou.
2. Znovu spusť službu Lavalink:

```bash
docker compose up -d --force-recreate lavalink
```

3. Otevři log Lavalinku:

```bash
docker compose logs -f lavalink
```

4. V logu vyhledej řádek s odkazem [https://www.google.com/device](https://www.google.com/device) a jedinečným textovým kódem.
5. Otevři tento odkaz v internetovém prohlížeči, zadej zobrazený kód a přihlas se svým vedlejším Google účtem.
6. Po úspěšném schválení se v logu Lavalinku vypíše vygenerovaný refresh token.
7. Zkopíruj tento řetězec a vlož ho do souboru `.env` k proměnné `YT_OAUTH_REFRESH_TOKEN`.
8. Znovu restartuj kontejner Lavalink, aby se token uložil natrvalo:

```bash
docker compose up -d --force-recreate lavalink
```

Pokud bys token do souboru `.env` neuložil, celý proces párování by se opakoval při každém restartu kontejneru.

---

## 10. Pokročilé (volitelné)

### Proof of Origin Token (poToken)

- poToken slouží jako dodatečné ověření pravosti požadavků odesílaných na servery YouTube.
- Pokud je potřeba jej použít, otevři soubor `lavalink/application.yml` a v sekci `youtube` odkomentuj blok `pot:` (položky `token` a `visitorData`).
- Tento token lze vygenerovat pomocí externích nástrojů, například [youtube-trusted-session-generator](https://github.com/iv-org/youtube-trusted-session-generator).
- Pamatuj, že platnost poTokenu je časově omezená a po vypršení je nutné jej vygenerovat znovu.

### Přehrávání cizích playlistů ze Spotify (cookie sp_dc)

Ve výchozím vývojářském režimu Spotify API bez přihlášeného uživatele nevrací skladby z playlistů. Tento limit lze obejít použitím přihlašovací cookie:

1. Otevři webový přehrávač [open.spotify.com](https://open.spotify.com) ve svém prohlížeči a přihlas se.
2. Stiskni klávesu `F12` pro otevření vývojářských nástrojů prohlížeče.
3. Přejdi do záložky **Application** (v prohlížeči Chrome/Edge) nebo **Úložiště** (ve Firefoxu).
4. V levém panelu rozbal položku **Cookies** a klikni na `https://open.spotify.com`.
5. Vyhledej cookie s názvem `sp_dc` a zkopíruj její dlouhou textovou hodnotu.
6. Otevři soubor `.env`, vlož hodnotu do `SPOTIFY_SP_DC` a nastav proměnnou `SPOTIFY_PREFER_PARTNER_API=true`.
7. Ulož změny a restartuj bota:

```bash
docker compose up -d
```

> [!CAUTION]
> Použití cookie `sp_dc` představuje šedou zónu v podmínkách používání služby Spotify. Hodnota cookie slouží jako plnohodnotné heslo k danému účtu. Používej výhradně vedlejší Spotify účet a postupuj výhradně na vlastní nebezpečí!

---

## 11. Řešení problémů

| Příznak problému | Pravděpodobná příčina | Řešení |
| :--- | :--- | :--- |
| Slash příkazy (`/play` atd.) se v Discordu vůbec nezobrazují. | 1. V `.env` je špatně zadané `DISCORD_GUILD_ID`.<br>2. Bot nebyl pozván s oprávněním (scope) `applications.commands`.<br>3. Discord klient ještě neaktualizoval seznam příkazů. | 1. Zkontroluj ID serveru v `.env`.<br>2. Pozvi bota znovu s vygenerovaným odkazem z kapitoly 3.<br>3. V Discord aplikaci stiskni `Ctrl + R` pro obnovení rozhraní. |
| Bot se připojí do voice kanálu, ale skladba nehraje. | 1. YouTube blokuje požadavky (v logu je `All clients failed`).<br>2. Stará verze Lavalinku bez podpory nového Discord DAVE šifrování (chyba 4017). | 1. Aktualizuj YouTube plugin v `.env` na novější verzi nebo zapni YouTube OAuth (kapitola 9).<br>2. Ověř, že `LAVALINK_VERSION` je alespoň `4.2.0` (výchozí je 4.2.2) a nepoužíváš alpine variantu. |
| V logu bota se neustále opakuje zpráva `Uzel "main" odpojen`. | 1. Nesouhlasí heslo `LAVALINK_PASSWORD` mezi botem a Lavalinkem.<br>2. Lavalink ještě nedokončil start a stahování pluginů. | 1. Zkontroluj, zda máš v `.env` správně nastavené `LAVALINK_PASSWORD`.<br>2. Počkej 1 až 2 minuty na dokončení startu a prověř `docker compose logs lavalink`. |
| Spotify hlásí v logu chybu 401 nebo 403. | 1. Neplatné údaje `SPOTIFY_CLIENT_ID` nebo `SPOTIFY_CLIENT_SECRET`.<br>2. Na Spotify účtu vypršelo předplatné Premium. | 1. Překontroluj hodnoty v `.env` proti údajům ve Spotify Developer Dashboardu.<br>2. Zkontroluj stav předplatného Premium na svém Spotify účtu. |
| Spotify playlist se načte, ale je zcela prázdný. | Omezení režimu Spotify Development Mode (bot se nepřihlašuje uživatelským účtem). | Pusť jednotlivé skladby nebo album, stejný playlist najdi na YouTube Music, nebo nastav cookie `sp_dc` podle návodu v kapitole 10. |

---

## 12. Bezpečnost

- **Nikdy nesdílej soubor `.env`**: Soubor obsahuje citlivé přístupové tokeny k Discordu i Spotify. Nikdy jej necommituj do repozitáře ani neposílej dalším lidem.
- **Izolace portů v Docker síti**: Služby `lavalink` ani `yt-cipher` nemají v souboru `docker-compose.yml` nastavenou sekci `ports:`, ale pouze vnitřní směrování `expose:`. Nejsou tedy dostupné z internetu ani z tvé lokální sítě a komunikují výhradně s botem uvnitř zabezpečené Docker sítě `music`.
- **Rychlá náprava při úniku tokenu**: Pokud dojde k nechtěnému odhalení tokenu bota, neprodleně otevři [Discord Developer Portal](https://discord.com/developers/applications), přejdi do sekce **Bot** a klikni na **Reset Token**. Tím původní kompromitovaný token okamžitě zneplatníš.
