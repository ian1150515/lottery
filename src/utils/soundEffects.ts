/**
/**
 * 企業抽獎系統專用音效管理器 (Gala Lucky Draw Sound Engine)
 * 包含：
 * 1. 【音效 1：抽獎進行中】(約 6.2 秒：節奏逐漸加快、緊張期待、旋轉金幣、緊湊高潮、懸念煞車停頓)
 * 2. 【音效 2：中獎揭曉音效】(約 4.0 秒：瞬間揭曉、喜慶金管、元寶散落、勝利星光、明亮 chime 收尾)
 * 
 * 支援預先快取之 PCM WAV 零延遲原音播放，並內建 Web Audio API 即時程序化合成降級保護，
 * 確保在任何設備、網路離線或大螢幕環境皆能 100% 穩定開獎！
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.9;

  // Cached AudioBuffers
  private rollingBuffer: AudioBuffer | null = null;
  private fanfareBuffer: AudioBuffer | null = null;

  // Active playing source nodes
  private activeRollingSource: AudioBufferSourceNode | null = null;
  private activeRollingGain: GainNode | null = null;
  private isRolling: boolean = false;

  // Track loading state
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  // AI喜慶背景配樂 (BGM)
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmGainNode: GainNode | null = null;

  constructor() {
    // Lazy pre-fetch audio assets when window is ready
    if (typeof window !== 'undefined') {
      this.initBuffers();
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Pre-fetches and decodes the two dedicated gala WAV files for 0-latency playback
   */
  public async initBuffers(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const ctx = this.getContext();
        if (!ctx) return;

        const [rollingRes, fanfareRes] = await Promise.allSettled([
          fetch('/sounds/drawing_rolling.wav'),
          fetch('/sounds/winner_fanfare.wav'),
        ]);

        if (rollingRes.status === 'fulfilled' && rollingRes.value.ok) {
          const ab = await rollingRes.value.arrayBuffer();
          this.rollingBuffer = await ctx.decodeAudioData(ab);
        }

        if (fanfareRes.status === 'fulfilled' && fanfareRes.value.ok) {
          const ab = await fanfareRes.value.arrayBuffer();
          this.fanfareBuffer = await ctx.decodeAudioData(ab);
        }

        this.isLoaded = Boolean(this.rollingBuffer && this.fanfareBuffer);
      } catch (e) {
        console.warn('Gala sound buffer preloading notice (will use Web Audio synthesis fallback):', e);
      }
    })();

    return this.loadPromise;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopRollingSound();
      this.stopFestiveBgm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  // ==========================================
  // 【音效 1：抽獎進行中】 (Drawing / Rolling)
  // ==========================================
  /**
   * 播放抽獎進行中音效 (約 6.2 秒：節奏加快、輪盤旋轉、金幣翻動、高潮懸念停頓)
   * 抽獎期間循環或播放直至 stopRollingSound() 被呼叫
   */
  public startRollingSound() {
    if (this.isMuted || this.isRolling) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isRolling = true;

    // 1. If WAV audio buffer is available, play cached buffer
    if (this.rollingBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = this.rollingBuffer;
        source.loop = true; // Loops seamlessly if draw takes longer than 6s

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(this.masterVolume, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
        this.activeRollingSource = source;
        this.activeRollingGain = gainNode;
        return;
      } catch (err) {
        console.warn('Error starting rolling buffer, falling back to synthesizer:', err);
      }
    }

    // 2. Fallback procedural synthesis: accelerating slot clicks + rhythmic taiko tension
    this.synthesizeRollingFallback();
  }

  /**
   * 停止抽獎進行中音效，帶有平滑淡出以避免爆音，並為揭曉音效提供乾淨過渡
   */
  public stopRollingSound() {
    this.isRolling = false;

    if (this.activeRollingGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.activeRollingGain.gain.cancelScheduledValues(now);
        this.activeRollingGain.gain.setValueAtTime(this.activeRollingGain.gain.value, now);
        this.activeRollingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      } catch {}
    }

    setTimeout(() => {
      if (this.activeRollingSource) {
        try {
          this.activeRollingSource.stop();
          this.activeRollingSource.disconnect();
        } catch {}
        this.activeRollingSource = null;
      }
      this.activeRollingGain = null;
    }, 90);
  }

  // ==========================================
  // 【音效 2：中獎揭曉音效】 (Winner Fanfare)
  // ==========================================
  /**
   * 播放中獎揭曉音效 (約 4.0 秒：瞬間揭曉、金色號角勝利和弦、金幣傾瀉雨、星光彩帶、明亮 chime 收尾)
   */
  public playFanfare() {
    if (this.isMuted) return;
    // Always cleanly terminate rolling sound first
    this.stopRollingSound();

    const ctx = this.getContext();
    if (!ctx) return;

    // 1. Play dedicated Gala WAV fanfare buffer
    if (this.fanfareBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = this.fanfareBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(this.masterVolume * 1.05, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
        return;
      } catch (err) {
        console.warn('Error starting fanfare buffer, falling back to synthesizer:', err);
      }
    }

    // 2. High-fidelity procedural fanfare fallback
    this.synthesizeFanfareFallback();
  }

  /**
   * 試聽【音效 1：抽獎進行中】單次播放完整 6.2 秒（不自動循環，用於試聽與驗收）
   */
  public playDrawingPreview(): () => void {
    if (this.isMuted) return () => {};
    this.stopRollingSound();
    const ctx = this.getContext();
    if (!ctx) return () => {};

    if (this.rollingBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.rollingBuffer;
      source.loop = false;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      return () => {
        try {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
          setTimeout(() => {
            try { source.stop(); } catch {}
          }, 120);
        } catch {}
      };
    } else {
      this.startRollingSound();
      const timer = setTimeout(() => this.stopRollingSound(), 6000);
      return () => {
        clearTimeout(timer);
        this.stopRollingSound();
      };
    }
  }

  /**
   * 試聽【音效 2：中獎揭曉音效】（用於試聽與驗收）
   */
  public playWinnerPreview() {
    this.playFanfare();
  }

  /**
   * 輕快抽獎單一跳動聲 (用於手動逐一滾動或快速單次跳動)
   */
  public playTick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + Math.random() * 220, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  /**
   * 金色星光亮鈴 (輔助細膩音效)
   */
  public playShimmer() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const shimmerNotes = [1318.51, 1567.98, 2093.0, 2637.02];
      shimmerNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        const startTime = now + idx * 0.05;
        gain.gain.setValueAtTime(0.08 * this.masterVolume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch {}
  }

  /**
   * 缺席重抽／名額釋出提示音 (溫和可愛，避免失敗感)
   */
  public playRedrawSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(261.63, now + 0.22);

      gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // ==========================================
  // AI 喜慶背景配樂 (BGM)
  // ==========================================
  /**
   * 播放 AI 喜慶背景配樂 (喜慶五聲和弦與歡騰旋律循環)
   */
  public playFestiveBgm(): void {
    if (this.isMuted) return;
    if (this.isBgmPlaying) return;

    const ctx = this.getContext();
    if (!ctx) return;

    this.isBgmPlaying = true;

    // 主音量增益節點
    this.bgmGainNode = ctx.createGain();
    this.bgmGainNode.gain.setValueAtTime(0.18 * this.masterVolume, ctx.currentTime);
    this.bgmGainNode.connect(ctx.destination);

    // 經典喜慶五聲音階樂譜 (C 大調五聲音階：C4, D4, E4, G4, A4, C5, D5, E5)
    const melody: Array<{ note: number; dur: number; time: number }> = [
      // 第一小節：開門見喜
      { note: 523.25, dur: 0.18, time: 0.0 },   // C5
      { note: 659.25, dur: 0.18, time: 0.25 },  // E5
      { note: 783.99, dur: 0.25, time: 0.5 },   // G5
      { note: 659.25, dur: 0.18, time: 0.75 },  // E5
      // 第二小節：步步高升
      { note: 523.25, dur: 0.22, time: 1.0 },   // C5
      { note: 440.00, dur: 0.18, time: 1.25 },  // A4
      { note: 392.00, dur: 0.35, time: 1.5 },   // G4
      // 第三小節：鴻運當頭
      { note: 440.00, dur: 0.18, time: 2.0 },   // A4
      { note: 523.25, dur: 0.18, time: 2.25 },  // C5
      { note: 587.33, dur: 0.25, time: 2.5 },   // D5
      { note: 659.25, dur: 0.18, time: 2.75 },  // E5
      // 第四小節：財源滾滾
      { note: 587.33, dur: 0.35, time: 3.0 },   // D5
      { note: 392.00, dur: 0.25, time: 3.5 },   // G4
      // 第五小節：喜慶高潮
      { note: 659.25, dur: 0.18, time: 4.0 },   // E5
      { note: 783.99, dur: 0.18, time: 4.25 },  // G5
      { note: 880.00, dur: 0.25, time: 4.5 },   // A5
      { note: 783.99, dur: 0.18, time: 4.75 },  // G5
      // 第六小節：大展宏圖
      { note: 659.25, dur: 0.22, time: 5.0 },   // E5
      { note: 587.33, dur: 0.18, time: 5.25 },  // D5
      { note: 523.25, dur: 0.35, time: 5.5 },   // C5
      // 第七小節：金玉滿堂
      { note: 440.00, dur: 0.18, time: 6.0 },   // A4
      { note: 523.25, dur: 0.18, time: 6.25 },  // C5
      { note: 587.33, dur: 0.22, time: 6.5 },   // D5
      { note: 392.00, dur: 0.22, time: 6.75 },  // G4
      // 第八小節：圓滿收合
      { note: 523.25, dur: 0.65, time: 7.0 },   // C5
    ];

    const loopLength = 7.8; // 秒

    const playLoop = () => {
      if (!this.isBgmPlaying || !this.bgmGainNode) return;
      const startTime = ctx.currentTime;

      melody.forEach(item => {
        try {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = 'triangle'; // 溫暖如木琴、簧管與喜慶絲竹
          osc.frequency.setValueAtTime(item.note, startTime + item.time);

          noteGain.gain.setValueAtTime(0.001, startTime + item.time);
          noteGain.gain.linearRampToValueAtTime(0.14 * this.masterVolume, startTime + item.time + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + item.time + item.dur);

          osc.connect(noteGain);
          noteGain.connect(this.bgmGainNode!);

          osc.start(startTime + item.time);
          osc.stop(startTime + item.time + item.dur + 0.05);
        } catch {}
      });

      // 伴奏低音和弦襯底
      const bassNotes = [
        { freq: 130.81, time: 0.0 }, // C3
        { freq: 196.00, time: 2.0 }, // G3
        { freq: 130.81, time: 4.0 }, // C3
        { freq: 196.00, time: 6.0 }, // G3
      ];

      bassNotes.forEach(b => {
        try {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();

          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(b.freq, startTime + b.time);

          bassGain.gain.setValueAtTime(0.001, startTime + b.time);
          bassGain.gain.linearRampToValueAtTime(0.07 * this.masterVolume, startTime + b.time + 0.05);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, startTime + b.time + 1.8);

          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmGainNode!);

          bassOsc.start(startTime + b.time);
          bassOsc.stop(startTime + b.time + 1.85);
        } catch {}
      });
    };

    playLoop();
    this.bgmIntervalId = window.setInterval(playLoop, loopLength * 1000);
  }

  /**
   * 停止 AI 喜慶背景配樂
   */
  public stopFestiveBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.bgmGainNode) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          this.bgmGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        }
      } catch {}
      setTimeout(() => {
        this.bgmGainNode = null;
      }, 300);
    }
  }

  /**
   * 切換播放 / 停止 AI 喜慶背景配樂
   */
  public toggleFestiveBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopFestiveBgm();
      return false;
    } else {
      this.playFestiveBgm();
      return true;
    }
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  // ==========================================
  // PROCEDURAL SYNTHESIS FALLBACKS
  // ==========================================
  private synthesizeRollingFallback() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.07 * this.masterVolume, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.activeRollingSource = osc as unknown as AudioBufferSourceNode;
      this.activeRollingGain = gain;
    } catch {
      this.isRolling = false;
    }
  }

  private synthesizeFanfareFallback() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5 - E5 - G5 - C6 triumphant chord
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = index === notes.length - 1 ? 'sine' : 'triangle';
        const startTime = now + index * 0.08;
        const duration = index === notes.length - 1 ? 1.8 : 0.6;

        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.22 * this.masterVolume, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });

      setTimeout(() => this.playShimmer(), 350);
    } catch {}
  }
}

export const soundEffects = new SoundEffectsManager();
