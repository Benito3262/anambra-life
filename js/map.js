/* Real map of Anambra (Leaflet + OpenStreetMap tiles). Offline fallback draws an SVG from the same coordinates. */
var MAPV = (function () {
  var map = null, sel = null;
  function info(root, tid) {
    var box = root.querySelector("#mapinfo"); box.textContent = ""; sel = tid;
    var S = G.S, T = D.TOWNS[tid], s = UI.sec(T.name + (tid === S.town ? " (you are here)" : ""), box);
    UI.p(s, T.tag);
    var cheap = Object.keys(T.cheap).map(function (g) { return D.GOODS[g].name; }).join(", ") || "nothing special";
    var dear = Object.keys(T.dear).map(function (g) { return D.GOODS[g].name; }).join(", ") || "nothing special";
    UI.p(s, "Cost of living x" + T.cost + " · Opportunity x" + T.opp + " · Market day: " + (T.md < 0 ? "every day" : D.MARKET_DAYS[T.md]) + " · Light chance " + Math.round(T.light * 100) + "%");
    UI.p(s, "Cheap here: " + cheap + ". Sells dear: " + dear + ".");
    var lms = D.LANDMARKS.filter(function (l) { return l.town === tid; });
    if (lms.length) UI.p(s, "Real places: " + lms.map(function (l) { return l.name; }).join(", ") + ".");
    if (tid !== S.town) {
      var bs = UI.el("div", "btns"); s.appendChild(bs);
      ["keke", "okada", "bus"].forEach(function (m) { var q = G.quote(tid, m); if (q) bs.appendChild(UI.btn(G.MODES[m].name + " " + G.fmtS(q.fare) + " · " + q.hours + "h", function () { if (G.travel(tid, m)) { UI.close(); W.enter(tid); MAIN.arrived(); } }, m === "bus" ? "" : "alt")); });
      UI.p(s, G.dist(S.town, tid) + " km by road (estimated from real distance).");
    }
  }
  function render(root) {
    var S = G.S, box = UI.el("div"); box.id = "mapbox"; root.appendChild(box);
    var inf = UI.el("div"); inf.id = "mapinfo"; root.appendChild(inf);
    UI.p(root, "Map data © OpenStreetMap contributors. Town and landmark positions checked against OpenStreetMap, Wikipedia and Wikidata.");
    if (window.L && navigator.onLine !== false) {
      try {
        if (map) { map.remove(); map = null; }
        map = L.map(box, { zoomControl: true, attributionControl: true }).setView([6.12, 6.98], 9);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
        var pts = [];
        D.TOWN_IDS.forEach(function (tid) {
          var T = D.TOWNS[tid], here = tid === S.town, big = T.size === "big";
          var mk = L.circleMarker([T.lat, T.lon], { radius: big ? 11 : T.size === "mid" ? 8 : 6, color: here ? "#e53935" : "#0b3d22", weight: here ? 4 : 2, fillColor: T.cost >= 1.4 ? "#f1c75b" : T.cost >= 1.05 ? "#8bc34a" : "#4fc3f7", fillOpacity: 0.95 }).addTo(map);
          mk.bindTooltip((here ? "📍 " : "") + T.name, { permanent: big || here, direction: "top", offset: [0, -8] });
          mk.on("click", function () { info(root, tid); });
          pts.push([T.lat, T.lon]);
        });
        D.LANDMARKS.forEach(function (l) {
          var ic = L.divIcon({ className: "", html: '<div style="font-size:18px;line-height:18px">' + (D.POI[l.poi] ? D.POI[l.poi].icon : "📍") + "</div>", iconSize: [20, 20], iconAnchor: [10, 10] });
          var m = L.marker([l.lat, l.lon], { icon: ic, title: l.name }).addTo(map);
          m.bindTooltip(l.name + " (" + D.TOWNS[l.town].name + ")", { direction: "top" });
          m.on("click", function () { info(root, l.town); });
        });
        map.fitBounds(pts, { padding: [20, 20] });
        setTimeout(function () { if (map) map.invalidateSize(); }, 250);
      } catch (e) { svg(box, root); }
    } else svg(box, root);
    info(root, sel && sel !== S.town ? sel : S.town);
  }
  function svg(box, root) {
    var S = G.S, ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 400 400"); s.style.width = "100%"; s.style.height = "100%"; s.style.background = "#dbeedd";
    var minLa = 5.8, maxLa = 6.38, minLo = 6.74, maxLo = 7.3;
    function xy(la, lo) { return [20 + (lo - minLo) / (maxLo - minLo) * 360, 20 + (maxLa - la) / (maxLa - minLa) * 360]; }
    var river = document.createElementNS(ns, "path"); var a = xy(6.4, 6.77), b = xy(6.13, 6.76), c = xy(5.8, 6.74);
    river.setAttribute("d", "M" + a + " Q" + b + " " + c); river.setAttribute("stroke", "#4fa3c7"); river.setAttribute("stroke-width", "6"); river.setAttribute("fill", "none"); s.appendChild(river);
    D.TOWN_IDS.forEach(function (tid) {
      var T = D.TOWNS[tid], p = xy(T.lat, T.lon), g = document.createElementNS(ns, "g"), ci = document.createElementNS(ns, "circle"), tx = document.createElementNS(ns, "text");
      ci.setAttribute("cx", p[0]); ci.setAttribute("cy", p[1]); ci.setAttribute("r", T.size === "big" ? 9 : 6); ci.setAttribute("fill", tid === S.town ? "#e53935" : "#0b6b3a");
      tx.setAttribute("x", p[0] + 9); tx.setAttribute("y", p[1] + 4); tx.setAttribute("font-size", "11"); tx.textContent = T.name;
      g.appendChild(ci); g.appendChild(tx); g.style.cursor = "pointer"; g.addEventListener("click", function () { info(root, tid); }); s.appendChild(g);
    });
    box.appendChild(s);
    var n = UI.el("div", "muted", "Offline map. Connect to the internet to see the full street map."); n.style.padding = "4px"; box.parentNode.insertBefore(n, box.nextSibling);
  }
  function close() { if (map) { map.remove(); map = null; } }
  return { render: render, close: close };
})();
