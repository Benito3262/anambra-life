/* Offline cache for Anambra Life */
var CACHE = "anambra-life-v1";
var CORE = ["./", "index.html", "css/style.css", "js/data.js", "js/audio.js", "js/world.js", "js/game.js", "js/net.js", "js/ui.js", "js/map.js", "js/main.js", "icon.svg", "manifest.webmanifest"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); })); self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.indexOf("supabase") >= 0 || u.hostname.indexOf("openstreetmap") >= 0) return;
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok && (u.origin === location.origin || /jsdelivr|unpkg/.test(u.hostname))) { var cl = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cl); }); } return r; }).catch(function () { return caches.match(e.request); }));
});
