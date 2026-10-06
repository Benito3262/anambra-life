/* Tiny synthesized sound effects (WebAudio, no files). */
var SFX = (function () {
  var ctx = null, muted = localStorage.getItem("al_mute") === "1";
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; }
  function tone(f, d, type, vol, delay) {
    if (muted) return; var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  }
  return {
    coin: function () { tone(988, 0.08, "square", 0.06); tone(1319, 0.25, "square", 0.06, 0.07); },
    cash: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.15, "triangle", 0.09, i * 0.06); }); },
    level: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.22, "square", 0.07, i * 0.1); }); },
    bad: function () { tone(220, 0.25, "sawtooth", 0.07); tone(160, 0.35, "sawtooth", 0.07, 0.15); },
    click: function () { tone(660, 0.04, "square", 0.03); },
    msg: function () { tone(880, 0.07, "sine", 0.08); tone(1175, 0.1, "sine", 0.08, 0.08); },
    alarm: function () { for (var i = 0; i < 4; i++) { tone(700, 0.15, "square", 0.06, i * 0.3); tone(500, 0.15, "square", 0.06, i * 0.3 + 0.15); } },
    toggle: function () { muted = !muted; localStorage.setItem("al_mute", muted ? "1" : "0"); return muted; },
    get muted() { return muted; }, unlock: ac
  };
})();
