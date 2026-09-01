<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()

function back() {
  store.setState('worldMap')
}

function selectPet(petId: string) {
  const pet = store.pets.find(p => p.config.id === petId)
  if (!pet || !pet.unlocked) return
  store.setActivePet(petId)
  // 同步给 GameScene 的全局变量
  ;(window as any).__activePetConfig = pet.config
}

function buffLabel(buff: { type: string; value: number }): string {
  const map: Record<string, string> = {
    attack: '攻击', defense: '防御', mp: 'MP上限', hp: 'HP上限', speed: '速度'
  }
  return `+${buff.value} ${map[buff.type] || buff.type}`
}

const activePetId = computed(() => store.activePetId)
</script>

<template>
  <div class="pet-panel">
    <div class="panel-header">
      <button class="back-btn" @click="back">← 返回地图</button>
      <div class="panel-title">🐾 宠物图鉴</div>
      <div class="spacer"></div>
    </div>

    <div class="panel-intro">
      打败 Boss 可获得它的化身作为伙伴，最多可同时携带一只出战。宠物会跟随你攻击敌人，并提供永久属性加成。
    </div>

    <div class="pet-grid">
      <div v-for="pet in store.pets" :key="pet.config.id"
        :class="['pet-card', { locked: !pet.unlocked, active: pet.config.id === activePetId }]"
        @click="pet.unlocked && selectPet(pet.config.id)"
      >
        <div class="pet-avatar" :style="{ background: pet.unlocked ? pet.config.color : '#333' }">
          <span class="pet-icon">{{ pet.unlocked ? pet.config.icon : '❓' }}</span>
        </div>
        <div class="pet-info">
          <div class="pet-name">{{ pet.unlocked ? pet.config.name : '???' }}</div>
          <div class="pet-desc" v-if="pet.unlocked">{{ pet.config.description }}</div>
          <div class="pet-locked" v-else>未解锁 - 击败对应 Boss 解锁</div>

          <template v-if="pet.unlocked">
            <div class="pet-stats">
              <div class="stat-line">
                <span class="stat-label">加成</span>
                <span class="stat-value buff">{{ buffLabel(pet.config.buff) }}</span>
              </div>
              <div class="stat-line">
                <span class="stat-label">技能</span>
                <span class="stat-value">{{ pet.config.skillName }}</span>
              </div>
              <div class="stat-line">
                <span class="stat-label">伤害</span>
                <span class="stat-value">{{ pet.config.attackDamage }}</span>
              </div>
            </div>
            <div class="pet-action">
              <span v-if="pet.config.id === activePetId" class="active-tag">✓ 出战中</span>
              <span v-else class="select-tag">点击出战</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <span>已收集: {{ store.pets.filter(p => p.unlocked).length }} / {{ store.pets.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.pet-panel {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1a0a2a 0%, #2a1a3a 100%);
  color: #fff;
  font-family: 'Microsoft YaHei', serif;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px;
  border-bottom: 2px solid #ffd700;
  margin-bottom: 16px;
}
.back-btn {
  background: rgba(40,20,60,0.8);
  border: 1px solid #ffd700;
  color: #ffd700;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.back-btn:hover { background: rgba(80,50,100,0.9); }
.panel-title {
  font-size: 22px;
  font-weight: bold;
  color: #ffd700;
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(255,215,0,0.5);
}
.spacer { width: 100px; }

.panel-intro {
  text-align: center;
  font-size: 13px;
  color: #ccc;
  margin-bottom: 24px;
  line-height: 1.6;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.pet-card {
  display: flex;
  background: linear-gradient(135deg, rgba(40,20,60,0.9), rgba(20,10,30,0.9));
  border: 2px solid #555;
  border-radius: 8px;
  padding: 16px;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.pet-card:hover:not(.locked) {
  transform: translateY(-2px);
  border-color: #888;
  box-shadow: 0 6px 16px rgba(0,0,0,0.4);
}
.pet-card.locked {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.6);
}
.pet-card.active {
  border-color: #ffd700;
  box-shadow: 0 0 16px rgba(255,215,0,0.5);
}

.pet-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255,255,255,0.3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2);
}
.pet-icon { font-size: 32px; }

.pet-info {
  flex: 1;
  min-width: 0;
}
.pet-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 4px;
}
.pet-desc {
  font-size: 11px;
  color: #bbb;
  line-height: 1.5;
  margin-bottom: 8px;
}
.pet-locked {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

.pet-stats {
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 6px;
}
.stat-line {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin: 2px 0;
}
.stat-label { color: #888; }
.stat-value { color: #fff; }
.stat-value.buff { color: #4f8; font-weight: bold; }

.pet-action {
  text-align: right;
  font-size: 12px;
}
.active-tag {
  color: #ffd700;
  font-weight: bold;
}
.select-tag {
  color: #6a9;
}

.panel-footer {
  text-align: center;
  margin-top: 32px;
  font-size: 13px;
  color: #888;
  letter-spacing: 1px;
}
</style>
