<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { LEVEL_CONFIGS } from '@/game/scenes/LevelConfigs'

const store = useGameStore()
const props = defineProps<{
  mode: 'intro' | 'outro'  // 关卡前 / 关卡后
  levelId: number
}>()
const emit = defineEmits<{ done: [] }>()

function backToMap() {
  store.setState('worldMap')
}

const level = computed(() => LEVEL_CONFIGS[props.levelId])
const dialogStep = ref(0)
const isTyping = ref(false)
const displayedText = ref('')
const skipRequested = ref(false)

// 当前展示的对话列表
const dialogs = computed(() => {
  if (!level.value) return []
  if (props.mode === 'intro') {
    return [
      { speaker: '旁白', text: level.value.storyIntro },
      ...level.value.bossDialog
    ]
  } else {
    return [
      { speaker: '旁白', text: level.value.storyOutro },
      ...level.value.victoryDialog
    ]
  }
})

const currentDialog = computed(() => dialogs.value[dialogStep.value])

// 打字机效果
let typingTimer: number | null = null
function startTyping(text: string) {
  if (typingTimer) clearInterval(typingTimer)
  displayedText.value = ''
  isTyping.value = true
  skipRequested.value = false
  let i = 0
  typingTimer = window.setInterval(() => {
    if (skipRequested.value) {
      displayedText.value = text
      isTyping.value = false
      if (typingTimer) { clearInterval(typingTimer); typingTimer = null }
      return
    }
    if (i < text.length) {
      displayedText.value += text[i]
      i++
    } else {
      isTyping.value = false
      if (typingTimer) { clearInterval(typingTimer); typingTimer = null }
    }
  }, 30)
}

// 点击/按键推进对话
function advance() {
  if (isTyping.value) {
    skipRequested.value = true
    return
  }
  if (dialogStep.value < dialogs.value.length - 1) {
    dialogStep.value++
    // startTyping 由 watch(dialogStep) 统一触发
  } else {
    // 对话结束
    emit('done')
  }
}

function skip() {
  emit('done')
}

// 监听对话变化
watch(dialogStep, () => {
  if (currentDialog.value) {
    startTyping(currentDialog.value.text)
  }
})

let keydownHandler: ((e: KeyboardEvent) => void) | null = null

onMounted(() => {
  if (currentDialog.value) {
    startTyping(currentDialog.value.text)
  }
  keydownHandler = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
      e.preventDefault()
      advance()
    } else if (e.code === 'Escape') {
      skip()
    }
  }
  window.addEventListener('keydown', keydownHandler)
})

onUnmounted(() => {
  if (typingTimer) { clearInterval(typingTimer); typingTimer = null }
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
})
</script>

<template>
  <div class="story-dialog" @click="advance">
    <!-- 章节标题 -->
    <div class="chapter-banner">
      <div class="chapter-title">{{ level?.storyTitle }}</div>
      <div class="chapter-sub">{{ level?.name }}</div>
    </div>

    <!-- 对话区 -->
    <div class="dialog-area">
      <div class="speaker" :class="{ narrator: currentDialog?.speaker === '旁白' }">
        {{ currentDialog?.speaker }}
      </div>
      <div class="text-box">
        <span class="text">{{ displayedText }}</span>
        <span v-if="isTyping" class="cursor">▌</span>
      </div>
      <div class="hint" v-if="!isTyping">
        <span>点击继续</span>
        <span class="kbd">Space</span>
      </div>
      <div class="dialog-actions">
        <div class="hint skip" @click.stop="skip">
          <span>跳过</span>
          <span class="kbd">Esc</span>
        </div>
        <div class="hint back-map" @click.stop="backToMap">
          <span>🗺 返回地图</span>
        </div>
      </div>
    </div>

    <!-- 关卡进度指示 -->
    <div class="progress-dots">
      <div v-for="(d, i) in dialogs" :key="i"
        :class="['dot', { active: i === dialogStep, done: i < dialogStep }]"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.story-dialog {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10,5,20,0.95), rgba(20,10,30,0.95));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 40px;
  cursor: pointer;
  z-index: 100;
  font-family: 'Microsoft YaHei', serif;
  color: #fff;
}

.chapter-banner {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  animation: bannerFadeIn 0.8s ease-out;
}
@keyframes bannerFadeIn {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.chapter-title {
  font-size: 28px;
  font-weight: bold;
  color: #ffd700;
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(255,215,0,0.6);
  margin-bottom: 8px;
}
.chapter-sub {
  font-size: 16px;
  color: #ccc;
  letter-spacing: 2px;
}

.dialog-area {
  width: 100%;
  max-width: 700px;
  background: linear-gradient(180deg, rgba(30,20,40,0.95), rgba(20,10,30,0.95));
  border: 2px solid #ffd700;
  border-radius: 8px;
  padding: 20px 24px 44px;
  box-shadow: 0 0 24px rgba(255,215,0,0.3), 0 8px 24px rgba(0,0,0,0.5);
  position: relative;
  animation: dialogSlideIn 0.4s ease-out;
}
@keyframes dialogSlideIn {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.speaker {
  font-size: 14px;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.speaker.narrator {
  color: #aaa;
  font-style: italic;
}
.text-box {
  font-size: 15px;
  line-height: 1.7;
  min-height: 60px;
  color: #fff;
  text-shadow: 0 1px 2px #000;
}
.cursor {
  display: inline-block;
  margin-left: 2px;
  color: #ffd700;
  animation: blink 0.6s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.dialog-actions {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}
.hint {
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}
.hint.skip {
  color: #888;
  cursor: pointer;
}
.hint.back-map {
  color: #ffd700;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 14px;
  background: rgba(60,30,10,0.9);
  border: 1px solid #c89020;
  border-radius: 4px;
  transition: all 0.2s;
}
.hint.back-map:hover {
  background: rgba(120,70,30,0.95);
  box-shadow: 0 2px 8px rgba(200,144,32,0.5);
}
.kbd {
  background: rgba(80,60,100,0.8);
  border: 1px solid #888;
  border-radius: 3px;
  padding: 1px 6px;
  color: #ffd700;
  font-family: monospace;
}

.progress-dots {
  position: absolute;
  bottom: 20px;
  display: flex;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(80,60,100,0.6);
  border: 1px solid #888;
  transition: all 0.3s;
}
.dot.active {
  background: #ffd700;
  border-color: #fff;
  box-shadow: 0 0 8px #ffd700;
}
.dot.done {
  background: #4f8;
  border-color: #4f8;
}
</style>
