<script setup lang="ts">
// ============ 勇者之路风格 Canvas 初始菜单 ============
// 完全用 canvas + 精灵图绘制：背景、Logo、动画英雄、像素按钮
import { ref, onMounted, onUnmounted } from 'vue'
import {
  generateAllUISprites, getUISprite, drawUIButton, draw9Slice, drawUIIcon, drawDecorFrame,
} from '@/game/engine/UISpriteSheetGenerator'
import { generateMenuBackground } from '@/game/engine/BackgroundGenerator'
import { getSpriteSheet } from '@/game/engine/SpriteSheetGenerator'
import { generateAllSpriteSheets } from '@/game/engine/SpriteSheetGenerator'
import { soundEngine } from '@/game/engine/SoundEngine'

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'openMap'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const W = 960, H = 540

// 按钮：x, y, w, h, label, action, style
interface Btn { x: number; y: number; w: number; h: number; label: string; action: 'start' | 'map'; style: 'gold' | 'primary' }
const buttons: Btn[] = [
  { x: W / 2 - 100, y: 340, w: 200, h: 44, label: '▶  开始冒险', action: 'start', style: 'gold' },
  { x: W / 2 - 100, y: 394, w: 200, h: 44, label: '◆  世界地图', action: 'map', style: 'primary' },
]
const hoverBtn = ref<number>(-1)
const pressedBtn = ref<number>(-1)

let rafId = 0
let menuBg: HTMLCanvasElement | null = null
let titleLogo: HTMLCanvasElement | null = null
let panelSprite: ReturnType<typeof getUISprite> | null = null
let heroSheet: ReturnType<typeof getSpriteSheet> | null = null
let textLayer: HTMLCanvasElement | null = null
let frame = 0

// 静态文本离屏缓存：故事简介、操作说明、游戏信息、版本号从不变化，
// 逐帧 fillText 中文既浪费性能，也会在部分环境（无 GPU 的 headless chromium）触发渲染崩溃。
// 一次性绘制到离屏 canvas，render 每帧仅 drawImage。
function buildTextLayer() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const tctx = c.getContext('2d')!

  // 故事简介（小字）
  tctx.font = '13px "Microsoft YaHei", serif'
  tctx.textAlign = 'center'
  tctx.fillStyle = '#e8d0a0'
  tctx.shadowColor = 'rgba(0,0,0,0.9)'
  tctx.shadowBlur = 2
  tctx.fillText('千年前，封印魔王的水晶破碎，黑暗笼罩大地。', W / 2, 290)
  tctx.fillText('少年黎恩从废墟中崛起，踏上寻找水晶碎片的征途……', W / 2, 308)
  tctx.shadowBlur = 0

  // 操作说明（左侧）
  tctx.font = '12px "Microsoft YaHei", serif'
  tctx.textAlign = 'left'
  tctx.fillStyle = '#c9a4ff'
  const controls = [
    { icon: -1, label: 'A / D   移动' },
    { icon: -1, label: 'Space  跳跃 (二段跳)' },
    { icon: -1, label: 'J      普通攻击' },
    { icon: -1, label: 'K / U  技能' },
    { icon: -1, label: 'I      终极技能' },
    { icon: -1, label: '1-4    切换武器' },
    { icon: -1, label: '拾取   路上掉落/宝箱换装' },
    { icon: -1, label: 'Esc    暂停' },
  ]
  controls.forEach((c2, i) => {
    tctx.fillText(c2.label, W / 2 - 270, 350 + i * 18)
  })

  // 右侧：游戏信息
  tctx.textAlign = 'right'
  tctx.fillStyle = '#ffd700'
  tctx.font = 'bold 13px "Microsoft YaHei", serif'
  tctx.fillText('黎恩征途 v3.0', W / 2 + 270, 350)
  tctx.font = '11px "Microsoft YaHei", serif'
  tctx.fillStyle = '#c9a4ff'
  tctx.fillText('— 故事版 —', W / 2 + 270, 368)
  tctx.fillText('勇者之路风格', W / 2 + 270, 384)

  // 版本号
  tctx.textAlign = 'center'
  tctx.font = '10px "Microsoft YaHei", serif'
  tctx.fillStyle = 'rgba(200,160,255,0.6)'
  tctx.fillText('© 黎恩征途 · 仿勇者之路像素 RPG', W / 2, 504)

  textLayer = c
}


// 鼠标事件
function getCanvasPos(e: MouseEvent) {
  const c = canvasRef.value!
  const rect = c.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top) * (H / rect.height),
  }
}

function hitButton(x: number, y: number): number {
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i]!
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i
  }
  return -1
}

function onMouseMove(e: MouseEvent) {
  const p = getCanvasPos(e)
  hoverBtn.value = hitButton(p.x, p.y)
  canvasRef.value!.style.cursor = hoverBtn.value >= 0 ? 'pointer' : 'default'
}

function onMouseDown(e: MouseEvent) {
  const p = getCanvasPos(e)
  pressedBtn.value = hitButton(p.x, p.y)
}

function onMouseUp(e: MouseEvent) {
  const p = getCanvasPos(e)
  const idx = hitButton(p.x, p.y)
  const wasPressed = pressedBtn.value
  pressedBtn.value = -1
  if (idx >= 0 && idx === wasPressed) {
    const b = buttons[idx]!
    soundEngine.resume()
    soundEngine.playButtonClick()
    if (b.action === 'start') emit('start')
    else if (b.action === 'map') emit('openMap')
  }
}

function render() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // 1. 背景
  if (menuBg) ctx.drawImage(menuBg, 0, 0, W, H)

  // 2. 浮动粒子（火光）
  ctx.fillStyle = 'rgba(255,200,100,0.8)'
  for (let i = 0; i < 20; i++) {
    const px = ((i * 137 + frame * 0.5) % W)
    const py = ((i * 73 + frame * 1.2) % H)
    const size = (i % 3) + 1
    ctx.fillRect(px, py, size, size)
  }

  // 3. 中央面板（9-slice）
  if (panelSprite) {
    draw9Slice(ctx, panelSprite, W / 2 - 280, 30, 560, 480, 8)
  }

  // 4. 顶部装饰横条
  drawDecorFrame(ctx, W / 2 - 200, 40, 400)
  drawDecorFrame(ctx, W / 2 - 200, 484, 400)

  // 5. 标题 Logo
  if (titleLogo) {
    const logoY = 70 + Math.sin(frame * 0.03) * 3
    ctx.drawImage(titleLogo, W / 2 - titleLogo.width / 2, logoY)
  }

  // 6. 动画英雄（行走动画）
  if (heroSheet) {
    const FC = heroSheet.frameCount
    const fi = Math.floor(frame / 8) % FC
    const scale = 3
    const heroW = heroSheet.frameWidth * scale
    const heroH = heroSheet.frameHeight * scale
    const heroX = W / 2 - heroW / 2
    const heroY = 200 + Math.abs(Math.sin(frame * 0.08)) * -4
    ctx.drawImage(
      heroSheet.canvas,
      fi * heroSheet.frameWidth, 0, heroSheet.frameWidth, heroSheet.frameHeight,
      heroX, heroY, heroW, heroH
    )
    // 英雄脚下阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(heroX + heroW / 2, heroY + heroH + 2, heroW / 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. 静态文本层（故事简介 / 操作说明 / 游戏信息 / 版本号，一次性缓存绘制）
  if (textLayer) {
    ctx.drawImage(textLayer, 0, 0)
  }

  // 8. 按钮
  buttons.forEach((b, i) => {
    const state = pressedBtn.value === i ? 'pressed' : hoverBtn.value === i ? 'hover' : 'normal'
    drawUIButton(ctx, b.style, b.x, b.y, b.w, b.h, b.label, state)
  })


  frame++
  rafId = requestAnimationFrame(render)
}

onMounted(() => {
  // 初始化精灵
  generateAllSpriteSheets()
  generateAllUISprites()
  menuBg = generateMenuBackground()
  titleLogo = getUISprite('title_logo')?.canvas ?? null
  panelSprite = getUISprite('panel_main') ?? undefined
  heroSheet = getSpriteSheet('player_walk') ?? null
  buildTextLayer()

  const c = canvasRef.value!
  c.width = W
  c.height = H
  c.addEventListener('mousemove', onMouseMove)
  c.addEventListener('mousedown', onMouseDown)
  c.addEventListener('mouseup', onMouseUp)
  c.addEventListener('mouseleave', () => { hoverBtn.value = -1; pressedBtn.value = -1 })

  render()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  const c = canvasRef.value
  if (c) {
    c.removeEventListener('mousemove', onMouseMove)
    c.removeEventListener('mousedown', onMouseDown)
    c.removeEventListener('mouseup', onMouseUp)
  }
})
</script>

<template>
  <canvas ref="canvasRef" class="canvas-menu"></canvas>
</template>

<style scoped>
.canvas-menu {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
