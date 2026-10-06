# Anambra Life

A free, mobile-first browser life game set in Anambra State, Nigeria. Trade in Onitsha, build a parts business in Nnewi, run for office in Awka, and climb the Anambra Forbes list, from Broke to Big Man.

**Play:** https://benito3262.github.io/anambra-life/

## Features
- Character creation (name, skin, outfit, head style, starting town), progress saved on the device
- 18 towns on a real Leaflet + OpenStreetMap map (Onitsha, Nnewi, Awka, Nkpor, Obosi, Ogidi, Abagana, Amawbia, Agulu, Nnobi, Oba, Ozubulu, Ihiala, Ekwulobia, Igbo-Ukwu, Oko, Umunze, Otuocha/Aguleri), each with its own cost of living, opportunity size, market day, NEPA odds and cheap/dear goods
- Real landmarks with checked coordinates: Onitsha Main Market, Ochanja Market, Niger Bridge, Upper Iweka/Iweka Road, Nkwo Nnewi, Eke Awka, UNIZIK, Agulu Lake, Igbo-Ukwu Museum, Federal Polytechnic Oko, Aguleri
- Walkable top-down towns (D-pad, keyboard, or tap to walk), art drawn in code
- Trading with price swings, market days, wholesale and haggling with retail customers, boat cargo lots, bulk supplier deals
- Wealth ladder: Broke → Hawker → Trader → Shop Owner → Warehouse Boss → Importer → Industrialist → Big Man (Billionaire), with level-ups and level-downs
- Igba Boi apprenticeship (Onitsha and Nnewi) with honesty tests and settlement
- Shops, sales boys, warehouses, container imports (ship can sink, customs can hold or seize), Nnewi workshop → factory → industrial plant, Otuocha rice farms, country mansion
- Rent and houses, NEPA light cuts and generators, chop money, keke/okada/bus travel priced on real distance
- Microfinance savings, loans, insurance and esusu (with emergency early turn)
- Awka politics: parties, influence, endorsements, campaigns, elections (Ward → LGA → State Assembly), contracts with consequences
- Socialising, nightlife, dating and Igba Nkwu wedding
- Phone: NPC suppliers, customers, rivals, family, politicians, love interests, plus private DMs with real players
- Town Square chat (global and per town): real players (LIVE) plus NPC chatter
- Anambra Forbes: fictional tycoons plus real players, weekly in-game updates with a reveal screen
- Billboards marked "Your business here" (placeholder, not wired to payments), coin shop placeholder, live stats

## Live backend
Supabase free plan. The client only uses the public publishable key and calls the RPCs `upsert_player`, `send_message`, `send_dm`, `get_dms`. Identity is a random per-device player id and secret in localStorage. If Supabase is unreachable the game runs offline with simulated chat.

## Run locally
Any static server works: `python3 -m http.server` in this folder, then open http://localhost:8000.

All people, businesses, tycoons and parties in the game are fictional. Map data © OpenStreetMap contributors.
