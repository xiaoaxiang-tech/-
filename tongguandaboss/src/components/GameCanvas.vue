<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { GameScene } from '@/game/scenes/GameScene'
import type { GameConfig, KeyState, WeaponType } from '@/game/types'
import { loadImage } from '@/game/engine/AssetLoader'

const store = useGameStore()
const emit = defineEmits<{
  (e: 'fullscreenchange', value: boolean): void
  (e: 'equipchange', info: { name: string; tier: number; equipped: boolean; slot: string }): void
}>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let gameScene: GameScene | null = null
let animFrameId: number = 0
let inputState: KeyState = {
  left: false, right: false, jump: false, attack: false,
  skill1: false, skill2: false, ultimate: false, switchWeapon: false, pause: false,
  directWeapon: -1
}
// 记录上一帧的暂停键状态（用于按键边沿检测）
let lastPauseState = false

const config: GameConfig = {
  width: 1024,
  height: 640,
  gravity: 0.8,
  groundY: 600
}

;(window as any).__gameInput = inputState

function initGame() {
  if (!canvasRef.value) return
  const cvs = canvasRef.value
  cvs.width = config.width
  cvs.height = config.height
  ctx = cvs.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  gameScene = new GameScene(config)
  gameScene.onStateChange = (state) => store.setState(state)
  gameScene.onStatsChange = (stats) => store.updateStats(stats)
  gameScene.onBossHP = (hp, max, name) => store.updateBossHP(hp, max, name)
  gameScene.onWaveChange = (wave, total) => store.setWave(wave, total)
  gameScene.onEquipmentChange = (info) => {
    store.syncEquipmentFromGame()
    emit('equipchange', {
      name: info.name,
      tier: info.tier,
      equipped: info.equipped,
      slot: info.slot,
    })
  }
}

function gameLoop() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, config.width, config.height)

  if (gameScene) {
    // 检测 Esc/P 暂停键的按下边沿，切换暂停/继续
    if (inputState.pause && !lastPauseState &&
        (gameScene.state === 'playing' || gameScene.state === 'paused')) {
      togglePause()
    }
    lastPauseState = inputState.pause

    gameScene.update()
    gameScene.draw(ctx)
  }

  animFrameId = requestAnimationFrame(gameLoop)
}

function onKeyDown(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyA': case 'ArrowLeft': inputState.left = true; break
    case 'KeyD': case 'ArrowRight': inputState.right = true; break
    case 'Space': case 'KeyW': case 'ArrowUp': inputState.jump = true; break
    case 'KeyJ': inputState.attack = true; break
    case 'KeyK': inputState.skill1 = true; break
    case 'KeyU': inputState.skill2 = true; break
    case 'KeyI': inputState.ultimate = true; break
    case 'Tab': inputState.switchWeapon = true; break
    case 'Digit1': inputState.directWeapon = 0; break
    case 'Digit2': inputState.directWeapon = 1; break
    case 'Digit3': inputState.directWeapon = 2; break
    case 'Digit4': inputState.directWeapon = 3; break
    case 'Escape':
      // 全屏模式下 Esc 交给浏览器退出全屏，避免同时误触发暂停
      if (!document.fullscreenElement) inputState.pause = true
      break
    case 'KeyP': inputState.pause = true; break
    case 'KeyF': toggleFullscreen(); break
  }
  e.preventDefault()
}

function onKeyUp(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyA': case 'ArrowLeft': inputState.left = false; break
    case 'KeyD': case 'ArrowRight': inputState.right = false; break
    case 'Space': case 'KeyW': case 'ArrowUp': inputState.jump = false; break
    case 'KeyJ': inputState.attack = false; break
    case 'KeyK': inputState.skill1 = false; break
    case 'KeyU': inputState.skill2 = false; break
    case 'KeyI': inputState.ultimate = false; break
    case 'Tab': inputState.switchWeapon = false; break
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': inputState.directWeapon = -1; break
    case 'Escape': case 'KeyP': inputState.pause = false; break
  }
}

function startLevel(index: number) {
  // 确保装备存档状态已同步到游戏全局（跨关卡/重新进入时应用）
  store.pushEquipmentToGame()
  gameScene?.startLevel(index)
}

// 装备栏手动装备武器 / 护甲
function equipWeapon(type: WeaponType, tier: number) {
  gameScene?.equipWeapon(type, tier)
}
function equipArmor(tier: number) {
  gameScene?.equipArmor(tier)
}

function togglePause() {
  if (!gameScene) return
  if (gameScene.state === 'playing') { gameScene.state = 'paused'; store.setState('paused') }
  else if (gameScene.state === 'paused') { gameScene.state = 'playing'; store.setState('playing') }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  } catch { /* 浏览器不支持或当前手势被拒绝，忽略 */ }
}

function onFsChange() {
  emit('fullscreenchange', !!document.fullscreenElement)
}

function resetInputs() {
  inputState.left = false
  inputState.right = false
  inputState.jump = false
  inputState.attack = false
  inputState.skill1 = false
  inputState.skill2 = false
  inputState.ultimate = false
  inputState.switchWeapon = false
  inputState.pause = false
  inputState.directWeapon = -1
}

// 鼠标点击武器切换（index 0-3）
function selectWeapon(index: number) {
  if (index < 0 || index > 3) return
  inputState.directWeapon = index
  // 立即触发后还原（避免持续高亮导致重复切换）
  setTimeout(() => { inputState.directWeapon = -1 }, 30)
}

defineExpose({ startLevel, togglePause, selectWeapon, toggleFullscreen, equipWeapon, equipArmor })

onMounted(async () => {
  // 加载所有精灵图
  const spriteDir = '/assets/sprites/'
  const sprites = [
    'player_idle', 'player_walk', 'player_jump', 'player_attack',
    'slime', 'skeleton', 'goblin', 'dark_mage', 'armored_knight',
    'dragon_warrior', 'shadow_lord', 'demon_lord',
    'bg_grass', 'bg_night',
    'potion_red', 'potion_blue', 'coin', 'projectile',
    'slash', 'effect_fire', 'effect_ice', 'effect_poison',
    'heart', 'mp_bar', 'stamina_bar', 'crossbow'
  ]
  await Promise.all(sprites.map(name => loadImage(name, spriteDir + name + '.png')))
  initGame()
  gameLoop()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', resetInputs)
  document.addEventListener('fullscreenchange', onFsChange)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', resetInputs)
  document.removeEventListener('fullscreenchange', onFsChange)
})
</script>

<template>
  <canvas ref="canvasRef" class="game-canvas" />
</template>

<style scoped>
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  image-rendering: pixelated;
  border: 2px solid #333;
}
</style>
