/* UI: HUD, panels, modals, phone, chat, forbes. All user/remote text goes through textContent. */
var UI = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fmt = G.fmt, fmtS = G.fmtS;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, fn, cls, disabled) { var b = el("button", "btn " + (cls || ""), label); b.disabled = !!disabled; b.onclick = function (ev) { ev.stopPropagation(); SFX.unlock(); if (!b.disabled) { fn(); refreshAll(); } }; return b; }
  function sec(title, parent) { var s = el("div", "sec"); if (title) s.appendChild(el("h3", null, title)); (parent || body()).appendChild(s); return s; }
  function row(parent, title, sub, buttons, icon) {
    var r = el("div", "row"); if (icon) { var ic = el("div", null, icon); ic.style.fontSize = "22px"; r.appendChild(ic); }
    var g = el("div", "grow"); g.appendChild(el("div", "t", title)); if (sub) { var m = el("div", "muted"); if (typeof sub === "string") m.textContent = sub; else m.appendChild(sub); g.appendChild(m); } r.appendChild(g);
    var bs = el("div", "btns"); (buttons || []).forEach(function (b) { if (b) bs.appendChild(b); }); r.appendChild(bs); parent.appendChild(r); return r;
  }
  function p(parent, text, cls) { var e = el("p", cls || "muted", text); e.style.margin = "4px 0"; parent.appendChild(e); return e; }
  function body() { return $("panelBody"); }
  var current = null, currentArg = null, tabState = {};

  /* ---------- toasts / feedback ---------- */
  function toast(t, kind) { var d = el("div", "toast " + (kind || ""), t); $("toasts").appendChild(d); setTimeout(function () { d.remove(); }, 2600); while ($("toasts").children.length > 3) $("toasts").firstChild.remove(); if (kind === "bad") SFX.bad(); }
  var shownCash = 0;
  function money(n) {
    var c = $("hudCash"); c.classList.remove("pop", "drop"); void c.offsetWidth; c.classList.add(n > 0 ? "pop" : "drop"); setTimeout(function () { c.classList.remove("pop", "drop"); }, 300);
    W.float((n > 0 ? "+" : "") + fmtS(n), n > 0 ? "#b9ff7a" : "#ff8a80");
    if (n > 0) { W.coins(Math.min(30, 6 + Math.log10(n) * 3)); n >= 50000 ? SFX.cash() : SFX.coin(); }
  }
  /* ---------- HUD ---------- */
  function hud() {
    var S = G.S; if (!S) return;
    var target = S.cash; shownCash += (target - shownCash) * 0.25; if (Math.abs(target - shownCash) < 1) shownCash = target;
    $("hudCash").textContent = fmt(shownCash);
    var L = D.LEVELS[S.level], N = D.LEVELS[S.level + 1], nw = G.netWorth();
    $("hudLvlName").textContent = L.name + " · " + fmtS(nw);
    $("hudLvlBar").style.width = (N ? Math.max(0, Math.min(100, (nw - L.min) / (N.min - L.min) * 100)) : 100) + "%";
    $("hudLvlBar").style.background = L.color === "#8a8a8a" ? "#ffd54f" : L.color;
    $("hudTown").textContent = "📍 " + D.TOWNS[S.town].name;
    $("hudTime").textContent = "Day " + S.day + " · " + D.MARKET_DAYS[G.mdIdx()] + (G.isMarketDay() ? " 🛒" : "") + " · " + (S.hour < 10 ? "0" : "") + S.hour + ":00";
    $("hudLight").textContent = S.light[S.town] ? "💡" : "🕯️";
    $("hudEnergy").style.width = S.energy + "%"; $("hudEnergy").style.background = S.energy < 25 ? "#ff5252" : "#7CFC00";
    $("hudHappy").style.width = S.happy + "%"; $("hudHappy").style.background = "#ffd54f";
    var unread = 0; for (var k in S.chats) unread += S.chats[k].unread; unread += NET.unread();
    $("phoneBadge").textContent = unread ? String(unread) : "";
    var lt = $("liveTag"); lt.textContent = NET.online ? "● LIVE " + Math.max(1, NET.onlineCount()) : "● OFFLINE"; lt.classList.toggle("on", NET.online);
  }

  /* ---------- panels ---------- */
  function open(kind, arg) {
    current = kind; currentArg = arg; $("panel").classList.remove("hidden"); render();
    if (kind === "phone") NET.setFast(true);
  }
  function close() { $("panel").classList.add("hidden"); if (current === "phone") NET.setFast(false); current = null; if (MAPV.close) MAPV.close(); }
  function render() {
    if (!current) return; var b = body(), keep = b.scrollTop; b.textContent = "";
    var fn = P[current]; if (!fn) { close(); return; }
    var title = fn(currentArg); $("panelTitle").textContent = title || "";
    b.scrollTop = keep;
  }
  function refreshAll() { hud(); if (current && current !== "map" && current !== "chat" && current !== "phone_thread") render(); }
  function tabs(key, list, parent) {
    var t = el("div", "tabs"); tabState[key] = tabState[key] || list[0][0];
    list.forEach(function (x) { var bt = el("button", tabState[key] === x[0] ? "on" : "", x[1]); bt.onclick = function () { tabState[key] = x[0]; render(); }; t.appendChild(bt); });
    (parent || body()).appendChild(t); return tabState[key];
  }

  /* ---------- modal queue ---------- */
  var queue = [], showing = false;
  function modal(m) { if (m.forbes) return forbesReveal(m); queue.push(m); if (!showing) nextModal(); }
  function nextModal() {
    var m = queue.shift(); if (!m) { showing = false; $("modal").classList.add("hidden"); return; }
    showing = true; var c = $("modalCard"); c.textContent = ""; c.className = "card" + (m.bad ? " bad" : "") + (m.big ? " big" : "");
    c.appendChild(el("h2", null, m.title)); if (m.text) c.appendChild(el("p", null, m.text));
    if (m.lines) { var ul = el("ul"); m.lines.forEach(function (l) { ul.appendChild(el("li", null, l)); }); c.appendChild(ul); }
    if (m.node) c.appendChild(m.node);
    var bs = el("div", "btns");
    (m.choices || [{ label: m.morning ? "Start the day" : "OK" }]).forEach(function (ch) { var b = el("button", "btn", ch.label); b.onclick = function () { if (ch.fn) ch.fn(); G.checkLevel(); G.save(); refreshAll(); nextModal(); }; bs.appendChild(b); });
    c.appendChild(bs); $("modal").classList.remove("hidden");
  }

  /* ---------- level up ---------- */
  function levelUp(o, n, up) {
    var L = D.LEVELS[n], d = $("levelup"); d.textContent = "";
    if (!up) { toast("Level down: you are now " + L.name + ". Rise again!", "bad"); return; }
    SFX.level(); W.coins(40);
    d.appendChild(el("div", null, "LEVEL UP")); d.appendChild(el("h1", null, L.name)); d.appendChild(el("p", null, "Unlocked: " + L.unlock));
    var b = el("button", "btn alt", "Odogwu! Continue"); b.style.marginTop = "14px"; b.style.fontSize = "16px"; b.onclick = function () { d.classList.add("hidden"); }; d.appendChild(b);
    for (var i = 0; i < 60; i++) { var c = el("i", "conf"); c.style.left = Math.random() * 100 + "%"; c.style.background = ["#ffd54f", "#e53935", "#43a047", "#1e88e5", "#fff"][i % 5]; c.style.animationDuration = (1.5 + Math.random() * 2) + "s"; c.style.animationDelay = Math.random() * 0.8 + "s"; d.appendChild(c); }
    d.classList.remove("hidden");
  }
  function forbesReveal(m) {
    var node = el("div"); node.style.textAlign = "center";
    var big = el("div", null, "#" + m.old); big.style.cssText = "font-size:64px;font-weight:900;color:#d4a017"; node.appendChild(big);
    node.appendChild(el("p", null, "You climbed the Anambra Forbes rich list!"));
    var cur = m.old > 30 ? 31 : m.old, iv = setInterval(function () { cur--; if (cur <= m.rank) { cur = m.rank; clearInterval(iv); SFX.level(); } else SFX.click(); big.textContent = "#" + cur; }, 90);
    queue.push({ title: "🏆 Anambra Forbes", big: true, node: node, choices: [{ label: "See the list", fn: function () { open("forbes"); } }, { label: "Close" }] });
    if (!showing) nextModal();
  }

  /* ---------- customers (haggle) ---------- */
  var custQ = [];
  function custCard(parent) {
    var S = G.S, c = custQ[0]; if (!c) return;
    var card = el("div", "cust"); parent.appendChild(card);
    card.appendChild(el("div", "face", ["🧕🏾", "👨🏾", "👩🏾", "🧔🏾", "👵🏾", "👨🏾‍🦱"][c.name.length % 6]));
    card.appendChild(el("div", "t", c.name + " wants " + c.q + " × " + D.GOODS[c.g].name));
    card.appendChild(el("div", "say", "\"" + c.line + "\""));
    var have = S.inv[c.g] || 0, q = Math.min(c.q, have);
    var bs = el("div", "btns"); card.appendChild(bs);
    var next = function () { custQ.shift(); render(); };
    if (!have) { card.appendChild(el("p", "muted", "You don't have " + D.GOODS[c.g].name + ". Stock it next time!")); bs.appendChild(btn("Next customer", next)); return; }
    var ac = G.avgCost(c.g);
    card.insertBefore(el("p", "muted", "Offer " + fmt(c.offer) + " each · your cost " + fmt(ac) + " · " + (q < c.q ? "you have " + have : "")), bs);
    [[0, "Accept " + fmt(c.offer)], [1, "Counter " + fmt(c.offer * 1.05)], [2, "Push " + fmt(c.offer * 1.12)], [3, "Hold " + fmt(c.ask)]].forEach(function (o) {
      bs.appendChild(btn(o[1], function () {
        var r = G.haggle(c, o[0]);
        if (r.ok) { var pr = G.sell(c.g, q, r.price, "Sold to " + c.name); toast((r.grudge ? c.name + ": \"Okay o, but na my price.\" " : c.name + ": \"Daalu!\" ") + (pr >= 0 ? "Profit " + fmt(pr) : "Loss " + fmt(pr)), pr >= 0 ? "good" : "warn"); }
        else toast(c.name + " hissed and walked away. 😤", "warn");
        next();
      }, o[0] === 0 ? "" : "alt"));
    });
    bs.appendChild(btn("Refuse", next, "ghost"));
  }

  /* ---------- POI panels ---------- */
  var P = {};
  function agbero(kind) {
    var S = G.S, key = "agb_" + S.town + kind; if (S.daily[key]) return; S.daily[key] = 1;
    if (Math.random() > 0.15) return;
    var fee = Math.round(200 * D.TOWNS[S.town].cost * (1 + S.level) / 50) * 50;
    modal({ title: "🧍🏾‍♂️ Agbero at the gate", text: "\"Oga, ticket! Na " + fmt(fee) + " for today. No dull me.\"", choices: [
      { label: "Pay " + fmt(fee), fn: function () { G.spend(fee, "Agbero ticket"); } },
      { label: "Show union receipt & refuse", fn: function () { if (Math.random() < 0.4 + S.rep / 150) toast("He looked at your receipt and waved you in.", "good"); else { var f2 = fee * 2; S.cash = Math.max(0, S.cash - f2); S.stats.spent += f2; toast("Wahala! You paid " + fmt(f2) + " to avoid drama.", "bad"); } } }] });
  }
  P.market = function () {
    var S = G.S, t = G.town(); agbero("m");
    var s = sec(null); p(s, (G.isMarketDay() ? "🛒 Market day! More customers and better prices. " : "Normal day. ") + "Load " + G.load_() + "/" + G.capacity() + " · Cash " + fmt(S.cash), "muted");
    var tab = tabs("market", [["buy", "Buy"], ["sell", "Sell"], ["cust", "Customers"]]);
    if (tab === "buy") {
      var s2 = sec("Today's prices in " + t.name);
      D.GOOD_IDS.forEach(function (g) {
        var pr = G.price(g), base = D.GOODS[g].base, rel = pr / base, roomQ = Math.floor((G.capacity() - G.load_()) / D.GOODS[g].load), maxQ = Math.max(0, Math.min(roomQ, Math.floor(S.cash / pr)));
        var sub = el("span"); sub.textContent = fmt(pr) + " "; var tr = el("span", rel < 0.93 ? "down" : rel > 1.07 ? "up" : "", rel < 0.93 ? "▼ cheap" : rel > 1.07 ? "▲ dear" : "• fair"); sub.appendChild(tr); sub.appendChild(document.createTextNode(" · have " + (S.inv[g] || 0)));
        row(s2, D.GOODS[g].name, sub, [btn("+1", function () { G.buy(g, 1); }, "", maxQ < 1), btn("+5", function () { G.buy(g, 5); }, "", maxQ < 5), btn("Max " + maxQ, function () { G.buy(g, maxQ); }, "alt", maxQ < 1)], D.GOODS[g].icon);
      });
      if (S.level >= 1 && !S.items.barrow) row(sec("Upgrade"), "Wheelbarrow", "+25 carrying space", [btn("Buy ₦15,000", function () { if (G.spend(15000, "Wheelbarrow")) { S.items.barrow = true; SFX.level(); toast("Wheelbarrow acquired! Carry more.", "good"); } })], "🛒");
    } else if (tab === "sell") {
      var s3 = sec("Sell to wholesalers (instant, about 90% of market price)"); p(s3, "Big lots push the price down. Retail customers and warehouses pay better.");
      var any = false;
      Object.keys(S.inv).forEach(function (g) {
        any = true; var pr = G.wholesalePrice(g, 1), pa = G.wholesalePrice(g, S.inv[g]), ac = G.avgCost(g), pf = pa - ac;
        var sub = el("span"); sub.textContent = S.inv[g] + " @ " + fmt(pr) + (pa < pr ? " (all: " + fmt(pa) + ")" : "") + " · cost " + fmt(ac) + " "; sub.appendChild(el("span", pf >= 0 ? "down" : "up", (pf >= 0 ? "+" : "") + fmt(pf) + "/unit"));
        row(s3, D.GOODS[g].name, sub, [btn("Sell 1", function () { G.wholesale(g, 1); }), btn("Sell all", function () { var pf2 = G.wholesale(g, S.inv[g]); toast("Sold! " + (pf2 >= 0 ? "Profit " : "Loss ") + fmt(pf2), pf2 >= 0 ? "good" : "warn"); }, "alt")], D.GOODS[g].icon);
      });
      if (!any) p(s3, "You have nothing to sell. Buy cheap here, sell where it's dear. Check 🎒 Bag → Prices.");
    } else {
      var s4 = sec("Retail customers");
      if (!custQ.length) {
        p(s4, "Open your spot for 2 hours. Customers come, you haggle. Retail pays more than wholesale." + (S.shops[S.town] ? " Your shop here brings extra customers." : ""));
        s4.appendChild(btn("Open for customers (2h, ⚡8)", function () { if (!G.needEnergy(8)) return; if (S.hour > 21) return toast("Market don close. Come tomorrow.", "warn"); G.act(2, 8); custQ = G.customers(); }, "alt"));
      } else { p(s4, custQ.length + " customer(s) waiting"); custCard(s4); }
    }
    return t.name + " · " + (W.map ? labelOf("market") : "Market");
  };
  function labelOf(kind) { var b = W.map && W.map.buildings.filter(function (x) { return x.kind === kind; })[0]; return b ? b.label : D.POI[kind].label; }
  P.park = function () {
    var S = G.S; agbero("p");
    var s = sec("Where you dey go?"); p(s, "Fares follow real road distance. " + (S.fareMul > 1 ? "⛽ Fuel scarcity: fares are high!" : ""));
    s.appendChild(btn("🗺️ Open Anambra map", function () { open("map"); }, "alt"));
    var list = D.TOWN_IDS.filter(function (x) { return x !== S.town; }).sort(function (a, b) { return G.dist(S.town, a) - G.dist(S.town, b); });
    var s2 = sec("Destinations");
    list.forEach(function (to) {
      var T = D.TOWNS[to], bs = [];
      ["keke", "okada", "bus"].forEach(function (m) { var q = G.quote(to, m); if (q) bs.push(btn(G.MODES[m].name + " " + fmtS(q.fare) + " · " + q.hours + "h", function () { goTravel(to, m); }, m === "bus" ? "" : "alt")); });
      row(s2, T.name + " · " + G.dist(S.town, to) + "km", "Rent x" + T.cost + " · Opportunity x" + T.opp + " · " + T.tag, bs);
    });
    var s3 = sec("Guest house");
    row(s3, "Sleep at the motel", "Restores 80 energy. " + fmt(4000 * G.town().cost), [btn("Sleep", function () { close(); G.sleep("guest"); })], "🛏️");
    return labelOf("park");
  };
  function goTravel(to, m) { if (G.travel(to, m)) { close(); W.enter(to); MAIN.arrived(); } }
  P.house = function () {
    var S = G.S, t = G.town(), s = sec("Your house");
    if (S.house) { p(s, D.HOUSES[S.house.tier].name + " in " + D.TOWNS[S.house.town].name + " · rent " + fmt(G.rentFor(S.house.tier, S.house.town)) + "/week"); if (S.house.town === S.town) s.appendChild(btn("😴 Sleep at home (end day)", function () { close(); G.sleep("home"); })); else p(s, "Your house is in another town. Sleep at the motel in the motor park, or move here."); }
    else p(s, "You have no house. You sleep at the motor park or in your shop. Rent somewhere to rest well.");
    if (S.shops[S.town]) s.appendChild(btn("Sleep in your shop (60 energy)", function () { close(); G.sleep("shop"); }, "ghost"));
    var s2 = sec("Houses for rent in " + t.name);
    D.HOUSES.forEach(function (h, i) { var r = G.rentFor(i); row(s2, h.name, fmt(r) + "/week · first payment " + fmt(r * 2) + " (rent + caution) · rest " + h.energy, [btn("Rent", function () { G.rentHouse(i); }, "", S.house && S.house.town === S.town && S.house.tier === i)], "🏠"); });
    var s3 = sec("Power");
    p(s3, S.light[S.town] ? "💡 NEPA has light here today." : "🕯️ No light today. Without a generator you sleep hot and wake tired.");
    if (!S.items.gen) s3.appendChild(btn("Buy generator " + fmt(180000), function () { if (G.spend(180000, "Generator")) { S.items.gen = true; toast("I better pass my neighbour! Generator bought.", "good"); } }, "alt"));
    else p(s3, "You own a generator. Fuel costs about " + fmt(2500 * t.cost) + " on nights with no light.");
    if (S.level >= 5 && D.TOWNS[S.town]) row(sec("Country home"), "Build your mansion", "Go to Ozubulu's Country Home Site.", []);
    return labelOf("house");
  };
  P.bar = function (b) { return barPanel(false); };
  function barPanel(club) {
    var S = G.S, t = G.town(), c = t.cost, s = sec(club ? "Nightlife" : "Hang out");
    if (!club) {
      row(s, "Chill with pepper soup & drinks", "+12 happiness · 2h · " + fmt(1500 * c), [btn("Chill", function () { if (!G.spend(1500 * c, "Pepper soup")) return; S.happy = G.clamp(S.happy + 12, 0, 100); G.act(2, 0); maybeMeet(0.3); }, "alt")], "🍲");
      row(s, "Buy a round for traders", "+4 rep · gossip · " + fmt(10000 * c), [btn("Buy round", function () { if (!G.spend(10000 * c, "Bought a round")) return; S.rep = G.clamp(S.rep + 4, 0, 100); G.act(1, 0); var g = G.pick(D.GOOD_IDS), best = D.TOWN_IDS.slice().sort(function (a, b) { return G.price(g, b) - G.price(g, a); })[0]; toast("Gist: " + D.GOODS[g].name + " dey sell well for " + D.TOWNS[best].name + " now.", "good"); })], "🍺");
      row(s, "Small talk", "\"Nwanne, how far?\"", [btn("Talk", function () { toast(G.pick(D.SMALLTALK)); S.happy = G.clamp(S.happy + 2, 0, 100); }, "ghost")], "🗣️");
    } else {
      row(s, "Party night", "+25 happiness · ⚡-20 · 4h · " + fmt(15000 * c), [btn("Party", function () { if (S.hour < 18) return toast("Lounge opens by 6pm. Come back later.", "warn"); if (!G.spend(15000 * c, "Night out")) return; S.happy = G.clamp(S.happy + 25, 0, 100); G.act(4, 20); maybeMeet(0.45); }, "alt")], "🎶");
      row(s, "VIP table", "Big man move: +30 happiness, +4 rep, +3 influence · " + fmt(250000 * c), [btn("Book VIP", function () { if (S.level < 3) return toast("VIP na for Shop Owner level and up.", "warn"); if (!G.spend(250000 * c, "VIP table")) return; S.happy = G.clamp(S.happy + 30, 0, 100); S.rep = G.clamp(S.rep + 4, 0, 100); S.influence += 3; G.act(4, 15); })], "🍾");
    }
    loveSection();
    return labelOf(club ? "club" : "bar");
  };
  P.club = function () { return barPanel(true); };
  function maybeMeet(ch) { if (!G.S.love && Math.random() < ch) { var n = G.meet(); if (n) modal({ title: "💘 You met someone", text: "You started talking with " + n + " and the gist was sweet. Check your phone later!" }); } }
  function loveSection() {
    var S = G.S, L = S.love; if (!L) return;
    var s = sec(L.married ? "💍 " + L.name + " (spouse)" : "❤️ " + L.name);
    if (L.married) { p(s, "Married. Your spouse adds happiness every day."); return; }
    p(s, "Relationship " + Math.round(L.meter) + "/100");
    var bs = el("div", "btns"); s.appendChild(bs);
    bs.appendChild(btn("Date " + fmtS(8000 * G.town().cost), function () { G.date("date"); }));
    bs.appendChild(btn("Gift " + fmtS(30000 * G.town().cost), function () { G.date("gift"); }, "alt"));
    if (L.meter >= 100) bs.appendChild(btn("Propose · Igba Nkwu " + fmtS(1500000 * G.town().cost), function () { G.marry(); }, "red"));
  }
  P.bank = function () {
    var S = G.S, s = sec("Savings · " + fmt(S.bank));
    p(s, "Earns 0.1% a day. Savings help you survive big losses.");
    var bs = el("div", "btns"); s.appendChild(bs);
    [10000, 100000, 1e6].forEach(function (a) { bs.appendChild(btn("Save " + fmtS(a), function () { G.deposit(a); }, "", S.cash < a)); });
    bs.appendChild(btn("Save all", function () { G.deposit(S.cash); }, "alt", !S.cash));
    bs.appendChild(btn("Withdraw all", function () { G.withdraw(S.bank); }, "ghost", !S.bank));
    var s2 = sec("Loan · owing " + fmt(S.debt));
    p(s2, "Limit " + fmt(G.loanMax()) + " · 0.7% interest per day. Loans help you grow faster, but debt can sink you.");
    var b2 = el("div", "btns"); s2.appendChild(b2);
    [0.25, 1].forEach(function (f) { var a = Math.round((G.loanMax() - S.debt) * f); b2.appendChild(btn("Borrow " + fmtS(a), function () { G.borrow(a); }, "alt", a <= 0)); });
    b2.appendChild(btn("Repay", function () { G.repay(S.debt); }, "", !S.debt));
    var s3 = sec("Business insurance");
    p(s3, "Covers 80% of fire losses. Premium now: " + fmt(G.premium()) + "/week (grows with your stock).");
    s3.appendChild(S.insured ? btn("Cancel cover", function () { S.insured = false; }, "ghost") : btn("Insure my goods", function () { if (G.spend(G.premium(), "Insurance premium")) { S.insured = true; toast("You are covered. Sleep well.", "good"); } }));
    var s4 = sec("Esusu (contribution group)");
    if (S.esusu) { var e = S.esusu; p(s4, "Contribution " + fmt(e.c) + " every Eke day · round " + e.cycle + "/10 · your turn: round " + e.slot + (e.got ? " (collected)" : "")); if (!e.got) s4.appendChild(btn("Ask for early turn (emergency)", function () { G.esusuEarly(); }, "alt")); }
    else { p(s4, "10 members contribute every Eke day. When your turn comes you collect 10x. If disaster strikes, the group can swap your turn."); var b4 = el("div", "btns"); s4.appendChild(b4); [2000, 20000, 200000, 2000000].forEach(function (c) { b4.appendChild(btn(fmtS(c) + "/week", function () { G.joinEsusu(c); }, "", c > Math.max(5000, G.netWorth() * 0.2))); }); }
    return labelOf("bank");
  };
  P.job = function () {
    var S = G.S, s = sec("Shifts today");
    p(s, "Quick money when you're broke. Pay grows with skill (" + Math.round(S.skill) + ").");
    G.jobsHere().forEach(function (j) { var pay = Math.round(j.pay * Math.sqrt(G.town().opp) * (1 + S.skill / 200) / 10) * 10; row(s, j.name, fmt(pay) + " · " + j.hours + "h · ⚡" + j.energy, [btn("Work", function () { G.shift(j); }, "alt")], "🧰"); });
    return labelOf("job");
  };
  P.master = function () {
    var S = G.S, m = D.MASTERS[S.town], s = sec("Igba Boi with " + m.name);
    p(s, m.name + " trades in " + m.trade + ". Serve him for " + m.days + " days: learn the trade, earn a small allowance, then he settles you with capital and your own shop. Honesty matters.");
    if (S.appr && S.appr.town === S.town) { p(s, "Days served: " + S.appr.served + "/" + m.days + " · Oga's trust: " + Math.round(S.trust)); s.appendChild(btn(S.appr.last === S.day ? "Served today ✔" : "Serve Oga today (8h, ⚡30)", function () { G.serve(); }, "alt", S.appr.last === S.day)); }
    else if (S.appr) p(s, "You are serving " + D.MASTERS[S.appr.town].name + " in " + D.TOWNS[S.appr.town].name + ".");
    else if (S.settled) p(s, "You have already been settled. Now you are an Oga too!");
    else if (S.level > 2) p(s, "\"You don big pass apprentice now. Go and grow your business!\"");
    else s.appendChild(btn("Become his apprentice", function () { G.joinMaster(); }));
    return labelOf("master");
  };
  P.shop = function () {
    var S = G.S, s = sec("Shops in " + G.town().name), sh = S.shops[S.town];
    if (sh) { p(s, "✅ Your shop is here. +120 space, +3 customers per round, better prices. Rent " + fmt(G.shopRent()) + "/week" + (sh.weeks ? " (" + sh.weeks + " weeks prepaid)" : "") + "."); if (!sh.boy) s.appendChild(btn("Hire a sales boy (₦10,000/week)", function () { G.hireBoy(); }, "alt", S.level < 2)); else p(s, "Your sales boy sells from your stock every night."); }
    else { p(s, "Rent " + fmt(G.shopRent()) + "/week. First payment " + fmt(G.shopRent() * 2) + ". Needs Trader level."); s.appendChild(btn("Rent a shop", function () { G.rentShop(); }, "", S.level < 2)); }
    var mine = Object.keys(S.shops); if (mine.length) p(sec("Your shops"), mine.map(function (x) { return D.TOWNS[x].name; }).join(", "));
    return labelOf("shop");
  };
  P.warehouse = function () {
    var S = G.S, s = sec("Warehouse in " + G.town().name);
    if (S.warehouses[S.town]) {
      p(s, "✅ Yours. +2,500 space. Supply retailers in bulk once a day per item at 98% of market price.");
      Object.keys(S.inv).forEach(function (g) { row(s, D.GOODS[g].name, S.inv[g] + " in stock", [btn("Supply retailers", function () { var pf = G.supplyRetailers(g); if (pf != null) toast("Supplied! Profit " + fmt(pf), "good"); }, "alt", !!S.daily["sup_" + g])], D.GOODS[g].icon); });
    } else { p(s, "Rent " + fmt(G.whRent()) + "/week (first payment " + fmt(G.whRent() * 2) + "). Needs Shop Owner level."); s.appendChild(btn("Rent warehouse", function () { G.rentWarehouse(); }, "", S.level < 3)); }
    return labelOf("warehouse");
  };
  P.bridge = function () {
    var S = G.S, s = sec("The Niger Bridge");
    p(s, "The bridge links Onitsha to the west. Traffic, hawkers, and the wide Niger river below.");
    row(s, "Watch the river", "+8 happiness · 1h", [btn("Relax", function () { if (S.daily.bridge) return toast("You already watched the river today.", "warn"); S.daily.bridge = 1; S.happy = G.clamp(S.happy + 8, 0, 100); G.act(1, 0); toast("The breeze from the Niger is sweet."); })], "🌊");
    row(s, "Hawk pure water in traffic", "Buy 20 bags here, sell fast to drivers", [btn("Hawk (3h)", function () {
      if (!G.needEnergy(20)) return; var cost = 20 * G.price("water"); if (!G.spend(cost, "20 bags pure water")) return;
      var sold = G.RI(12, 20), rev = sold * Math.round(G.price("water") * G.R(1.3, 1.6)); G.act(3, 20); G.earn(rev, "Sold " + sold + " bags in traffic"); toast("Sold " + sold + "/20 bags. Profit " + fmt(rev - cost), rev > cost ? "good" : "warn");
    }, "alt")], "💧");
    return labelOf("bridge");
  };
  P.waterside = function () {
    var S = G.S, s = sec("Boat cargo at the waterside");
    p(s, "Boats bring goods down the river. One lot a day, sold fast and cheap. Quick flip!");
    var lot = S.daily.lot; if (!lot) { var g = G.pick(D.GOOD_IDS); lot = S.daily.lot = { g: g, q: Math.max(2, Math.round(G.R(5, 30) * (1 + S.level * 0.6) / D.GOODS[g].load)), p: Math.round(G.price(g) * G.R(0.68, 0.84) / 10) * 10 }; }
    if (lot.sold) p(s, "Today's lot is sold. Come back tomorrow.");
    else row(s, lot.q + " × " + D.GOODS[lot.g].name, fmt(lot.p) + " each (market " + fmt(G.price(lot.g)) + ")", [btn("Buy lot " + fmtS(lot.p * lot.q), function () { if (G.buy(lot.g, lot.q, lot.p, "Boat cargo lot")) { lot.sold = true; toast("Lot secured! Sell it where it's dear.", "good"); } }, "alt")], D.GOODS[lot.g].icon);
    return labelOf("waterside");
  };
  P.import = function () {
    var S = G.S, s = sec("Import a container");
    p(s, "Order goods from overseas through the port. About 40% cheaper than market, lands in 4-6 days. Risks: the ship can sink, customs can hold or seize it. Needs Warehouse Boss level and a warehouse.");
    var ins = tabState.insure !== false; var b = btn((ins ? "☑" : "☐") + " Marine insurance (+3%)", function () { tabState.insure = !ins; }, "ghost"); s.appendChild(b);
    Object.keys(G.CONTAINERS).forEach(function (g) { var c = G.containerCost(g); row(s, G.CONTAINERS[g] + " × " + D.GOODS[g].name, "Cost " + fmtS(c) + " · market value ~" + fmtS(G.CONTAINERS[g] * D.GOODS[g].base), [btn("Order", function () { G.orderContainer(g, ins); }, "alt", S.level < 4)], D.GOODS[g].icon); });
    if (S.imports.length) { var s2 = sec("In transit"); S.imports.forEach(function (im) { row(s2, D.GOODS[im.g].name + " × " + im.units, (im.status === "customs" ? "🛃 Held at customs" : "🚢 At sea") + " · ETA day " + im.eta + (im.insured ? " · insured" : ""), []); }); }
    return labelOf("import");
  };
  P.factory = function () {
    var S = G.S, s = sec("Made in Nnewi");
    var names = ["Nothing yet", "Workshop", "Factory", "Industrial plant"], need = [0, 3, 5, 6];
    p(s, "Current: " + names[S.workshop] + (S.workshop ? " · earns ~" + fmt(G.WS_INC[S.workshop]) + "/day" : "") + ". Local manufacturing of motor parts.");
    if (S.workshop < 3) { var n = S.workshop + 1; row(s, "Build " + names[n], "Cost " + fmtS(G.WS_COST[n]) + " · earns ~" + fmtS(G.WS_INC[n]) + "/day · needs " + D.LEVELS[need[n]].name, [btn("Build", function () { G.buildWorkshop(); }, "alt", S.level < need[n])], "🏭"); }
    else p(s, "You run one of the biggest plants in Nnewi. Odogwu!");
    return labelOf("factory");
  };
  P.party = function () {
    var S = G.S, pl = S.pol, s = sec("Your political profile");
    p(s, "Influence " + Math.round(S.influence) + " · Reputation " + Math.round(S.rep) + (pl.party ? " · Party: " + D.PARTIES.filter(function (x) { return x.id === pl.party; })[0].name : "") + (pl.seat ? " · Seat: " + D.SEATS.filter(function (x) { return x.id === pl.seat; })[0].name : ""));
    if (!pl.party) { var s0 = sec("Join a party (₦20,000 form)"); D.PARTIES.forEach(function (pt) { row(s0, pt.name, pt.short, [btn("Join", function () { G.joinParty(pt.id); })], "🗳️"); }); return labelOf("party"); }
    var s1 = sec("Grow influence");
    [["meeting", "Attend ward meeting", "+3 · ₦2,000 · 2h"], ["townhall", "Host a town hall", "+7 · ₦100,000 · 3h"], ["borehole", "Sponsor a borehole", "+15 · ₦2M"], ["scholarship", "Fund scholarships", "+30 · ₦10M"], ["road", "Grade a community road", "+60 · ₦50M"]].forEach(function (a) { row(s1, a[1], a[2], [btn("Do it", function () { G.polAct(a[0]); }, "alt")]); });
    var s2 = sec("Endorsements"); if (pl.giftReady) p(s2, "🎁 Your forge gift is ready: next endorsement costs half.");
    D.ENDORSERS.forEach(function (e) { row(s2, e.name, pl.endorse[e.id] ? "✅ Endorsed you" : "Needs " + e.minInf + " influence · sponsor their programme " + fmtS(pl.giftReady ? e.ask / 2 : e.ask), [pl.endorse[e.id] ? null : btn("Seek", function () { G.endorse(e); }, "", S.influence < e.minInf)]); });
    var s3 = sec(pl.running ? "🗳️ Campaign" : "Run for office");
    if (pl.running) {
      var seat = D.SEATS.filter(function (x) { return x.id === pl.running.seat; })[0];
      p(s3, seat.name + " · election on day " + pl.running.end + " · support " + Math.round(pl.running.support) + " vs opponent " + seat.oppStr);
      [["door", "Door-to-door", "free · 5h · +3"], ["posters", "Posters & jingles", fmtS(seat.fee * 0.1) + " · +4"], ["rally", "Big rally", fmtS(seat.fee * 0.3) + " · +9"]].forEach(function (a) { row(s3, a[1], a[2], [btn("Go", function () { G.campaign(a[0]); }, "alt", !!S.daily["camp_" + a[0]])]); });
    } else D.SEATS.forEach(function (st) { var held = pl.held.indexOf(st.id) >= 0; row(s3, st.name, held ? "✅ Won before" : "Form " + fmtS(st.fee) + " · needs " + st.minInf + " influence" + (st.needs ? " · must have won " + D.SEATS.filter(function (x) { return x.id === st.needs; })[0].name : ""), [held ? null : btn("Declare", function () { G.declare(st); }, "red", !G.seatOk(st) || S.influence < st.minInf)]); });
    return labelOf("party");
  };
  P.govt = function () {
    var S = G.S, s = sec("Government House area");
    if (!S.pol.seat) { p(s, "Security at the gate checks your name. Only office holders get contracts. Win an election at the Party Secretariat first."); s.appendChild(btn("Sign the visitors' book", function () { if (S.daily.vb) return; S.daily.vb = 1; S.influence += 1; toast("Your name is in the book. +1 influence"); }, "ghost")); return labelOf("govt"); }
    p(s, "As an office holder you receive contract offers on your phone. Deliver well and people trust you. Cut corners and a scandal can end you.");
    var act = S.pol.contracts.filter(function (c) { return c.active; }); act.forEach(function (c) { row(s, c.what, "In progress · done day " + c.done + " · " + (c.mode === "well" ? "quality work" : "cheap work ⚠️"), []); });
    return labelOf("govt");
  };
  P.unizik = function () {
    var S = G.S, s = sec("Nnamdi Azikiwe University");
    row(s, "Speak at the student forum", "+4 influence · 3h", [btn("Speak", function () { G.polAct("forum"); }, "alt")], "🎤");
    row(s, "Sell phones on campus", "Students pay well for phones in Awka. Open a customer round at the market with phones in stock.", [], "📱");
    row(s, "Hire a graduate intern", "+5 skill · " + fmt(30000), [btn("Hire", function () { if (S.daily.intern) return; if (G.spend(30000, "Graduate intern")) { S.daily.intern = 1; S.skill = G.clamp(S.skill + 5, 0, 100); toast("Your intern set up your books. +5 skill", "good"); } })], "🎓");
    return labelOf("unizik");
  };
  P.forge = function () {
    var S = G.S, s = sec("Awka blacksmith quarter");
    p(s, "Awka smiths have worked iron for generations. Hoes, gongs, gates and gifts are made here.");
    row(s, "Commission a gift for the elders", "Next endorsement costs half · " + fmt(300000), [btn("Commission", function () { if (S.pol.giftReady) return toast("Your gift is already waiting.", "warn"); if (G.spend(300000, "Forged gift")) { S.pol.giftReady = true; toast("A fine iron staff of office, ready for the elders.", "good"); } })], "⚒️");
    row(s, "Help at the forge", "Job · see Job Centre for pay", [btn("Work", function () { G.shift(D.JOBS.awka[1]); }, "alt")], "🔥");
    return labelOf("forge");
  };
  P.lake = function () { var S = G.S, s = sec("Agulu Lake"); p(s, "Calm water, birds, and fresh air. Locals protect the lake and its crocodiles."); row(s, "Relax by the lake", "+15 happiness, +10 energy · 2h", [btn("Relax", function () { if (S.daily.lake) return toast("You've rested here today.", "warn"); S.daily.lake = 1; S.happy = G.clamp(S.happy + 15, 0, 100); S.energy = G.clamp(S.energy + 10, 0, 100); G.act(2, 0); toast("Peace of mind. O di mma."); }, "alt")], "🏞️"); return labelOf("lake"); };
  P.museum = function () { var S = G.S, s = sec("Igbo-Ukwu heritage"); p(s, "Igbo-Ukwu is world famous for bronze work cast more than a thousand years ago. Learn the story of the ancestors."); row(s, "Visit the exhibition", "+12 happiness · ₦1,000 · 2h", [btn("Visit", function () { if (S.daily.mus) return; if (G.spend(1000, "Museum ticket")) { S.daily.mus = 1; S.happy = G.clamp(S.happy + 12, 0, 100); G.act(2, 0); toast("You left proud of your roots."); } }, "alt")], "🏺"); return labelOf("museum"); };
  P.farm = function () {
    var S = G.S, s = sec("Rice farms by the Anambra river");
    p(s, "Plant rice plots. Harvest in 6 days and sell at the farm gate. Floods are a risk (10%).");
    row(s, "Plant 1 plot", fmt(400000) + " · ~10 bags", [btn("Plant", function () { if (S.level < 2) return toast("Reach Trader level to farm.", "warn"); if (G.spend(400000, "Rice plot")) { S.farms.push({ plots: 1, cost: 400000, day: S.day + 6 }); toast("Seedlings in! Harvest on day " + (S.day + 6), "good"); } }, "alt")], "🌱");
    row(s, "Plant 5 plots", fmt(2000000), [btn("Plant", function () { if (S.level < 2) return toast("Reach Trader level to farm.", "warn"); if (G.spend(2000000, "5 rice plots")) { S.farms.push({ plots: 5, cost: 2000000, day: S.day + 6 }); toast("5 plots planted!", "good"); } }, "alt")], "🌾");
    if (S.farms.length) p(sec("Growing"), S.farms.map(function (f) { return f.plots + " plot(s) → day " + f.day; }).join(" · "));
    return labelOf("farm");
  };
  P.mansion = function () {
    var S = G.S, s = sec("Build your country home");
    if (S.mansion) { p(s, "Your mansion stands tall. People call you Odogwu when you pass."); return labelOf("mansion"); }
    p(s, "Every big trader builds at home. +20 influence, +2 happiness every day. Needs Importer level.");
    s.appendChild(btn("Build mansion " + fmtS(150e6), function () { if (S.level < 5) return toast("Reach Importer level first.", "warn"); if (G.spend(150e6, "Country mansion")) { S.mansion = true; S.influence += 20; SFX.level(); modal({ title: "🏰 Mansion complete!", big: true, text: "The whole village came for the opening. Your parents cried with joy." }); } }, "red"));
    return labelOf("mansion");
  };
  P.filler = function (b) { var s = sec(b.label); p(s, G.pick(D.SMALLTALK)); p(s, "This is a local business. In v2, real businesses can rent spots like this."); return b.label; };
  P.billboard = function (b) {
    var s = sec(null); var bb = el("div", "bb", "YOUR BUSINESS HERE"); s.appendChild(bb);
    p(s, "Billboard " + b.id + " in " + G.town().name + ". Every player walking past sees it.", "");
    p(s, "Placeholder rate: " + fmt(5000 * G.town().opp) + "/week. Booking is not live yet. Businesses will be able to book this spot in a later version.");
    return "Billboard " + b.id;
  };

  /* ---------- bag & prices ---------- */
  P.bag = function () {
    var S = G.S, tab = tabs("bag", [["inv", "My goods"], ["prices", "Prices"], ["assets", "Assets"]]);
    if (tab === "inv") {
      var s = sec("Load " + G.load_() + "/" + G.capacity());
      var ks = Object.keys(S.inv); if (!ks.length) p(s, "Empty. Go to any market and buy goods.");
      ks.forEach(function (g) { row(s, D.GOODS[g].name, S.inv[g] + " units · avg cost " + fmt(G.avgCost(g)) + " · here " + fmt(G.price(g)), [], D.GOODS[g].icon); });
    } else if (tab === "prices") {
      var s2 = sec("Today's prices (trader WhatsApp group)"); p(s2, "Green = cheapest town, red = dearest. Buy green, sell red.");
      var tb = el("table", "prices"), hr = el("tr"); hr.appendChild(el("th", null, "Town"));
      D.GOOD_IDS.forEach(function (g) { hr.appendChild(el("th", null, D.GOODS[g].icon)); }); tb.appendChild(hr);
      var mins = {}, maxs = {}; D.GOOD_IDS.forEach(function (g) { var ps = D.TOWN_IDS.map(function (t) { return G.price(g, t); }); mins[g] = Math.min.apply(0, ps); maxs[g] = Math.max.apply(0, ps); });
      D.TOWN_IDS.forEach(function (t) { var tr = el("tr"); tr.appendChild(el("td", null, (t === S.town ? "📍" : "") + D.TOWNS[t].name)); D.GOOD_IDS.forEach(function (g) { var v = G.price(g, t), td = el("td", "pricecell " + (v === mins[g] ? "down" : v === maxs[g] ? "up" : ""), fmtS(v).replace("₦", "")); tr.appendChild(td); }); tb.appendChild(tr); });
      var wrap = el("div"); wrap.style.overflowX = "auto"; wrap.appendChild(tb); s2.appendChild(wrap);
    } else {
      var s3 = sec("What you own");
      var items = [["Cash", fmt(S.cash)], ["Savings", fmt(S.bank)], ["Debt", fmt(S.debt)], ["Goods & assets value", fmt(G.netWorth() - S.cash - S.bank + S.debt)], ["House", S.house ? D.HOUSES[S.house.tier].name + " (" + D.TOWNS[S.house.town].name + ")" : "None"], ["Shops", Object.keys(S.shops).map(function (x) { return D.TOWNS[x].name; }).join(", ") || "None"], ["Warehouses", Object.keys(S.warehouses).map(function (x) { return D.TOWNS[x].name; }).join(", ") || "None"], ["Nnewi works", ["None", "Workshop", "Factory", "Industrial plant"][S.workshop]], ["Insurance", S.insured ? "Covered" : "None"], ["Esusu", S.esusu ? fmt(S.esusu.c) + "/week" : "None"], ["Generator", S.items.gen ? "Yes" : "No"]];
      items.forEach(function (x) { row(s3, x[0], x[1], []); });
    }
    return "🎒 Bag";
  };

  /* ---------- phone ---------- */
  P.phone = function () {
    var S = G.S, s = sec(null);
    var top = el("div", "btns"); top.appendChild(btn("✍️ New chat with a player", function () { open("newdm"); }, "alt")); s.appendChild(top);
    if (!NET.online) p(s, "Offline: real player DMs need internet. NPC chats still work.");
    var threads = [];
    Object.keys(S.chats).forEach(function (k) { var th = S.chats[k], last = th.msgs[th.msgs.length - 1]; threads.push({ key: "npc:" + k, name: th.name, role: th.role, last: last ? last.text : "", unread: th.unread, sort: (last && last.t) ? 1e9 + parseFloat(String(last.t).replace(":", ".")) : 0, npc: true }); });
    NET.conversations().forEach(function (c) { var last = c.msgs[c.msgs.length - 1]; threads.push({ key: "dm:" + c.id, name: c.name, role: "Player", last: last.body, unread: c.unread, sort: 2e9 + new Date(c.last).getTime() / 1e3, live: true }); });
    threads.sort(function (a, b) { return (b.unread - a.unread) || (b.sort - a.sort); });
    var list = sec("Inbox");
    if (!threads.length) p(list, "No messages yet.");
    threads.forEach(function (t) {
      var r = el("div", "row"); r.style.cursor = "pointer";
      var g = el("div", "grow"), tt = el("div", "t", t.name); tt.appendChild(el("span", "tag " + (t.live ? "live" : "npc"), t.live ? "PLAYER" : t.role)); if (t.unread) tt.appendChild(el("span", "tag live", t.unread + " new"));
      g.appendChild(tt); g.appendChild(el("div", "muted", String(t.last).slice(0, 70))); r.appendChild(g);
      r.onclick = function () { open("thread", t.key); }; list.appendChild(r);
    });
    var bl = NET.blockedList(), bk = Object.keys(bl);
    if (bk.length) { var sb = sec("Blocked players"); bk.forEach(function (id) { row(sb, String(bl[id] === true ? id.slice(0, 8) : bl[id]), "", [btn("Unblock", function () { NET.unblock(id); })]); }); }
    return "📱 Phone";
  };
  P.newdm = function () {
    var s = sec("Players online & on Forbes");
    var ps = NET.livePlayers().filter(function (x) { return !NET.isMe(x.id); });
    if (!NET.online) p(s, "Offline. Connect to the internet to message real players.");
    else if (!ps.length) p(s, "No other players yet. Share the game link with friends!");
    ps.slice(0, 80).forEach(function (pl) { row(s, pl.name, (pl.title || "") + " · " + (pl.town || "") + " · " + fmtS(Number(pl.net_worth) || 0), [btn("Message", function () { open("thread", "dm:" + pl.id + ":" + pl.name); })]); });
    return "New chat";
  };
  P.thread = function (key) {
    var S = G.S, b = body(), list = el("div", "chatlist"), title;
    if (key.indexOf("npc:") === 0) {
      var id = key.slice(4), th = S.chats[id]; if (!th) return "Chat"; th.unread = 0; title = th.name;
      th.msgs.forEach(function (m, mi) {
        var d = el("div", "msg" + (m.from === "me" ? " me" : "")); d.appendChild(el("div", null, m.text));
        if (m.actions && !m.done) { var bs = el("div", "btns"); bs.style.marginTop = "6px"; m.actions.forEach(function (a, ai) { bs.appendChild(btn(a.label, function () { G.chatAction(id, mi, ai); render(); }, ai === 0 ? "alt" : "ghost")); }); d.appendChild(bs); }
        list.appendChild(d);
      });
      b.appendChild(list);
      if (id === "love" && S.love && !S.love.married) { var c = el("div", "compose"); c.appendChild(btn("💌 Send sweet message", function () { if (S.daily.lovechat) return toast("Don't over-text. Tomorrow!", "warn"); S.daily.lovechat = 1; S.love.meter = G.clamp(S.love.meter + 4, 0, 100); G.reply("love", G.pick(["Good morning my dear 🌹", "I'm thinking of you today", "Kedu? I miss you", "You make my day sweet 😊"])); G.msg("love", th.name, th.role, G.pick(["Awww 🥰", "You too! Take care today", "Hehe stop it 🙈", "Daalu, my person ❤️"])); th.unread = 0; render(); }, "alt")); b.appendChild(c); }
      b.appendChild(btn("← Inbox", function () { open("phone"); }, "ghost"));
      setTimeout(function () { b.scrollTop = b.scrollHeight; }, 0); G.save(); hud();
      return title;
    }
    var parts = key.split(":"), other = parts[1], c2 = NET.conversations().filter(function (x) { return x.id === other; })[0];
    title = c2 ? c2.name : (parts.slice(2).join(":") || "Player");
    (c2 ? c2.msgs : []).forEach(function (m) { var mine = m.sender_id === NET.id, d = el("div", "msg" + (mine ? " me" : "")); d.appendChild(el("div", null, NET.clean(m.body))); var w = el("span", "when", new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); d.appendChild(w); list.appendChild(d); });
    if (!c2) list.appendChild(el("div", "muted", "Say hello to " + title + ". Messages are private between you two."));
    b.appendChild(list); NET.markRead(other);
    var cp = el("div", "compose"), inp = el("input"); inp.maxLength = 500; inp.placeholder = "Message " + title + "…";
    var send = function () { var v = inp.value.trim(); if (!v) return; inp.disabled = true; NET.sendDm(other, v).then(function () { inp.value = ""; render(); }).catch(function (e) { toast(/slow/i.test(e.message) ? "Slow down small." : "Not sent: " + e.message, "bad"); }).then(function () { inp.disabled = false; }); };
    inp.onkeydown = function (e) { if (e.key === "Enter") send(); };
    cp.appendChild(inp); cp.appendChild(btn("Send", send)); b.appendChild(cp);
    var bs2 = el("div", "btns"); bs2.style.marginTop = "8px"; bs2.appendChild(btn("← Inbox", function () { open("phone"); }, "ghost")); bs2.appendChild(btn("Block " + title, function () { NET.block(other, title); toast(title + " blocked on this phone."); open("phone"); }, "red")); b.appendChild(bs2);
    setTimeout(function () { b.scrollTop = b.scrollHeight; }, 0); hud();
    return title;
  };

  /* ---------- town square chat ---------- */
  var feed = { global: [], town: {} };
  function npcLine() { var t = G.pick(D.TOWN_IDS); return { name: G.pick(D.SQUARE_HANDLES), body: G.pick(D.SQUARE_LINES).replace("{town}", D.TOWNS[t].name).replace("{md}", D.MARKET_DAYS[G.mdIdx()]), npc: true, t: Date.now(), town: D.TOWNS[t].name }; }
  function pushFeed(ch, m) { var arr = ch === "global" ? feed.global : (feed.town[ch] = feed.town[ch] || []); arr.push(m); if (arr.length > 80) arr.shift(); }
  function chName(tab) { return tab === "global" ? "global" : "town:" + D.TOWNS[G.S.town].name; }
  var loaded = {};
  P.chat = function () {
    var tab = tabs("chat", [["global", "🌍 All Anambra"], ["town", "📍 " + D.TOWNS[G.S.town].name]]), ch = chName(tab), b = body();
    if (!loaded[ch] && NET.online) { loaded[ch] = true; NET.loadMessages(ch).then(function (rows) { rows.forEach(function (m) { pushFeed(ch === "global" ? "global" : ch, { name: m.name, body: m.body, pid: m.player_id, live: true, t: new Date(m.created_at).getTime(), town: m.town, id: m.id }); }); sortFeed(ch); if (current === "chat") render(); }); }
    var arr = ch === "global" ? feed.global : (feed.town[ch] || []);
    if (!arr.length) for (var i = 0; i < 6; i++) pushFeed(ch, npcLine());
    p(b, NET.online ? "LIVE = real players. NPC = simulated town chatter. Tap a player's name to DM or block." : "Offline: showing simulated chatter. Real chat returns when you're online.");
    var list = el("div", "chatlist");
    (ch === "global" ? feed.global : feed.town[ch]).forEach(function (m) {
      if (m.pid && NET.isBlocked(m.pid)) return;
      var mine = m.pid && NET.isMe(m.pid), d = el("div", "msg" + (mine ? " me" : "") + (m.npc ? " npc" : ""));
      var who = el("span", "who", m.name); d.appendChild(who); d.appendChild(el("span", "tag " + (m.npc ? "npc" : mine ? "me" : "live"), m.npc ? "NPC" : mine ? "YOU" : "LIVE"));
      if (m.town) d.appendChild(el("span", "when", m.town));
      d.appendChild(el("div", null, NET.clean(m.body)));
      if (m.live && !mine) who.onclick = function () { playerMenu(m.pid, m.name); };
      list.appendChild(d);
    });
    b.appendChild(list);
    var cp = el("div", "compose"), inp = el("input"); inp.maxLength = 280; inp.placeholder = NET.online ? "Talk to " + (tab === "global" ? "all Anambra" : D.TOWNS[G.S.town].name) + "…" : "Offline";
    inp.disabled = !NET.online;
    var send = function () { var v = inp.value.trim(); if (!v) return; inp.disabled = true; NET.send(ch, v).then(function () { inp.value = ""; }).catch(function (e) { toast(/slow/i.test(e.message) ? "Slow down small (3s between messages)." : "Not sent: " + e.message, "bad"); }).then(function () { inp.disabled = false; inp.focus(); }); };
    inp.onkeydown = function (e) { if (e.key === "Enter") send(); };
    cp.appendChild(inp); cp.appendChild(btn("Send", send, "", !NET.online)); b.appendChild(cp);
    setTimeout(function () { b.scrollTop = b.scrollHeight; }, 0);
    return "💬 Town Square";
  };
  function sortFeed(ch) { var arr = ch === "global" ? feed.global : feed.town[ch]; if (arr) arr.sort(function (a, b) { return a.t - b.t; }); }
  function onLive(m) {
    var ch = m.channel === "global" ? "global" : m.channel; pushFeed(ch, { name: m.name, body: m.body, pid: m.player_id, live: true, t: new Date(m.created_at).getTime(), town: m.town, id: m.id });
    if (!NET.isMe(m.player_id)) ticker("💬 " + m.name + ": " + NET.clean(m.body));
    if (current === "chat") render();
  }
  function playerMenu(pid, name) {
    modal({ title: name, text: "Real player. What do you want to do?", choices: [{ label: "💬 Private message", fn: function () { open("thread", "dm:" + pid + ":" + name); } }, { label: "🚫 Block", fn: function () { NET.block(pid, name); toast(name + " blocked."); if (current) render(); } }, { label: "Cancel" }] });
  }
  function ticker(t) { var k = $("ticker"); k.textContent = t; k.classList.remove("hidden"); clearTimeout(ticker.t); ticker.t = setTimeout(function () { k.classList.add("hidden"); }, 6000); }
  setInterval(function () { if (!G.S) return; var m = npcLine(); pushFeed(Math.random() < 0.5 ? "global" : "town:" + D.TOWNS[G.S.town].name, m); if (current === "chat") render(); else if (Math.random() < 0.3) ticker("🗨️ " + m.name + ": " + m.body); }, 14000);

  /* ---------- forbes ---------- */
  P.forbes = function () {
    var S = G.S, list = G.forbesList(), me = list.filter(function (x) { return x.me; })[0];
    var s = sec(null); p(s, "Anambra's richest, updated weekly in game time (week " + S.forbes.week + "). Tycoons are fictional. LIVE = real players.");
    var top = sec("Your position: #" + me.rank + " of " + list.length + " · " + fmtS(me.nw));
    var shown = list.slice(0, 40); if (me.rank > 40) shown.push(me);
    shown.forEach(function (x) {
      var r = row(top, "#" + x.rank + " " + x.name, x.ind + " · " + fmtS(x.nw), x.live && !x.me ? [btn("DM", function () { open("thread", "dm:" + x.id + ":" + x.name); }, "ghost")] : []);
      var t = r.querySelector(".t"); t.appendChild(el("span", "tag " + (x.me ? "me" : x.live ? "live" : "npc"), x.me ? "YOU" : x.live ? "LIVE" : "NPC"));
      if (x.me) r.style.background = "#fff6d6";
    });
    return "🏆 Anambra Forbes";
  };

  /* ---------- more ---------- */
  P.more = function () {
    var S = G.S, tab = tabs("more", [["me", "Me"], ["stats", "Live stats"], ["shop", "Coin shop"], ["set", "Settings"]]);
    if (tab === "me") {
      var s = sec(S.name + " · " + D.LEVELS[S.level].name);
      p(s, "Net worth " + fmt(G.netWorth()) + " · Rep " + Math.round(S.rep) + " · Influence " + Math.round(S.influence) + " · Skill " + Math.round(S.skill));
      var lad = sec("Wealth ladder"); lad.classList.add("ladder");
      D.LEVELS.forEach(function (L, i) { var r = row(lad, (i <= S.level ? "✅ " : "🔒 ") + L.name, "From " + fmtS(L.min) + " · " + L.unlock, []); if (i === S.level) r.classList.add("cur"); });
    } else if (tab === "stats") {
      var s2 = sec("Live stats");
      var st = [["Players online now", NET.online ? String(Math.max(1, NET.onlineCount())) + " (real)" : "offline"], ["Players on the server", NET.online ? String(NET.livePlayers().length) : "offline"], ["Days played", String(S.day)], ["Total earned", fmt(S.stats.earned)], ["Total spent", fmt(S.stats.spent)], ["Trades", String(S.stats.trades)], ["Shifts worked", String(S.stats.shifts)], ["Best single flip", fmt(S.stats.bestFlip)], ["Money lost to disasters", fmt(S.stats.losses)], ["Highest level", D.LEVELS[S.stats.peak].name]];
      st.forEach(function (x) { row(s2, x[0], x[1], []); });
    } else if (tab === "shop") {
      var s3 = sec("Odogwu Coins"); p(s3, "Premium coins for outfits, shop decorations and boosts. Not available yet: nothing here can be bought.");
      [["Small pack", "100 coins"], ["Market pack", "550 coins"], ["Big man pack", "1,200 coins"]].forEach(function (x) { row(s3, x[0], x[1], [btn("Coming soon", function () {}, "ghost", true)], "🪙"); });
    } else {
      var s4 = sec("Settings");
      s4.appendChild(btn(SFX.muted ? "🔇 Sound off" : "🔊 Sound on", function () { SFX.toggle(); }, "ghost"));
      var s5 = sec("Start over"); p(s5, "Deletes your saved game on this phone.");
      s5.appendChild(btn("Reset game", function () { modal({ title: "Reset?", text: "This deletes your progress on this device.", choices: [{ label: "Yes, start over", fn: function () { G.reset(); location.reload(); } }, { label: "Cancel" }] }); }, "red"));
      p(sec("About"), "Anambra Life · original fan-made game. All characters, tycoons, parties and businesses are fictional. Map data © OpenStreetMap contributors.");
    }
    return "☰ More";
  };
  P.map = function () { MAPV.render(body()); return "🗺️ Anambra"; };

  /* ---------- hooks ---------- */
  G.H.toast = toast; G.H.money = money; G.H.levelUp = levelUp; G.H.modal = modal;
  G.H.chat = function () { SFX.msg(); hud(); };
  G.H.refresh = refreshAll;
  NET.onMessage(onLive);
  NET.onDm(function (fresh) { var inc = fresh.filter(function (d) { return d.sender_id !== NET.id; }); if (inc.length) { SFX.msg(); ticker("📩 " + inc[0].sender_name + ": " + NET.clean(inc[0].body)); } hud(); if (current === "phone" || current === "thread") render(); });
  NET.onPlayers(function () { if (current === "forbes") render(); });

  $("panelClose").onclick = close;
  $("panel").onclick = function (e) { if (e.target.id === "panel") close(); };
  return { open: open, close: close, render: render, hud: hud, toast: toast, modal: modal, refreshAll: refreshAll, get current() { return current; }, el: el, btn: btn, sec: sec, row: row, p: p, P: P };
})();
