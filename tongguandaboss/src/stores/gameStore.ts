import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { GameState, PlayerStats, Pet, PetConfig, WeaponType } from "@/game/types";
import { ALL_PETS, LEVEL_CONFIGS } from "@/game/scenes/LevelConfigs";

export interface EquipSaveState {
  weaponTiers: Record<WeaponType, number>;
  weaponInventories: Record<WeaponType, number[]>;
  armorTier: number;
  armorInventory: number[];
}

const WEAPON_TYPES: WeaponType[] = ["sword", "spear", "bow", "gun"];

export const defaultEquipment = (): EquipSaveState => ({
  weaponTiers: { sword: 0, spear: 0, bow: 0, gun: 0 },
  weaponInventories: { sword: [0], spear: [0], bow: [0], gun: [0] },
  armorTier: -1,
  armorInventory: [],
});

export const useGameStore = defineStore("game", () => {
  const gameState = ref<GameState>("menu");
  const playerStats = ref<PlayerStats | null>(null);
  const currentLevel = ref(0);
  const currentWave = ref(0);
  const totalWaves = ref(0);
  const unlockedLevels = ref(0);
  const highScore = ref(0);
  const bossHP = ref(0);
  const bossMaxHP = ref(0);
  const bossName = ref("");

  // === 宠物系统 ===
  const pets = ref<Pet[]>(
    ALL_PETS.map((c) => ({ config: c, unlocked: false, active: false, level: 1 })),
  );
  const activePetId = ref<string | null>(null);

  // === 故事进度 ===
  const storyProgress = ref<number>(0); // 已观看的故事章节
  const newlyUnlockedPet = ref<PetConfig | null>(null); // 刚解锁的宠物（用于弹窗）

  // === 装备系统 ===
  const equipment = ref<EquipSaveState>(defaultEquipment());

  const isMenu = computed(() => gameState.value === "menu");
  const isWorldMap = computed(() => gameState.value === "worldMap");
  const isStoryIntro = computed(() => gameState.value === "storyIntro");
  const isPlaying = computed(() => gameState.value === "playing");
  const isPaused = computed(() => gameState.value === "paused");
  const isLevelComplete = computed(() => gameState.value === "levelComplete");
  const isGameOver = computed(() => gameState.value === "gameOver");
  const isVictory = computed(() => gameState.value === "victory");
  const isPetPanel = computed(() => gameState.value === "petPanel");

  const activePet = computed(() => pets.value.find((p) => p.active));

  function setState(state: GameState) {
    gameState.value = state;
  }
  function setCurrentLevel(lv: number) {
    currentLevel.value = lv;
  }
  function setWave(w: number, t: number) {
    currentWave.value = w;
    totalWaves.value = t;
  }
  function updateStats(s: PlayerStats) {
    playerStats.value = s;
  }
  function updateBossHP(hp: number, maxHp: number, name: string) {
    bossHP.value = hp;
    bossMaxHP.value = maxHp;
    bossName.value = name;
  }

  // === 宠物操作 ===
  function unlockPet(petId: string) {
    const pet = pets.value.find((p) => p.config.id === petId);
    if (pet && !pet.unlocked) {
      pet.unlocked = true;
      newlyUnlockedPet.value = pet.config;
      // 自动激活第一个解锁的宠物
      if (!activePetId.value) {
        pet.active = true;
        activePetId.value = petId;
      }
      // 播放宠物解锁音效
      import("../game/engine/SoundEngine").then(({ soundEngine }) => {
        soundEngine.resume();
        soundEngine.playPetUnlock();
      });
    }
  }

  function setActivePet(petId: string) {
    pets.value.forEach((p) => {
      p.active = p.config.id === petId;
    });
    activePetId.value = petId;
  }

  function clearNewlyUnlocked() {
    newlyUnlockedPet.value = null;
  }

  function getActivePetBuff() {
    const pet = activePet.value;
    if (!pet || !pet.unlocked) return null;
    return { ...pet.config.buff, level: pet.level };
  }

  // === 装备同步 ===
  /** 从游戏全局状态读取最新装备进度（拾取/切换后调用） */
  function syncEquipmentFromGame() {
    const es = (window as any).__equipState as EquipSaveState | undefined;
    if (!es) return;
    equipment.value = normalizeEquipState(es);
    (window as any).__equipState = equipment.value;
  }

  /** 将当前装备进度写入游戏全局（加载存档/重置后调用） */
  function pushEquipmentToGame() {
    (window as any).__equipState = equipment.value;
  }

  function normalizeEquipState(es: Partial<EquipSaveState> | undefined | null): EquipSaveState {
    const def = defaultEquipment();
    const weaponTiers: Record<WeaponType, number> = { ...def.weaponTiers };
    const weaponInventories: Record<WeaponType, number[]> = { sword: [0], spear: [0], bow: [0], gun: [0] };
    for (const t of WEAPON_TYPES) {
      if (typeof es?.weaponTiers?.[t] === "number") {
        weaponTiers[t] = Math.max(0, Math.min(4, es.weaponTiers[t]!));
      }
      const arr = Array.isArray(es?.weaponInventories?.[t]) ? es.weaponInventories[t]! : [];
      weaponInventories[t] = Array.from(new Set([0, ...arr.map((n: number) => Math.max(0, Math.min(4, n)))]));
    }
    const armorTier = typeof es?.armorTier === "number" ? Math.min(4, Math.max(-1, es.armorTier)) : -1;
    const armorInventory = Array.isArray(es?.armorInventory)
      ? Array.from(new Set(es.armorInventory.map((n: number) => Math.max(0, Math.min(4, n)))))
      : [];
    return { weaponTiers, weaponInventories, armorTier, armorInventory };
  }

  /** 手动装备武器（同步到游戏与存档） */
  function equipWeapon(type: WeaponType, tier: number) {
    equipment.value.weaponTiers[type] = Math.max(0, Math.min(4, tier));
    const inv = equipment.value.weaponInventories[type] ?? [];
    if (!inv.includes(equipment.value.weaponTiers[type]!)) inv.push(equipment.value.weaponTiers[type]!);
    equipment.value.weaponInventories[type] = inv;
    pushEquipmentToGame();
  }

  /** 手动装备护甲 */
  function equipArmor(tier: number) {
    equipment.value.armorTier = Math.max(0, Math.min(4, tier));
    if (!equipment.value.armorInventory.includes(equipment.value.armorTier!)) {
      equipment.value.armorInventory.push(equipment.value.armorTier!);
    }
    pushEquipmentToGame();
  }

  // === 存档 ===
  function saveStats() {
    const data = {
      unlockedLevels: unlockedLevels.value,
      highScore: highScore.value,
      storyProgress: storyProgress.value,
      pets: pets.value.map((p) => ({ id: p.config.id, unlocked: p.unlocked, level: p.level })),
      activePetId: activePetId.value,
      equipment: equipment.value,
    };
    localStorage.setItem("tb_save", JSON.stringify(data));
  }
  function loadStats() {
    try {
      const raw = localStorage.getItem("tb_save");
      if (raw) {
        const d = JSON.parse(raw);
        unlockedLevels.value = d.unlockedLevels ?? 0;
        highScore.value = d.highScore ?? 0;
        storyProgress.value = d.storyProgress ?? 0;
        if (d.pets) {
          d.pets.forEach((saved: { id: string; unlocked: boolean; level: number }) => {
            const pet = pets.value.find((p) => p.config.id === saved.id);
            if (pet) {
              pet.unlocked = saved.unlocked;
              pet.level = saved.level ?? 1;
            }
          });
        }
        if (d.activePetId) {
          setActivePet(d.activePetId);
        }
        if (d.equipment) {
          equipment.value = normalizeEquipState(d.equipment);
        }
        // 确保装备进度写入游戏全局（供关卡加载时应用）
        pushEquipmentToGame();
      }
    } catch {
      /* ignore */
    }
  }

  function completeLevel() {
    const nextId = currentLevel.value + 1;
    if (nextId > unlockedLevels.value) {
      unlockedLevels.value = Math.min(LEVEL_CONFIGS.length - 1, nextId);
    }
    if (currentLevel.value >= storyProgress.value) {
      storyProgress.value = currentLevel.value + 1;
    }
    saveStats();
  }

  function resetProgress() {
    unlockedLevels.value = 0;
    storyProgress.value = 0;
    pets.value.forEach((p) => {
      p.unlocked = false;
      p.active = false;
      p.level = 1;
    });
    activePetId.value = null;
    // 重置装备进度
    equipment.value = defaultEquipment();
    pushEquipmentToGame();
    saveStats();
  }

  return {
    gameState,
    playerStats,
    currentLevel,
    currentWave,
    totalWaves,
    unlockedLevels,
    highScore,
    bossHP,
    bossMaxHP,
    bossName,
    pets,
    activePetId,
    activePet,
    newlyUnlockedPet,
    storyProgress,
    equipment,
    isMenu,
    isWorldMap,
    isStoryIntro,
    isPlaying,
    isPaused,
    isLevelComplete,
    isGameOver,
    isVictory,
    isPetPanel,
    setState,
    setCurrentLevel,
    setWave,
    updateStats,
    updateBossHP,
    saveStats,
    loadStats,
    completeLevel,
    resetProgress,
    unlockPet,
    setActivePet,
    clearNewlyUnlocked,
    getActivePetBuff,
    syncEquipmentFromGame,
    pushEquipmentToGame,
    equipWeapon,
    equipArmor,
  };
});
