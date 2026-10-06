/* Game state and systems. */
var G = (function () {
  var S = null, H = { toast: function () {}, money: function () {}, levelUp: function () {}, modal: function () {}, chat: function () {}, refresh: function () {}, forbes: function () {} };
  var SAVE_KEY = "anambra_life_save_v1";
  function R(a, b) { return a + Math.random() * (b - a); }
  function RI(a, b) { return Math.floor(R(a, b + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(n) { n = Math.round(n); var s = n < 0 ? "-" : ""; n = Math.abs(n); return s + "₦" + n.toLocaleString("en-NG"); }
  function fmtS(n) { var a = Math.abs(n), s = n < 0 ? "-" : ""; if (a >= 1e9) return s + "₦" + (a / 1e9).toFixed(a >= 1e10 ? 1 : 2) + "B"; if (a >= 1e6) return s + "₦" + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M"; if (a >= 1e4) return s + "₦" + Math.round(a / 1e3) + "k"; return fmt(n); }
  function town() { return D.TOWNS[S.town]; }
  function mdIdx(day) { return ((day || S.day) - 1) % 4; }
  function isMarketDay(tid) { var t = D.TOWNS[tid || S.town]; return t.md === -1 || t.md === mdIdx(); }

  function fresh(name, look, start) {
    var s = {
      v: 1, name: name, look: look, start: start, town: start, day: 1, hour: 7,
      cash: 15000, bank: 0, debt: 0, energy: 100, happy: 70, rep: 10, influence: 0, skill: 0, trust: 50,
      inv: {}, invCost: {}, items: {}, house: null, arrears: 0,
      shops: {}, warehouses: {}, prices: {}, events: [], fareMul: 1, fareDays: 0, light: {},
      appr: null, settled: false, esusu: null, insured: false, imports: [], workshop: 0, farms: [], mansion: false,
      deals: [], pol: { party: null, held: [], seat: null, running: null, endorse: {}, contracts: [], giftReady: false },
      love: null, chats: {}, tips: [], forbes: { rank: 0, week: 0 }, tycoons: D.TYCOONS.map(function (t) { return { name: t[0], ind: t[1], nw: t[2] }; }),
      stats: { earned: 0, spent: 0, trades: 0, shifts: 0, peak: 0, bestFlip: 0, losses: 0, started: Date.now() },
      level: 0, flags: {}, daily: {}, log: []
    };
    D.TOWN_IDS.forEach(function (t) { s.prices[t] = {}; D.GOOD_IDS.forEach(function (g) { s.prices[t][g] = R(0.9, 1.1); }); s.light[t] = Math.random() < D.TOWNS[t].light; });
    return s;
  }
  function save() { try { S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { var j = localStorage.getItem(SAVE_KEY); if (j) { S = JSON.parse(j); return true; } } catch (e) {} return false; }
  function reset() { localStorage.removeItem(SAVE_KEY); S = null; }

  /* ---------- economy ---------- */
  function price(g, tid) {
    tid = tid || S.town; var t = D.TOWNS[tid], b = D.GOODS[g].base, m = (t.cheap[g] || 1) * (t.dear[g] || 1);
    var ev = 1; S.events.forEach(function (e) { if (e.good === g && (!e.town || e.town === tid)) ev *= e.mul; });
    return Math.max(50, Math.round(b * m * S.prices[tid][g] * ev / 10) * 10);
  }
  function load_() { var l = 0; for (var g in S.inv) l += S.inv[g] * D.GOODS[g].load; return l; }
  function capacity() { return 15 + (S.items.barrow ? 25 : 0) + Object.keys(S.shops).length * 120 + Object.keys(S.warehouses).length * 2500; }
  function invValue() { var v = 0; for (var g in S.inv) v += S.inv[g] * D.GOODS[g].base * 0.9; return v; }
  var WS_COST = [0, 4e6, 120e6, 900e6], WS_INC = [0, 160000, 3800000, 30000000];
  function netWorth() {
    var nw = S.cash + S.bank - S.debt + invValue();
    nw += WS_COST[S.workshop] * 0.7 + (S.mansion ? 150e6 * 0.8 : 0);
    S.imports.forEach(function (i) { if (i.status !== "done") nw += i.cost; });
    S.farms.forEach(function (f) { nw += f.cost; });
    S.deals.forEach(function (d) { nw += d.amount; });
    S.pol.contracts.forEach(function (c) { if (c.active) nw += c.upfront; });
    return Math.round(nw);
  }
  function levelOf(nw) { var l = 0; D.LEVELS.forEach(function (L, i) { if (nw >= L.min) l = i; }); return l; }
  function checkLevel() {
    var nw = netWorth(), l = levelOf(nw);
    if (l > S.level) { var old = S.level; S.level = l; if (l > S.stats.peak) S.stats.peak = l; H.levelUp(old, l, true); }
    else if (l < S.level) { var o2 = S.level; S.level = l; H.levelUp(o2, l, false); }
    if (window.NET) NET.maybeSync(nw);
  }
  function earn(n, why, quiet) { n = Math.round(n); if (n <= 0) return; S.cash += n; S.stats.earned += n; if (!quiet) H.money(n, why); }
  function spend(n, why) { n = Math.round(n); if (S.cash < n) { H.toast("No money for that. You need " + fmt(n) + ".", "bad"); return false; } S.cash -= n; S.stats.spent += n; H.money(-n, why); return true; }
  function needEnergy(e) { if (S.energy < e) { H.toast("You don tire. Rest or sleep first.", "bad"); return false; } return true; }
  function act(hours, energy) { S.energy = clamp(S.energy - (energy || 0), 0, 100); advance(hours); }
  function advance(h) { S.hour += h; if (S.hour >= 24) { H.toast("It's late. You slept where you were.", "warn"); newDay("rough"); } }

  /* ---------- trading ---------- */
  function buy(g, qty, unitPrice, why) {
    qty = Math.floor(qty); if (qty <= 0) return false;
    var p = unitPrice || price(g), cost = p * qty;
    if (load_() + qty * D.GOODS[g].load > capacity()) { H.toast("No space. Your load is full. Rent a shop or warehouse.", "bad"); return false; }
    if (!spend(cost, why || "Bought " + qty + " " + D.GOODS[g].name)) return false;
    S.inv[g] = (S.inv[g] || 0) + qty; S.invCost[g] = (S.invCost[g] || 0) + cost; S.stats.trades++;
    SFX.click(); checkLevel(); save(); return true;
  }
  function avgCost(g) { return S.inv[g] ? (S.invCost[g] || 0) / S.inv[g] : 0; }
  function removeGoods(g, qty) { var ac = avgCost(g); S.inv[g] -= qty; S.invCost[g] = Math.max(0, (S.invCost[g] || 0) - ac * qty); if (S.inv[g] <= 0) { delete S.inv[g]; delete S.invCost[g]; } return ac * qty; }
  function sell(g, qty, unitPrice, why) {
    qty = Math.min(Math.floor(qty), S.inv[g] || 0); if (qty <= 0) return 0;
    var cost = removeGoods(g, qty), rev = unitPrice * qty, profit = rev - cost;
    earn(rev, why || ("Sold " + qty + " " + D.GOODS[g].name)); S.stats.trades++;
    if (profit > S.stats.bestFlip) S.stats.bestFlip = profit;
    if (profit > 0) { S.rep = clamp(S.rep + 0.3, 0, 100); S.skill = clamp(S.skill + 0.2, 0, 100); }
    checkLevel(); save(); return profit;
  }
  function wholesalePrice(g, qty) { var depth = 500 * town().opp, slip = Math.min(0.35, (qty || 1) * D.GOODS[g].load / depth) / 2; return Math.round(price(g) * 0.9 * (1 - slip)); }
  function wholesale(g, qty) { return sell(g, qty, wholesalePrice(g, qty), "Sold to wholesalers"); }
  function customers() {
    var t = town(), n = Math.round(2 + t.opp * 1.5 + (S.shops[S.town] ? 3 : 0) + (isMarketDay() ? 2 : 0) + S.rep / 30);
    var list = [], have = Object.keys(S.inv);
    for (var i = 0; i < n; i++) {
      var g = (have.length && Math.random() < 0.85) ? pick(have) : pick(D.GOOD_IDS);
      var p = price(g), maxQ = D.GOODS[g].base < 1000 ? 25 : D.GOODS[g].base < 20000 ? 6 : 3;
      var q = Math.max(1, Math.round(R(1, maxQ) * Math.sqrt(t.opp)));
      var bonus = (S.shops[S.town] ? 0.04 : 0) + (isMarketDay() ? 0.03 : 0);
      list.push({ g: g, q: q, offer: Math.round(p * R(0.95, 1.07 + bonus) / 10) * 10, ask: Math.round(p * (1.15 + bonus) / 10) * 10, name: pick(D.FIRST), line: pick(D.CUSTOMER_LINES) });
    }
    return list;
  }
  function haggle(c, level) { // level 0 accept, 1 small counter, 2 big counter, 3 asking price
    var mult = [1, 1.05, 1.12, c.ask / c.offer][level];
    var chance = [1, 0.82, 0.55, 0.3][level] + S.rep / 400 + S.skill / 300 + (S.happy - 50) / 500 + (isMarketDay() ? 0.05 : 0);
    if (Math.random() < chance) return { ok: true, price: Math.round(c.offer * mult / 10) * 10 };
    if (Math.random() < 0.35) return { ok: true, price: c.offer, grudge: true };
    return { ok: false };
  }

  /* ---------- jobs, rest ---------- */
  function jobsHere() { return D.JOBS.generic.concat(D.JOBS[S.town] || []); }
  function shift(j) {
    if (!needEnergy(j.energy)) return;
    if (S.hour + j.hours > 23) { H.toast("Too late for a shift. Come back tomorrow morning.", "warn"); return; }
    var pay = Math.round(j.pay * Math.sqrt(town().opp) * (1 + S.skill / 200) / 10) * 10;
    S.stats.shifts++; earn(pay, j.name); S.skill = clamp(S.skill + 0.5, 0, 100); act(j.hours, j.energy); SFX.coin(); checkLevel(); save();
  }
  function rentFor(tier, tid) { return Math.round(D.HOUSES[tier].rent * D.TOWNS[tid || S.town].cost / 100) * 100; }
  function rentHouse(tier) {
    var r = rentFor(tier); if (!spend(r * 2, "Rent + caution fee")) return;
    S.house = { town: S.town, tier: tier }; S.arrears = 0; H.toast("You don get house for " + town().name + "! " + D.HOUSES[tier].name, "good"); SFX.cash(); save();
  }
  function sleep(where) {
    var e = 50, cost = 0;
    if (where === "home") { e = D.HOUSES[S.house.tier].energy; if (!S.light[S.town]) { if (S.items.gen) { cost = Math.round(2500 * town().cost); } else e -= 15; } }
    else if (where === "guest") { cost = Math.round(4000 * town().cost); e = 80; }
    else if (where === "shop") e = 60;
    if (cost && S.cash < cost) { H.toast("You no fit pay " + fmt(cost) + ". Sleeping rough.", "warn"); cost = 0; e = 45; }
    if (cost) { S.cash -= cost; S.stats.spent += cost; }
    newDay(e);
  }

  /* ---------- travel ---------- */
  function dist(a, b) {
    var A = D.TOWNS[a], B = D.TOWNS[b], rad = Math.PI / 180;
    var dLat = (B.lat - A.lat) * rad, dLon = (B.lon - A.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(A.lat * rad) * Math.cos(B.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 1.35); // road factor
  }
  var MODES = {
    keke:  { name: "Keke", perKm: 45, min: 200, kmh: 22, wait: 0.3, max: 30 },
    okada: { name: "Okada", perKm: 60, min: 300, kmh: 35, wait: 0.1, max: 60 },
    bus:   { name: "Bus", perKm: 28, min: 500, kmh: 45, wait: 0.8, max: 999 }
  };
  function quote(to, mode) {
    var d = dist(S.town, to), m = MODES[mode];
    if (d > m.max) return null;
    return { km: d, fare: Math.round(Math.max(m.min, d * m.perKm) * S.fareMul / 50) * 50, hours: Math.max(1, Math.round(d / m.kmh + m.wait)) };
  }
  function travel(to, mode) {
    var q = quote(to, mode); if (!q) return false;
    if (S.hour + q.hours > 23) { H.toast("Last bus don go. Travel tomorrow morning.", "warn"); return false; }
    if (!spend(q.fare, MODES[mode].name + " to " + D.TOWNS[to].name)) return false;
    act(q.hours, Math.min(25, q.hours * 6));
    S.town = to; S.daily = {};
    if (mode === "okada" && Math.random() < 0.03) { var c = Math.round(5000 * D.TOWNS[to].cost); S.cash = Math.max(0, S.cash - c); S.energy = clamp(S.energy - 20, 0, 100); H.modal({ title: "Small okada accident", text: "Okada skid for bad road. You get small injury and paid " + fmt(c) + " for chemist. You dey alright. Ndo." }); }
    save(); return true;
  }

  /* ---------- apprenticeship (Igba Boi) ---------- */
  function joinMaster() {
    var m = D.MASTERS[S.town]; if (!m) return;
    S.appr = { town: S.town, served: 0, last: 0 }; S.trust = 50;
    msg("master", m.name + " (Oga)", "Master", "Nnoo! From today you are my boy. Come early, serve well, and in " + m.days + " days I go settle you. Na so we dey do am.");
    H.toast("You don start Igba Boi with " + m.name + "!", "good"); save();
  }
  function serve() {
    var a = S.appr, m = D.MASTERS[a.town];
    if (a.last === S.day) { H.toast("You don serve Oga today. Come back tomorrow.", "warn"); return; }
    if (!needEnergy(30)) return; if (S.hour > 15) { H.toast("Shop don close. Come early tomorrow.", "warn"); return; }
    a.last = S.day; a.served++; earn(1500, "Oga's daily allowance"); S.skill = clamp(S.skill + 3, 0, 100); act(8, 30);
    if (Math.random() < 0.3) {
      H.modal({ title: "Honesty test", text: "A customer paid ₦5,000 extra by mistake and left. " + m.name + " is not around. What do you do?",
        choices: [{ label: "Return it to Oga's till", fn: function () { S.trust += 15; S.rep = clamp(S.rep + 3, 0, 100); H.toast("Oga heard. Trust up!", "good"); save(); } },
                  { label: "Keep it quietly", fn: function () { earn(5000, "Kept extra money"); S.trust -= 25; H.toast("Hmm. Oga noticed the till was short...", "bad"); save(); } }] });
    }
    if (a.served >= m.days) settle();
    checkLevel(); save();
  }
  function settle() {
    var a = S.appr, m = D.MASTERS[a.town], good = S.trust >= 45;
    var cap = good ? m.capital : Math.round(m.capital / 3);
    earn(cap, "Settlement capital from " + m.name);
    for (var g in m.goods) { S.inv[g] = (S.inv[g] || 0) + (good ? m.goods[g] : Math.ceil(m.goods[g] / 3)); S.invCost[g] = (S.invCost[g] || 0); }
    if (good) { S.shops[a.town] = { weeks: 4, boy: false }; S.rep = clamp(S.rep + 20, 0, 100); }
    S.appr = null; S.settled = true;
    H.modal({ title: "🎉 Oga don settle you!", big: true, text: good ? (m.name + " gathered the family and traders. You served well, so he gave you " + fmt(cap) + ", goods, and a shop in " + D.TOWNS[a.town].name + " with 4 weeks rent paid. Imeela! Your own business starts now.") : (m.name + " settled you small: " + fmt(cap) + " and some goods. He said the till was short sometimes. Trust is everything in business.") });
    SFX.level(); save();
  }

  /* ---------- shops, warehouses, factory ---------- */
  function shopRent(tid) { return Math.round(20000 * Math.pow(D.TOWNS[tid || S.town].cost, 1.5) / 500) * 500; }
  function whRent(tid) { return Math.round(150000 * D.TOWNS[tid || S.town].cost / 1000) * 1000; }
  function rentShop() { var r = shopRent(); if (S.level < 2) return H.toast("Reach Trader level first.", "bad"); if (!spend(r * 2, "Shop rent + agreement")) return; S.shops[S.town] = { weeks: 1, boy: false }; SFX.cash(); H.toast("Your shop for " + town().name + " is open! +120 space, more customers.", "good"); checkLevel(); save(); }
  function hireBoy() { var s = S.shops[S.town]; if (!s) return; s.boy = true; H.toast("You hired a sales boy. He sells from your stock every night (" + fmt(10000) + "/week).", "good"); save(); }
  function rentWarehouse() { if (S.level < 3) return H.toast("Reach Shop Owner level first.", "bad"); var r = whRent(); if (!spend(r * 2, "Warehouse rent + agreement")) return; S.warehouses[S.town] = { weeks: 1 }; SFX.cash(); H.toast("Warehouse secured! +2,500 space. You can supply retailers now.", "good"); checkLevel(); save(); }
  function supplyRetailers(g) {
    if (!S.warehouses[S.town]) return; if (S.daily["sup_" + g]) return H.toast("Retailers don buy this one today.", "warn");
    var q = Math.min(S.inv[g] || 0, Math.round(150 * town().opp)); if (!q) return;
    S.daily["sup_" + g] = 1; var p = sell(g, q, Math.round(price(g) * 0.98), "Supplied retailers " + q + " " + D.GOODS[g].name); act(1, 5); SFX.cash(); return p;
  }
  function buildWorkshop() {
    var lvl = S.workshop + 1, need = [0, 3, 5, 6][lvl]; if (lvl > 3) return;
    if (S.level < need) return H.toast("Reach " + D.LEVELS[need].name + " level first.", "bad");
    if (!spend(WS_COST[lvl], ["", "Workshop", "Factory", "Industrial plant"][lvl])) return;
    S.workshop = lvl; SFX.level(); W.coins(30);
    H.modal({ title: ["", "🔧 Workshop open!", "🏭 Factory built!", "🏗️ Industrial plant!"][lvl], big: true, text: "Made in Nnewi! It earns about " + fmt(WS_INC[lvl]) + " every day (less when NEPA takes light and you run diesel)." });
    checkLevel(); save();
  }

  /* ---------- imports ---------- */
  var CONTAINERS = { phone: 300, ankara: 2000, parts: 1500, provis: 2000 };
  function containerCost(g) { return Math.round(CONTAINERS[g] * D.GOODS[g].base * 0.6); }
  function orderContainer(g, insure) {
    if (S.level < 4) return H.toast("Reach Warehouse Boss level first.", "bad");
    if (!Object.keys(S.warehouses).length) return H.toast("You need a warehouse to receive a container.", "bad");
    var c = containerCost(g), prem = insure ? Math.round(c * 0.03) : 0;
    if (!spend(c + prem, "Container of " + D.GOODS[g].name)) return;
    S.imports.push({ g: g, units: CONTAINERS[g], cost: c, eta: S.day + RI(4, 6), insured: insure, status: "sea" });
    msg("agent", "Barr. Okwy (Clearing Agent)", "Clearing agent", "Your container of " + D.GOODS[g].name + " don load. ETA about 5 days. " + (insure ? "Marine insurance dey. Good choice." : "No insurance o. Pray make sea calm."));
    SFX.cash(); save();
  }
  function resolveImports(rep) {
    S.imports.forEach(function (im) {
      if (im.status === "done" || S.day < im.eta) return;
      var roll = Math.random();
      if (im.status === "sea" && roll < 0.06) {
        im.status = "done"; var back = im.insured ? Math.round(im.cost * 0.9) : 0; S.stats.losses += im.cost - back; S.flags.recentLoss = S.day;
        if (back) earn(back, "Marine insurance payout", true);
        rep.push({ title: "🌊 SHIP SANK!", big: true, bad: true, text: "The ship carrying your " + D.GOODS[im.g].name + " sank in bad weather. " + (im.insured ? "Insurance paid you back " + fmt(back) + ". Thank God you insured." : "No insurance. You lost " + fmt(im.cost) + ". Use savings, esusu, or start trading again. Odogwu no dey give up.") });
        return;
      }
      if (im.status === "sea" && roll < 0.2) {
        im.status = "customs"; im.eta = S.day + 3;
        var fee = Math.round(im.cost * 0.05);
        rep.push({ title: "🛃 Container stuck at customs", bad: true, text: "Your container is held at the port for paperwork. Pay " + fmt(fee) + " demurrage and clearing to release it now, or wait 3 days (small risk it gets seized).",
          choices: [{ label: "Pay " + fmtS(fee) + " to clear", fn: function () { if (spend(fee, "Demurrage & clearing")) { im.status = "sea"; im.eta = S.day; im.cleared = true; resolveOne(im); } } }, { label: "Wait 3 days", fn: function () {} }] });
        return;
      }
      if (im.status === "customs" && roll < 0.12) {
        im.status = "done"; S.stats.losses += im.cost; S.flags.recentLoss = S.day;
        rep.push({ title: "⛔ Container seized", big: true, bad: true, text: "After the long wait, your container of " + D.GOODS[im.g].name + " was seized over paperwork. You lost " + fmt(im.cost) + ". Insurance does not cover seizure. Next time, clear fast." });
        return;
      }
      resolveOne(im, rep);
    });
    S.imports = S.imports.filter(function (i) { return i.status !== "done" || i.day === S.day; }).filter(function (i) { return i.status !== "done"; });
  }
  function resolveOne(im, rep) {
    im.status = "done";
    var room = Math.floor((capacity() - load_()) / D.GOODS[im.g].load), q = Math.min(room, im.units), over = im.units - q;
    S.inv[im.g] = (S.inv[im.g] || 0) + q; S.invCost[im.g] = (S.invCost[im.g] || 0) + im.cost * q / im.units;
    var extra = over > 0 ? Math.round(over * price(im.g, "onitsha") * 0.8) : 0; if (extra) earn(extra, "Overflow sold at the port", true);
    var t = { title: "🚢 Container landed!", big: true, text: im.units + " " + D.GOODS[im.g].name + " arrived. " + q + " went into your warehouse." + (over ? " No space for " + over + ", sold at the port for " + fmt(extra) + "." : "") + " Sell them well!" };
    if (rep) rep.push(t); else { H.modal(t); SFX.cash(); }
    S.imports = S.imports.filter(function (i) { return i.status !== "done"; }); save();
  }

  /* ---------- bank, esusu, insurance ---------- */
  function loanMax() { return Math.round(60000 * Math.pow(3, S.level)); }
  function deposit(n) { n = Math.min(n, S.cash); if (n <= 0) return; S.cash -= n; S.bank += n; SFX.coin(); save(); }
  function withdraw(n) { n = Math.min(n, S.bank); if (n <= 0) return; S.bank -= n; S.cash += n; SFX.coin(); save(); }
  function borrow(n) { if (S.debt + n > loanMax()) return H.toast("Your loan limit is " + fmt(loanMax()) + ".", "bad"); S.debt += n; S.cash += n; SFX.coin(); save(); }
  function repay(n) { n = Math.min(n, S.cash, S.debt); if (n <= 0) return; S.debt -= n; S.cash -= n; SFX.coin(); save(); }
  function premium() { return Math.max(2000, Math.round(invValue() * 0.004)); }
  function joinEsusu(c) { if (S.esusu) return; S.esusu = { c: c, slot: RI(2, 10), cycle: 0, got: false }; msg("mama", "Mama Nkechi (Esusu)", "Esusu head", "Welcome to Ndi Ahia Esusu! 10 members. Every Eke day you pay " + fmt(c) + ". Your turn to collect " + fmt(c * 10) + " na round " + S.esusu.slot + ". If wahala happen, talk to me."); save(); }
  function esusuEarly() { var e = S.esusu; if (!e || e.got) return; if (!(S.flags.recentLoss && S.day - S.flags.recentLoss <= 7)) return H.toast("Mama Nkechi: early collection is only for real emergencies.", "warn"); e.got = true; earn(Math.max(0, e.c * 10 - (e.owed || 0)), "Esusu early collection"); SFX.cash(); H.toast("The group agreed to swap turns. Na community be this!", "good"); save(); }

  /* ---------- politics ---------- */
  function joinParty(id) { if (!spend(20000, "Party membership form")) return; S.pol.party = id; S.influence += 2; H.toast("You are now a card-carrying member of " + D.PARTIES.filter(function (p) { return p.id === id; })[0].name + ".", "good"); save(); }
  function polAct(kind) {
    var lv = S.level;
    var A = {
      meeting: { cost: 2000, h: 2, e: 8, inf: 3, txt: "Ward meeting attended. People are starting to know your face." },
      townhall: { cost: 100000, h: 3, e: 12, inf: 7, txt: "Town hall done. You listened to complaints about roads and light." },
      forum: { cost: 0, h: 3, e: 10, inf: 4, txt: "You spoke at the UNIZIK student forum. The students cheered." },
      borehole: { cost: 2000000, h: 2, e: 5, inf: 15, rep: 5, txt: "You sponsored a borehole. Clean water for the community!" },
      scholarship: { cost: 10000000, h: 2, e: 5, inf: 30, rep: 8, txt: "Scholarships for 50 students. Your name dey every mouth." },
      road: { cost: 50000000, h: 2, e: 5, inf: 60, rep: 12, txt: "You graded a community road. Even the elders came to thank you." }
    }[kind];
    if (S.daily["pol_" + kind] && kind !== "borehole" && kind !== "scholarship" && kind !== "road") return H.toast("Done that today already.", "warn");
    if (!needEnergy(A.e)) return; if (A.cost && !spend(A.cost, "Politics: " + kind)) return;
    S.daily["pol_" + kind] = 1; S.influence += A.inf; if (A.rep) S.rep = clamp(S.rep + A.rep, 0, 100);
    if (S.pol.running) S.pol.running.support += A.inf * 0.6;
    act(A.h, A.e); H.toast(A.txt + " +" + A.inf + " influence", "good"); SFX.coin(); save();
  }
  function endorse(e) {
    if (S.pol.endorse[e.id]) return; if (S.influence < e.minInf) return H.toast("They don't know you well enough. Need " + e.minInf + " influence.", "bad");
    var ask = S.pol.giftReady ? Math.round(e.ask / 2) : e.ask;
    if (!spend(ask, "Sponsored " + e.name + " programme")) return;
    S.pol.giftReady = false; S.pol.endorse[e.id] = true; S.influence += 3;
    if (S.pol.running) S.pol.running.support += e.boost;
    H.toast(e.name + " endorsed you!", "good"); SFX.cash(); save();
  }
  function seatOk(seat) { return (!seat.needs || S.pol.held.indexOf(seat.needs) >= 0) && S.pol.held.indexOf(seat.id) < 0; }
  function declare(seat) {
    if (!S.pol.party) return H.toast("Join a party first.", "bad"); if (S.pol.running) return;
    if (S.influence < seat.minInf) return H.toast("You need " + seat.minInf + " influence.", "bad");
    if (!seatOk(seat)) return H.toast("Win the lower seat first.", "bad");
    if (!spend(seat.fee, "Nomination form: " + seat.name)) return;
    var sup = S.influence * 0.5; for (var k in S.pol.endorse) sup += D.ENDORSERS.filter(function (x) { return x.id === k; })[0].boost;
    S.pol.running = { seat: seat.id, support: sup, end: S.day + 6 };
    msg("chief", "Chief Dozie (Party Chairman)", "Politician", "Congrats on your nomination for " + seat.name + "! Election na in 6 days. Campaign hard, be humble, and no do anything wey go spoil your name.");
    SFX.level(); save();
  }
  function campaign(kind) {
    var r = S.pol.running; if (!r) return;
    var seat = D.SEATS.filter(function (s) { return s.id === r.seat; })[0];
    var k = { door: { cost: 0, h: 5, e: 25, s: 3 }, rally: { cost: seat.fee * 0.3, h: 4, e: 20, s: 9 }, posters: { cost: seat.fee * 0.1, h: 1, e: 5, s: 4 } }[kind];
    if (S.daily["camp_" + kind]) return H.toast("Done that today. Try another way.", "warn");
    if (!needEnergy(k.e)) return; if (k.cost && !spend(k.cost, "Campaign " + kind)) return;
    S.daily["camp_" + kind] = 1; r.support += k.s; S.influence += 1; act(k.h, k.e); H.toast("Support +" + k.s, "good"); save();
  }
  function election(rep) {
    var r = S.pol.running; if (!r || S.day < r.end) return;
    var seat = D.SEATS.filter(function (s) { return s.id === r.seat; })[0];
    var p = clamp(r.support / (r.support + seat.oppStr) + R(-0.12, 0.12), 0.05, 0.95), win = Math.random() < p;
    var opp = pick(D.FIRST) + " " + pick(D.LAST);
    S.pol.running = null;
    if (win) {
      S.pol.held.push(seat.id); S.pol.seat = seat.id; S.influence += 15; S.rep = clamp(S.rep + 10, 0, 100);
      rep.push({ title: "🗳️ YOU WON!", big: true, text: "You won the " + seat.name + " seat against " + opp + ". The keke riders are blowing horns all over Awka! You earn " + fmt(seat.salary) + " a week and contracts will come. Serve the people well." });
    } else {
      S.influence = Math.round(S.influence * 0.8);
      rep.push({ title: "🗳️ Election lost", bad: true, text: opp + " won the " + seat.name + " seat. Your support was " + Math.round(p * 100) + "%. Build more influence and try again." });
    }
  }
  function offerContract() {
    if (!S.pol.seat) return;
    var V = { ward: 5e6, lga: 80e6, house: 600e6 }[S.pol.seat], what = pick(["road repair", "school block", "market drainage", "health centre", "solar street lights", "borehole project"]);
    var c = { id: Date.now(), what: what, V: V, upfront: Math.round(V * 0.6), active: false };
    S.pol.contracts.push(c);
    msg("govt", "Ministry of Works", "Government", "Contract offer: " + what + " worth " + fmt(V) + ". You need " + fmt(c.upfront) + " working capital. How you go run am?",
      [{ label: "Deliver it well", act: "contract", id: c.id, mode: "well" }, { label: "Cut corners", act: "contract", id: c.id, mode: "cheap" }, { label: "Decline", act: "contract", id: c.id, mode: "no" }]);
  }
  function startContract(id, mode) {
    var c = S.pol.contracts.filter(function (x) { return x.id === id; })[0]; if (!c || c.active) return false;
    if (mode === "no") { S.pol.contracts = S.pol.contracts.filter(function (x) { return x.id !== id; }); return true; }
    if (!spend(c.upfront, "Contract working capital")) return false;
    c.active = true; c.mode = mode; c.done = S.day + 5; save(); return true;
  }
  function resolveContracts(rep) {
    S.pol.contracts.forEach(function (c) {
      if (!c.active || S.day < c.done) return;
      c.active = false; c.over = true;
      if (c.mode === "well") { earn(c.upfront + c.V * 0.15, "Contract paid: " + c.what, true); S.rep = clamp(S.rep + 5, 0, 100); S.influence += 6; rep.push({ title: "✅ Contract delivered", text: "The " + c.what + " is standing strong. You made " + fmt(c.V * 0.15) + " profit and people trust you more." }); }
      else {
        earn(c.upfront + c.V * 0.45, "Contract paid: " + c.what, true);
        if (Math.random() < 0.45) {
          var fine = Math.round(c.V * 0.6); S.cash -= fine; S.influence = Math.max(0, S.influence - 30); S.rep = clamp(S.rep - 20, 0, 100); S.flags.recentLoss = S.day;
          var lost = S.pol.seat ? D.SEATS.filter(function (s) { return s.id === S.pol.seat; })[0].name : "";
          S.pol.seat = null;
          rep.push({ title: "📰 SCANDAL!", big: true, bad: true, text: "Your " + c.what + " collapsed after rain. It is all over the news. You refunded " + fmt(fine) + ", lost your " + lost + " seat, and your reputation crashed. Cutting corners no pay." });
        } else rep.push({ title: "Contract paid", text: "You made fat profit on the " + c.what + ". But people are whispering about the quality..." });
      }
    });
    S.pol.contracts = S.pol.contracts.filter(function (c) { return !c.over; });
  }

  /* ---------- love ---------- */
  function meet() {
    if (S.love) return null;
    var n = pick(D.FIRST); S.love = { name: n, town: S.town, meter: 10, married: false, chat: 0 };
    msg("love", n + " ❤️", "Love interest", "Hi! It was nice meeting you at " + town().name + " today 😊 Kedu?");
    return n;
  }
  function date(kind) {
    var L = S.love; if (!L || L.married) return;
    var k = { date: { c: 8000, m: 14, h: 3 }, gift: { c: 30000, m: 18, h: 1 } }[kind];
    if (S.daily["love_" + kind]) return H.toast("You did that today already.", "warn");
    if (!spend(Math.round(k.c * town().cost), kind === "date" ? "Date night" : "Gift")) return;
    S.daily["love_" + kind] = 1; L.meter = clamp(L.meter + k.m, 0, 100); S.happy = clamp(S.happy + 10, 0, 100); act(k.h, 5); save();
  }
  function marry() {
    var L = S.love; if (!L || L.married || L.meter < 100) return;
    var c = Math.round(1500000 * town().cost); if (!spend(c, "Igba Nkwu (traditional wedding)")) return;
    L.married = true; S.happy = 100; S.rep = clamp(S.rep + 5, 0, 100);
    H.modal({ title: "💍 Igba Nkwu!", big: true, text: "Your wine-carrying ceremony was the talk of " + town().name + ". " + L.name + " found you in the crowd with the palm wine cup. You are married! Your spouse will support you every day." }); SFX.level(); save();
  }

  /* ---------- chats ---------- */
  function msg(id, name, role, text, actions) {
    var th = S.chats[id] || (S.chats[id] = { name: name, role: role, msgs: [], unread: 0 });
    th.name = name; th.msgs.push({ from: "them", text: text, t: S.day + ":" + S.hour, actions: actions || null }); th.unread++;
    if (th.msgs.length > 60) th.msgs.shift();
    H.chat(id);
  }
  function chatAction(id, mi, ai) {
    var th = S.chats[id], m = th && th.msgs[mi]; if (!m || !m.actions || m.done) return;
    var a = m.actions[ai], ok = true;
    if (a.act === "bulk") {
      if (a.label.indexOf("No") === 0) ok = true; else ok = buy(a.g, a.q, a.p, "Bulk deal from " + th.name);
      if (ok && a.label.indexOf("No") !== 0) reply(id, "Deal! Send am.");
    } else if (a.act === "scam") {
      if (a.yes) {
        if (!spend(a.amount, "Paid upfront to unknown supplier")) return;
        if (Math.random() < 0.85) {
          S.stats.losses += a.amount; S.flags.recentLoss = S.day;
          setTimeout(function () { H.modal({ title: "😱 You've been duped!", big: true, bad: true, text: "The 'supplier' blocked your number after you paid " + fmt(a.amount) + ". No goods are coming. Red flags you missed: unknown number, price too cheap, and pay-first pressure. Report to the police and warn your people. Your savings, insurance and esusu are there to help you recover." }); SFX.bad(); }, 600);
        } else { var q = a.q; S.inv[a.g] = (S.inv[a.g] || 0) + q; S.invCost[a.g] = (S.invCost[a.g] || 0) + a.amount; H.toast("Lucky! The goods actually came. Don't push your luck.", "warn"); }
      } else reply(id, "No thanks. I only buy from people I know.");
    } else if (a.act === "invest") {
      if (a.yes) { if (!spend(a.amount, a.what)) return; S.deals.push({ kind: a.kind, what: a.what, amount: a.amount, day: S.day + a.days, from: th.name }); reply(id, "Okay, I'm in. Let's do it."); }
      else reply(id, "I'll pass this time.");
    } else if (a.act === "contract") {
      ok = startContract(a.id, a.mode); if (!ok) return; reply(id, a.mode === "well" ? "I will deliver it properly." : a.mode === "cheap" ? "I will manage the cost." : "I'll pass on this one.");
    } else if (a.act === "reserve") {
      if (a.yes) { if ((S.inv[a.g] || 0) < a.q) return H.toast("You don't have " + a.q + " " + D.GOODS[a.g].name + ".", "bad"); sell(a.g, a.q, a.p, "Customer order: " + th.name); SFX.cash(); reply(id, "Your goods dey ready. Come carry am!"); }
      else reply(id, "Sorry, no stock now.");
    } else if (a.act === "family") {
      if (a.yes) { if (!spend(a.amount, "Helped family")) return; S.happy = clamp(S.happy + 8, 0, 100); S.rep = clamp(S.rep + 2, 0, 100); reply(id, "I sent it. Greet everybody."); }
      else reply(id, "Things are tight now, I'll help next time.");
    }
    m.done = true; save(); H.refresh();
  }
  function reply(id, text) { var th = S.chats[id]; th.msgs.push({ from: "me", text: text, t: S.day + ":" + S.hour }); }
  function genChats() {
    var n = RI(1, 3), t = town(), g, p, q;
    for (var i = 0; i < n; i++) {
      var r = Math.random();
      if (r < 0.2) {
        g = pick(D.GOOD_IDS); var best = D.TOWN_IDS.slice().sort(function (a, b) { return price(g, a) - price(g, b); })[0];
        p = Math.round(price(g, best) * 0.9 / 10) * 10; q = Math.max(2, Math.round(R(4, 20) * (1 + S.level) / D.GOODS[g].load));
        msg("nneka", "Nneka Supplies", "Supplier", "Nwanne, I get " + q + " " + D.GOODS[g].name + " at " + fmt(p) + " each (" + D.TOWNS[best].name + " price minus 10%). Pay and I deliver today. You dey?",
          [{ label: "Buy all " + q + " (" + fmtS(p * q) + ")", act: "bulk", g: g, q: q, p: p }, { label: "No thanks", act: "bulk" }]);
      } else if (r < 0.38) {
        g = pick(D.GOOD_IDS); var tt = pick(D.TOWN_IDS), up = Math.random() < 0.6, truth = Math.random() < 0.75;
        S.tips.push({ town: tt, good: g, mul: up ? 1.25 : 0.8, day: S.day + 1, truth: truth });
        msg("chinedu", "Chinedu (Keke rider)", "Gist", "Gist for you: people dey talk say " + D.GOODS[g].name + " price go " + (up ? "rise" : "fall") + " for " + D.TOWNS[tt].name + " tomorrow. I no swear o 😂");
      } else if (r < 0.48 && S.level >= 1) {
        g = pick(["phone", "ankara", "parts", "tyre"]); var amt = Math.round(Math.min(Math.max(S.cash * 0.4, 20000), 50e6) / 1000) * 1000;
        msg("unknown", "+234 81•• ••• •••", "Unknown", "Hello dear, I am importer. I get " + D.GOODS[g].name + " half price!!! Only today. Send " + fmt(amt) + " to my account first and I deliver tomorrow. Hurry, other buyers waiting.",
          [{ label: "Pay " + fmtS(amt) + " now", act: "scam", yes: true, amount: amt, g: g, q: Math.max(1, Math.round(amt / (D.GOODS[g].base * 0.5))) }, { label: "Ignore (red flags)", act: "scam" }]);
      } else if (r < 0.58 && S.level >= 2) {
        var amt2 = Math.round(Math.max(netWorth() * 0.15, 100000) / 1000) * 1000, partner = Math.random() < 0.5;
        if (partner) msg("obiora", "Obiora (Business partner)", "Partner", "Bros, I get supply contract for one hotel in Awka. Bring " + fmt(amt2) + ", we buy goods together and share profit in 4 days. You trust me?",
          [{ label: "Partner (" + fmtS(amt2) + ")", act: "invest", yes: true, kind: "partner", what: "Partnership with Obiora", amount: amt2, days: 4 }, { label: "Decline", act: "invest" }]);
        else msg("realtor", "Barr. Kenechukwu (Land agent)", "Investment", "Plots for the new layout outside Awka. " + fmt(amt2) + " now. Many people say value go double in one week. But land matter get risk o.",
          [{ label: "Invest (" + fmtS(amt2) + ")", act: "invest", yes: true, kind: "land", what: "Land at new Awka layout", amount: amt2, days: 7 }, { label: "Decline", act: "invest" }]);
      } else if (r < 0.7 && Object.keys(S.inv).length) {
        g = pick(Object.keys(S.inv)); q = Math.max(1, Math.min(S.inv[g], RI(1, 5))); p = Math.round(price(g) * 1.18 / 10) * 10;
        msg("ada", "Ada (Regular customer)", "Customer", "Abeg reserve " + q + " " + D.GOODS[g].name + " for me. I go pay " + fmt(p) + " each. You be my person!",
          [{ label: "Sell " + q + " for " + fmtS(p * q), act: "reserve", yes: true, g: g, q: q, p: p }, { label: "No stock", act: "reserve" }]);
      } else if (r < 0.78) {
        var a3 = Math.round(Math.max(3000, netWorth() * 0.01) / 500) * 500;
        msg("sister", "Sister Ifeoma (Family)", "Family", "Kedu? Mama says greet you. School fees for our small brother is " + fmt(a3) + ". Abeg help if you fit. Chukwu gozie gi.",
          [{ label: "Send " + fmtS(a3), act: "family", yes: true, amount: a3 }, { label: "Not now", act: "family" }]);
      } else if (r < 0.86) {
        msg("emeka", "Emeka (Rival trader)", "Rival", pick(["I hear say you dey sell for " + t.name + ". Na my area be that o 😏", "My shop don pass your own. Catch me if you can!", "Customers dey run come my side today. Sorry o 😂", "Respect. I see say you dey grow. Healthy competition!"]));
      } else if (S.pol.party || S.level >= 3) {
        msg("chief", "Chief Dozie (Party Chairman)", "Politician", pick(["Ward meeting dey this week. Show face.", "People dey talk your name for the ward. You go run?", "Election season dey come. Influence na everything.", "The Keke Riders Union want sponsor for their end of year party. Think am."]));
      } else msg("mama", "Mama Nkechi (Esusu)", "Esusu head", "Nnoo. Our esusu group get space. Join at any microfinance office. Small small, money go gather.");
    }
    if (S.love && !S.love.married && Math.random() < 0.4) msg("love", S.love.name + " ❤️", "Love interest", pick(["Good morning 🌞 You don chop?", "I miss you o. When we go see?", "Take care of yourself today. Don't work too hard.", "My people want to meet you one day 😊"]));
    if (S.love && S.love.married && Math.random() < 0.3) msg("love", S.love.name + " 💍", "Spouse", pick(["I prayed for your business this morning. Go and win!", "Tip: " + pick(D.GOOD_IDS.map(function (x) { return D.GOODS[x].name; })) + " is selling well this week.", "Come home early today. Your soup is ready 🍲"]));
  }
  function resolveDeals(rep) {
    S.deals = S.deals.filter(function (d) {
      if (S.day < d.day) return true;
      var r = Math.random();
      if (d.kind === "partner") {
        if (r < 0.55) { earn(d.amount * 1.6, "Partnership profit", true); rep.push({ title: "🤝 Partnership paid", text: d.from + " delivered. You got back " + fmt(d.amount * 1.6) + "." }); }
        else { S.stats.losses += d.amount; S.flags.recentLoss = S.day; rep.push({ title: "🏃🏾 Partner ran off!", big: true, bad: true, text: d.from + " switched off his phone and his shop is locked. Your " + fmt(d.amount) + " is gone. Lesson: put agreements in writing and never put in more than you can lose." }); }
      } else {
        if (r < 0.5) { earn(d.amount * 1.8, "Land sale", true); rep.push({ title: "🏡 Land value jumped", text: "You sold the plot for " + fmt(d.amount * 1.8) + ". Good investment!" }); }
        else if (r < 0.8) { earn(d.amount * 1.05, "Land sale", true); rep.push({ title: "Land sold", text: "Land market was slow. You sold for " + fmt(d.amount * 1.05) + "." }); }
        else { earn(d.amount * 0.3, "Land dispute settlement", true); S.stats.losses += d.amount * 0.7; S.flags.recentLoss = S.day; rep.push({ title: "⚖️ Land dispute!", big: true, bad: true, text: "Another family claimed the land. After the case you recovered only " + fmt(d.amount * 0.3) + ". Always verify land documents first." }); }
      }
      return false;
    });
  }

  /* ---------- random events ---------- */
  function randomEvent(rep) {
    var t = town(), r = Math.random(), shopsHere = Object.keys(S.shops).concat(Object.keys(S.warehouses));
    if (shopsHere.length && r < 0.06) {
      var tid = pick(shopsHere), lossFrac = R(0.3, 0.7), val = 0, lostUnits = {};
      for (var g in S.inv) { var u = Math.floor(S.inv[g] * lossFrac * 0.8); if (u > 0) { lostUnits[g] = u; val += avgCost(g) * u || D.GOODS[g].base * u * 0.8; removeGoods(g, u); } }
      var back = S.insured ? Math.round(val * 0.8) : 0; if (back) earn(back, "Fire insurance payout", true); S.stats.losses += val - back; S.flags.recentLoss = S.day;
      rep.push({ title: "🔥 MARKET FIRE in " + D.TOWNS[tid].name + "!", big: true, bad: true, alarm: true, text: "Fire broke out at night. Traders formed a bucket line but you lost goods worth about " + fmt(val) + ". " + (S.insured ? "Your insurance paid " + fmt(back) + ". Insurance na life!" : "You had no insurance. Your esusu group and savings can help you rise again.") });
      return;
    }
    var E = [
      function () { rep.push({ title: "🔥 Fire scare!", text: "Somebody shouted FIRE at " + t.name + " market. Everybody ran... it was just a woman frying akara with too much oil. Market resumed with laughter." }); },
      function () { var g = pick(D.GOOD_IDS); S.events.push({ good: g, mul: 1.3, days: 3 }); rep.push({ title: "📈 Price hike", text: D.GOODS[g].name + " price jumped across Anambra for 3 days. If you get stock, sell now!" }); },
      function () { var g = pick(D.GOOD_IDS); S.events.push({ good: g, mul: 0.78, days: 2 }); rep.push({ title: "📉 Price crash", text: "Too much " + D.GOODS[g].name + " flooded the markets. Price down for 2 days. Good time to buy." }); },
      function () { S.fareMul = 1.5; S.fareDays = 3; rep.push({ title: "⛽ Fuel scarcity", text: "Fuel queues everywhere. Transport fares up 50% for 3 days." }); },
      function () { D.TOWN_IDS.forEach(function (x) { S.light[x] = true; }); rep.push({ title: "💡 UP NEPA!", text: "Light everywhere today! People are shouting UP NEPA all over Anambra." }); },
      function () { var g = pick(D.GOOD_IDS); S.events.push({ good: g, mul: 0.9, days: 2, town: S.town }); rep.push({ title: "😤 Rival price war", text: "Emeka dropped his " + D.GOODS[g].name + " price in " + t.name + ". Prices here are lower for 2 days." }); },
      function () { var a = Math.round(Math.max(2000, S.cash * 0.05)); rep.push({ title: "👜 Found a bag", text: "A customer left a bag with " + fmt(a) + " at your spot.", choices: [{ label: "Find and return it", fn: function () { S.rep = clamp(S.rep + 6, 0, 100); H.toast("The woman blessed you and told the whole market. Rep +6", "good"); } }, { label: "Keep it", fn: function () { earn(a, "Kept found money"); S.rep = clamp(S.rep - 4, 0, 100); } }] }); },
      function () { var a = Math.round(1000 * t.cost * (1 + S.level)); rep.push({ title: "🧾 Revenue officer", text: "Council revenue officers came for the daily market levy: " + fmt(a) + ". They have a proper receipt.", choices: [{ label: "Pay with receipt", fn: function () { spend(a, "Council levy"); S.rep = clamp(S.rep + 1, 0, 100); } }] }); },
      function () { rep.push({ title: "🎉 Festival day", text: "The town is celebrating a new yam festival in " + t.name + ". Customers are in a spending mood today!" }); S.events.push({ good: "yam", mul: 1.2, days: 1 }); S.happy = clamp(S.happy + 8, 0, 100); },
      function () { var a = Math.round(Math.max(1000, S.stats.earned * 0.002)); earn(a, "Old debt repaid", true); rep.push({ title: "💸 Old customer paid", text: "A customer who bought on credit months ago came back and paid " + fmt(a) + ". Integrity still dey!" }); },
      function () { rep.push({ title: "🌧️ Heavy rain", text: "Rain fell all night. Roads are muddy but the farms are happy." }); S.events.push({ good: "yam", mul: 0.92, days: 2 }); }
    ];
    if (r < 0.55) pick(E)();
  }

  /* ---------- day cycle ---------- */
  function newDay(energy) {
    var rep = [], t = town(), oldNW = netWorth();
    S.day++; S.hour = 7; S.daily = {};
    S.energy = clamp(energy === "rough" ? 40 : energy, 0, 100);
    if (S.house && S.house.town === S.town && energy !== "rough") S.happy = clamp(S.happy + D.HOUSES[S.house.tier].happy, 0, 100);
    S.happy = clamp(S.happy - 4 + (S.love && S.love.married ? 4 : 0) + (S.mansion ? 2 : 0), 0, 100);
    if (S.love && !S.love.married) S.love.meter = clamp(S.love.meter - 2, 0, 100);
    // prices and tips
    D.TOWN_IDS.forEach(function (tid) { D.GOOD_IDS.forEach(function (g) { var f = S.prices[tid][g]; f *= 1 + (Math.random() - 0.5) * 0.14; f += (1 - f) * 0.15; S.prices[tid][g] = clamp(f, 0.8, 1.25); }); S.light[tid] = Math.random() < D.TOWNS[tid].light; });
    S.events.forEach(function (e) { e.days--; }); S.events = S.events.filter(function (e) { return e.days > 0; });
    S.tips.forEach(function (tp) { if (tp.day === S.day && tp.truth) S.events.push({ good: tp.good, mul: tp.mul, days: 2, town: tp.town }); }); S.tips = S.tips.filter(function (tp) { return tp.day > S.day; });
    if (S.fareDays > 0 && --S.fareDays === 0) S.fareMul = 1;
    // living cost
    var chop = Math.round(600 * t.cost * (1 + S.level * 0.8)); S.cash = Math.max(0, S.cash - chop); S.stats.spent += chop;
    var lines = ["Chop money: -" + fmt(chop)];
    if (S.bank > 0) { var it = Math.round(S.bank * 0.001); S.bank += it; if (it) lines.push("Savings interest: +" + fmt(it)); }
    if (S.debt > 0) { var di = Math.round(S.debt * 0.007); S.debt += di; lines.push("Loan interest: +" + fmt(di) + " debt"); }
    // shop boys
    for (var tid in S.shops) if (S.shops[tid].boy) {
      var units = Math.round(5 * D.TOWNS[tid].opp), got = 0;
      Object.keys(S.inv).forEach(function (g) { if (units <= 0) return; var q = Math.min(units, S.inv[g]); units -= q; var p = Math.round(price(g, tid) * 1.03); removeGoods(g, q); got += p * q; });
      if (got) { earn(got, "", true); lines.push("Sales boy (" + D.TOWNS[tid].name + "): +" + fmt(got)); }
    }
    if (S.workshop) { var inc = WS_INC[S.workshop] * (S.light.nnewi ? 1 : 0.85); earn(inc, "", true); lines.push(["", "Workshop", "Factory", "Plant"][S.workshop] + " income: +" + fmt(inc) + (S.light.nnewi ? "" : " (diesel cost)")); }
    // farms
    S.farms = S.farms.filter(function (f) {
      if (S.day < f.day) return true;
      var flood = Math.random() < 0.1, bags = f.plots * 10 * (flood ? 0.4 : 1), val = Math.round(bags * price("rice", "otuocha") * 0.95);
      earn(val, "", true); rep.push({ title: flood ? "🌊 Flood hit your rice farm" : "🌾 Rice harvest!", bad: flood, text: (flood ? "River overflowed. You saved only part of the crop. " : "Your " + f.plots + " plots gave a good harvest. ") + "Sold " + Math.round(bags) + " bags at the farm gate for " + fmt(val) + "." });
      return false;
    });
    // weekly
    if ((S.day - 1) % 7 === 0) weekly(lines, rep);
    // esusu on Eke day
    if (mdIdx() === 0 && S.esusu) {
      var e = S.esusu; e.cycle++;
      if (S.cash >= e.c) { S.cash -= e.c; lines.push("Esusu contribution: -" + fmt(e.c)); } else if (S.bank >= e.c) { S.bank -= e.c; lines.push("Esusu contribution from savings: -" + fmt(e.c)); } else { e.owed = (e.owed || 0) + e.c; lines.push("Esusu: you missed your contribution. It will be deducted from your payout."); }
      if (e.cycle === e.slot && !e.got) { e.got = true; earn(Math.max(0, e.c * 10 - (e.owed || 0)), "", true); rep.push({ title: "💃🏾 Esusu turn reach you!", text: "Mama Nkechi handed you " + fmt(e.c * 10) + ". Na small small contributions do am." }); }
      if (e.cycle >= 10) { S.esusu = null; lines.push("Esusu round finished. You can join a new one."); }
    }
    resolveImports(rep); resolveDeals(rep); election(rep); resolveContracts(rep);
    randomEvent(rep); genChats();
    if (S.pol.seat && Math.random() < 0.25) offerContract();
    var nw = netWorth();
    lines.push("Net worth: " + fmtS(nw) + " (" + (nw >= oldNW ? "+" : "") + fmtS(nw - oldNW) + ")");
    checkLevel(); save();
    H.modal({ title: "☀️ Day " + S.day + " · " + D.MARKET_DAYS[mdIdx()] + " day", text: (S.light[S.town] ? "💡 NEPA brought light in " + t.name + "." : "🕯️ No light in " + t.name + " today. NEPA don take am.") + (isMarketDay() ? " Today is market day here! More customers." : ""), lines: lines, morning: true });
    rep.forEach(function (x) { H.modal(x); if (x.alarm) SFX.alarm(); else if (x.bad) SFX.bad(); });
    H.refresh();
  }
  function weekly(lines, rep) {
    if (S.house) {
      var r = rentFor(S.house.tier, S.house.town);
      if (S.cash >= r) { S.cash -= r; lines.push("House rent: -" + fmt(r)); S.arrears = 0; }
      else if (S.bank >= r) { S.bank -= r; lines.push("House rent from savings: -" + fmt(r)); S.arrears = 0; }
      else { S.arrears++; if (S.arrears >= 2) { rep.push({ title: "🚪 Evicted", bad: true, text: "Landlord changed the lock after two weeks of unpaid rent. Find another place." }); S.house = null; S.arrears = 0; } else rep.push({ title: "Rent overdue", bad: true, text: "Landlord: 'My money, by next week, or you pack!'" }); }
    }
    for (var tid in S.shops) {
      var s = S.shops[tid]; if (s.weeks > 0) { s.weeks--; continue; }
      var sr = shopRent(tid) + (s.boy ? 10000 : 0);
      if (S.cash + S.bank >= sr) { payAny(sr); lines.push("Shop rent " + D.TOWNS[tid].name + ": -" + fmt(sr)); }
      else { delete S.shops[tid]; rep.push({ title: "Shop lost", bad: true, text: "You could not pay rent for your " + D.TOWNS[tid].name + " shop. The landlord gave it to another trader." }); }
    }
    for (tid in S.warehouses) {
      var w = S.warehouses[tid]; if (w.weeks > 0) { w.weeks--; continue; }
      var wr = whRent(tid);
      if (S.cash + S.bank >= wr) { payAny(wr); lines.push("Warehouse " + D.TOWNS[tid].name + ": -" + fmt(wr)); }
      else { delete S.warehouses[tid]; rep.push({ title: "Warehouse lost", bad: true, text: "Warehouse rent unpaid in " + D.TOWNS[tid].name + ". Lease ended." }); }
    }
    if (S.insured) { var pr = premium(); if (S.cash + S.bank >= pr) { payAny(pr); lines.push("Insurance premium: -" + fmt(pr)); } else { S.insured = false; lines.push("Insurance lapsed (no money)."); } }
    if (S.pol.seat) { var sal = D.SEATS.filter(function (x) { return x.id === S.pol.seat; })[0].salary; earn(sal, "", true); lines.push("Salary: +" + fmt(sal)); S.influence += 5; }
    // Forbes
    S.tycoons.forEach(function (ty) { ty.nw = Math.round(ty.nw * (1 + R(-0.01, 0.035))); });
    var list = forbesList(), me = list.filter(function (x) { return x.me; })[0], rank = me ? me.rank : 0;
    var old = S.forbes.rank || 999; S.forbes.week++;
    if (rank && rank <= 30 && rank < old) rep.push({ forbes: true, rank: rank, old: old });
    S.forbes.rank = rank; lines.push("Anambra Forbes updated (week " + S.forbes.week + ")");
  }
  function payAny(n) { var c = Math.min(S.cash, n); S.cash -= c; S.bank -= (n - c); }
  function forbesList() {
    var arr = S.tycoons.map(function (t) { return { name: t.name, ind: t.ind, nw: t.nw }; });
    if (window.NET) NET.livePlayers().forEach(function (p) { if (!NET.isMe(p.id)) arr.push({ name: p.name, ind: (p.title || "Player") + " · " + (p.town || ""), nw: Number(p.net_worth) || 0, live: true, id: p.id }); });
    arr.push({ name: S.name, ind: D.LEVELS[S.level].name, nw: netWorth(), me: true, live: !!(window.NET && NET.online) });
    arr.sort(function (a, b) { return b.nw - a.nw; }); arr.forEach(function (x, i) { x.rank = i + 1; });
    return arr;
  }

  return {
    get S() { return S; }, set S(v) { S = v; }, H: H, fresh: fresh, save: save, load: load, reset: reset,
    fmt: fmt, fmtS: fmtS, R: R, RI: RI, pick: pick, clamp: clamp, town: town, mdIdx: mdIdx, isMarketDay: isMarketDay,
    price: price, load_: load_, capacity: capacity, netWorth: netWorth, levelOf: levelOf, checkLevel: checkLevel, earn: earn, spend: spend, act: act, needEnergy: needEnergy, advance: advance,
    buy: buy, sell: sell, wholesale: wholesale, wholesalePrice: wholesalePrice, avgCost: avgCost, customers: customers, haggle: haggle,
    jobsHere: jobsHere, shift: shift, rentFor: rentFor, rentHouse: rentHouse, sleep: sleep,
    dist: dist, MODES: MODES, quote: quote, travel: travel,
    joinMaster: joinMaster, serve: serve, shopRent: shopRent, whRent: whRent, rentShop: rentShop, hireBoy: hireBoy, rentWarehouse: rentWarehouse, supplyRetailers: supplyRetailers,
    WS_COST: WS_COST, WS_INC: WS_INC, buildWorkshop: buildWorkshop, CONTAINERS: CONTAINERS, containerCost: containerCost, orderContainer: orderContainer,
    loanMax: loanMax, deposit: deposit, withdraw: withdraw, borrow: borrow, repay: repay, premium: premium, joinEsusu: joinEsusu, esusuEarly: esusuEarly,
    joinParty: joinParty, polAct: polAct, endorse: endorse, seatOk: seatOk, declare: declare, campaign: campaign,
    meet: meet, date: date, marry: marry, msg: msg, chatAction: chatAction, reply: reply, forbesList: forbesList, newDay: newDay
  };
})();
