// ============ Web Audio 音效引擎 ============
// 使用 Web Audio API 程序化生成音效，无需外部音频文件
// 支持攻击、受击、Boss、宠物、拾取、升级、胜负等音效

export class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private enabled: boolean = true
  private musicEnabled: boolean = true
  private currentMusic: { oscillators: OscillatorNode[]; gains: GainNode[] } | null = null
  private musicTimer: number = 0
  private musicInterval: number | null = null

  init() {
    if (this.ctx) return
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext)
      this.ctx = new AC()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.6
      this.masterGain.connect(this.ctx.destination)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.25
      this.musicGain.connect(this.masterGain)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.8
      this.sfxGain.connect(this.masterGain)
    } catch (e) {
      console.warn('Web Audio not supported:', e)
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v
    if (this.masterGain) {
      this.masterGain.gain.value = v ? 0.6 : 0
    }
  }

  setMusicEnabled(v: boolean) {
    this.musicEnabled = v
    if (this.musicGain) {
      this.musicGain.gain.value = v ? 0.25 : 0
    }
  }

  private envGain(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.3,
    attack: number = 0.005,
    release: number = 0.05
  ) {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(50, endFreq), ctx.currentTime + duration)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + release)
    osc.connect(gain)
    gain.connect(this.sfxGain)
    osc.start()
    osc.stop(ctx.currentTime + duration + release + 0.05)
  }

  private noiseBurst(duration: number, filterFreq: number, volume: number = 0.3, q: number = 1) {
    if (!this.ctx || !this.sfxGain || !this.enabled) return
    const ctx = this.ctx
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain)
    source.start()
    source.stop(ctx.currentTime + duration + 0.05)
  }

  // ============ 攻击音效 ============
  playSwordSlash() {
    this.resume()
    this.envGain(800, 200, 0.08, 'sawtooth', 0.25)
    this.noiseBurst(0.1, 3000, 0.15)
  }

  playArrowShoot() {
    this.resume()
    this.envGain(1200, 600, 0.1, 'triangle', 0.25)
  }

  playStaffCast() {
    this.resume()
    this.envGain(400, 800, 0.15, 'sine', 0.25)
    setTimeout(() => this.envGain(800, 1200, 0.1, 'sine', 0.2), 50)
  }

  playHammerSwing() {
    this.resume()
    this.envGain(200, 60, 0.15, 'square', 0.35)
    this.noiseBurst(0.08, 150, 0.2)
  }

  /**
   * 武器攻击音效：每种武器 + 每个阶数都有独立音色。
   * 阶数越高音色越华丽——更高的音高、更多泛音、更重的打击感，
   * 让新装备一听就有“新”的感觉。
   */
  playWeaponAttack(type: 'sword' | 'spear' | 'bow' | 'gun', tier: number) {
    this.resume()
    const t = Math.max(0, Math.min(4, Math.floor(tier)))
    switch (type) {
      case 'sword':
        // 斩剑：金属挥砍 + 剑刃破空，阶数越高音越高、附加泛音
        this.envGain(650 + t * 130, 150 + t * 35, 0.09, 'sawtooth', 0.22 + t * 0.02)
        this.noiseBurst(0.08 + t * 0.01, 2200 + t * 500, 0.12 + t * 0.02)
        if (t >= 2) setTimeout(() => this.envGain(1400 + t * 150, 420, 0.06, 'triangle', 0.12), 30)
        if (t >= 4) setTimeout(() => this.noiseBurst(0.1, 5200, 0.1), 60)
        break
      case 'spear':
        // 长枪：高频破空突刺，短促有力
        this.envGain(950 + t * 150, 300 + t * 40, 0.07, 'sawtooth', 0.24 + t * 0.02)
        this.envGain(1800 + t * 220, 620, 0.05, 'triangle', 0.15 + t * 0.015)
        if (t >= 3) setTimeout(() => this.envGain(2600 + t * 120, 900, 0.05, 'sine', 0.12), 40)
        break
      case 'bow':
        // 弓箭：弓弦清脆弹拨，阶数越高越亮越清越
        this.envGain(1400 + t * 220, 820, 0.06, 'triangle', 0.2 + t * 0.02)
        setTimeout(() => this.envGain(2200 + t * 300, 1400, 0.05, 'sine', 0.14 + t * 0.015), 25)
        if (t >= 2) setTimeout(() => this.noiseBurst(0.04, 6000 + t * 400, 0.08), 10)
        if (t >= 4) setTimeout(() => this.envGain(3200, 2000, 0.06, 'sine', 0.12), 50)
        break
      case 'gun':
        // 枪械：火药爆震噪声 + 低频轰鸣，阶数越高越重越长
        this.noiseBurst(0.12 + t * 0.02, 480 + t * 130, 0.3 + t * 0.03, 2)
        this.envGain(180 + t * 30, 60, 0.14 + t * 0.02, 'square', 0.3 + t * 0.03)
        if (t >= 3) setTimeout(() => this.noiseBurst(0.08, 4000, 0.14), 60)
        if (t >= 4) setTimeout(() => this.envGain(60, 40, 0.2, 'sawtooth', 0.2), 120)
        break
    }
  }

  // ============ 受击/命中 ============
  playHit() {
    this.resume()
    this.noiseBurst(0.08, 800, 0.3)
    this.envGain(300, 100, 0.08, 'square', 0.15)
  }

  playEnemyHit() {
    this.resume()
    this.noiseBurst(0.06, 600, 0.2)
  }

  playPlayerHurt() {
    this.resume()
    this.envGain(400, 150, 0.15, 'sawtooth', 0.3)
  }

  playCriticalHit() {
    this.resume()
    this.envGain(600, 1200, 0.06, 'square', 0.3)
    setTimeout(() => this.envGain(1200, 200, 0.1, 'sawtooth', 0.25), 40)
  }

  // ============ Boss 音效 ============
  playBossRoar() {
    this.resume()
    this.envGain(80, 40, 0.4, 'sawtooth', 0.4)
    this.noiseBurst(0.5, 120, 0.35, 3)
    setTimeout(() => this.envGain(60, 30, 0.3, 'square', 0.3), 100)
  }

  playBossWarn() {
    this.resume()
    this.envGain(200, 100, 0.2, 'square', 0.3)
    setTimeout(() => this.envGain(250, 120, 0.2, 'square', 0.3), 200)
  }

  playBossDefeated() {
    this.resume()
    this.envGain(100, 50, 0.3, 'sawtooth', 0.4)
    this.noiseBurst(0.6, 200, 0.4)
    setTimeout(() => this.envGain(80, 40, 0.5, 'sawtooth', 0.35), 200)
  }

  // ============ 拾取/升级 ============
  playPickupCoin() {
    this.resume()
    this.envGain(1200, 1800, 0.06, 'square', 0.15)
    setTimeout(() => this.envGain(1800, 2400, 0.06, 'square', 0.12), 50)
  }

  playPickupHealth() {
    this.resume()
    this.envGain(600, 900, 0.1, 'sine', 0.2)
    setTimeout(() => this.envGain(900, 1200, 0.1, 'sine', 0.15), 80)
  }

  playPickupMana() {
    this.resume()
    this.envGain(400, 700, 0.15, 'triangle', 0.2)
  }

  playEquip() {
    this.resume()
    // 金属质感上升琶音，暗示装备上身
    this.envGain(880, 660, 0.09, 'square', 0.22)
    setTimeout(() => this.envGain(1320, 990, 0.09, 'square', 0.22), 70)
    setTimeout(() => this.envGain(1760, 1320, 0.14, 'square', 0.24), 140)
  }

  playEquipLow() {
    this.resume()
    // 已拥有更优装备时的低沉短音
    this.envGain(330, 280, 0.09, 'triangle', 0.16)
  }

  playLevelUp() {
    this.resume()
    this.envGain(500, 800, 0.1, 'triangle', 0.25)
    setTimeout(() => this.envGain(800, 1200, 0.1, 'triangle', 0.25), 80)
    setTimeout(() => this.envGain(1200, 1600, 0.15, 'triangle', 0.25), 160)
  }

  // ============ 宠物 ============
  playPetUnlock() {
    this.resume()
    this.envGain(600, 900, 0.1, 'sine', 0.3)
    setTimeout(() => this.envGain(900, 1300, 0.1, 'sine', 0.25), 100)
    setTimeout(() => this.envGain(1300, 1800, 0.2, 'sine', 0.25), 200)
    setTimeout(() => this.noiseBurst(0.2, 2000, 0.15), 300)
  }

  playPetAttack() {
    this.resume()
    this.envGain(500, 200, 0.1, 'triangle', 0.2)
  }

  // ============ 胜负 ============
  playVictory() {
    this.resume()
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => this.envGain(freq, freq * 1.2, 0.2, 'triangle', 0.25), i * 120)
    })
  }

  playDefeat() {
    this.resume()
    this.envGain(300, 80, 0.5, 'sawtooth', 0.3)
    setTimeout(() => this.envGain(200, 50, 0.6, 'sawtooth', 0.3), 300)
  }

  // ============ UI 音效 ============
  playButtonClick() {
    this.resume()
    this.envGain(600, 400, 0.04, 'square', 0.1)
  }

  playHover() {
    this.resume()
    this.envGain(800, 900, 0.02, 'sine', 0.05)
  }

  // ============ 背景音乐（循环旋律）============
  private musicMelodies: Record<number, number[]> = {
    0: [523, 587, 659, 698, 784, 698, 659, 587, 523, 587, 659, 523],
    1: [440, 392, 440, 330, 440, 523, 440, 392, 349, 392, 440, 330],
    2: [330, 294, 330, 262, 330, 392, 440, 392, 349, 330, 294, 262],
    // 3 永冻冰原：冷冽空灵的高音旋律
    3: [698, 587, 698, 880, 784, 698, 587, 523, 587, 698, 784, 659],
    // 4 深渊王座：低沉压迫的终章旋律
    4: [196, 233, 196, 165, 196, 262, 233, 196, 174, 196, 233, 165],
  }

  startMusic(levelId: number) {
    this.resume()
    if (!this.musicEnabled || !this.ctx || !this.musicGain) return
    this.stopMusic()

    const melody = this.musicMelodies[levelId] || this.musicMelodies[0]!
    const noteDuration = 0.35
    let noteIndex = 0

    const playNote = () => {
      if (!this.ctx || !this.musicGain) return
      const freq = melody[noteIndex % melody.length]!
      noteIndex++

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(0, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + noteDuration - 0.05)
      osc.connect(gain)
      gain.connect(this.musicGain)
      osc.start()
      osc.stop(this.ctx.currentTime + noteDuration)

      // Bass line (every other note)
      if (noteIndex % 2 === 0) {
        const bassFreq = freq / 2
        const bassOsc = this.ctx.createOscillator()
        const bassGain = this.ctx.createGain()
        bassOsc.type = 'sine'
        bassOsc.frequency.setValueAtTime(bassFreq, this.ctx.currentTime)
        bassGain.gain.setValueAtTime(0, this.ctx.currentTime)
        bassGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.02)
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + noteDuration * 2)
        bassOsc.connect(bassGain)
        bassGain.connect(this.musicGain)
        bassOsc.start()
        bassOsc.stop(this.ctx.currentTime + noteDuration * 2)
      }
    }

    this.musicInterval = window.setInterval(playNote, noteDuration * 1000)
    this.currentMusic = { oscillators: [], gains: [] }
  }

  stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    this.currentMusic = null
  }

  get isEnabled() { return this.enabled }
  get isMusicEnabled() { return this.musicEnabled }
}

export const soundEngine = new SoundEngine()
