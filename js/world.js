/* World: town map generation, rendering, movement. Original art drawn in code. */
var W = (function () {
  var TILE = 32;
  var T = { GRASS: 0, ROAD: 1, EARTH: 2, BUILD: 3, WATER: 4, TREE: 5, DECO: 6, BRIDGE: 7, PLAZA: 8 };

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var FILLER = ["Divine Favour Pharmacy", "God's Time Ventures", "Ebuka & Sons Motors", "Nwanne Di Namba Stores", "Chinedu Phones & Repairs", "Ada's Kitchen", "Odogwu Vulcanizer", "Peace Hotel", "Ifeoma Fashion House", "Unity Cyber Cafe", "Grace Bakery", "St. Michael's Church", "Okeke Building Materials", "Mama Nkechi Provisions", "Kelechi Barbing Salon", "Amaka Hair Studio", "Hope Clinic", "Bright Future Nursery School", "Ugo Electronics", "Ozo Pure Water", "Nkem Bookshop", "Ikenna Fabrics", "Agu Paints", "Chisom Pharmacy", "Obi Furniture Works"];
  var WALLS = ["#f2e6c9", "#e9d7b5", "#d8e8e0", "#f0d0c0", "#e0e4f0", "#f5f0d8", "#e8c9a0", "#cfe0c3"];
  var ROOFS = ["#7b8794", "#8c4b2f", "#3c6e9c", "#9c3c3c", "#5f6b5f", "#6d5a8c"];

  var town = null, map = null, cache = {};
  var player = { tx: 2, ty: 2, px: 64, py: 64, dir: 0, moving: false, path: [], step: 0, look: null };
  var npcs = [], kekes = [], floaters = [], particles = [];
  var held = { x: 0, y: 0 };
  var onArrive = null;

  function build(townId) {
    if (cache[townId]) return cache[townId];
    var t = D.TOWNS[townId], r = rng(hash(townId));
    var dims = t.size === "big" ? [5, 4] : t.size === "mid" ? [4, 3] : [3, 3];
    var cols = dims[0], rows = dims[1];
    var river = townId === "onitsha" ? 5 : townId === "otuocha" ? 3 : 0;
    var w = cols * 8 + 1 + river, h = rows * 7 + 1;
    var g = []; for (var y = 0; y < h; y++) { g.push([]); for (var x = 0; x < w; x++) g[y].push(T.GRASS); }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var lx = x - river;
      if (x < river) g[y][x] = T.WATER;
      else if (lx % 8 === 0 || y % 7 === 0) g[y][x] = T.ROAD;
    }
    var blocks = []; for (var by = 0; by < rows; by++) for (var bx = 0; bx < cols; bx++) blocks.push({ bx: bx, by: by });
    // order: specials near river get bx 0
    var pois = t.pois.slice();
    var buildings = [];
    var order = blocks.slice().sort(function () { return r() - 0.5; });
    function take(pref) {
      for (var i = 0; i < order.length; i++) if (!pref || pref(order[i])) return order.splice(i, 1)[0];
      return order.shift();
    }
    pois.forEach(function (p) {
      var b;
      if ((p === "bridge" || p === "waterside" || p === "farm") && river) b = take(function (o) { return o.bx === 0; });
      else if (p === "park") b = take(function (o) { return o.bx === cols - 1 && o.by === 0; }) ;
      else if (p === "market") b = take(function (o) { return o.bx > 0 && o.bx < cols - 1 || cols < 4; });
      else b = take();
      if (b) buildings.push({ kind: p, b: b });
    });
    order.forEach(function (b) { buildings.push({ kind: "filler", b: b, name: FILLER[Math.floor(r() * FILLER.length)] }); });
    buildings.forEach(function (o) {
      var x0 = river + o.b.bx * 8 + 2, y0 = o.b.by * 7 + 1, bw = 5, bh = 3;
      if (o.kind === "market" || o.kind === "govt" || o.kind === "unizik" || o.kind === "park") { x0 -= 1; bw = 7; }
      o.x = x0; o.y = y0; o.w = bw; o.h = bh;
      o.door = { x: x0 + Math.floor(bw / 2), y: y0 + bh - 1 };
      o.front = { x: o.door.x, y: o.door.y + 1 };
      o.wall = WALLS[Math.floor(r() * WALLS.length)]; o.roof = ROOFS[Math.floor(r() * ROOFS.length)];
      o.tank = r() < 0.5; o.label = o.kind === "filler" ? o.name : D.POI[o.kind].label;
      var lm = (D.LANDMARKS || []).filter(function (l) { return l.town === townId && l.poi === o.kind; })[0];
      if (lm) o.label = lm.name.replace(/ \(.*\)/, "");
      for (var yy = y0; yy < y0 + bh; yy++) for (var xx = x0; xx < x0 + bw; xx++) g[yy][xx] = T.BUILD;
      g[o.front.y][o.front.x] = T.PLAZA;
      for (var wy = o.front.y + 1; wy < h && g[wy][o.front.x] !== T.ROAD; wy++) g[wy][o.front.x] = T.PLAZA;
    });
    // bridge deck for Onitsha
    if (townId === "onitsha") { var br = buildings.filter(function (b) { return b.kind === "bridge"; })[0]; if (br) { for (x = 0; x < river; x++) { g[br.y + 1][x] = T.BRIDGE; } } }
    // decorations: palm trees, stalls, billboards
    var bills = [], nb = t.size === "big" ? 4 : t.size === "mid" ? 3 : 2, deco = [];
    blocks.forEach(function (b, i) {
      var bx0 = river + b.bx * 8, by0 = b.by * 7;
      var row = by0 + 5;
      if (bills.length < nb && r() < 0.55) {
        var bxp = bx0 + 2 + Math.floor(r() * 3);
        if (g[row][bxp] === T.GRASS && g[row][bxp + 1] === T.GRASS) { g[row][bxp] = T.DECO; g[row][bxp + 1] = T.DECO; bills.push({ x: bxp, y: row, id: townId.slice(0, 3).toUpperCase() + "-" + (bills.length + 1) }); return; }
      }
      for (var k = 0; k < 3; k++) {
        var xx = bx0 + 1 + Math.floor(r() * 7), yy = by0 + 5 + Math.floor(r() * 2);
        if (g[yy] && g[yy][xx] === T.GRASS && r() < 0.8) { g[yy][xx] = T.TREE; deco.push({ x: xx, y: yy, type: r() < 0.6 ? "palm" : (r() < 0.5 ? "mango" : "stall"), c: ["#e53935", "#1e88e5", "#fdd835", "#43a047"][Math.floor(r() * 4)] }); }
      }
    });
    // earth shoulders next to roads
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (g[y][x] === T.GRASS) {
      var nr = (g[y - 1] && g[y - 1][x] === T.ROAD) || (g[y + 1] && g[y + 1][x] === T.ROAD) || g[y][x - 1] === T.ROAD || g[y][x + 1] === T.ROAD;
      if (nr && r() < 0.55) g[y][x] = T.EARTH;
    }
    var m = { id: townId, w: w, h: h, g: g, buildings: buildings, bills: bills, deco: deco, river: river, seed: hash(townId) };
    m.canvas = renderStatic(m, t);
    cache[townId] = m; return m;
  }

  function walkable(m, x, y) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; var v = m.g[y][x]; return v === T.GRASS || v === T.ROAD || v === T.EARTH || v === T.PLAZA || v === T.BRIDGE; }

  /* ---------- static art ---------- */
  function renderStatic(m, t) {
    var c = document.createElement("canvas"); c.width = m.w * TILE; c.height = m.h * TILE;
    var x2 = c.getContext("2d"), r = rng(m.seed + 7);
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      var v = m.g[y][x], X = x * TILE, Y = y * TILE;
      if (v === T.WATER || (v === T.BRIDGE)) {
        x2.fillStyle = "#3f8fb5"; x2.fillRect(X, Y, TILE, TILE);
        x2.strokeStyle = "rgba(255,255,255,.25)"; x2.beginPath(); x2.moveTo(X + 4 + r() * 8, Y + 10 + r() * 12); x2.lineTo(X + 14 + r() * 10, Y + 10 + r() * 12); x2.stroke();
        if (v === T.BRIDGE) { x2.fillStyle = "#9aa4ad"; x2.fillRect(X, Y + 2, TILE, TILE - 4); x2.fillStyle = "#59636b"; x2.fillRect(X, Y + 2, TILE, 3); x2.fillRect(X, Y + TILE - 5, TILE, 3); x2.fillStyle = "#fff"; x2.fillRect(X + 4, Y + 15, 10, 2); }
        continue;
      }
      if (v === T.ROAD) {
        x2.fillStyle = "#4a4a4f"; x2.fillRect(X, Y, TILE, TILE);
        x2.fillStyle = "rgba(255,255,255,.05)"; x2.fillRect(X + r() * 28, Y + r() * 28, 4, 3);
        var lx = x - m.river, hz = y % 7 === 0, vt = lx % 8 === 0;
        x2.fillStyle = "#e8c547";
        if (hz && !vt && x % 2 === 0) x2.fillRect(X + 6, Y + 15, 18, 2);
        if (vt && !hz && y % 2 === 0) x2.fillRect(X + 15, Y + 6, 2, 18);
        if (r() < 0.05) { x2.fillStyle = "#38383c"; x2.beginPath(); x2.ellipse(X + 16, Y + 16, 6, 4, 0, 0, 7); x2.fill(); } // pothole
        continue;
      }
      x2.fillStyle = v === T.EARTH ? "#c67a4a" : v === T.PLAZA ? "#d9c7a5" : (((x + y) % 2) ? "#7cb24a" : "#78ad47");
      x2.fillRect(X, Y, TILE, TILE);
      if (v === T.GRASS || v === T.TREE || v === T.DECO) {
        if (v !== T.GRASS) { x2.fillStyle = ((x + y) % 2) ? "#7cb24a" : "#78ad47"; x2.fillRect(X, Y, TILE, TILE); }
        x2.fillStyle = "rgba(40,90,20,.35)"; for (var k = 0; k < 3; k++) x2.fillRect(X + r() * 30, Y + r() * 30, 2, 3);
      } else if (v === T.EARTH) { x2.fillStyle = "rgba(90,40,10,.18)"; for (k = 0; k < 4; k++) x2.fillRect(X + r() * 30, Y + r() * 30, 2, 2); }
    }
    // electric poles along roads
    for (y = 0; y < m.h; y += 7) for (x = m.river + 3; x < m.w; x += 5) {
      if (m.g[y + 1] && m.g[y + 1][x] !== T.BUILD) { pole(x2, x * TILE + 4, (y + 1) * TILE + 2); }
    }
    m.deco.forEach(function (d) { drawDeco(x2, d); });
    m.bills.forEach(function (b) { drawBillboard(x2, b); });
    m.buildings.forEach(function (b) { drawBuilding(x2, b, t); });
    // welcome sign
    // continuous Niger Bridge deck across the river
    var brb = m.buildings.filter(function (b) { return b.kind === "bridge"; })[0];
    if (brb) {
      var dy = (brb.y + 1) * TILE + 4, ex = (brb.x + brb.w) * TILE;
      x2.fillStyle = "rgba(0,0,0,.25)"; x2.fillRect(0, dy + 8, ex, 30);
      x2.fillStyle = "#a7b0b8"; x2.fillRect(0, dy, ex, 26); x2.fillStyle = "#5d666e"; x2.fillRect(0, dy, ex, 3); x2.fillRect(0, dy + 23, ex, 3);
      x2.fillStyle = "#fff"; for (var bx2 = 6; bx2 < ex; bx2 += 26) x2.fillRect(bx2, dy + 12, 12, 2);
      x2.strokeStyle = "#dfe6ea"; x2.lineWidth = 3;
      for (var ax = 0; ax < ex - 20; ax += 64) { x2.beginPath(); x2.moveTo(ax, dy); x2.quadraticCurveTo(ax + 32, dy - 34, ax + 64, dy); x2.stroke(); for (var hx = ax + 10; hx < ax + 60; hx += 10) { x2.beginPath(); x2.moveTo(hx, dy); x2.lineTo(hx, dy - 22 + Math.abs(hx - ax - 32) * 0.6); x2.stroke(); } }
      x2.lineWidth = 1;
      x2.fillStyle = "#0b3d22"; x2.fillRect(8, dy - 52, 150, 18); x2.fillStyle = "#fff"; x2.font = "bold 11px system-ui,sans-serif"; x2.fillText("RIVER NIGER", 14, dy - 39);
    }
    // boats on the river
    if (m.river) for (var bt = 0; bt < 4; bt++) { var by2 = (3 + bt * 6) * TILE, bx3 = 6 + (bt % 2) * 50; if (m.river < 4) bx3 = 10; x2.fillStyle = "#6d4c41"; x2.beginPath(); x2.moveTo(bx3, by2); x2.lineTo(bx3 + 44, by2); x2.lineTo(bx3 + 36, by2 + 10); x2.lineTo(bx3 + 8, by2 + 10); x2.closePath(); x2.fill(); x2.fillStyle = ["#e53935", "#fdd835", "#1e88e5", "#43a047"][bt]; x2.fillRect(bx3 + 14, by2 - 8, 16, 8); }
    return c;
  }
  function pole(x2, X, Y) { x2.fillStyle = "#6b4b2a"; x2.fillRect(X, Y - 18, 3, 22); x2.fillRect(X - 6, Y - 16, 15, 2); }
  function drawDeco(x2, d) {
    var X = d.x * TILE, Y = d.y * TILE;
    if (d.type === "palm") {
      x2.fillStyle = "rgba(0,0,0,.18)"; x2.beginPath(); x2.ellipse(X + 18, Y + 28, 10, 4, 0, 0, 7); x2.fill();
      x2.strokeStyle = "#7a5230"; x2.lineWidth = 4; x2.beginPath(); x2.moveTo(X + 16, Y + 28); x2.quadraticCurveTo(X + 12, Y + 14, X + 17, Y + 4); x2.stroke(); x2.lineWidth = 1;
      x2.fillStyle = "#2e7d32";
      for (var a = 0; a < 6; a++) { x2.save(); x2.translate(X + 17, Y + 5); x2.rotate(a * 1.05); x2.beginPath(); x2.ellipse(9, 0, 10, 3, 0, 0, 7); x2.fill(); x2.restore(); }
    } else if (d.type === "mango") {
      x2.fillStyle = "rgba(0,0,0,.18)"; x2.beginPath(); x2.ellipse(X + 16, Y + 28, 13, 5, 0, 0, 7); x2.fill();
      x2.fillStyle = "#6d4c2f"; x2.fillRect(X + 14, Y + 16, 5, 13);
      x2.fillStyle = "#2f6d2a"; x2.beginPath(); x2.arc(X + 16, Y + 12, 12, 0, 7); x2.fill();
      x2.fillStyle = "#3d8a35"; x2.beginPath(); x2.arc(X + 12, Y + 9, 6, 0, 7); x2.fill();
    } else {
      // roadside umbrella stall
      x2.fillStyle = "#8d6e63"; x2.fillRect(X + 6, Y + 18, 20, 9);
      x2.fillStyle = "#ffcc80"; x2.fillRect(X + 8, Y + 16, 5, 4); x2.fillStyle = "#ef5350"; x2.fillRect(X + 15, Y + 16, 4, 4); x2.fillStyle = "#66bb6a"; x2.fillRect(X + 20, Y + 16, 4, 4);
      x2.fillStyle = "#555"; x2.fillRect(X + 15, Y + 6, 2, 12);
      x2.fillStyle = d.c; x2.beginPath(); x2.moveTo(X + 2, Y + 9); x2.quadraticCurveTo(X + 16, Y - 4, X + 30, Y + 9); x2.closePath(); x2.fill();
    }
  }
  function drawBillboard(x2, b) {
    var X = b.x * TILE, Y = b.y * TILE;
    x2.fillStyle = "#555"; x2.fillRect(X + 10, Y + 10, 3, 22); x2.fillRect(X + 50, Y + 10, 3, 22);
    x2.fillStyle = "#222"; x2.fillRect(X, Y - 10, 64, 26);
    var gr = x2.createLinearGradient(X, Y - 8, X + 62, Y + 14); gr.addColorStop(0, "#ffeb3b"); gr.addColorStop(1, "#ff9800");
    x2.fillStyle = gr; x2.fillRect(X + 2, Y - 8, 60, 22);
    x2.fillStyle = "#222"; x2.font = "bold 8px system-ui,sans-serif"; x2.textAlign = "center";
    x2.fillText("YOUR BUSINESS", X + 32, Y + 1); x2.fillText("HERE", X + 32, Y + 11); x2.textAlign = "left";
  }
  function roofLines(x2, X, Y, w, h, col) {
    x2.fillStyle = col; x2.fillRect(X, Y, w, h);
    x2.strokeStyle = "rgba(255,255,255,.18)"; for (var i = X + 3; i < X + w; i += 5) { x2.beginPath(); x2.moveTo(i, Y); x2.lineTo(i, Y + h); x2.stroke(); }
    x2.fillStyle = "rgba(0,0,0,.15)"; x2.fillRect(X, Y + h - 3, w, 3);
  }
  function drawBuilding(x2, b, t) {
    var X = b.x * TILE, Y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, p = D.POI[b.kind] || { color: b.wall, roof: b.roof };
    x2.fillStyle = "rgba(0,0,0,.22)"; x2.fillRect(X + 4, Y + 6, w, h);
    if (b.kind === "market") {
      // open market: rows of stalls with colourful umbrellas
      x2.fillStyle = "#cfb48a"; x2.fillRect(X, Y, w, h);
      var cols = ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#fb8c00", "#8e24aa"];
      for (var sy = 0; sy < 3; sy++) for (var sx = 0; sx < 7; sx++) {
        var cx = X + 8 + sx * 30, cy = Y + 10 + sy * 26;
        x2.fillStyle = "#795548"; x2.fillRect(cx - 9, cy + 4, 18, 8);
        x2.fillStyle = cols[(sx + sy * 2) % cols.length]; x2.beginPath(); x2.arc(cx, cy, 11, Math.PI, 0); x2.fill();
      }
    } else if (b.kind === "park") {
      x2.fillStyle = "#8d8d8d"; x2.fillRect(X, Y, w, h);
      for (var i = 0; i < 4; i++) { bus(x2, X + 10 + i * 52, Y + 12, i % 2 ? "#fdd835" : "#f5f5f5"); }
      x2.fillStyle = "#fdd835"; x2.fillRect(X + 8, Y + 60, 18, 12); x2.fillStyle = "#2e7d32"; x2.fillRect(X + 8, Y + 60, 18, 4);
    } else if (b.kind === "bridge") {
      x2.fillStyle = "#3f8fb5"; x2.fillRect(X, Y, w, h);
      x2.fillStyle = "#9aa4ad"; x2.fillRect(X - 6, Y + 36, w + 6, 26);
      x2.strokeStyle = "#cfd8dc"; x2.lineWidth = 3;
      for (i = 0; i < 3; i++) { x2.beginPath(); x2.moveTo(X + i * 56, Y + 36); x2.lineTo(X + 28 + i * 56, Y + 6); x2.lineTo(X + 56 + i * 56, Y + 36); x2.stroke(); }
      x2.lineWidth = 1;
    } else if (b.kind === "farm") {
      for (i = 0; i < 5; i++) { x2.fillStyle = i % 2 ? "#9ccc65" : "#c5e1a5"; x2.fillRect(X, Y + i * (h / 5), w, h / 5); }
      x2.fillStyle = "#6d4c41"; x2.fillRect(X + w - 40, Y + 10, 34, 28); roofLines(x2, X + w - 44, Y + 4, 42, 10, "#8d6e63");
    } else if (b.kind === "lake") {
      x2.fillStyle = "#4fa3c7"; x2.beginPath(); x2.ellipse(X + w / 2, Y + h / 2, w / 2, h / 2, 0, 0, 7); x2.fill();
      x2.fillStyle = "#e0f7fa"; x2.fillRect(X + 30, Y + 30, 14, 2); x2.fillRect(X + 90, Y + 50, 18, 2);
    } else {
      // walled compound building with zinc roof
      var wall = b.kind === "filler" ? b.wall : p.color, roof = b.kind === "filler" ? b.roof : p.roof;
      x2.fillStyle = wall; x2.fillRect(X, Y + h * 0.35, w, h * 0.65);
      roofLines(x2, X - 3, Y, w + 6, h * 0.4, roof);
      if (b.tank) { x2.fillStyle = "#212121"; x2.fillRect(X + w - 20, Y - 6, 14, 14); x2.fillStyle = "#424242"; x2.fillRect(X + w - 20, Y - 6, 14, 3); }
      x2.fillStyle = "#4e6e8e";
      for (i = 0; i < b.w; i++) if (i !== Math.floor(b.w / 2)) { x2.fillRect(X + i * TILE + 8, Y + h * 0.5, 14, 12); }
      if (b.kind === "govt" || b.kind === "unizik") { x2.fillStyle = "#fff"; for (i = 0; i < 6; i++) x2.fillRect(X + 12 + i * 34, Y + h * 0.38, 5, h * 0.55); }
      if (b.kind === "govt") { x2.fillStyle = "#555"; x2.fillRect(X + w - 14, Y - 26, 2, 34); x2.fillStyle = "#008751"; x2.fillRect(X + w - 12, Y - 26, 6, 12); x2.fillStyle = "#fff"; x2.fillRect(X + w - 6, Y - 26, 6, 12); x2.fillStyle = "#008751"; x2.fillRect(X + w, Y - 26, 6, 12); }
      if (b.kind === "filler" || b.kind === "shop" || b.kind === "bar") { var aw = ["#e53935", "#1e88e5", "#43a047", "#fb8c00"][(b.x + b.y) % 4]; for (var ai = 0; ai < b.w * 4; ai++) { x2.fillStyle = ai % 2 ? "#fff" : aw; x2.fillRect(X + ai * 8, Y + h * 0.35, 8, 7); } }
      if (b.tank && b.kind === "filler") { x2.fillStyle = "#cfd8dc"; x2.fillRect(X - 10, Y + h - 16, 9, 10); x2.fillStyle = "#e53935"; x2.fillRect(X - 9, Y + h - 15, 7, 3); }
      if (b.kind === "forge") { x2.fillStyle = "#ff7043"; x2.beginPath(); x2.arc(X + 20, Y + h - 12, 6, 0, 7); x2.fill(); }
    }
    // door
    var dX = b.door.x * TILE, dY = b.door.y * TILE;
    x2.fillStyle = "#5d4037"; x2.fillRect(dX + 9, dY + 12, 14, 20);
    // sign
    x2.font = "bold 11px system-ui,sans-serif";
    var label = (b.kind === "filler" ? "" : (p.icon + " ")) + b.label;
    var tw = x2.measureText(label).width + 10;
    var sx0 = X + w / 2 - tw / 2, sy0 = Y + h - 6;
    x2.fillStyle = b.kind === "filler" ? "rgba(255,255,255,.85)" : "#1b5e20"; x2.fillRect(sx0, sy0 - 14, tw, 16);
    x2.fillStyle = b.kind === "filler" ? "#333" : "#fff"; x2.fillText(label, sx0 + 5, sy0 - 2);
  }
  function bus(x2, X, Y, col) {
    x2.fillStyle = col; x2.fillRect(X, Y, 40, 20); x2.fillStyle = "#263238"; x2.fillRect(X + 4, Y + 3, 32, 7);
    x2.fillStyle = "#111"; x2.beginPath(); x2.arc(X + 9, Y + 21, 4, 0, 7); x2.arc(X + 31, Y + 21, 4, 0, 7); x2.fill();
    x2.fillStyle = "#2e7d32"; x2.fillRect(X, Y + 13, 40, 3);
  }

  /* ---------- people ---------- */
  function drawPerson(cx, X, Y, look, dir, t, bubble) {
    var bob = Math.sin(t / 90) * 1.5;
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(X, Y + 13, 8, 3, 0, 0, 7); cx.fill();
    cx.fillStyle = look.pants || "#37474f"; cx.fillRect(X - 5, Y + 3, 4, 9 + (bob > 0 ? 1 : 0)); cx.fillRect(X + 1, Y + 3, 4, 9 - (bob > 0 ? 1 : 0));
    cx.fillStyle = look.outfit; cx.beginPath(); cx.moveTo(X - 7, Y - 6 + bob); cx.lineTo(X + 7, Y - 6 + bob); cx.lineTo(X + 8, Y + 5); cx.lineTo(X - 8, Y + 5); cx.closePath(); cx.fill();
    if (look.pattern) { cx.fillStyle = "rgba(255,255,255,.5)"; cx.fillRect(X - 6, Y - 3 + bob, 3, 3); cx.fillRect(X + 2, Y + bob, 3, 3); }
    cx.fillStyle = look.skin; cx.beginPath(); cx.arc(X, Y - 11 + bob, 6, 0, 7); cx.fill();
    if (look.hat === "cap") { cx.fillStyle = "#c62828"; cx.fillRect(X - 6, Y - 18 + bob, 12, 5); }
    else if (look.hat === "gele") { cx.fillStyle = look.outfit; cx.beginPath(); cx.ellipse(X, Y - 17 + bob, 9, 5, 0, 0, 7); cx.fill(); cx.fillStyle = "rgba(255,255,255,.35)"; cx.fillRect(X - 5, Y - 19 + bob, 10, 2); }
    else if (look.hat === "hair") { cx.fillStyle = "#1a1a1a"; cx.beginPath(); cx.arc(X, Y - 13 + bob, 6, Math.PI, 0); cx.fill(); }
    else if (look.hat === "tray") { cx.fillStyle = "#b0bec5"; cx.beginPath(); cx.ellipse(X, Y - 19 + bob, 10, 3, 0, 0, 7); cx.fill(); cx.fillStyle = "#e3f2fd"; cx.fillRect(X - 6, Y - 24 + bob, 12, 5); }
    cx.fillStyle = "#111"; if (dir !== 3) { cx.fillRect(X - 3, Y - 12 + bob, 2, 2); cx.fillRect(X + 1, Y - 12 + bob, 2, 2); }
    if (bubble) {
      cx.font = "11px system-ui,sans-serif"; var tw = Math.min(cx.measureText(bubble).width, 170) + 12;
      cx.fillStyle = "rgba(255,255,255,.95)"; roundRect(cx, X - tw / 2, Y - 46, tw, 20, 8); cx.fill();
      cx.fillStyle = "#222"; cx.fillText(bubble, X - tw / 2 + 6, Y - 32, 170);
    }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function drawKeke(cx, X, Y, horiz, flip) {
    cx.save(); cx.translate(X, Y); if (!horiz) cx.rotate(Math.PI / 2); if (flip) cx.scale(-1, 1);
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(-14, 6, 28, 5);
    cx.fillStyle = "#fbc02d"; roundRect(cx, -14, -9, 28, 16, 5); cx.fill();
    cx.fillStyle = "#2e7d32"; cx.fillRect(-14, 1, 28, 3);
    cx.fillStyle = "#263238"; cx.fillRect(4, -7, 8, 7);
    cx.fillStyle = "#111"; cx.beginPath(); cx.arc(-9, 8, 3, 0, 7); cx.arc(9, 8, 3, 0, 7); cx.fill();
    cx.restore();
  }

  var LOOKS = { skin: ["#5a3825", "#7a4a2c", "#8d5a3b", "#a8714a"], outfit: ["#e53935", "#1e88e5", "#43a047", "#8e24aa", "#fb8c00", "#00897b", "#3949ab", "#f4511e"] };
  function randLook(r) { return { skin: LOOKS.skin[Math.floor(r() * 4)], outfit: LOOKS.outfit[Math.floor(r() * 8)], pattern: r() < 0.4, hat: ["", "cap", "gele", "hair", "tray", "hair"][Math.floor(r() * 6)], pants: ["#37474f", "#5d4037", "#263238"][Math.floor(r() * 3)] }; }

  function spawn(m) {
    var r = rng(m.seed + 99), t = D.TOWNS[m.id];
    npcs = []; kekes = [];
    var n = Math.round(5 + t.opp * 5);
    for (var i = 0; i < n; i++) {
      for (var k = 0; k < 50; k++) {
        var x = Math.floor(r() * m.w), y = Math.floor(r() * m.h);
        if (walkable(m, x, y)) { npcs.push({ tx: x, ty: y, px: x * TILE, py: y * TILE, dir: 0, next: 0, look: randLook(r), say: "", sayT: 0, name: D.FIRST[Math.floor(r() * D.FIRST.length)] }); break; }
      }
    }
    var nk = Math.round(1 + t.opp * 2);
    for (i = 0; i < nk; i++) {
      var horiz = r() < 0.5;
      if (horiz) { var row = 7 * Math.floor(r() * (m.h / 7)); kekes.push({ horiz: true, line: row, pos: r() * m.w * TILE, sp: (r() < 0.5 ? -1 : 1) * (40 + r() * 40), bus: r() < 0.35 }); }
      else { var colN = Math.floor((m.w - m.river) / 8); var col = m.river + 8 * Math.floor(r() * (colN + 1)); kekes.push({ horiz: false, line: col, pos: r() * m.h * TILE, sp: (r() < 0.5 ? -1 : 1) * (40 + r() * 40), bus: r() < 0.35 }); }
    }
  }

  function enter(townId, spot) {
    town = townId; map = build(townId); spawn(map);
    var park = map.buildings.filter(function (b) { return b.kind === (spot || "park"); })[0] || map.buildings[0];
    var p = park.front; player.tx = p.x; player.ty = p.y; player.px = p.x * TILE; player.py = p.y * TILE; player.path = []; player.moving = false;
  }
  function placeAt(tx, ty) { if (walkable(map, tx, ty)) { player.tx = tx; player.ty = ty; player.px = tx * TILE; player.py = ty * TILE; } }

  /* ---------- pathfinding ---------- */
  function bfs(sx, sy, gx, gy) {
    if (!walkable(map, gx, gy)) return null;
    var key = function (x, y) { return y * map.w + x; }, prev = {}, q = [[sx, sy]], seen = {}; seen[key(sx, sy)] = 1;
    while (q.length) {
      var c = q.shift(); if (c[0] === gx && c[1] === gy) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1], k = key(nx, ny);
        if (!seen[k] && walkable(map, nx, ny)) { seen[k] = 1; prev[k] = c; q.push([nx, ny]); }
      });
    }
    if (!seen[key(gx, gy)]) return null;
    var path = [], cur = [gx, gy];
    while (!(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev[key(cur[0], cur[1])]; }
    return path;
  }
  function goTo(gx, gy, cb) { var p = bfs(player.tx, player.ty, gx, gy); if (p) { player.path = p; onArrive = cb || null; if (!p.length && cb) { onArrive = null; cb(); } return true; } return false; }

  /* ---------- update ---------- */
  var SPEED = 7.5; // tiles/s
  function update(dt, now) {
    if (!map) return;
    // player
    if (!player.moving) {
      var dx = held.x, dy = held.y;
      if (dx || dy) { player.path = []; onArrive = null; }
      if (!dx && !dy && player.path.length) { var n = player.path[0]; dx = n[0] - player.tx; dy = n[1] - player.ty; }
      if (dx || dy) {
        if (dx && dy) dy = 0;
        player.dir = dy > 0 ? 0 : dy < 0 ? 3 : dx < 0 ? 1 : 2;
        var nx = player.tx + dx, ny = player.ty + dy;
        if (walkable(map, nx, ny)) { player.tx = nx; player.ty = ny; player.moving = true; if (player.path.length) player.path.shift(); }
        else { player.path = []; }
      }
    }
    if (player.moving) {
      var tx = player.tx * TILE, ty = player.ty * TILE, s = SPEED * TILE * dt;
      player.px += Math.max(-s, Math.min(s, tx - player.px)); player.py += Math.max(-s, Math.min(s, ty - player.py));
      if (player.px === tx && player.py === ty) { player.moving = false; if (!player.path.length && onArrive) { var cb = onArrive; onArrive = null; cb(); } }
    }
    // npcs
    npcs.forEach(function (n) {
      if (now > n.next && n.px === n.tx * TILE && n.py === n.ty * TILE) {
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], d = dirs[Math.floor(Math.random() * 4)];
        if (Math.random() < 0.7 && n.last) d = n.last;
        if (walkable(map, n.tx + d[0], n.ty + d[1]) && !(n.tx + d[0] === player.tx && n.ty + d[1] === player.ty)) { n.tx += d[0]; n.ty += d[1]; n.last = d; n.dir = d[1] > 0 ? 0 : d[1] < 0 ? 3 : 1; }
        else n.last = null;
        n.next = now + 200 + Math.random() * 900;
        if (Math.random() < 0.01 && !n.sayT) { n.say = D.SMALLTALK[Math.floor(Math.random() * D.SMALLTALK.length)]; n.sayT = now + 3500; }
      }
      var s2 = 2.5 * TILE * dt;
      n.px += Math.max(-s2, Math.min(s2, n.tx * TILE - n.px)); n.py += Math.max(-s2, Math.min(s2, n.ty * TILE - n.py));
      if (n.sayT && now > n.sayT) { n.sayT = 0; n.say = ""; }
    });
    kekes.forEach(function (k) {
      k.pos += k.sp * dt; var max = (k.horiz ? map.w : map.h) * TILE;
      if (k.pos < -40) k.pos = max + 30; if (k.pos > max + 40) k.pos = -30;
    });
    floaters = floaters.filter(function (f) { f.t += dt; return f.t < f.life; });
    particles = particles.filter(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; return p.t < p.life; });
  }

  /* ---------- draw ---------- */
  var cam = { x: 0, y: 0 };
  function draw(cx, cw, ch, now, hour, light) {
    if (!map) return;
    var zoom = cw < 600 ? 1.15 : 1.4;
    var vw = cw / zoom, vh = ch / zoom;
    cam.x = Math.max(0, Math.min(map.w * TILE - vw, player.px + 16 - vw / 2));
    cam.y = Math.max(0, Math.min(map.h * TILE - vh, player.py + 16 - vh / 2));
    if (map.w * TILE < vw) cam.x = (map.w * TILE - vw) / 2;
    if (map.h * TILE < vh) cam.y = (map.h * TILE - vh) / 2;
    cx.save(); cx.fillStyle = "#3f8fb5"; cx.fillRect(0, 0, cw, ch);
    cx.scale(zoom, zoom); cx.translate(-Math.round(cam.x), -Math.round(cam.y));
    cx.drawImage(map.canvas, 0, 0);
    // water shimmer
    if (map.river) { cx.fillStyle = "rgba(255,255,255," + (0.06 + 0.04 * Math.sin(now / 600)) + ")"; cx.fillRect(0, 0, map.river * TILE, map.h * TILE); }
    // forge smoke / market activity
    kekes.forEach(function (k) {
      if (k.bus) { var bx = k.horiz ? k.pos : k.line * TILE + (k.sp > 0 ? 4 : 18), by = k.horiz ? k.line * TILE + (k.sp > 0 ? 14 : 2) : k.pos; cx.save(); cx.translate(bx, by); if (!k.horiz) { cx.rotate(Math.PI / 2); cx.translate(-20, -24); } else cx.translate(-20, -4); bus(cx, 0, 0, "#fdd835"); cx.restore(); return; }
      if (k.horiz) drawKeke(cx, k.pos, k.line * TILE + (k.sp > 0 ? 22 : 10), true, k.sp < 0);
      else drawKeke(cx, k.line * TILE + (k.sp > 0 ? 10 : 22), k.pos, false, k.sp < 0);
    });
    // target marker
    if (player.path.length) { var g = player.path[player.path.length - 1]; cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = 2; cx.beginPath(); cx.arc(g[0] * TILE + 16, g[1] * TILE + 16, 8 + Math.sin(now / 150) * 2, 0, 7); cx.stroke(); cx.lineWidth = 1; }
    var ents = npcs.map(function (n) { return { y: n.py, f: function () { drawPerson(cx, n.px + 16, n.py + 16, n.look, n.dir, now + n.tx * 50, n.say); } }; });
    ents.push({ y: player.py, f: function () {
      drawPerson(cx, player.px + 16, player.py + 16, player.look || LOOKS_DEF, player.dir, player.moving ? now : 0, "");
      cx.fillStyle = "#fff"; cx.font = "bold 10px system-ui,sans-serif"; cx.textAlign = "center";
      cx.strokeStyle = "rgba(0,0,0,.7)"; cx.lineWidth = 3; cx.strokeText(player.name || "You", player.px + 16, player.py - 6); cx.fillText(player.name || "You", player.px + 16, player.py - 6); cx.textAlign = "left"; cx.lineWidth = 1;
    } });
    ents.sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { e.f(); });
    // night overlay with lit windows
    var dark = hour >= 19 ? Math.min(0.62, (hour - 18) * 0.16) : hour < 6 ? 0.55 : hour < 7 ? 0.25 : 0;
    if (dark > 0) {
      cx.fillStyle = "rgba(10,20,60," + dark + ")"; cx.fillRect(cam.x, cam.y, vw + 2, vh + 2);
      map.buildings.forEach(function (b, i) {
        var lit = light || (i % 3 === 0); // generators on some houses
        if (!lit || b.kind === "market" || b.kind === "park" || b.kind === "lake" || b.kind === "farm" || b.kind === "bridge") return;
        cx.fillStyle = "rgba(255,220,120," + (light ? 0.85 : 0.6) + ")";
        for (var k = 0; k < b.w; k++) if (k !== Math.floor(b.w / 2)) cx.fillRect(b.x * TILE + k * TILE + 8, b.y * TILE + b.h * TILE * 0.5, 14, 12);
      });
    }
    // floaters
    floaters.forEach(function (f) {
      var a = 1 - f.t / f.life; cx.globalAlpha = a; cx.font = "bold 16px system-ui,sans-serif"; cx.textAlign = "center";
      cx.strokeStyle = "rgba(0,0,0,.6)"; cx.lineWidth = 3; cx.strokeText(f.text, player.px + 16, player.py - 20 - f.t * 40);
      cx.fillStyle = f.color; cx.fillText(f.text, player.px + 16, player.py - 20 - f.t * 40); cx.globalAlpha = 1; cx.textAlign = "left"; cx.lineWidth = 1;
    });
    particles.forEach(function (p) { cx.fillStyle = "#ffd54f"; cx.beginPath(); cx.arc(player.px + 16 + p.x, player.py + p.y, 4, 0, 7); cx.fill(); cx.fillStyle = "#ff8f00"; cx.fillRect(player.px + 15 + p.x, player.py - 1 + p.y, 2, 2); });
    cx.restore();
  }
  var LOOKS_DEF = { skin: "#7a4a2c", outfit: "#1e88e5", hat: "hair" };

  function screenToTile(sx, sy, cw) { var zoom = cw < 600 ? 1.15 : 1.4; return { x: Math.floor((sx / zoom + cam.x) / TILE), y: Math.floor((sy / zoom + cam.y) / TILE) }; }
  function buildingAt(x, y) { return map.buildings.filter(function (b) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; })[0]; }
  function billAt(x, y) { return map.bills.filter(function (b) { return (x === b.x || x === b.x + 1) && (y === b.y || y === b.y - 1); })[0]; }
  function npcAt(x, y) { return npcs.filter(function (n) { return n.tx === x && n.ty === y; })[0]; }
  function nearby() {
    var px = player.tx, py = player.ty;
    var b = map.buildings.filter(function (b) { return Math.abs(b.front.x - px) + Math.abs(b.front.y - py) <= 1 || (px === b.door.x && py === b.door.y + 1); })[0];
    if (b) return { type: "building", b: b };
    var bl = map.bills.filter(function (b) { return Math.abs(b.x + 0.5 - px) <= 1.5 && Math.abs(b.y - py) <= 1; })[0];
    if (bl) return { type: "bill", b: bl };
    var n = npcs.filter(function (n) { return Math.abs(n.tx - px) + Math.abs(n.ty - py) <= 1; })[0];
    if (n) return { type: "npc", n: n };
    return null;
  }
  function float(text, color) { floaters.push({ text: text, color: color || "#7CFC00", t: 0, life: 1.4 }); }
  function coins(n) { for (var i = 0; i < (n || 14); i++) particles.push({ x: 0, y: 0, vx: (Math.random() - 0.5) * 220, vy: -150 - Math.random() * 200, t: 0, life: 0.9 }); }

  return { TILE: TILE, enter: enter, update: update, draw: draw, player: player, held: held, goTo: goTo, screenToTile: screenToTile, buildingAt: buildingAt, billAt: billAt, npcAt: npcAt, nearby: nearby, float: float, coins: coins, placeAt: placeAt, randLook: randLook, drawPerson: drawPerson, get map() { return map; }, get town() { return town; }, rng: rng, hash: hash };
})();
