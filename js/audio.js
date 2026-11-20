/* Procedural sticky wet stir / squelch. No audio files. */
(function (global) {
  "use strict";

  var MixGame = global.MixGame || (global.MixGame = {});
  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var stirSrc = null;
  var stirFilter = null;
  var stirGain = null;
  var lastSquelch = 0;
  var unlocked = false;
  var muted = false;

  function makeNoise(ac, seconds) {
    var n = Math.floor(ac.sampleRate * seconds);
    var buf = ac.createBuffer(1, n, ac.sampleRate);
    var d = buf.getChannelData(0);
    var acc = 0;
    for (var i = 0; i < n; i++) {
      acc = acc * 0.96 + (Math.random() * 2 - 1) * 0.04;
      d[i] = acc * 3.2 + (Math.random() * 2 - 1) * 0.12;
    }
    return buf;
  }

  function unlock() {
    if (unlocked && ctx && ctx.state === "running") return;
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      if (!master) {
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.42;
        master.connect(ctx.destination);
        noiseBuf = makeNoise(ctx, 1.4);
        setupStirLoop();
      }
      unlocked = true;
    } catch (e) {
      unlocked = false;
    }
  }

  function setupStirLoop() {
    stirFilter = ctx.createBiquadFilter();
    stirFilter.type = "lowpass";
    stirFilter.frequency.value = 220;
    stirFilter.Q.value = 0.9;
    var hip = ctx.createBiquadFilter();
    hip.type = "highpass";
    hip.frequency.value = 50;
    stirGain = ctx.createGain();
    stirGain.gain.value = 0;
    stirSrc = ctx.createBufferSource();
    stirSrc.buffer = noiseBuf;
    stirSrc.loop = true;
    stirSrc.connect(hip);
    hip.connect(stirFilter);
    stirFilter.connect(stirGain);
    stirGain.connect(master);
    stirSrc.start();
  }

  function stir(speed, pressing) {
    if (!unlocked || !stirGain) return;
    var now = ctx.currentTime;
    var amt = pressing ? Math.min(0.28, 0.04 + speed * 0.35) : 0;
    var freq = 140 + Math.min(520, speed * 680);
    stirGain.gain.cancelScheduledValues(now);
    stirGain.gain.setTargetAtTime(amt, now, 0.04);
    stirFilter.frequency.setTargetAtTime(freq, now, 0.05);
    if (pressing && speed > 0.18 && now - lastSquelch > 0.22) {
      lastSquelch = now;
      squelch(0.35 + Math.min(0.5, speed));
    }
  }

  function squelch(strength) {
    if (!unlocked || !ctx) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = "sine";
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    var startF = 90 + Math.random() * 70;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18 * strength, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(f);
    f.connect(g);
    g.connect(master);

    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var ng = ctx.createGain();
    var nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 180 + Math.random() * 90;
    nf.Q.value = 1.1;
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.22 * strength, now + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    src.connect(nf);
    nf.connect(ng);
    ng.connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
    src.start(now);
    src.stop(now + 0.16);
  }

  function dip() {
    if (!unlocked) return;
    squelch(0.85);
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(64, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.2);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  function reveal() {
    if (!unlocked) return;
    squelch(0.7);
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  function stopStir() {
    if (!stirGain || !ctx) return;
    var now = ctx.currentTime;
    stirGain.gain.setTargetAtTime(0, now, 0.06);
  }

  MixGame.audio = {
    unlock: unlock,
    setMuted: function (value) {
      muted = value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.025);
    },
    stir: stir,
    dip: dip,
    reveal: reveal,
    squelch: squelch,
    stopStir: stopStir
  };
})(typeof window !== "undefined" ? window : this);
