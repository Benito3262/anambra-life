/* Anambra Life - game data. All people, businesses and parties are fictional. */
var D = {};

D.MARKET_DAYS = ["Eke", "Orie", "Afo", "Nkwo"];

D.GOODS = {
  water:  { name: "Pure water (bag)",   base: 300,    load: 1, icon: "💧" },
  yam:    { name: "Yam (tuber)",        base: 2000,   load: 1, icon: "🍠" },
  ankara: { name: "Ankara (bundle)",    base: 16000,  load: 1, icon: "🧵" },
  parts:  { name: "Brake pad set",      base: 18000,  load: 1, icon: "⚙️" },
  provis: { name: "Provisions (carton)",base: 13000,  load: 2, icon: "📦" },
  cement: { name: "Cement (bag)",       base: 9500,   load: 3, icon: "🧱" },
  tyre:   { name: "Okada tyre",         base: 26000,  load: 2, icon: "🛞" },
  oil:    { name: "Palm oil (25L)",     base: 48000,  load: 3, icon: "🛢️" },
  rice:   { name: "Rice (50kg bag)",    base: 72000,  load: 4, icon: "🌾" },
  phone:  { name: "Android phone",      base: 110000, load: 1, icon: "📱" }
};
D.GOOD_IDS = Object.keys(D.GOODS);

/* Wealth ladder by net worth */
D.LEVELS = [
  { name: "Broke",            min: 0,          color: "#8a8a8a", unlock: "Do shifts, hawk pure water, join an apprenticeship." },
  { name: "Hawker",           min: 30000,      color: "#c98a2b", unlock: "Wheelbarrow upgrade. Trade between towns." },
  { name: "Trader",           min: 250000,     color: "#2b9c5a", unlock: "Rent a shop in any market." },
  { name: "Shop Owner",       min: 1500000,    color: "#2b78c9", unlock: "Rent warehouses. Open a workshop in Nnewi. Hire a sales boy." },
  { name: "Warehouse Boss",   min: 10000000,   color: "#7b3fc9", unlock: "Import containers at Onitsha waterside." },
  { name: "Importer",         min: 60000000,   color: "#c93f7b", unlock: "Build a real factory in Nnewi. Build your country home." },
  { name: "Industrialist",    min: 400000000,  color: "#c9402b", unlock: "Industrial plant. Run for big seats with big money." },
  { name: "Big Man (Billionaire)", min: 2000000000, color: "#d4a017", unlock: "You don reach. Odogwu! Now climb Anambra Forbes." }
];

/* Towns. lat/lon verified from OpenStreetMap Nominatim (Amawbia from Wikidata Q19460191).
   cost = cost of living multiplier (rent, food). opp = opportunity (customers, deal size).
   md = market day index (0 Eke,1 Orie,2 Afo,3 Nkwo), -1 = busy every day.
   cheap/dear = price multipliers per good. light = chance of NEPA light per day. */
D.TOWNS = {
  onitsha: { name: "Onitsha", lat: 6.14616, lon: 6.80191, cost: 1.9, opp: 2.0, md: -1, size: "big", light: 0.5,
    tag: "Commercial city. Main Market, the Niger Bridge, Upper Iweka. Big money, big rent.",
    cheap: { ankara: 0.8, phone: 0.85, provis: 0.85, water: 0.95 }, dear: { yam: 1.15, rice: 1.08, oil: 1.1 },
    pois: ["market","park","bridge","waterside","master","shop","import","house","bar","club","bank","job","warehouse"] },
  nnewi: { name: "Nnewi", lat: 6.01953, lon: 6.91718, cost: 1.5, opp: 1.6, md: 3, size: "big", light: 0.55,
    tag: "Spare parts capital. Nkwo Nnewi market and local factories. Made-in-Nigeria energy.",
    cheap: { parts: 0.72, tyre: 0.78 }, dear: { ankara: 1.08, rice: 1.05 },
    pois: ["market","park","master","shop","factory","house","bar","bank","job","warehouse"] },
  awka: { name: "Awka", lat: 6.21895, lon: 7.07744, cost: 1.6, opp: 1.5, md: 0, size: "big", light: 0.62,
    tag: "State capital. Government House area, UNIZIK, the blacksmith quarter. Politics everywhere.",
    cheap: { cement: 0.95 }, dear: { phone: 1.15, parts: 1.18, rice: 1.12, yam: 1.1 },
    pois: ["market","park","party","govt","unizik","forge","shop","house","bar","club","bank","job"] },
  nkpor: { name: "Nkpor", lat: 6.14555, lon: 6.83372, cost: 1.4, opp: 1.4, md: 1, size: "mid", light: 0.45,
    tag: "Busy junction next to Onitsha. Cheaper rent, plenty traffic.",
    cheap: { cement: 0.85, provis: 0.9 }, dear: { yam: 1.1 },
    pois: ["market","park","shop","house","bar","bank","job","warehouse"] },
  obosi: { name: "Obosi", lat: 6.11597, lon: 6.83359, cost: 1.3, opp: 1.1, md: 2, size: "mid", light: 0.5,
    tag: "Quiet base for Onitsha traders. Good rent, short keke to the market.",
    cheap: { cement: 0.88 }, dear: { phone: 1.05 },
    pois: ["market","park","house","bar","bank","job"] },
  ogidi: { name: "Ogidi", lat: 6.15269, lon: 6.86683, cost: 1.15, opp: 1.0, md: 0, size: "small", light: 0.45,
    tag: "Old town of storytellers on the Onitsha-Awka road. Calm and affordable.",
    cheap: { yam: 0.9 }, dear: { ankara: 1.1 },
    pois: ["market","park","house","bar","job"] },
  abagana: { name: "Abagana", lat: 6.18573, lon: 6.98412, cost: 0.95, opp: 0.85, md: 1, size: "small", light: 0.4,
    tag: "Farm town between Onitsha and Awka. Cheap living, cheap food.",
    cheap: { yam: 0.82, oil: 0.9 }, dear: { phone: 1.12, parts: 1.1 },
    pois: ["market","park","house","bar","job"] },
  amawbia: { name: "Amawbia", lat: 6.2, lon: 7.0478, cost: 1.25, opp: 1.0, md: 2, size: "small", light: 0.55,
    tag: "Next door to Awka. Civil servants live here. Rent lower than Awka.",
    cheap: {}, dear: { phone: 1.08, provis: 1.05 },
    pois: ["market","park","house","bar","job"] },
  agulu: { name: "Agulu", lat: 6.11, lon: 7.0724, cost: 0.95, opp: 0.85, md: 3, size: "small", light: 0.4,
    tag: "Home of the famous lake. Peaceful. Good for rest and farm produce.",
    cheap: { yam: 0.85, oil: 0.88 }, dear: { parts: 1.12, tyre: 1.1 },
    pois: ["market","park","lake","house","bar","job"] },
  nnobi: { name: "Nnobi", lat: 6.04818, lon: 6.94847, cost: 0.95, opp: 0.85, md: 0, size: "small", light: 0.4,
    tag: "Farming community near Nnewi. Low cost, steady small trade.",
    cheap: { yam: 0.85, oil: 0.9 }, dear: { cement: 1.1 },
    pois: ["market","park","house","bar","job"] },
  oba: { name: "Oba", lat: 6.07007, lon: 6.84014, cost: 1.1, opp: 1.05, md: 1, size: "small", light: 0.5,
    tag: "On the expressway between Onitsha and Nnewi. Warehouses and small industry.",
    cheap: { cement: 0.9, provis: 0.92 }, dear: { yam: 1.05 },
    pois: ["market","park","house","bar","job","warehouse"] },
  ozubulu: { name: "Ozubulu", lat: 5.95704, lon: 6.85354, cost: 1.2, opp: 1.0, md: 2, size: "small", light: 0.45,
    tag: "Hometown of many big traders. Country mansions everywhere.",
    cheap: {}, dear: { cement: 1.15, tyre: 1.05 },
    pois: ["market","park","mansion","house","bar","job"] },
  ihiala: { name: "Ihiala", lat: 5.84432, lon: 6.87329, cost: 1.05, opp: 1.1, md: 3, size: "mid", light: 0.4,
    tag: "Southern gateway town on the road to Owerri. Transit trade and farm produce.",
    cheap: { oil: 0.82, yam: 0.88 }, dear: { ankara: 1.2, phone: 1.1 },
    pois: ["market","park","house","bar","bank","job"] },
  ekwulobia: { name: "Ekwulobia", lat: 6.02381, lon: 7.08238, cost: 1.15, opp: 1.25, md: 1, size: "mid", light: 0.45,
    tag: "Big junction town of the south. Motor park and market always busy.",
    cheap: { provis: 0.95 }, dear: { ankara: 1.2, parts: 1.2, cement: 1.08 },
    pois: ["market","park","shop","house","bar","bank","job"] },
  igboukwu: { name: "Igbo-Ukwu", lat: 6.01615, lon: 7.02633, cost: 1.0, opp: 0.9, md: 0, size: "small", light: 0.45,
    tag: "Heritage town, famous for ancient bronze work. Visitors and culture.",
    cheap: { yam: 0.9 }, dear: { cement: 1.15, phone: 1.08 },
    pois: ["market","park","museum","house","bar","job"] },
  oko: { name: "Oko", lat: 6.04369, lon: 7.10512, cost: 1.05, opp: 0.95, md: 2, size: "small", light: 0.5,
    tag: "Polytechnic town. Students buy phones and provisions.",
    cheap: {}, dear: { phone: 1.15, provis: 1.1, water: 1.1 },
    pois: ["market","park","house","bar","job"] },
  umunze: { name: "Umunze", lat: 5.96608, lon: 7.2368, cost: 0.85, opp: 0.8, md: 3, size: "small", light: 0.35,
    tag: "Far south-east farm country. Very cheap palm oil and yam.",
    cheap: { oil: 0.75, yam: 0.75 }, dear: { phone: 1.15, parts: 1.15, ankara: 1.15 },
    pois: ["market","park","house","bar","job"] },
  otuocha: { name: "Otuocha/Aguleri", lat: 6.33933, lon: 6.84692, cost: 0.9, opp: 0.9, md: 2, size: "mid", light: 0.35,
    tag: "Aguleri and Otuocha rice country by the Anambra river. Rice is cheap here.",
    cheap: { rice: 0.75, yam: 0.8 }, dear: { phone: 1.12, parts: 1.15, cement: 1.12 },
    pois: ["market","park","farm","house","bar","job"] }
};
D.TOWN_IDS = Object.keys(D.TOWNS);

/* Building types */
D.POI = {
  market:   { label: "Market",          icon: "🛒", color: "#e8a23a", roof: "#b5651d" },
  park:     { label: "Motor Park",      icon: "🚌", color: "#5aa0d8", roof: "#2c5d8a" },
  house:    { label: "House Agent",     icon: "🏠", color: "#e6d2a8", roof: "#8c4b2f" },
  bar:      { label: "Pepper Soup Joint",icon: "🍲", color: "#d86a5a", roof: "#7a2e24" },
  club:     { label: "Night Lounge",    icon: "🎶", color: "#6a4ad8", roof: "#2d1f66" },
  bank:     { label: "Microfinance",    icon: "🏦", color: "#9ad0b0", roof: "#2f6b4c" },
  job:      { label: "Job Centre",      icon: "🧰", color: "#c8c8c8", roof: "#555" },
  shop:     { label: "Shop Plaza",      icon: "🏪", color: "#f1c75b", roof: "#9c6b10" },
  warehouse:{ label: "Warehouses",      icon: "🏭", color: "#a7a7b8", roof: "#4b4b63" },
  master:   { label: "Oga's Shop",      icon: "🧑🏾‍🏫", color: "#f0b49a", roof: "#8a3f22" },
  bridge:   { label: "Niger Bridge Head",icon: "🌉", color: "#9fb4c7", roof: "#3c5266" },
  waterside:{ label: "Waterside",       icon: "⛵", color: "#7fc3d6", roof: "#2a6b7c" },
  import:   { label: "Clearing Agent",  icon: "🚢", color: "#b9c7ff", roof: "#33408c" },
  factory:  { label: "Factory Layout",  icon: "🔧", color: "#c9b48a", roof: "#5a4a2a" },
  party:    { label: "Party Secretariat",icon: "🗳️", color: "#f7f7f7", roof: "#2b8a3e" },
  govt:     { label: "Government House",icon: "🏛️", color: "#ffffff", roof: "#1d5e2f" },
  unizik:   { label: "University (UNIZIK)", icon: "🎓", color: "#d9e6ff", roof: "#2a3f8f" },
  forge:    { label: "Blacksmith Quarter", icon: "⚒️", color: "#b58b6b", roof: "#3d2a1d" },
  lake:     { label: "Agulu Lake",      icon: "🏞️", color: "#8fd0e0", roof: "#2a7c8c" },
  museum:   { label: "Heritage Centre", icon: "🏺", color: "#d9b77a", roof: "#6b4a1d" },
  farm:     { label: "Rice Farms",      icon: "🌾", color: "#cde39a", roof: "#5a7a1d" },
  mansion:  { label: "Country Home Site", icon: "🏰", color: "#efe3c8", roof: "#a03a2a" }
};

D.HOUSES = [
  { id: "room",   name: "Face-me-I-face-you room", rent: 3000,  energy: 70,  happy: 0 },
  { id: "self",   name: "Self-contain",            rent: 9000,  energy: 85,  happy: 2 },
  { id: "flat",   name: "2-bedroom flat",          rent: 25000, energy: 95,  happy: 4 },
  { id: "duplex", name: "Duplex",                  rent: 120000,energy: 100, happy: 7 }
];

D.JOBS = {
  generic: [
    { id: "loader", name: "Market loader", pay: 1800, hours: 5, energy: 30 },
    { id: "pos",    name: "POS attendant", pay: 2200, hours: 6, energy: 22 },
    { id: "keke",   name: "Ride hired keke", pay: 2800, hours: 7, energy: 30 }
  ],
  onitsha: [{ id: "bridgehawk", name: "Hawk at bridge-head traffic", pay: 2600, hours: 5, energy: 30 }],
  nnewi:   [{ id: "assembly", name: "Assembly line hand", pay: 3800, hours: 8, energy: 35 }],
  awka:    [{ id: "civil", name: "Ministry temp clerk", pay: 4000, hours: 8, energy: 25 },
            { id: "forgehand", name: "Help at the forge", pay: 3000, hours: 6, energy: 35 }],
  otuocha: [{ id: "farmhand", name: "Rice farm hand", pay: 2200, hours: 6, energy: 35 }],
  oko:     [{ id: "tutor", name: "Tutor poly students", pay: 3000, hours: 5, energy: 20 }],
  igboukwu:[{ id: "guide", name: "Heritage tour guide", pay: 2800, hours: 5, energy: 18 }]
};

D.MASTERS = {
  onitsha: { name: "Oga Ikenna", trade: "textiles and phones", days: 10, capital: 600000, goods: { ankara: 10, phone: 2 } },
  nnewi:   { name: "Oga Obinna", trade: "motor spare parts", days: 10, capital: 500000, goods: { parts: 15, tyre: 5 } }
};

D.PARTIES = [
  { id: "pep", name: "Progressive Eagle Party", short: "PEP", color: "#2b78c9" },
  { id: "ppc", name: "People's Palm Congress", short: "PPC", color: "#2b8a3e" },
  { id: "nmp", name: "New Market Alliance",    short: "NMA", color: "#c9402b" }
];
D.SEATS = [
  { id: "ward",  name: "Ward Councillor",          fee: 250000,   minInf: 15, salary: 60000,   oppStr: 40 },
  { id: "lga",   name: "LGA Chairman",             fee: 6000000,  minInf: 45, salary: 900000,  oppStr: 60, needs: "ward" },
  { id: "house", name: "State Assembly Member",    fee: 60000000, minInf: 85, salary: 6000000, oppStr: 75, needs: "lga" }
];
D.ENDORSERS = [
  { id: "women", name: "Market Women Association", minInf: 5,  ask: 50000,   boost: 10 },
  { id: "keke",  name: "Keke Riders Union",        minInf: 10, ask: 120000,  boost: 10 },
  { id: "youth", name: "Youth Forum",              minInf: 15, ask: 200000,  boost: 12 },
  { id: "town",  name: "Town Union Executives",    minInf: 30, ask: 1500000, boost: 15 },
  { id: "elders",name: "Council of Elders",        minInf: 50, ask: 5000000, boost: 18 }
];

D.FIRST = ["Chidi","Ngozi","Emeka","Adaeze","Obinna","Chiamaka","Ikenna","Nneka","Uche","Ifeoma","Chukwudi","Amaka","Kelechi","Chinwe","Tobenna","Ebuka","Nkechi","Somto","Kosi","Chisom","Onyeka","Ugochi","Nnamdi","Ogechi","Chibuzor","Ifunanya","Kenechukwu","Oluchi","Azubuike","Ozioma"];
D.LAST  = ["Okeke","Nwosu","Eze","Obi","Okafor","Nwankwo","Udeh","Onwudiwe","Chukwu","Anyaso","Mbanefo","Ezenwa","Nwachukwu","Okonkwo","Ibe","Agu","Nweke","Umeh","Ilo","Orji"];

/* Fictional tycoons for Anambra Forbes */
D.TYCOONS = [
  ["Chief Ebubedike Nwora", "Cement & steel", 140e9], ["Dame Ugomma Ezenwa", "Pharmaceuticals", 96e9],
  ["Sir Okwudili Anyaso", "Auto assembly", 71e9], ["Chief Ifeanyichukwu Mbanefo", "Banking", 55e9],
  ["Madam Chinwendu Udeh", "Textiles", 38e9], ["Engr. Kosisochukwu Ibe", "Oil servicing", 29e9],
  ["Chief Nnaemeka Orji", "Real estate", 21e9], ["Dr. Adaobi Umeh", "Hospitals", 16e9],
  ["Odogwu Ekene Agu", "Electronics import", 12e9], ["Lolo Ngozika Okonkwo", "Food processing", 8.5e9],
  ["Chief Obiora Ilo", "Spare parts", 6.2e9], ["Mazi Uchenna Nweke", "Rice milling", 4.4e9],
  ["Ozioma Nwachukwu", "Fintech", 3.1e9], ["Chief Tobechukwu Eze", "Transport", 2.2e9],
  ["Madam Ijeoma Obi", "Cosmetics", 1.6e9], ["Ikemefuna Okafor", "Logistics", 1.15e9],
  ["Mazi Azubuike Nwosu", "Building materials", 820e6], ["Chiamaka Onwudiwe", "Fashion", 610e6],
  ["Somtochukwu Chukwu", "Phones & gadgets", 450e6], ["Nwanneka Ezeh", "Palm oil", 320e6],
  ["Kenechukwu Okoli", "Hotels", 230e6], ["Ebuka Anozie", "Plastics", 160e6],
  ["Oluchi Nwafor", "Bakery chain", 110e6], ["Ugochukwu Ndubuisi", "Tyres", 75e6],
  ["Chisom Ikeji", "Furniture", 48e6]
];

/* Dialogue */
D.SMALLTALK = [
  "Nwanne, how far? Market dey move?",
  "Kedu? Body dey inside cloth.",
  "My brother, this sun no be here o!",
  "Nnoo! You don chop today?",
  "Abeg, which side dem dey sell cheap rice?",
  "NEPA don take light again. We move.",
  "Today na market day. Ego must enter!",
  "Small small, the bird go build nest.",
  "Biko, where this keke dey go?",
  "Hustle no dey sleep. Daalu!",
  "If you see my apprentice, tell am say Oga dey find am.",
  "This fuel price eh. God dey.",
  "Odogwu! You dey shine today.",
  "Ndo, the road rough small but we go reach.",
  "Who get change for 1k? Abeg.",
  "O di mma. Make we see later.",
  "Igba boi na the real business school, I tell you.",
  "Agbero dey that side, hold your receipt.",
  "I hear say phone price go rise this week.",
  "Imeela! Thank you for yesterday."
];
D.CUSTOMER_LINES = [
  "Abeg reduce am small, I be your regular customer.",
  "Oga, last price? No vex.",
  "Na this price una dey sell for Onitsha? Haa!",
  "My sister, make I pay this one abeg.",
  "Biko, I go come back buy more if you do me well.",
  "Wetin be your best price? Talk am.",
  "I get only this money. Help me.",
  "Customer na king o! Reduce am."
];
D.SQUARE_HANDLES = ["IbeTheTrader","Ada_Okpu","NnewiPartsKing","AwkaBoy99","OnyeOnitsha","KekeLord","ChiomaFabrics","Mazi_Ego","UNIZIK_Babe","OtuochaRiceMan","EkwuloJunction","NkporHustler","LoloTextiles","SpareGuy","IgbaBoiGrad","ObosiQueen","OkadaDon","Ugo_Phones","PalmOilMama","BigManLoading"];
D.SQUARE_LINES = [
  "Who dey Onitsha Main Market today? Ankara price don drop small",
  "NEPA bring light for {town}! UP NEPA 🙌",
  "Rice cheap for Otuocha this week, I just carry 10 bags",
  "Na today be {md} day. Market go full!",
  "My Oga finally settle me 🙏🏾 Own shop loading",
  "Who get space for warehouse for Nkpor? DM",
  "Agbero for Upper Iweka no dey smile today o",
  "Phone price for Awka high pass Onitsha. Arbitrage season 😎",
  "Small small I don reach Trader level",
  "Esusu turn reach me today. God when 💃🏾",
  "Who sabi better pepper soup joint for {town}?",
  "Just landed one container. Customs no hold me this time 🙏🏾",
  "Election for ward don near. Which party una dey?",
  "Nnewi factory dey hire. Made in Naija!",
  "This fuel price wan finish us",
  "Don't pay any unknown supplier upfront o. Them scam my guy yesterday",
  "Rainy day for {town}. Road slippery, walk careful",
  "Who wan buy okada tyres wholesale? Nnewi price",
  "I don rent self-contain for Obosi. Rent no high like Onitsha",
  "Anambra Forbes don update. Odogwu people dey move up!"
];

/* Real landmarks, coordinates verified (OSM Nominatim / Wikipedia / Wikidata). Tied to in-game buildings. */
D.LANDMARKS = [
  { town: "onitsha", poi: "market",   name: "Main Market, Onitsha", lat: 6.15222, lon: 6.775, src: "Wikipedia" },
  { town: "onitsha", poi: "shop",     name: "Ochanja Market", lat: 6.14207, lon: 6.78595, src: "Wikidata Q115800028" },
  { town: "onitsha", poi: "bridge",   name: "Niger Bridge (Head Bridge side)", lat: 6.13416, lon: 6.75952, src: "OSM" },
  { town: "onitsha", poi: "park",     name: "Upper Iweka park area (Iweka Road)", lat: 6.14261, lon: 6.78214, src: "OSM" },
  { town: "nnewi",   poi: "market",   name: "Nkwo Nnewi spare parts market", lat: 6.02083, lon: 6.90635, src: "Wikidata Q123385515" },
  { town: "awka",    poi: "market",   name: "Eke Awka Main Market", lat: 6.20794, lon: 7.06865, src: "Wikidata Q123345679" },
  { town: "awka",    poi: "unizik",   name: "Nnamdi Azikiwe University (UNIZIK)", lat: 6.2493, lon: 7.11316, src: "OSM" },
  { town: "agulu",   poi: "lake",     name: "Agulu Lake", lat: 6.12698, lon: 7.02841, src: "Wikidata Q108908179" },
  { town: "igboukwu",poi: "museum",   name: "Igbo-Ukwu Museum", lat: 6.02342, lon: 7.01008, src: "OSM" },
  { town: "oko",     poi: "job",      name: "Federal Polytechnic Oko", lat: 6.0508, lon: 7.10727, src: "OSM" },
  { town: "otuocha", poi: "farm",     name: "Aguleri", lat: 6.33229, lon: 6.87796, src: "OSM" }
];
