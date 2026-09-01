import { beforeAll, describe, expect, it } from 'vitest'
import { installCanvasMock } from './helpers/canvasMock'

let AssetLoader: typeof import('../AssetLoader')
let BackgroundGenerator: typeof import('../BackgroundGenerator')
let ctx: CanvasRenderingContext2D

beforeAll(async () => {
  ctx = installCanvasMock()
  // 动态 import：保证模块顶层（生成全部精灵/背景）在 mock 就绪后执行
  AssetLoader = await import('../AssetLoader')
  BackgroundGenerator = await import('../BackgroundGenerator')
})


describe('9+6 主题背景生成完整性', () => {
  it('generateAllBackgrounds 注册全部主题，且每个主题含完整层级与地面绘制', () => {
    BackgroundGenerator.generateAllBackgrounds()
    for (let theme = 0; theme <= 8; theme++) {
      const bg = BackgroundGenerator.getBackground(theme)
      expect(bg, `主题 ${theme} 背景应存在`).toBeDefined()
      expect(bg!.layers.length, `主题 ${theme} 应含多层视差背景`).toBeGreaterThanOrEqual(3)
      expect(typeof bg!.groundDetail).toBe('function')
      expect(bg!.groundColor).toBeTruthy()
      expect(bg!.sky.colorTop).toBeTruthy()
      expect(bg!.sky.colorBottom).toBeTruthy()
    }
  })

  it('超出主题范围的索引安全返回 undefined（drawBackground 走回退）', () => {
    BackgroundGenerator.generateAllBackgrounds()
    expect(BackgroundGenerator.getBackground(99)).toBeUndefined()
  })
})

describe('drawBackground 各主题渲染', () => {
  it('0-14 主题渲染背景均不抛错（9-14 走主题色回退）', () => {
    for (let theme = 0; theme <= 14; theme++) {
      expect(() => AssetLoader.drawBackground(ctx, theme, 0, 960, 540), `主题 ${theme}`).not.toThrow()
      expect(() => AssetLoader.drawBackground(ctx, theme, 300, 960, 540), `主题 ${theme} 滚动`).not.toThrow()
    }
  })
})

describe('drawPlatform 各主题渲染', () => {
  it('ground 类型各主题渲染不抛错', () => {
    for (let theme = 0; theme <= 14; theme++) {
      expect(() => AssetLoader.drawPlatform(ctx, 0, 400, 960, 140, 'ground', theme), `主题 ${theme}`).not.toThrow()
    }
  })

  it('platform 类型各主题渲染不抛错（木/苔藓/朽木/石板/熔岩/冰晶/深渊材质）', () => {
    for (let theme = 0; theme <= 14; theme++) {
      expect(() => AssetLoader.drawPlatform(ctx, 100, 300, 200, 16, 'platform', theme), `主题 ${theme}`).not.toThrow()
    }
  })
})
