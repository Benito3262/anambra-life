/* Boot, character creation, input and main loop. */
var MAIN = (function () {
  var cv = document.getElementById("game"), cx = cv.getContext("2d"), dpr = 1, cw = 0, ch = 0;
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; }
  window.addEventListener("resize", resize); resize();
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- character creation ---------- */
  function create() {
    var c = $("create"); c.classList.remove("hidden"); c.textContent = "";
    var look = { skin: "#7a4a2c", outfit: "#1e88e5", hat: "hair", pattern: true, pants: "#37474f" }, start = "onitsha";
    var box = UI.el("div", "box"); c.appendChild(box);
    var h = UI.el("h1"); h.appendChild(document.createTextNode("Anambra ")); h.appendChild(UI.el("b", null, "Life")); box.appendChild(h);
    box.appendChild(UI.el("p", null, "Trade for Onitsha. Build for Nnewi. Run for office in Awka. From hawker to Big Man."));
    var pv = UI.el("canvas"); pv.width = 120; pv.height = 120; box.appendChild(pv);
    function preview() { var x = pv.getContext("2d"); x.clearRect(0, 0, 120, 120); x.save(); x.scale(3, 3); W.drawPerson(x, 20, 26, look, 0, 0, ""); x.restore(); }
    box.appendChild(UI.el("label", null, "Your name"));
    var inp = UI.el("input"); inp.maxLength = 20; inp.placeholder = "e.g. Chukwuemeka"; inp.value = ""; box.appendChild(inp);
    function opts(label, list, key, render) {
      box.appendChild(UI.el("label", null, label)); var o = UI.el("div", "opts"); box.appendChild(o);
      list.forEach(function (v) { var b = UI.el("button", "opt" + (look[key] === v[0] ? " on" : "")); render(b, v); b.onclick = function () { look[key] = v[0]; Array.prototype.forEach.call(o.children, function (x) { x.classList.remove("on"); }); b.classList.add("on"); preview(); }; o.appendChild(b); });
    }
    opts("Skin", [["#5a3825"], ["#7a4a2c"], ["#8d5a3b"], ["#a8714a"]], "skin", function (b, v) { b.classList.add("sw"); b.style.background = v[0]; });
    opts("Outfit", [["#e53935"], ["#1e88e5"], ["#43a047"], ["#8e24aa"], ["#fb8c00"], ["#00897b"], ["#f4511e"], ["#3949ab"]], "outfit", function (b, v) { b.classList.add("sw"); b.style.background = v[0]; });
    opts("Head", [["hair", "Low cut"], ["cap", "Red cap"], ["gele", "Gele"], ["", "Bald"]], "hat", function (b, v) { b.textContent = v[1]; });
    box.appendChild(UI.el("label", null, "Starting town"));
    var o2 = UI.el("div", "opts"); box.appendChild(o2);
    var tip = UI.el("p", "muted"); tip.style.color = "#cfe"; box.appendChild(tip);
    ["onitsha", "nnewi", "awka", "nkpor", "obosi", "ekwulobia", "ihiala", "otuocha", "igboukwu", "umunze"].forEach(function (tid) {
      var b = UI.el("button", "opt" + (tid === start ? " on" : ""), D.TOWNS[tid].name);
      b.onclick = function () { start = tid; Array.prototype.forEach.call(o2.children, function (x) { x.classList.remove("on"); }); b.classList.add("on"); tip.textContent = D.TOWNS[tid].tag + " Rent x" + D.TOWNS[tid].cost + "."; };
      o2.appendChild(b);
    });
    tip.textContent = D.TOWNS[start].tag + " Rent x" + D.TOWNS[start].cost + ".";
    var go = UI.el("button", "btn alt", "Start hustling ▶"); go.style.cssText = "width:100%;padding:14px;font-size:17px;margin-top:8px";
    go.onclick = function () {
      SFX.unlock(); var name = inp.value.replace(/[<>]/g, "").trim();
      if (name.length < 2) { inp.focus(); inp.style.outline = "3px solid #e53935"; return; }
      name = NET.clean(name).slice(0, 20);
      G.S = G.fresh(name, look, start); G.save(); c.classList.add("hidden"); begin(true);
    };
    box.appendChild(go);
    var note = UI.el("p", "muted", "Free to play. Your progress saves on this phone. All characters are fictional."); note.style.color = "#cfe"; box.appendChild(note);
    preview();
  }

  /* ---------- start ---------- */
  function begin(isNew) {
    ["hud", "controls", "bar", "liveTag"].forEach(function (id) { $(id).classList.remove("hidden"); });
    W.player.look = G.S.look; W.player.name = G.S.name;
    W.enter(G.S.town);
    if (G.S.pos && G.S.pos.town === G.S.town) W.placeAt(G.S.pos.x, G.S.pos.y);
    NET.init(); setTimeout(function () { NET.sync(true); }, 800);
    G.checkLevel();
    if (isNew) {
      G.msg("sister", "Sister Ifeoma (Family)", "Family", "Nwanne! Mama said make I greet you. You don reach " + D.TOWNS[G.S.town].name + "? Take am easy. Hustle hard but stay honest. We dey pray for you 🙏🏾");
      G.msg("chinedu", "Chinedu (Keke rider)", "Gist", "Welcome! Tip: buy goods where e cheap, carry am go where e cost. Check 🎒 Bag → Prices. And if you broke, Job Centre dey.");
      UI.modal({ title: "Nnoo, " + G.S.name + "! 👋🏾", text: "You arrived in " + D.TOWNS[G.S.town].name + " with " + G.fmt(G.S.cash) + ". Walk with the arrows or tap the map. Stand at a door and press A to enter.", lines: ["🛒 Market: buy cheap, sell dear, haggle with customers", "🧰 Job Centre: quick shifts when you're broke", "🚌 Motor Park: travel to 18 Anambra towns", "🧑🏾‍🏫 Onitsha & Nnewi: serve an Oga (Igba Boi) and get settled", "🗳️ Awka: politics, endorsements, elections", "🏆 Climb the Anambra Forbes list"] });
    } else UI.toast("Welcome back, " + G.S.name + "!", "good");
    last = performance.now(); requestAnimationFrame(loop);
  }
  function arrived() {
    var T = G.town(); UI.toast("📍 " + T.name + ": " + T.tag, "good");
    if (!G.S.light[G.S.town]) setTimeout(function () { UI.toast("🕯️ NEPA has taken light in " + T.name + " today.", "warn"); }, 1200);
    NET.sync(true); G.save(); UI.hud();
  }

  /* ---------- interaction ---------- */
  function interact() {
    if (UI.current || !$("modal").classList.contains("hidden")) return;
    var n = W.nearby(); if (!n) return;
    SFX.click();
    if (n.type === "building") { var k = n.b.kind; UI.open(k === "filler" ? "filler" : k, n.b); }
    else if (n.type === "bill") UI.open("billboard", n.b);
    else if (n.type === "npc") { n.n.say = G.pick(D.SMALLTALK); n.n.sayT = performance.now() + 3500; }
  }
  function promptText() {
    var n = W.nearby(); if (!n) return "";
    if (n.type === "building") return "A: " + (n.b.kind === "filler" ? n.b.label : (D.POI[n.b.kind].icon + " " + n.b.label));
    if (n.type === "bill") return "A: Billboard";
    return "A: Talk to " + n.n.name;
  }

  /* ---------- input ---------- */
  var keys = {};
  function blocked() { return !!UI.current || !$("modal").classList.contains("hidden") || !$("create").classList.contains("hidden") || !$("levelup").classList.contains("hidden"); }
  function updHeld() { W.held.x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); W.held.y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); if (blocked()) { W.held.x = 0; W.held.y = 0; } }
  var KM = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (KM[e.code]) { keys[KM[e.code]] = true; updHeld(); e.preventDefault(); }
    else if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") { if (!$("modal").classList.contains("hidden")) { var b = document.querySelector("#modalCard .btn"); if (b) b.click(); } else interact(); e.preventDefault(); }
    else if (e.code === "Escape") UI.close();
  });
  window.addEventListener("keyup", function (e) { if (KM[e.code]) { keys[KM[e.code]] = false; updHeld(); } });
  document.querySelectorAll("#dpad button").forEach(function (b) {
    var d = b.getAttribute("data-d");
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); SFX.unlock(); keys[d] = true; b.classList.add("on"); updHeld(); b.setPointerCapture && b.setPointerCapture(e.pointerId); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { b.addEventListener(ev, function () { keys[d] = false; b.classList.remove("on"); updHeld(); }); });
  });
  $("btnA").addEventListener("click", function () { SFX.unlock(); interact(); });
  document.querySelectorAll("#bar button").forEach(function (b) { b.addEventListener("click", function () { SFX.unlock(); SFX.click(); var p = b.getAttribute("data-p"); if (UI.current === p) UI.close(); else UI.open(p); }); });
  var down = null;
  cv.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; SFX.unlock(); });
  cv.addEventListener("pointerup", function (e) {
    if (!down || blocked()) return; var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null; if (moved > 12) return;
    var t = W.screenToTile(e.clientX, e.clientY, cw), b = W.buildingAt(t.x, t.y);
    if (b) { W.goTo(b.front.x, b.front.y, function () { UI.open(b.kind === "filler" ? "filler" : b.kind, b); }); return; }
    var bl = W.billAt(t.x, t.y); if (bl) { W.goTo(bl.x, bl.y + 1, function () { UI.open("billboard", bl); }) || W.goTo(bl.x, bl.y - 1); return; }
    var n = W.npcAt(t.x, t.y); if (n) { n.say = G.pick(D.SMALLTALK); n.sayT = performance.now() + 3500; return; }
    W.goTo(t.x, t.y);
  });

  /* ---------- loop ---------- */
  var last = 0, hudT = 0, saveT = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    updHeld();
    W.update(dt, now);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W.draw(cx, cw, ch, now, G.S.hour, G.S.light[G.S.town]);
    if (now - hudT > 100) { hudT = now; UI.hud(); var pt = promptText(); $("prompt").textContent = pt; $("btnA").classList.toggle("ready", !!pt); }
    if (now - saveT > 5000) { saveT = now; G.S.pos = { town: W.town, x: W.player.tx, y: W.player.ty }; G.save(); }
    requestAnimationFrame(loop);
  }

  /* ---------- boot ---------- */
  function boot() {
    if (G.load() && G.S && G.S.name) begin(false); else create();
    if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  window.addEventListener("error", function (e) { console.error("Game error:", e.message); });
  boot();
  return { arrived: arrived, interact: interact };
})();
