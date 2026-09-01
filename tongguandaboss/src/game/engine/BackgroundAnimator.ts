// ============ 动态背景动画系统 ============
// 在静态背景上叠加动态粒子层：云飘、叶落、萤火、气泡、火星等
// 支持 setTheme() 按子场景切换粒子主题

export interface AnimParticle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number
  color: string
  type: 'cloud' | 'leaf' | 'firefly' | 'star' | 'bubble' | 'ember' | 'smoke' | 'petal' | 'lightning' | 'snowflake' | 'sparkle' | 'dust'
  phase: number
}

export interface SceneTheme {
  name: string
  tint: string
  overlayColor: string
  particleColor: string
}

const DEFAULT_THEMES: SceneTheme[] = [
  // 0 晴空草原（第1关·场景1）：白昼暖色，云朵与光斑
  { name: '· 晴空草原', tint: '', overlayColor: '', particleColor: '#8ef1ff' },
  // 1 迷雾沼泽（第1关·场景2）：暗绿调，水汽与萤火
  { name: '· 迷雾沼泽', tint: '#1a3a2a', overlayColor: 'rgba(20,60,40,0.18)', particleColor: '#7dff9e' },
  // 2 巨树森林（第1关·场景3）：深绿调，飞花与萤火
  { name: '· 巨树森林', tint: '#0a2a1a', overlayColor: 'rgba(10,40,20,0.20)', particleColor: '#7cff9c' },
  // 3 月夜旷野（第2关·场景1）：冷蓝调，星光与浮尘
  { name: '· 月夜旷野', tint: '#15243c', overlayColor: 'rgba(20,35,70,0.22)', particleColor: '#bcd6ff' },
  // 4 枯木峡谷（第2关·场景2）：昏黄调，尘沙与枯叶
  { name: '· 枯木峡谷', tint: '#25120c', overlayColor: 'rgba(40,20,12,0.20)', particleColor: '#d8b48c' },
  // 5 银月祭坛（第2关·场景3）：幽蓝调，星光与符文光
  { name: '· 银月祭坛', tint: '#1c1c34', overlayColor: 'rgba(25,25,55,0.25)', particleColor: '#9aa8ff' },
  // 6 岩浆前哨（第3关·场景1）：暗红调，火星与烟尘
  { name: '· 岩浆前哨', tint: '#2a0e06', overlayColor: 'rgba(55,20,6,0.20)', particleColor: '#ff9440' },
  // 7 熔岩裂谷（第3关·场景2）：烈红调，火星四溅
  { name: '· 熔岩裂谷', tint: '#380a08', overlayColor: 'rgba(70,18,10,0.22)', particleColor: '#ff8a3a' },
  // 8 火山核心（第3关·场景3）：灼红调，浓烟与火雨
  { name: '· 火山核心', tint: '#4a0e0a', overlayColor: 'rgba(90,22,10,0.24)', particleColor: '#ff5a30' },
  // 9 冰封平原（第4关·场景1）：寒白调，暴雪与冰晶
  { name: '· 冰封平原', tint: '#1e3a4a', overlayColor: 'rgba(120,180,220,0.14)', particleColor: '#d6f4ff' },
  // 10 霜冻洞窟（第4关·场景2）：幽蓝调，冰晶与寒气
  { name: '· 霜冻洞窟', tint: '#12283e', overlayColor: 'rgba(80,140,200,0.18)', particleColor: '#9fd8ff' },
  // 11 冰晶王座（第4关·场景3）：深蓝紫调，极光与冰尘
  { name: '· 冰晶王座', tint: '#0d1d36', overlayColor: 'rgba(60,100,200,0.20)', particleColor: '#7cc8ff' },
  // 12 深渊入口（第5关·场景1）：暗紫调，怨火与黑雾
  { name: '· 深渊入口', tint: '#24103a', overlayColor: 'rgba(60,20,90,0.22)', particleColor: '#a080ff' },
  // 13 虚空长廊（第5关·场景2）：幽黑紫调，虚空星光与煞气
  { name: '· 虚空长廊', tint: '#160a2c', overlayColor: 'rgba(40,10,80,0.24)', particleColor: '#c060ff' },
  // 14 深渊王座（第5关·场景3）：血黑调，终焉之炎与吞噬黑雾
  { name: '· 深渊王座', tint: '#300812', overlayColor: 'rgba(90,10,30,0.26)', particleColor: '#ff4a6a' },
  // 15 烈日沙丘（第6关·场景1）：金黄沙海，热浪与浮尘
  { name: '· 烈日沙丘', tint: '#4a2a0a', overlayColor: 'rgba(120,80,20,0.18)', particleColor: '#ffd27a' },
  // 16 风蚀废墟（第6关·场景2）：昏黄调，沙尘与风卷
  { name: '· 风蚀废墟', tint: '#3a2208', overlayColor: 'rgba(90,60,20,0.20)', particleColor: '#f2c56a' },
  // 17 法老陵墓（第6关·场景3）：暗金调，圣甲虫微光与金尘
  { name: '· 法老陵墓', tint: '#2e1c06', overlayColor: 'rgba(70,50,10,0.22)', particleColor: '#ffd24d' },
  // 18 云海浮岛（第7关·场景1）：明亮蓝白，云雾与光斑
  { name: '· 云海浮岛', tint: '#eaf6ff', overlayColor: 'rgba(255,255,255,0.10)', particleColor: '#bde3ff' },
  // 19 风暴云渊（第7关·场景2）：青灰调，闪电与乱流
  { name: '· 风暴云渊', tint: '#2a3a4a', overlayColor: 'rgba(60,80,110,0.20)', particleColor: '#a5d8ff' },
  // 20 苍穹神殿（第7关·场景3）：金白调，圣光与星光
  { name: '· 苍穹神殿', tint: '#1c2a3c', overlayColor: 'rgba(40,60,90,0.20)', particleColor: '#e6f7ff' },
  // 21 城堡前庭（第8关·场景1）：灰石调，旗帜与尘埃
  { name: '· 城堡前庭', tint: '#2e2e38', overlayColor: 'rgba(60,60,75,0.20)', particleColor: '#d8d4c8' },
  // 22 王座回廊（第8关·场景2）：暗紫调，烛火与硝烟
  { name: '· 王座回廊', tint: '#1a1428', overlayColor: 'rgba(50,40,80,0.22)', particleColor: '#c9b3ff' },
  // 23 魔王大殿（第8关·场景3）：血暗调，黑雾与赤红
  { name: '· 魔王大殿', tint: '#2a0a12', overlayColor: 'rgba(90,10,30,0.26)', particleColor: '#ff5a6a' },
]

export class BackgroundAnimator {
  private particles: AnimParticle[] = []
  private frame: number = 0
  private width: number = 960
  private height: number = 540
  private nextSpawn: number = 0
  private lightningTimer: number = 0
  private lightningActive: number = 0
  private sceneIndex: number = 0

  // init 的 levelId 参数保留仅为兼容旧调用；粒子主题已完全由 setTheme(theme) 驱动
  init(_levelId: number, w: number, h: number) {
    this.width = w
    this.height = h
    this.particles = []
    this.frame = 0
    this.nextSpawn = 0
    this.lightningTimer = 0
    this.lightningActive = 0
    this.sceneIndex = 0
    this.seedParticles()
  }

  /** 按子场景索引切换背景粒子主题 */
  setTheme(sceneIndex: number) {
    this.sceneIndex = sceneIndex
    // 清除旧粒子并生成新场景的粒子
    this.particles = []
    this.seedParticles()
  }

  /** 获取当前场景色调（供 GameScene 叠加在背景上） */
  getTint(): string {
    return DEFAULT_THEMES[this.sceneIndex]?.tint ?? ''
  }

  /** 获取当前场景覆盖色 */
  getOverlay(): string {
    return DEFAULT_THEMES[this.sceneIndex]?.overlayColor ?? ''
  }

  /** 获取当前场景主题色 */
  getThemeColor(): string {
    return DEFAULT_THEMES[this.sceneIndex]?.particleColor ?? '#8ef1ff'
  }

  /** 获取当前场景主题名（供场景切换提示） */
  getThemeName(): string {
    return DEFAULT_THEMES[this.sceneIndex]?.name ?? ''
  }

  /** 按主题索引取主题色（供 GameScene 过渡动画使用） */
  static getThemeColorFor(themeIndex: number): string {
    return DEFAULT_THEMES[themeIndex]?.particleColor ?? '#8ef1ff'
  }

  /** 按主题索引取主题名 */
  static getThemeNameFor(themeIndex: number): string {
    return DEFAULT_THEMES[themeIndex]?.name ?? ''
  }

  private seedParticles() {
    const count = 35
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true))
    }
  }

  private createParticle(randomY: boolean): AnimParticle {
    // 粒子类型完全由场景主题(theme)决定，保证每个场景氛围一致
    const r = Math.random()
    switch (this.sceneIndex) {
      case 1: return this.createSwampParticle(r, randomY)      // 沼泽：水汽 / 萤火 / 落叶 / 气泡
      case 2: return this.createForestParticle(r, randomY)     // 巨树：萤火 / 花瓣 / 星光
      case 3: return this.createMoonParticle(r, randomY)       // 月夜：月光尘 / 星光 / 浮尘
      case 4: return this.createDeadParticle(r, randomY)       // 枯木：尘沙 / 枯叶 / 余烬
      case 5: return this.createAltarParticle(r, randomY)      // 祭坛：符文星光 / 星光 / 蓝烟
      case 6:
      case 7:
      case 8: return this.createVolcanoParticle(r, randomY)    // 熔岩：火星 / 烟尘 / 火雨
      case 9:
      case 10:
      case 11: return this.createFrostParticle(r, randomY)     // 冰霜：暴雪 / 冰晶 / 寒气
      case 12:
      case 13:
      case 14: return this.createAbyssParticle(r, randomY)     // 深渊：怨火 / 黑雾 / 虚空星屑
      case 15:
      case 16:
      case 17: return this.createDesertParticle(r, randomY)    // 沙漠：热浪沙尘 / 金尘
      case 18:
      case 19:
      case 20: return this.createSkyParticle(r, randomY)       // 天空：白云 / 星光
      case 21:
      case 22:
      case 23: return this.createCastleParticle(r, randomY)    // 城堡：烛火 / 硝烟 / 尘埃
      default: return this.createGrasslandParticle(r, randomY) // 草原：云 / 落叶 / 花瓣 / 光斑
    }
  }

  /** 沙漠：热浪沙尘 + 金尘 */
  private createDesertParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.5) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.8 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.3 + Math.random() * 0.5),
        life: 260, maxLife: 260,
        size: 1 + Math.random() * 2,
        color: 'rgba(214,158,46,0.8)',
        type: 'dust',
        phase: Math.random() * Math.PI * 2
      }
    }
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height * 0.6 : this.height + 5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.5 + Math.random() * 0.4),
      life: 220, maxLife: 220,
      size: 3 + Math.random() * 3,
      color: 'rgba(255,200,80,0.35)',
      type: 'ember',
      phase: Math.random() * Math.PI * 2
    }
  }

  /** 天空：白云 + 星光 */
  private createSkyParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.6) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.4 : this.height + 5,
        vx: 0.4 + Math.random() * 0.5,
        vy: -(0.1 + Math.random() * 0.1),
        life: 500, maxLife: 500,
        size: 14 + Math.random() * 20,
        color: 'rgba(255,255,255,0.5)',
        type: 'cloud',
        phase: Math.random() * Math.PI * 2
      }
    }
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height * 0.7 : this.height + 5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(0.2 + Math.random() * 0.2),
      life: 200, maxLife: 200,
      size: 2 + Math.random() * 2,
      color: 'rgba(230,250,255,0.9)',
      type: 'sparkle',
      phase: Math.random() * Math.PI * 2
    }
  }

  /** 城堡：烛火 + 硝烟 + 尘埃 */
  private createCastleParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.4) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.7 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.5 + Math.random() * 0.5),
        life: 200, maxLife: 200,
        size: 2 + Math.random() * 2,
        color: 'rgba(255,150,60,0.8)',
        type: 'ember',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.7) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.2),
        life: 320, maxLife: 320,
        size: 6 + Math.random() * 8,
        color: 'rgba(90,80,90,0.4)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    }
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height * 0.8 : this.height + 5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.3 + Math.random() * 0.4),
      life: 240, maxLife: 240,
      size: 1 + Math.random() * 2,
      color: 'rgba(200,180,160,0.6)',
      type: 'dust',
      phase: Math.random() * Math.PI * 2
    }
  }


  /** 沼泽：青灰水汽 + 萤火 + 落叶 + 上浮气泡 */
  private createSwampParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.35) {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.4 + Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.3),
        life: 400, maxLife: 400,
        size: 10 + Math.random() * 14,
        color: 'rgba(150,190,160,0.28)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.6) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.7 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.1 + Math.random() * 0.2),
        life: 260, maxLife: 260,
        size: 1 + Math.random() * 2,
        color: 'rgba(150,255,190,0.9)',
        type: 'firefly',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.85) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.5 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.4 + Math.random() * 0.5),
        life: 300, maxLife: 300,
        size: 2 + Math.random() * 2,
        color: ['#7a9a5a', '#8a7a4a', '#5a8a4a'][Math.floor(Math.random() * 3)] ?? '#7a9a5a',
        type: 'leaf',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: this.height - 20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.5 + Math.random() * 0.6),
        life: 90, maxLife: 90,
        size: 2 + Math.random() * 3,
        color: 'rgba(160,220,180,0.5)',
        type: 'bubble',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  /** 月夜：冷色月光尘 + 星光 + 飘落星屑 */
  private createMoonParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.4) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.8 + Math.random() * 1.2,
        life: 400, maxLife: 400,
        size: 1.5 + Math.random() * 2.5,
        color: '#dbe9ff',
        type: 'snowflake',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.7) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.2 + Math.random() * 0.4,
        life: 350, maxLife: 350,
        size: 1 + Math.random() * 2,
        color: '#cfe0ff',
        type: 'sparkle',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.3 : -5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.1 + Math.random() * 0.2,
        life: 500, maxLife: 500,
        size: 1 + Math.random() * 1.5,
        color: '#e6eeff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  /** 枯木：昏黄尘沙 + 枯叶 + 余烬 */
  private createDeadParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.45) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.2 + Math.random() * 0.3),
        life: 500, maxLife: 500,
        size: 1 + Math.random() * 1.5,
        color: 'rgba(200,170,130,0.4)',
        type: 'dust',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.75) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.5 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 0.5),
        life: 350, maxLife: 350,
        size: 2 + Math.random() * 2,
        color: ['#a07848', '#8a6238', '#c09058'][Math.floor(Math.random() * 3)] ?? '#a07848',
        type: 'leaf',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.3 + Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.4 + Math.random() * 0.6),
        life: 150, maxLife: 150,
        size: 1 + Math.random() * 2,
        color: '#ff9a4a',
        type: 'ember',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  /** 祭坛：幽蓝符文光点 + 星光 + 淡紫雾气 */
  private createAltarParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.5) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.15 + Math.random() * 0.3,
        life: 380, maxLife: 380,
        size: 1 + Math.random() * 2,
        color: '#9aa8ff',
        type: 'sparkle',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.8) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.3 : -5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.05 + Math.random() * 0.15,
        life: 550, maxLife: 550,
        size: 1 + Math.random() * 1,
        color: '#e0e6ff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.5 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.15 + Math.random() * 0.25),
        life: 500, maxLife: 500,
        size: 20 + Math.random() * 30,
        color: 'rgba(160,140,220,0.14)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  private createGrasslandParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.35) {
      const size = 20 + Math.random() * 40
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.4,
        vx: 0.15 + Math.random() * 0.25,
        vy: -0.05 + Math.random() * 0.1,
        life: 600, maxLife: 600,
        size,
        color: 'rgba(255,255,255,0.5)',
        type: 'cloud',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.6) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.3 + Math.random() * 0.5,
        life: 400, maxLife: 400,
        size: 3 + Math.random() * 3,
        color: ['#7ac040', '#a0c050', '#5a9030'][Math.floor(Math.random() * 3)] ?? '#7ac040',
        type: 'leaf',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.85) {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.3 + Math.random() * this.height * 0.4 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.2 + Math.random() * 0.4),
        life: 300, maxLife: 300,
        size: 1 + Math.random() * 2,
        color: 'rgba(255,240,120,0.8)',
        type: 'petal',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.3 : -5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.15 + Math.random() * 0.25,
        life: 500, maxLife: 500,
        size: 2 + Math.random() * 2,
        color: '#ffffaa',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  private createForestParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.35) {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.3),
        life: 500, maxLife: 500,
        size: 2 + Math.random() * 2,
        color: 'rgba(180,120,255,0.9)',
        type: 'firefly',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.55) {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.5,
        vx: 0.1 + Math.random() * 0.2,
        vy: 0,
        life: 800, maxLife: 800,
        size: 30 + Math.random() * 50,
        color: 'rgba(80,60,120,0.12)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.75) {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.05 + Math.random() * 0.1,
        life: 600, maxLife: 600,
        size: 1 + Math.random() * 1,
        color: '#ffffff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.5 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.3 + Math.random() * 0.4),
        life: 400, maxLife: 400,
        size: 3 + Math.random() * 3,
        color: 'rgba(200,160,255,0.7)',
        type: 'petal',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  private createVolcanoParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.35) {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.3 + Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.6 + Math.random() * 1.2),
        life: 120, maxLife: 120,
        size: 1 + Math.random() * 2,
        color: ['#ff4400', '#ff8800', '#ffff00', '#ffaa00'][Math.floor(Math.random() * 4)] ?? '#ff4400',
        type: 'ember',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.6) {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.3 + Math.random() * this.height * 0.5 : this.height + 10,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.3 + Math.random() * 0.5),
        life: 200, maxLife: 200,
        size: 8 + Math.random() * 14,
        color: 'rgba(60,30,20,0.35)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.75) {
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.4 + Math.random() * this.height * 0.4 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.8 + Math.random() * 1.5),
        life: 80, maxLife: 80,
        size: 1,
        color: '#ffff00',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      return {
        x: Math.random() * this.width,
        y: this.height - 20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1,
        life: 40, maxLife: 40,
        size: 4 + Math.random() * 6,
        color: '#ff6600',
        type: 'bubble',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  /** 冰霜：暴雪 / 冰晶 / 寒气冰雾 */
  private createFrostParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.4) {
      // 暴雪（旋转冰晶雪花）
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1 + Math.random() * 1.5,
        life: 400, maxLife: 400,
        size: 2 + Math.random() * 2.5,
        color: '#e8f6ff',
        type: 'snowflake',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.7) {
      // 冰晶闪光
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.15 + Math.random() * 0.35,
        life: 380, maxLife: 380,
        size: 1 + Math.random() * 2,
        color: this.sceneIndex >= 11 ? '#8fd0ff' : '#bfe8ff',
        type: 'sparkle',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      // 寒气冰雾
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.4 + Math.random() * this.height * 0.5 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.15 + Math.random() * 0.25),
        life: 550, maxLife: 550,
        size: 16 + Math.random() * 22,
        color: 'rgba(190,225,255,0.16)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  /** 深渊：怨火 / 黑雾 / 虚空星屑 */
  private createAbyssParticle(r: number, randomY: boolean): AnimParticle {
    if (r < 0.35) {
      // 怨火（上浮暗紫火焰）
      return {
        x: Math.random() * this.width,
        y: randomY ? this.height * 0.3 + Math.random() * this.height * 0.6 : this.height + 5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.5 + Math.random() * 1.0),
        life: 130, maxLife: 130,
        size: 1.5 + Math.random() * 2.5,
        color: this.sceneIndex >= 14 ? ['#ff3a5a', '#ff6a3a', '#c040ff'][Math.floor(Math.random() * 3)] ?? '#ff3a5a' : ['#b06aff', '#e06aff', '#ff5aa0'][Math.floor(Math.random() * 3)] ?? '#b06aff',
        type: 'ember',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.6) {
      // 吞噬黑雾
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.7 : this.height + 10,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.2 + Math.random() * 0.35),
        life: 320, maxLife: 320,
        size: 20 + Math.random() * 30,
        color: 'rgba(40,10,60,0.30)',
        type: 'smoke',
        phase: Math.random() * Math.PI * 2
      }
    } else if (r < 0.85) {
      // 虚空星光
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height * 0.3 : -5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.05 + Math.random() * 0.15,
        life: 550, maxLife: 550,
        size: 1 + Math.random() * 1.5,
        color: this.sceneIndex >= 14 ? '#ff9ab0' : '#c0b0ff',
        type: 'star',
        phase: Math.random() * Math.PI * 2
      }
    } else {
      // 深渊裂隙煞气（上浮暗红）
      return {
        x: Math.random() * this.width,
        y: this.height - 20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.3 + Math.random() * 0.5),
        life: 90, maxLife: 90,
        size: 2 + Math.random() * 3,
        color: this.sceneIndex >= 14 ? 'rgba(255,70,100,0.5)' : 'rgba(180,100,255,0.5)',
        type: 'bubble',
        phase: Math.random() * Math.PI * 2
      }
    }
  }

  update(dt: number) {
    this.frame++
    if (this.lightningActive > 0) this.lightningActive--
    this.lightningTimer++

    // Spawn new particles - 增加密度让背景更活跃
    this.nextSpawn -= dt
    if (this.nextSpawn <= 0) {
      this.nextSpawn = 1 + Math.random() * 2
      const count = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle(false))
      }
    }

    // 熔岩主题：随机闪电闪烁
    if (this.sceneIndex >= 6 && this.lightningTimer > 300 + Math.random() * 400) {
      this.lightningActive = 8
      this.lightningTimer = 0
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.phase += 0.05

      if (p.type === 'cloud') {
        p.x += p.vx
        p.y += Math.sin(p.phase) * 0.3
        p.size *= 1.002
      } else if (p.type === 'leaf') {
        p.x += p.vx + Math.sin(p.phase) * 0.5
        p.y += p.vy
      } else if (p.type === 'firefly') {
        p.x += p.vx + Math.sin(p.phase * 2) * 0.5
        p.y += p.vy + Math.cos(p.phase) * 0.3
      } else if (p.type === 'ember') {
        p.x += p.vx + Math.sin(p.phase) * 0.5
        p.y += p.vy
        p.vy -= 0.01
      } else if (p.type === 'smoke') {
        p.x += p.vx
        p.y += p.vy
        p.size += 0.15
      } else if (p.type === 'petal') {
        p.x += p.vx + Math.sin(p.phase * 1.5) * 0.3
        p.y += p.vy
      } else if (p.type === 'star') {
        p.x += p.vx
        p.y += p.vy
      } else if (p.type === 'bubble') {
        p.x += p.vx
        p.y += p.vy
        p.size += 0.05
      } else if (p.type === 'snowflake') {
        p.x += p.vx + Math.sin(p.phase * 0.8) * 0.6
        p.y += p.vy
      } else if (p.type === 'sparkle') {
        p.x += p.vx + Math.sin(p.phase) * 0.8
        p.y += p.vy + Math.cos(p.phase * 2) * 0.3
      } else if (p.type === 'dust') {
        p.x += p.vx + Math.sin(p.phase) * 0.3
        p.y += p.vy
      } else if (p.type === 'lightning') {
        p.life--
      }

      p.life -= dt

      // Remove dead / off-screen particles
      if (p.life <= 0 || p.x < -60 || p.x > this.width + 60 || p.y < -60 || p.y > this.height + 20) {
        this.particles.splice(i, 1)
      }
    }

    // Keep particle count reasonable - 增加上限
    while (this.particles.length > 120) {
      this.particles.shift()
    }
  }

  drawForeground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Lightning flash for volcano
    if (this.lightningActive > 0) {
      const alpha = this.lightningActive / 8 * 0.3
      ctx.fillStyle = `rgba(255,200,100,${alpha})`
      ctx.fillRect(0, 0, w, h)
    }

    for (const p of this.particles) {
      const alpha = Math.sin(p.phase) * 0.3 + 0.7
      ctx.save()
      ctx.globalAlpha = Math.max(0.2, Math.min(1, alpha))

      if (p.type === 'cloud') {
        ctx.fillStyle = p.color
        const s = p.size
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, s, s * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'leaf') {
        ctx.fillStyle = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.phase)
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      } else if (p.type === 'firefly') {
        const glow = 0.6 + Math.sin(p.phase * 3) * 0.4
        ctx.fillStyle = `rgba(180,120,255,${glow})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#e0b0ff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'ember') {
        const flicker = 0.7 + Math.sin(p.phase * 4) * 0.3
        ctx.fillStyle = p.color
        ctx.globalAlpha *= flicker
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.globalAlpha *= 0.3
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'star') {
        const twinkle = 0.5 + Math.sin(p.phase * 3) * 0.5
        ctx.globalAlpha *= twinkle
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.globalAlpha *= twinkle * 0.3
        ctx.fillRect(p.x - p.size, p.y - 1, p.size * 2, 2)
        ctx.fillRect(p.x - 1, p.y - p.size, 2, p.size * 2)
      } else if (p.type === 'petal') {
        ctx.fillStyle = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.phase * 0.5)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } else if (p.type === 'bubble') {
        const alpha2 = p.life / p.maxLife
        ctx.globalAlpha *= alpha2
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'snowflake') {
        const sway = Math.sin(p.phase * 0.8) * 0.6
        ctx.fillStyle = '#e8f4ff'
        ctx.save()
        ctx.translate(p.x + sway, p.y)
        ctx.rotate(p.phase)
        ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6)
        ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2)
        ctx.restore()
      } else if (p.type === 'sparkle') {
        const twinkle = 0.4 + Math.sin(p.phase * 4) * 0.4
        ctx.globalAlpha *= twinkle
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillRect(p.x - p.size * 2, p.y - 0.5, p.size * 4, 1)
        ctx.fillRect(p.x - 0.5, p.y - p.size * 2, 1, p.size * 4)
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }
}

