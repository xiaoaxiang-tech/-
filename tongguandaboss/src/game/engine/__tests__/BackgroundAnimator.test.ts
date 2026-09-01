import { beforeAll, describe, it, expect } from 'vitest'
import { installCanvasMock } from './helpers/canvasMock'
import { BackgroundAnimator } from '../BackgroundAnimator'

let ctx: CanvasRenderingContext2D

beforeAll(() => {
  ctx = installCanvasMock()
})

describe('BackgroundAnimator 主题系统', () => {
  it('静态辅助方法按主题索引返回正确颜色与名称', () => {
    // 9 个主题索引 0-8
    expect(BackgroundAnimator.getThemeColorFor(0)).toBe('#8ef1ff')
    expect(BackgroundAnimator.getThemeColorFor(3)).toBe('#bcd6ff')
    expect(BackgroundAnimator.getThemeColorFor(8)).toBe('#ff5a30')
    expect(BackgroundAnimator.getThemeNameFor(1)).toContain('沼泽')
    expect(BackgroundAnimator.getThemeNameFor(5)).toContain('祭坛')
    // 越界索引安全回退
    expect(BackgroundAnimator.getThemeColorFor(999)).toBe('#8ef1ff')
    expect(BackgroundAnimator.getThemeNameFor(-1)).toBe('')
  })

  it('setTheme 后各访问器返回对应主题配置', () => {
    const animator = new BackgroundAnimator()
    animator.init(0, 960, 540)
    const themes = [
      { theme: 0, color: '#8ef1ff', name: '晴空草原' },
      { theme: 1, color: '#7dff9e', name: '迷雾沼泽' },
      { theme: 2, color: '#7cff9c', name: '巨树森林' },
      { theme: 3, color: '#bcd6ff', name: '月夜旷野' },
      { theme: 4, color: '#d8b48c', name: '枯木峡谷' },
      { theme: 5, color: '#9aa8ff', name: '银月祭坛' },
      { theme: 6, color: '#ff9440', name: '岩浆前哨' },
      { theme: 7, color: '#ff8a3a', name: '熔岩裂谷' },
      { theme: 8, color: '#ff5a30', name: '火山核心' },
      { theme: 9, color: '#d6f4ff', name: '冰封平原' },
      { theme: 10, color: '#9fd8ff', name: '霜冻洞窟' },
      { theme: 11, color: '#7cc8ff', name: '冰晶王座' },
      { theme: 12, color: '#a080ff', name: '深渊入口' },
      { theme: 13, color: '#c060ff', name: '虚空长廊' },
      { theme: 14, color: '#ff4a6a', name: '深渊王座' },
    ]
    for (const t of themes) {
      animator.setTheme(t.theme)
      expect(animator.getThemeColor()).toBe(t.color)
      expect(animator.getThemeName()).toContain(t.name)
    }
  })

  it('15 个主题都能生成粒子（种子播种与新增粒子均不抛错）', () => {
    const animator = new BackgroundAnimator()
    animator.init(0, 960, 540)
    for (let theme = 0; theme <= 14; theme++) {
      expect(() => animator.setTheme(theme)).not.toThrow()
      // 模拟若干帧更新与前台绘制
      for (let i = 0; i < 10; i++) animator.update(1)
      expect(() => animator.drawForeground(ctx, 960, 540), `主题 ${theme}`).not.toThrow()
    }
  })
})

