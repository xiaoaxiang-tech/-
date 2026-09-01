import { test, expect } from '@playwright/test'

/**
 * 端到端冒烟测试：菜单 → 剧情 → 关卡加载 → 场景主题渲染。
 *
 * 目的：在真实浏览器中捕获运行时错误（pageerror / console.error），
 * 验证场景主题系统（背景 / 平台 / 粒子 / 过渡动画）在游戏全流程中不抛异常。
 */
test('菜单 → 剧情 → 关卡加载全程无运行时错误', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })

  // 1. 主菜单（canvas 渲染）出现
  const menuCanvas = page.locator('canvas.canvas-menu')
  await expect(menuCanvas).toBeVisible()

  // 2. 点击「▶  开始冒险」按钮（画布逻辑坐标 960×540，按钮中心 480,362）
  const box = (await menuCanvas.boundingBox())!
  await page.mouse.click(box.x + (480 / 960) * box.width, box.y + (362 / 540) * box.height)

  // 3. 剧情对话框出现 → 点击「跳过」直接进入关卡
  const storyDialog = page.locator('.story-dialog')
  await expect(storyDialog).toBeVisible({ timeout: 5000 })
  await storyDialog.locator('.hint.skip').click()

  // 4. 游戏画布出现并持续渲染（覆盖场景主题背景/平台/粒子绘制）
  const gameCanvas = page.locator('canvas.game-canvas')
  await expect(gameCanvas).toBeVisible({ timeout: 5000 })

  // 5. 让游戏稳定运行数秒，期间若主题渲染抛错会进入 errors
  await page.waitForTimeout(2500)

  // 6. 断言全程无运行时错误
  expect(errors).toEqual([])
})

test('世界地图页面可加载且无运行时错误', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })

  const menuCanvas = page.locator('canvas.canvas-menu')
  await expect(menuCanvas).toBeVisible()

  // 点击「◆  世界地图」按钮（中心 480,416）
  const box = (await menuCanvas.boundingBox())!
  await page.mouse.click(box.x + (480 / 960) * box.width, box.y + (416 / 540) * box.height)

  await expect(page.locator('.scroll-map-wrapper')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(800)

  expect(errors).toEqual([])
})
