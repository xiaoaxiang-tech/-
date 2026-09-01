<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { WEAPON_DATA, WEAPON_ORDER } from '@/game/entities/Weapon'
import { WEAPON_TIER_NAMES, WEAPON_ICONS, WEAPON_DAMAGE, ARMOR_TIERS, tierStars } from '@/game/entities/Equipment'
import type { WeaponType } from '@/game/types'
import { LEVEL_CONFIGS } from '@/game/scenes/LevelConfigs'
import GameCanvas from '@/components/GameCanvas.vue'
import WorldMapView from '@/views/WorldMapView.vue'
import PetPanel from '@/components/PetPanel.vue'
import StoryDialog from '@/components/StoryDialog.vue'
import CanvasMenuView from '@/components/CanvasMenuView.vue'
import { soundEngine } from '@/game/engine/SoundEngine'

const store = useGameStore()
const { isMenu, isWorldMap, isStoryIntro, isPlaying, isPaused, isLevelComplete, isGameOver, isVictory, isPetPanel } = storeToRefs(store)
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)

// 游戏舞台逻辑分辨率（与 GameCanvas/GameScene 保持一致），通过 CSS scale 适配屏幕
const GAME_STAGE_W = 1024
const GAME_STAGE_H = 640
const stageScale = ref(1)
const isFullscreen = ref(false)

const levels = LEVEL_CONFIGS

// 当前是否处于故事过场（intro 或 outro）
const storyMode = ref<'intro' | 'outro'>('intro')
const showStoryDialog = ref(false)

// 刚解锁的宠物弹窗
const showPetUnlock = ref(false)

// ==== 装备系统 UI ====
const showEquipPanel = ref(false)
// 拾取横幅（获得装备提示）
const pickupBanner = ref<{ text: string; color: string; equipped: boolean } | null>(null)
let pickupBannerTimer: ReturnType<typeof setTimeout> | null = null

const hpPercent = computed(() => {
  if (!store.playerStats) return 100
  return Math.max(0, (store.playerStats.hp / store.playerStats.maxHp) * 100)
})
const mpPercent = computed(() => {
  if (!store.playerStats) return 100
  return Math.max(0, (store.playerStats.mp / store.playerStats.maxMp) * 100)
})
const expPercent = computed(() => {
  if (!store.playerStats) return 0
  return Math.max(0, (store.playerStats.exp / store.playerStats.expToNext) * 100)
})
const bossHpPercent = computed(() => {
  if (!store.bossMaxHP) return 0
  return Math.max(0, (store.bossHP / store.bossMaxHP) * 100)
})

const skills = computed(() => store.playerStats?.skillCooldowns)
const weaponIndex = computed(() => WEAPON_ORDER.indexOf(store.playerStats?.currentWeapon || 'sword'))

// ==== 装备系统逻辑 ====
const currentWeaponTier = computed(() => store.playerStats?.weaponTier ?? 0)
const armorTier = computed(() => store.equipment.armorTier)
const armorName = computed(() => {
  const t = store.equipment.armorTier
  if (t < 0) return '未装备护甲'
  return ARMOR_TIERS[t]?.name ?? ''
})
const armorSpecOf = (t: number) => ARMOR_TIERS[t] ?? null

const weaponTierOf = (type: WeaponType) => store.equipment.weaponTiers[type] ?? 0
const ownedTiers = (type: WeaponType) => store.equipment.weaponInventories[type] ?? [0]
const weaponNameOf = (type: WeaponType) => WEAPON_TIER_NAMES[type][weaponTierOf(type)] ?? WEAPON_TIER_NAMES[type][0]!

function openEquipPanel() {
  showEquipPanel.value = true
  if (store.gameState === 'playing') gameCanvasRef.value?.togglePause()
}
function closeEquipPanel() {
  showEquipPanel.value = false
  if (store.gameState === 'paused') gameCanvasRef.value?.togglePause()
}
function toggleEquipPanel() {
  if (showEquipPanel.value) closeEquipPanel()
  else openEquipPanel()
}

function equipWeaponSlot(type: WeaponType, tier: number) {
  if (!ownedTiers(type).includes(tier)) return // 未获得不可装备
  gameCanvasRef.value?.equipWeapon(type, tier)
}
function equipArmorSlot(tier: number) {
  if (!store.equipment.armorInventory.includes(tier)) return
  gameCanvasRef.value?.equipArmor(tier)
}

function onEquipChange(info: { name: string; tier: number; equipped: boolean; slot: string }) {
  if (pickupBannerTimer) clearTimeout(pickupBannerTimer)
  const color = tierColorOf(info.tier)
  pickupBanner.value = {
    text: info.equipped
      ? `✨ 获得 ${info.name}！已替换旧装备 ✨`
      : `📦 获得 ${info.name}（已收藏，可在装备栏查看）`,
    color,
    equipped: info.equipped,
  }
  pickupBannerTimer = setTimeout(() => { pickupBanner.value = null }, 2600)
}

function tierColorOf(tier: number) {
  const colors = ['#b8b8b8', '#6fce6f', '#4fa3ff', '#d27bff', '#ffb13d']
  return colors[Math.max(0, Math.min(colors.length - 1, tier))] ?? '#fff'
}

/** 武器槽阶数辉光（T2+ 显示彩色光晕，越高阶越亮） */
function tierGlowStyle(tier: number) {
  const c = tierColorOf(tier)
  if (tier < 2) return {}
  return {
    borderColor: c,
    boxShadow: `0 0 ${6 + tier * 3}px ${c}66, 0 2px 4px rgba(0,0,0,0.5)`,
  }
}

/** 护甲槽辉光（使用护甲专属色） */
function armorSlotGlowStyle() {
  const t = store.equipment.armorTier
  if (t < 0) return {}
  const c = ARMOR_TIERS[t]?.color ?? '#ffd700'
  if (t < 2) return {}
  return {
    borderColor: c,
    boxShadow: `0 0 ${6 + t * 3}px ${c}66, 0 2px 4px rgba(0,0,0,0.5)`,
  }
}

/** 装备栏格子阶数辉光 */
function tierCellStyle(tier: number, owned: boolean) {
  if (!owned) return {}
  const c = tierColorOf(tier)
  if (tier < 2) return { borderColor: c }
  return { borderColor: c, boxShadow: `0 0 10px ${c}55, inset 0 0 6px ${c}22` }
}

/** 护甲栏格子辉光 */
function armorCellStyle(a: (typeof ARMOR_TIERS)[number]) {
  const owned = store.equipment.armorInventory.includes(a.tier)
  if (!owned) return {}
  if (a.tier < 2) return { borderColor: a.color }
  return { borderColor: a.color, boxShadow: `0 0 10px ${a.color}55, inset 0 0 6px ${a.color}22` }
}

function startGame() {
  store.resetProgress()
  store.setCurrentLevel(0)
  store.setState('storyIntro')
  storyMode.value = 'intro'
  showStoryDialog.value = true
}

function onStoryDone() {
  showStoryDialog.value = false
  if (storyMode.value === 'intro') {
    // 开始关卡
    const activePet = store.activePet
    ;(window as any).__activePetConfig = activePet?.unlocked ? activePet.config : null
    gameCanvasRef.value?.startLevel(store.currentLevel)
  } else {
    // outro 完成，进入下一关 / 胜利
    const next = store.currentLevel + 1
    if (next < LEVEL_CONFIGS.length) {
      store.setCurrentLevel(next)
      storyMode.value = 'intro'
      showStoryDialog.value = true
    } else {
      store.setState('victory')
    }
  }
}

function restartLevel() {
  storyMode.value = 'intro'
  showStoryDialog.value = true
  store.setState('storyIntro')
}

function backToMenu() {
  store.setState('menu')
  store.updateBossHP(0, 0, '')
}
function backToWorldMap() {
  store.setState('worldMap')
  store.updateBossHP(0, 0, '')
}

// 根据窗口尺寸缩放游戏舞台，保持 16:10 比例铺满可视区域（四周留黑边 letterbox）
function updateStageScale() {
  const s = Math.min(window.innerWidth / GAME_STAGE_W, window.innerHeight / GAME_STAGE_H)
  stageScale.value = Math.max(0.2, Math.round(s * 1000) / 1000)
}

function toggleFullscreen() {
  gameCanvasRef.value?.toggleFullscreen()
}

function onFullscreenChange(v: boolean) {
  isFullscreen.value = v
}

watch(isStoryIntro, (v) => {
  if (v) {
    storyMode.value = 'intro'
    showStoryDialog.value = true
  }
})
watch(isLevelComplete, (v) => {
  if (v) {
    storyMode.value = 'outro'
    showStoryDialog.value = true
  }
})

function openWorldMap() {
  store.setState('worldMap')
}

function togglePause() {
  gameCanvasRef.value?.togglePause()
}

function toggleSound() {
  soundEngine.setEnabled(!soundEngine.isEnabled)
}

function toggleMusic() {
  soundEngine.setMusicEnabled(!soundEngine.isMusicEnabled)
}

function selectWeapon(index: number) {
  gameCanvasRef.value?.selectWeapon(index)
}

// 检测 boss 死亡后解锁宠物
let lastBossHP = 0
watch(() => store.bossHP, (hp) => {
  if (lastBossHP > 0 && hp === 0 && store.bossMaxHP > 0) {
    // Boss 刚死亡
    const lv = LEVEL_CONFIGS[store.currentLevel]
    if (lv?.petReward && !store.pets.find(p => p.config.id === lv.petReward!.id)?.unlocked) {
      store.unlockPet(lv.petReward.id)
      showPetUnlock.value = true
    }
  }
  lastBossHP = hp
})

// 监听关卡完成状态：进入 outro（同时处理最终关的 victory 状态，确保存档进度更新）
watch(() => store.gameState, (s) => {
  if (s === 'levelComplete' || s === 'victory') {
    store.completeLevel()
  }
  if (s === 'levelComplete') {
    storyMode.value = 'outro'
    showStoryDialog.value = true
  }
})

function closePetUnlock() {
  const pet = store.newlyUnlockedPet
  if (pet) {
    store.setActivePet(pet.id)
    ;(window as any).__activePetConfig = pet
  }
  showPetUnlock.value = false
  store.clearNewlyUnlocked()
}

function continueAfterVictory() {
  store.setState('worldMap')
}

onMounted(() => {
  store.loadStats()
  updateStageScale()
  window.addEventListener('resize', updateStageScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateStageScale)
})
</script>

<template>
  <div class="game-app">
    <!-- 游戏画布区 -->
    <div class="canvas-wrapper" v-show="!isWorldMap && !isPetPanel"
         ref="canvasWrapperRef" :style="{ transform: 'scale(' + stageScale + ')' }">
      <GameCanvas ref="gameCanvasRef" @fullscreenchange="onFullscreenChange" @equipchange="onEquipChange" />

      <!-- 游戏HUD叠加 -->
      <div v-if="isPlaying || isPaused" class="hud">
        <!-- 顶部栏 -->
        <div class="hud-top">
          <!-- 玩家血条 -->
          <div class="hud-stats">
            <div class="stat-row">
              <span class="stat-icon">❤</span>
              <div class="stat-bar hp-bar">
                <div class="stat-fill hp-fill" :style="{ width: hpPercent + '%' }"></div>
                <span class="stat-text">{{ store.playerStats?.hp ?? 0 }} / {{ store.playerStats?.maxHp ?? 0 }}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-icon">✦</span>
              <div class="stat-bar mp-bar">
                <div class="stat-fill mp-fill" :style="{ width: mpPercent + '%' }"></div>
                <span class="stat-text">{{ store.playerStats?.mp ?? 0 }} / {{ store.playerStats?.maxMp ?? 0 }}</span>
              </div>
            </div>
          </div>

          <!-- 关卡/波数 -->
          <div class="hud-info">
            <div class="level-tag">Lv.{{ store.currentLevel + 1 }} {{ levels[store.currentLevel]?.name }}</div>
            <div class="wave-tag">第 {{ store.currentWave }}/{{ store.totalWaves }} 波</div>
          </div>

          <!-- 宠物 -->
          <div class="hud-pet" v-if="store.activePet?.unlocked">
            <span class="pet-badge" :style="{ background: store.activePet.config.color }">
              {{ store.activePet.config.icon }}
            </span>
          </div>

          <!-- 金币 -->
          <div class="hud-coins">
            <span class="coin-icon">●</span>
            {{ store.playerStats?.coins ?? 0 }}
          </div>
        </div>

        <!-- Boss 血条 -->
        <div v-if="store.bossHP > 0" class="boss-hp-bar">
          <div class="boss-name">{{ store.bossName }}</div>
          <div class="boss-bar-track">
            <div class="boss-bar-fill" :style="{ width: bossHpPercent + '%' }"></div>
            <span class="boss-hp-text">{{ store.bossHP }} / {{ store.bossMaxHP }}</span>
          </div>
        </div>

        <!-- 底部面板 -->
        <div class="hud-bottom">
          <!-- 技能CD -->
          <div class="skills-panel">
            <div class="skill-slot" v-for="s in ['K','U','I']" :key="s">
              <span class="skill-key">{{ s }}</span>
              <div class="skill-cd-bar">
                <div class="skill-cd-fill" :style="{
                  height: s === 'K' ? (skills?.['skill1'] ? (1 - skills['skill1'].current / skills['skill1'].max) * 100 : 0) + '%'
                    : s === 'U' ? (skills?.['skill2'] ? (1 - skills['skill2'].current / skills['skill2'].max) * 100 : 0) + '%'
                    : (skills?.['ultimate'] ? (1 - skills['ultimate'].current / skills['ultimate'].max) * 100 : 0) + '%'
                }"></div>
              </div>
            </div>
          </div>

          <!-- 经验条 -->
          <div class="exp-row">
            <span class="lv-badge">Lv.{{ store.playerStats?.level ?? 1 }}</span>
            <div class="exp-bar">
              <div class="exp-fill" :style="{ width: expPercent + '%' }"></div>
            </div>
            <span class="exp-num">{{ store.playerStats?.exp ?? 0 }}/{{ store.playerStats?.expToNext ?? 0 }}</span>
          </div>
        </div>

        <!-- 武器选择器（右侧垂直紧凑布局，可点击） -->
        <div class="weapon-selector">
          <div class="equip-bar-label">武器</div>
          <div v-for="(w, i) in WEAPON_ORDER" :key="w"
            :class="['weapon-slot', { active: i === weaponIndex }]"
            :style="tierGlowStyle(weaponTierOf(w))"
            :title="`${weaponNameOf(w)} · 伤害 ${WEAPON_DATA[w].damage} → 已强化至 ${weaponTierOf(w) + 1} 阶`"
            @click="selectWeapon(i)">
            <span class="wep-key">{{ i + 1 }}</span>
            <span class="wep-icon">{{ WEAPON_ICONS[w] }}</span>
            <span class="wep-tier" :style="{ color: tierColorOf(weaponTierOf(w)) }">{{ '★'.repeat(Math.max(1, weaponTierOf(w) + 1)) }}</span>
          </div>

          <!-- 护甲槽 -->
          <div class="equip-bar-divider"></div>
          <div class="armor-slot"
            :class="{ active: armorTier >= 0 }"
            :style="armorSlotGlowStyle()"
            :title="armorName + (armorTier >= 0 ? ' · 防御 ' + (armorSpecOf(armorTier)?.defense ?? 0) : ' · 尚未获得护甲')"
            @click="toggleEquipPanel">
            <span class="wep-key">甲</span>
            <span class="wep-icon">{{ armorTier >= 0 ? (armorSpecOf(armorTier)?.icon ?? '🛡') : '🛡' }}</span>
            <span class="wep-tier" v-if="armorTier >= 0" :style="{ color: tierColorOf(armorTier) }">{{ '★'.repeat(armorTier + 1) }}</span>
          </div>

          <!-- 装备栏按钮 -->
          <div class="equip-open-btn" title="打开装备栏 (B)" @click="toggleEquipPanel">⚙</div>
        </div>

        <!-- 拾取装备横幅 -->
        <transition name="banner-pop">
          <div v-if="pickupBanner" class="pickup-banner" :style="{ borderColor: pickupBanner.color, color: pickupBanner.color }">
            {{ pickupBanner.text }}
          </div>
        </transition>

        <!-- 操作提示 -->
        <div class="controls-hint">
          <span class="hint-tag">A/D 移动</span>
          <span class="hint-tag">Space 跳跃</span>
          <span class="hint-tag">J 攻击</span>
          <span class="hint-tag">1-4 选武器</span>
          <span class="hint-tag">⚙ 装备栏</span>
          <span class="hint-tag">Esc 暂停</span>
          <button class="hint-tag sound-btn" @click="toggleSound" :title="soundEngine.isEnabled ? '关闭音效' : '开启音效'">
            {{ soundEngine.isEnabled ? '🔊' : '🔇' }}
          </button>
          <button class="hint-tag sound-btn" @click="toggleMusic" :title="soundEngine.isMusicEnabled ? '关闭音乐' : '开启音乐'">
            {{ soundEngine.isMusicEnabled ? '🎵' : '🎶' }}
          </button>
          <button class="hint-tag sound-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏 (F)' : '全屏 (F)'">
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </button>
        </div>
      </div>

      <!-- 故事过场 -->
      <StoryDialog v-if="showStoryDialog && (isStoryIntro || isLevelComplete)"
        :mode="storyMode"
        :level-id="store.currentLevel"
        @done="onStoryDone"
      />

      <!-- 暂停覆盖 -->
      <div v-if="isPaused && !showEquipPanel" class="overlay pause-overlay">
        <div class="panel ornate-panel">
          <div class="panel-title">暂停</div>
          <button class="btn btn-primary" @click="togglePause">▶ 继续游戏</button>
          <button class="btn btn-secondary" @click="openEquipPanel">⚙ 装备栏</button>
          <button class="btn btn-secondary" @click="restartLevel">↻ 重新开始</button>
          <button class="btn btn-secondary" @click="backToWorldMap">🗺 返回地图</button>
          <button class="btn btn-secondary" @click="backToMenu">返回菜单</button>
        </div>
      </div>

      <!-- 装备栏 -->
      <div v-if="showEquipPanel" class="overlay equip-panel-overlay" @click.self="closeEquipPanel">
        <div class="panel equip-panel">
          <div class="panel-title">⚙ 装备栏</div>
          <div class="equip-panel-sub">路上拾取的装备会自动收藏并替换旧装备；点击已获得的装备即可换上。</div>

          <div class="equip-grid">
            <!-- 武器行 -->
            <div class="equip-row" v-for="w in WEAPON_ORDER" :key="'w' + w">
              <span class="equip-row-label">{{ WEAPON_ICONS[w] }}</span>
              <div class="equip-cells">
                <div v-for="t in 5" :key="t"
                  class="equip-cell"
                  :class="{ owned: ownedTiers(w).includes(t - 1), current: weaponTierOf(w) === t - 1 }"
                  :style="tierCellStyle(t - 1, ownedTiers(w).includes(t - 1))"
                  :title="WEAPON_TIER_NAMES[w][t - 1] + ' · ' + tierStars(t - 1) + ' · 伤害 ' + WEAPON_DAMAGE[w][t - 1]"
                  @click="equipWeaponSlot(w, t - 1)">
                  <span v-if="ownedTiers(w).includes(t - 1)" class="cell-name">{{ WEAPON_TIER_NAMES[w][t - 1] }}</span>
                  <span v-else class="cell-locked">🔒</span>
                  <span class="cell-tier" v-if="ownedTiers(w).includes(t - 1)">{{ tierStars(t - 1) }}</span>
                </div>
              </div>
            </div>
            <!-- 护甲行 -->
            <div class="equip-row" :key="'armor'">
              <span class="equip-row-label">🛡</span>
              <div class="equip-cells">
                <div v-for="a in ARMOR_TIERS" :key="'a' + a.tier"
                  class="equip-cell"
                  :class="{ owned: store.equipment.armorInventory.includes(a.tier), current: armorTier === a.tier }"
                  :style="armorCellStyle(a)"
                  :title="a.name + ' · 防御 ' + a.defense + ' · HP+' + a.hpBonus + ' · 攻击+' + a.attackBonus"
                  @click="equipArmorSlot(a.tier)">
                  <span v-if="store.equipment.armorInventory.includes(a.tier)" class="cell-name">{{ a.icon }} {{ a.name }}</span>
                  <span v-else class="cell-locked">🔒</span>
                </div>
              </div>
            </div>
          </div>

          <div class="equip-tip">
            当前武器：{{ weaponNameOf(WEAPON_ORDER[weaponIndex] ?? 'sword') }} ·
            护甲：{{ armorName }}
          </div>
          <button class="btn btn-primary" @click="closeEquipPanel">关闭</button>
        </div>
      </div>

      <!-- 菜单（勇者之路风格 canvas 渲染）-->
      <div v-if="isMenu" class="overlay canvas-menu-overlay">
        <CanvasMenuView @start="startGame" @openMap="openWorldMap" />
      </div>

      <!-- 过关 -->
      <div v-if="isLevelComplete && !showStoryDialog" class="overlay">
        <div class="panel ornate-panel">
          <div class="panel-title victory-title">★ 关卡通关！★</div>
          <div class="result-text">你击败了 {{ levels[store.currentLevel]?.bossName }}</div>
          <button class="btn btn-primary" @click="onStoryDone">▶ 继续故事</button>
          <button class="btn btn-secondary" @click="backToWorldMap">🗺 返回地图</button>
          <button class="btn btn-secondary" @click="backToMenu">返回菜单</button>
        </div>
      </div>

      <!-- 全部通关 -->
      <div v-if="isVictory" class="overlay">
        <div class="panel ornate-panel">
          <div class="panel-title victory-title">🏆 王者归来！</div>
          <div class="result-text">
            深渊主宰·灭世崩解，五枚水晶碎片重聚合一。<br/>
            光明重临大地，黎恩的传奇永载史册。
          </div>
          <button class="btn btn-primary" @click="continueAfterVictory">🗺 返回世界地图</button>
          <button class="btn btn-secondary" @click="backToMenu">返回菜单</button>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="isGameOver" class="overlay">
        <div class="panel ornate-panel">
          <div class="panel-title gameover-title">☠ 你阵亡了</div>
          <div class="result-text">黑暗暂占上风……但黎恩的征途并未终结。</div>
          <button class="btn btn-primary" @click="restartLevel">↻ 重新挑战</button>
          <button class="btn btn-secondary" @click="backToWorldMap">🗺 返回地图</button>
          <button class="btn btn-secondary" @click="backToMenu">返回菜单</button>
        </div>
      </div>

      <!-- 宠物解锁弹窗 -->
      <div v-if="showPetUnlock && store.newlyUnlockedPet" class="overlay pet-unlock-overlay">
        <div class="pet-unlock-panel">
          <div class="unlock-banner">✨ 新伙伴加入！✨</div>
          <div class="pet-unlock-avatar" :style="{ background: store.newlyUnlockedPet.color }">
            {{ store.newlyUnlockedPet.icon }}
          </div>
          <div class="pet-unlock-name">{{ store.newlyUnlockedPet.name }}</div>
          <div class="pet-unlock-desc">{{ store.newlyUnlockedPet.description }}</div>
          <div class="pet-unlock-skill">
            <span class="skill-label">技能：</span>{{ store.newlyUnlockedPet.skillName }}
          </div>
          <button class="btn btn-primary" @click="closePetUnlock">收为伙伴</button>
        </div>
      </div>
    </div>

    <!-- 世界地图页 -->
    <WorldMapView v-if="isWorldMap" />

    <!-- 宠物面板 -->
    <PetPanel v-if="isPetPanel" />
  </div>
</template>

<style scoped>
/* ===== 基础 ===== */
.game-app {
  width: 100%;
  margin: 0 auto;
  background: #000;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Microsoft YaHei', 'SimHei', serif;
  position: relative;
}

.canvas-wrapper {
  position: relative;
  width: 1024px;
  height: 640px;
  flex: none;
  transform-origin: center center;
  transition: transform 0.15s ease;
}

/* ===== 覆盖层 ===== */
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(6px);
}

.canvas-menu-overlay {
  background: #000;
  backdrop-filter: none;
  padding: 0;
}

.canvas-menu-overlay > * {
  width: 100%;
  height: 100%;
}

.pause-overlay {
  background: rgba(0, 0, 0, 0.6);
}

/* ===== 精致面板（勇者之路风格） ===== */
.panel {
  background: linear-gradient(180deg, #1a0e2e 0%, #2a1648 50%, #1a0a3e 100%);
  border: 3px solid #ffd700;
  border-radius: 6px;
  padding: 30px 40px;
  text-align: center;
  min-width: 380px;
  box-shadow:
    0 0 0 2px #1a0a2a,
    0 0 0 3px #ffd700,
    0 0 30px rgba(255, 215, 0, 0.4),
    inset 0 0 30px rgba(60, 30, 80, 0.4);
  position: relative;
}
/* 装饰角花 */
.ornate-panel::before, .ornate-panel::after {
  content: '❖';
  position: absolute;
  color: #ffd700;
  font-size: 18px;
  text-shadow: 0 0 6px rgba(255,215,0,0.6);
}
.ornate-panel::before { top: 8px; left: 12px; }
.ornate-panel::after { top: 8px; right: 12px; }

.menu-panel {
  min-width: 540px;
  max-height: 92vh;
  overflow-y: auto;
  padding: 36px 50px;
}

.menu-deco-top, .menu-deco-bottom {
  color: #ffd700;
  font-size: 14px;
  letter-spacing: 8px;
  margin: 8px 0 18px;
  text-shadow: 0 0 8px rgba(255,215,0,0.6);
}
.menu-deco-bottom { margin: 18px 0 8px; }

.panel-title {
  font-size: 26px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255,215,0,0.7), 2px 2px 0 #4a2800;
  margin-bottom: 20px;
  letter-spacing: 3px;
}

.victory-title {
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255,215,0,0.8), 2px 2px 0 #aa4400;
}

.gameover-title {
  color: #ff4444;
  text-shadow: 0 0 10px rgba(255,80,80,0.7), 2px 2px 0 #660000;
}

.result-text {
  color: #ccc;
  margin: 10px 0 20px;
  font-size: 13px;
  line-height: 1.6;
}

/* ===== 标题 ===== */
.game-title {
  font-size: 36px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 16px rgba(255,215,0,0.6), 3px 3px 0 #4a2800;
  margin-bottom: 6px;
  letter-spacing: 6px;
}

.game-subtitle {
  color: #c9a4ff;
  font-size: 14px;
  margin-bottom: 18px;
  letter-spacing: 3px;
  text-shadow: 0 0 6px rgba(180,140,255,0.5);
}

.title-deco {
  color: #ff8800;
  font-size: 28px;
  margin: 0 6px;
  text-shadow: 0 0 8px rgba(255,136,0,0.7);
}

.story-prologue {
  color: #aaa;
  font-size: 13px;
  line-height: 1.8;
  padding: 12px 18px;
  margin-bottom: 24px;
  background: rgba(0,0,0,0.3);
  border-left: 3px solid #ffd700;
  border-right: 3px solid #ffd700;
  text-align: center;
  font-style: italic;
}

/* ===== 按钮 ===== */
.btn {
  display: block;
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  background: linear-gradient(180deg, #3a2a6a 0%, #2a1a4a 100%);
  color: #ddeeff;
  border: 2px solid #6a5aaa;
  border-radius: 4px;
  font-family: 'Microsoft YaHei', serif;
  font-size: 14px;
  cursor: pointer;
  letter-spacing: 2px;
  transition: all 0.15s;
}
.btn:hover {
  background: linear-gradient(180deg, #4a3a8a 0%, #3a2a6a 100%);
  border-color: #9a8add;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(120,90,180,0.4);
}
.btn:active {
  transform: translateY(0);
}
.btn-primary {
  background: linear-gradient(180deg, #d83a00 0%, #8a2000 100%);
  border-color: #ff7a33;
  color: #ffe0cc;
  font-size: 15px;
}
.btn-primary:hover {
  background: linear-gradient(180deg, #f84a10 0%, #aa3000 100%);
  border-color: #ffaa66;
  box-shadow: 0 4px 14px rgba(255,120,50,0.5);
}
.btn-large {
  padding: 14px 24px;
  font-size: 16px;
}
.btn-secondary {
  background: linear-gradient(180deg, #2a2a3a 0%, #1a1a2a 100%);
  border-color: #555;
  font-size: 13px;
}

/* ===== 控制说明 ===== */
.controls-info {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #3a2a5a;
  text-align: left;
}
.info-title {
  color: #ffd700;
  font-size: 14px;
  margin-bottom: 12px;
  letter-spacing: 2px;
  text-align: center;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 18px;
  font-size: 12px;
}
.info-grid div {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  color: #8899aa;
  border-bottom: 1px dashed #2a1a3a;
}
.kbd {
  background: rgba(80,60,120,0.6);
  border: 1px solid #6a5aaa;
  border-radius: 3px;
  padding: 1px 8px;
  color: #ffd700;
  font-family: monospace;
  min-width: 50px;
  text-align: center;
}
.footer-text {
  margin-top: 18px;
  color: #6a5a8a;
  font-size: 11px;
  letter-spacing: 2px;
}

/* ===== HUD ===== */
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: 12px;
  color: #fff;
}

.hud-top {
  display: flex;
  align-items: flex-start;
  padding: 10px 14px;
  gap: 12px;
}
.hud-stats {
  flex: 1;
}
.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.stat-icon {
  font-size: 14px;
  text-shadow: 0 0 4px rgba(255,80,80,0.6);
}
.stat-row:nth-child(2) .stat-icon {
  color: #6acfff;
  text-shadow: 0 0 4px rgba(100,200,255,0.6);
}
.stat-bar {
  position: relative;
  width: 200px;
  height: 18px;
  border: 2px solid #3a2a4a;
  background: #1a0e2a;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4);
}
.stat-fill {
  height: 100%;
  transition: width 0.25s;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.2);
}
.hp-fill {
  background: linear-gradient(180deg, #ff5a5a 0%, #cc2222 50%, #881111 100%);
}
.mp-fill {
  background: linear-gradient(180deg, #5acfff 0%, #2266cc 50%, #114488 100%);
}
.stat-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
  letter-spacing: 1px;
}

.hud-info {
  text-align: right;
}
.level-tag {
  color: #ffd700;
  font-size: 14px;
  text-shadow: 0 0 4px rgba(255,215,0,0.5);
  letter-spacing: 1px;
}
.wave-tag {
  color: #aaccff;
  font-size: 11px;
  margin-top: 3px;
}

.hud-pet {
  display: flex;
  align-items: center;
}
.pet-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid #fff;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
  animation: petBob 1.5s ease-in-out infinite;
}
@keyframes petBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.hud-coins {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 1px 1px 0 #000, 0 0 6px rgba(255,215,0,0.4);
  min-width: 60px;
  text-align: right;
}
.coin-icon {
  color: #ffd700;
}

/* ===== Boss 血条 ===== */
.boss-hp-bar {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}
.boss-name {
  color: #ff4444;
  font-size: 15px;
  margin-bottom: 4px;
  text-shadow: 0 0 8px rgba(255,80,80,0.7), 1px 1px 0 #000;
  letter-spacing: 2px;
}
.boss-bar-track {
  position: relative;
  width: 440px;
  height: 16px;
  border: 2px solid #800;
  background: #200;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(255,50,50,0.5), inset 0 1px 2px rgba(0,0,0,0.6);
}
.boss-bar-fill {
  height: 100%;
  background: linear-gradient(180deg, #ff5a5a 0%, #cc2222 50%, #660000 100%);
  transition: width 0.3s;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.2);
}
.boss-hp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
}

/* ===== 底部面板 ===== */
.hud-bottom {
  position: absolute;
  bottom: 36px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
}

.skills-panel {
  display: flex;
  gap: 6px;
}
.skill-slot {
  width: 32px;
  height: 32px;
  border: 2px solid #4a3a6a;
  background: linear-gradient(180deg, #2a1a3a, #1a0e2a);
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.skill-key {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #ffd700;
  z-index: 2;
  font-weight: bold;
  text-shadow: 1px 1px 0 #000;
}
.skill-cd-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background: rgba(0,0,0,0.6);
}
.skill-cd-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(80,60,180,0.5);
  transition: height 0.1s;
}

.weapon-selector {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 5px;
  pointer-events: auto;
}
.weapon-slot {
  width: 36px;
  height: 36px;
  border: 2px solid #4a3a6a;
  background: linear-gradient(180deg, rgba(40,24,60,0.85), rgba(20,10,30,0.85));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.15s;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.weapon-slot:hover {
  border-color: #8a7add;
  background: linear-gradient(180deg, rgba(60,40,90,0.95), rgba(40,20,60,0.95));
  transform: scale(1.08);
}
.weapon-slot.active {
  border-color: #ffd700;
  background: linear-gradient(180deg, rgba(80,50,20,0.95), rgba(50,30,10,0.95));
  box-shadow: 0 0 12px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.5);
  transform: scale(1.15);
}
.wep-key {
  position: absolute;
  top: 1px;
  left: 3px;
  font-size: 8px;
  color: #889;
  line-height: 1;
}
.weapon-slot.active .wep-key {
  color: #ffd700;
}
.wep-icon {
  font-size: 18px;
  color: #aaa;
  line-height: 1;
}
.weapon-slot.active .wep-icon {
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255,215,0,0.6);
}
.wep-tier {
  font-size: 6px;
  line-height: 1;
  color: #b8b8b8;
  letter-spacing: -0.5px;
  text-shadow: 0 0 3px currentColor;
}
.weapon-slot.active .wep-tier {
  color: #ffd700;
}

/* ===== 装备栏 HUD ===== */
.equip-bar-label {
  font-size: 8px;
  color: #889;
  text-align: center;
  letter-spacing: 2px;
  padding: 1px 0;
}
.equip-bar-divider {
  width: 80%;
  height: 1px;
  margin: 2px auto;
  background: rgba(120,100,160,0.5);
}
.armor-slot {
  width: 36px;
  height: 36px;
  border: 2px solid #4a3a6a;
  background: linear-gradient(180deg, rgba(40,24,60,0.85), rgba(20,10,30,0.85));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.15s;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.armor-slot:hover {
  border-color: #8a7add;
  transform: scale(1.08);
}
.armor-slot.active {
  border-color: #ffd700;
  background: linear-gradient(180deg, rgba(60,40,20,0.95), rgba(40,20,10,0.95));
  box-shadow: 0 0 12px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.5);
}
.equip-open-btn {
  width: 36px;
  height: 26px;
  border: 2px dashed #5a4a7a;
  background: rgba(20,10,30,0.7);
  color: #9a8add;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  user-select: none;
}
.equip-open-btn:hover {
  border-color: #ffd700;
  color: #ffd700;
  transform: scale(1.08);
}

/* ===== 拾取装备横幅 ===== */
.pickup-banner {
  position: absolute;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 5, 25, 0.92);
  border: 2px solid #ffd700;
  border-radius: 6px;
  padding: 8px 22px;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 0 8px currentColor;
  box-shadow: 0 0 24px rgba(0,0,0,0.6), 0 0 12px rgba(255,215,0,0.35);
  z-index: 30;
  white-space: nowrap;
  pointer-events: none;
}
.banner-pop-enter-active, .banner-pop-leave-active {
  transition: all 0.3s ease;
}
.banner-pop-enter-from, .banner-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-14px) scale(0.9);
}

/* ===== 装备面板 ===== */
.equip-panel-overlay {
  background: rgba(0, 0, 0, 0.72);
  z-index: 50;
}
.equip-panel {
  min-width: 660px;
  padding: 22px 28px;
}
.equip-panel-sub {
  color: #9a8abb;
  font-size: 11px;
  margin-bottom: 16px;
}
.equip-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.equip-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.equip-row-label {
  width: 28px;
  font-size: 16px;
  color: #ffd700;
  text-align: center;
  flex: none;
}
.equip-cells {
  display: flex;
  gap: 6px;
  flex: 1;
}
.equip-cell {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 2px solid #3a2a4a;
  background: rgba(20, 10, 30, 0.7);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: default;
  transition: all 0.15s;
  overflow: hidden;
}
.equip-cell.owned {
  cursor: pointer;
}
.equip-cell.owned:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 10px rgba(255,215,0,0.25);
}
.equip-cell.current {
  background: linear-gradient(180deg, rgba(80,50,20,0.9), rgba(50,30,10,0.9));
  box-shadow: 0 0 12px rgba(255,215,0,0.5);
}
.cell-name {
  font-size: 10px;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 2px;
}
.equip-cell.current .cell-name {
  color: #ffd700;
}
.cell-tier {
  font-size: 7px;
  letter-spacing: -0.5px;
  line-height: 1;
}
.cell-locked {
  font-size: 13px;
  color: #555;
}
.equip-tip {
  color: #9a8abb;
  font-size: 11px;
  margin-bottom: 14px;
  padding: 6px 10px;
  background: rgba(80,60,160,0.15);
  border: 1px solid #5a4a8a;
  border-radius: 4px;
}

.exp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #aaa;
  white-space: nowrap;
}
.lv-badge {
  background: rgba(255,136,0,0.3);
  border: 1px solid #ff8800;
  border-radius: 3px;
  padding: 1px 6px;
  color: #ffc88a;
  font-weight: bold;
  font-size: 11px;
}
.exp-bar {
  width: 100px;
  height: 10px;
  border: 1px solid #4a3a1a;
  background: #1a0e2a;
  border-radius: 2px;
  overflow: hidden;
}
.exp-fill {
  height: 100%;
  background: linear-gradient(180deg, #ffaa44 0%, #ff8800 100%);
  transition: width 0.3s;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.3);
}
.exp-num {
  color: #888;
  font-size: 9px;
}

.controls-hint {
  position: absolute;
  bottom: 6px;
  right: 12px;
  display: flex;
  gap: 6px;
}
.hint-tag {
  font-size: 9px;
  color: #888;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 5px;
  border: 1px solid #3a2a4a;
  border-radius: 2px;
}
.sound-btn {
  pointer-events: auto;
  cursor: pointer;
  border: 1px solid #5a4a6a;
  transition: all 0.15s;
}
.sound-btn:hover {
  background: rgba(80,60,120,0.8);
  color: #ffd700;
}

/* ===== 宠物解锁弹窗 ===== */
.pet-unlock-overlay {
  background: rgba(0,0,0,0.85);
  z-index: 200;  /* 需高于过场对话(100)，否则会被遮挡 */
}
.pet-unlock-panel {
  background: linear-gradient(180deg, #1a0e2e 0%, #2a1648 50%, #1a0a3e 100%);
  border: 3px solid #ffd700;
  border-radius: 12px;
  padding: 30px 40px;
  text-align: center;
  min-width: 340px;
  box-shadow: 0 0 40px rgba(255,215,0,0.6), inset 0 0 30px rgba(60,30,80,0.4);
  position: relative;
}
.unlock-banner {
  font-size: 18px;
  color: #ffd700;
  letter-spacing: 3px;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255,215,0,0.8);
  animation: bannerPulse 1.5s ease-in-out infinite;
}
@keyframes bannerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.pet-unlock-avatar {
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  border: 4px solid #fff;
  box-shadow: 0 0 24px rgba(255,255,255,0.7), inset 0 2px 6px rgba(255,255,255,0.3);
  animation: avatarFloat 2s ease-in-out infinite;
}
@keyframes avatarFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.pet-unlock-name {
  font-size: 20px;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 0 0 8px rgba(255,215,0,0.6);
}
.pet-unlock-desc {
  color: #ccc;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 12px;
  padding: 0 20px;
}
.pet-unlock-skill {
  color: #aaccff;
  font-size: 13px;
  margin-bottom: 20px;
  padding: 6px 12px;
  background: rgba(80,60,180,0.2);
  border: 1px solid #6a5aaa;
  border-radius: 4px;
  display: inline-block;
}
.skill-label {
  color: #ffd700;
  font-weight: bold;
}
</style>
