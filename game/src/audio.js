// Sunport Chase — sound made from raw WebAudio oscillators, no audio files.
// A low engine hum that follows the car's speed, a two-tone siren while police are
// close, and short blips/thuds for pickups, crimes and crashes. M toggles mute.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenFlip = null;
  let muted = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();

    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 700;
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(ctx.destination);
    sirenOsc.start();
    let high = false;
    sirenFlip = setInterval(() => {
      if (!ctx || muted) return;
      high = !high;
      sirenOsc.frequency.setValueAtTime(high ? 950 : 680, ctx.currentTime);
    }, 420);
    return true;
  }

  function blip(freq, dur, type, vol) {
    if (!ensure() || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    setEngine(speedRatio, driving) {
      if (!ctx || muted) return;
      const target = driving ? 0.015 + Math.abs(speedRatio) * 0.03 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speedRatio) * 95, ctx.currentTime, 0.08);
    },
    setSiren(active) {
      if (!ctx || muted) return;
      sirenGain.gain.setTargetAtTime(active ? 0.02 : 0, ctx.currentTime, 0.15);
    },
    pickup() { blip(880, 0.12, 'square', 0.05); setTimeout(() => blip(1320, 0.14, 'square', 0.05), 70); },
    crime() { blip(220, 0.16, 'square', 0.05); },
    crash() { blip(70, 0.22, 'sawtooth', 0.12); },
    success() { blip(660, 0.12, 'triangle', 0.06); setTimeout(() => blip(990, 0.2, 'triangle', 0.06), 110); },
    fail() { blip(300, 0.3, 'triangle', 0.06); setTimeout(() => blip(190, 0.4, 'triangle', 0.06), 140); },
    dispose() { if (sirenFlip) clearInterval(sirenFlip); },
  };
}
