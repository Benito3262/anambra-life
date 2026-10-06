/* Live layer: Supabase (free plan). Falls back to offline simulation if unavailable. */
var NET = (function () {
  var URL = "https://zohehexlliuebnkxipvt.supabase.co";
  var KEY = "sb_publishable_Xwmpqbs28Uv7hsqF4ujPZw_MeYj5dDB";
  var sb = null, online = false, players = [], lastSync = 0, lastNW = 0, msgHandlers = [], playerHandlers = [], dmHandlers = [];
  var dms = [], dmSince = null, pollTimer = null, fastPoll = false;
  function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }
  function secret() { var a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  var id = localStorage.getItem("al_pid"), sec = localStorage.getItem("al_secret");
  if (!id) { id = uuid(); localStorage.setItem("al_pid", id); } if (!sec || sec.length < 16) { sec = secret(); localStorage.setItem("al_secret", sec); }
  try { dms = JSON.parse(localStorage.getItem("al_dms") || "[]"); } catch (e) { dms = []; }
  dmSince = dms.length ? dms[0].created_at : null;
  var blocked = {}; try { blocked = JSON.parse(localStorage.getItem("al_blocked") || "{}"); } catch (e) {}
  var readMap = {}; try { readMap = JSON.parse(localStorage.getItem("al_dmread") || "{}"); } catch (e) {}

  var BAD = ["fuck", "fucking", "shit", "bitch", "bastard", "cunt", "dick", "pussy", "whore", "slut", "nigga", "nigger", "motherfucker", "ashawo", "mumu", "idiot", "stupid", "olodo", "ewu"];
  var badRe = new RegExp("\\b(" + BAD.join("|") + ")\\b", "gi");
  function clean(s) { return String(s || "").replace(badRe, function (w) { return w[0] + "*".repeat(w.length - 1); }).slice(0, 500); }

  function init() {
    if (!window.supabase || !window.supabase.createClient) { online = false; return; }
    try {
      sb = window.supabase.createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      refreshPlayers();
      sb.channel("al-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, function (p) { var m = p.new; if (!m || blocked[m.player_id]) return; msgHandlers.forEach(function (h) { h(m); }); })
        .on("postgres_changes", { event: "*", schema: "public", table: "players" }, function (p) { var r = p.new; if (!r || !r.id) return; var i = players.findIndex(function (x) { return x.id === r.id; }); if (i >= 0) players[i] = r; else players.push(r); playerHandlers.forEach(function (h) { h(); }); })
        .subscribe();
      schedulePoll();
    } catch (e) { online = false; console.warn("live off", e); }
  }
  function refreshPlayers() {
    if (!sb) return Promise.resolve();
    return sb.from("players").select("id,name,town,net_worth,title,updated_at").order("net_worth", { ascending: false }).limit(200).then(function (r) {
      if (r.error) { online = false; return; } online = true; players = r.data || []; playerHandlers.forEach(function (h) { h(); });
    }).catch(function () { online = false; });
  }
  function sync(force) {
    if (!sb || !G.S) return Promise.resolve();
    var S = G.S, nw = G.netWorth(); lastSync = Date.now(); lastNW = nw;
    var name = String(S.name || "Player").trim().slice(0, 20); if (name.length < 2) name = name + "_";
    return sb.rpc("upsert_player", { p_id: id, p_secret: sec, p_name: name, p_town: D.TOWNS[S.town].name, p_net_worth: Math.max(0, Math.round(nw)), p_title: D.LEVELS[S.level].name })
      .then(function (r) { if (r.error) console.warn("sync", r.error.message); else refreshPlayers(); }).catch(function () {});
  }
  function maybeSync(nw) { if (!sb) return; var big = lastNW && Math.abs(nw - lastNW) / Math.max(1, lastNW) > 0.25; if (Date.now() - lastSync > 30000 || big) sync(); }
  function loadMessages(channel) {
    if (!sb) return Promise.resolve([]);
    return sb.from("messages").select("*").eq("channel", channel).order("created_at", { ascending: false }).limit(50).then(function (r) { return (r.data || []).reverse().filter(function (m) { return !blocked[m.player_id]; }); }).catch(function () { return []; });
  }
  function send(channel, body) {
    body = clean(body).trim().slice(0, 280); if (!body) return Promise.reject(new Error("empty"));
    if (!sb) return Promise.reject(new Error("offline"));
    return sb.rpc("send_message", { p_id: id, p_secret: sec, p_channel: channel.slice(0, 40), p_body: body }).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
  }
  function sendDm(to, body) {
    body = clean(body).trim().slice(0, 500); if (!body) return Promise.reject(new Error("empty"));
    if (!sb) return Promise.reject(new Error("offline"));
    return sb.rpc("send_dm", { p_id: id, p_secret: sec, p_to: to, p_body: body }).then(function (r) { if (r.error) throw new Error(r.error.message); return pollDms(); });
  }
  function pollDms() {
    if (!sb) return Promise.resolve();
    return sb.rpc("get_dms", { p_id: id, p_secret: sec, p_since: dmSince }).then(function (r) {
      if (r.error) return; var rows = r.data || [], known = {}; dms.forEach(function (d) { known[d.id] = 1; });
      var fresh = rows.filter(function (d) { return !known[d.id]; });
      if (fresh.length) {
        dms = fresh.concat(dms).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 500);
        dmSince = dms[0].created_at; localStorage.setItem("al_dms", JSON.stringify(dms));
        dmHandlers.forEach(function (h) { h(fresh); });
      }
    }).catch(function () {});
  }
  function schedulePoll() { clearTimeout(pollTimer); pollTimer = setTimeout(function () { pollDms().then(schedulePoll); }, fastPoll ? 4000 : 20000); }
  function setFast(f) { if (fastPoll === f) return; fastPoll = f; if (f) pollDms(); schedulePoll(); }
  function conversations() {
    var conv = {};
    dms.forEach(function (d) {
      var other = d.sender_id === id ? d.recipient_id : d.sender_id; if (blocked[other]) return;
      var name = d.sender_id === id ? d.recipient_name : d.sender_name;
      var c = conv[other] || (conv[other] = { id: other, name: name, msgs: [], last: d.created_at, unread: 0 });
      c.msgs.push(d); if (d.sender_id !== id && (!readMap[other] || d.created_at > readMap[other])) c.unread++;
    });
    Object.keys(conv).forEach(function (k) { conv[k].msgs.reverse(); });
    return Object.keys(conv).map(function (k) { return conv[k]; }).sort(function (a, b) { return a.last < b.last ? 1 : -1; });
  }
  function markRead(other) { var c = conversations().filter(function (x) { return x.id === other; })[0]; if (c && c.msgs.length) { readMap[other] = c.msgs[c.msgs.length - 1].created_at; localStorage.setItem("al_dmread", JSON.stringify(readMap)); } }
  function unread() { return conversations().reduce(function (a, c) { return a + c.unread; }, 0); }
  function block(pid, name) { blocked[pid] = name || true; localStorage.setItem("al_blocked", JSON.stringify(blocked)); }
  function unblock(pid) { delete blocked[pid]; localStorage.setItem("al_blocked", JSON.stringify(blocked)); }
  function onlineCount() { var t = Date.now() - 10 * 60000; return players.filter(function (p) { return new Date(p.updated_at).getTime() > t; }).length; }
  return {
    init: init, sync: sync, maybeSync: maybeSync, loadMessages: loadMessages, send: send, sendDm: sendDm, pollDms: pollDms, setFast: setFast,
    conversations: conversations, markRead: markRead, unread: unread, block: block, unblock: unblock, clean: clean, refreshPlayers: refreshPlayers, onlineCount: onlineCount,
    onMessage: function (h) { msgHandlers.push(h); }, onPlayers: function (h) { playerHandlers.push(h); }, onDm: function (h) { dmHandlers.push(h); },
    livePlayers: function () { return players.filter(function (p) { return !blocked[p.id]; }); }, isMe: function (pid) { return pid === id; }, isBlocked: function (pid) { return !!blocked[pid]; }, blockedList: function () { return blocked; },
    get online() { return online; }, get id() { return id; }
  };
})();
