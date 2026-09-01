import type { LevelConfig, BossConfig, PetConfig, Platform, WaveConfig, ChestConfig, SecretAreaConfig, ObstacleConfig } from '../types'

const GROUND_Y = 600

function makeGround(length: number, groundY: number) {
  const segs: { x: number; y: number; width: number; height: number; type: 'ground' }[] = []
  for (let x = 0; x < length; x += 480) {
    segs.push({ x, y: groundY, width: 480, height: 50, type: 'ground' })
  }
  return segs
}

function makeScene(id: number, name: string, length: number, platforms: Platform[], waves: WaveConfig[], theme = 0, extra?: { chests?: ChestConfig[]; obstacles?: ObstacleConfig[]; secretArea?: SecretAreaConfig }) {
  return { id, name, length, platforms, waves, theme, ...extra }
}

// ==================== 故事背景 ====================
// 千年前，封印魔王的水晶破碎成五枚碎片散落大地，黑暗随之蔓延。
// 少年「黎恩」从废墟中崛起，手持祖传长剑，
// 踏上寻找散落的五枚水晶碎片的征途。
// 每打败一位被黑暗侵蚀的守护者，他都能用纯净之心将其驯服为伙伴。
// 从翠绿草原到暗夜森林、炎之火山，再到永冻冰原，
// 他最终将抵达深渊之下的王座，与水晶黑暗面的化身「灭世」展开最终决战，
// 让五枚碎片重聚，终结千年的黑暗。

// ==================== 宠物配置 ====================
const PET_SLIME: PetConfig = {
  id: 'pet_slime',
  name: '小史莱姆·啵啵',
  description: '从草原收服的弹性伙伴，能在玩家攻击时喷射黏液造成额外伤害',
  icon: '🟢',
  color: '#44cc44',
  buff: { type: 'attack', value: 5 },
  skillName: '黏液喷射',
  skillDescription: '向最近敌人发射黏液球，造成 15 点伤害',
  attackDamage: 15,
  attackInterval: 90,
  projectileType: 'magic',
}

const PET_SHADOW: PetConfig = {
  id: 'pet_shadow',
  name: '暗影精灵·夜',
  description: '暗影领主被净化后的形态，能提升玩家的 MP 上限',
  icon: '🌑',
  color: '#9b59b6',
  buff: { type: 'mp', value: 30 },
  skillName: '暗影箭雨',
  skillDescription: '向前方扇形区域射出 5 发暗影箭，每发 20 伤害',
  attackDamage: 20,
  attackInterval: 110,
  projectileType: 'magic',
}

const PET_DEMON: PetConfig = {
  id: 'pet_demon',
  name: '炎之魔·赤',
  description: '魔王被打败后残余的意志，被驯服后大幅提升玩家防御',
  icon: '🔥',
  color: '#e74c3c',
  buff: { type: 'defense', value: 15 },
  skillName: '炼狱爆裂',
  skillDescription: '向前方释放火焰冲击波，造成 35 点范围伤害',
  attackDamage: 35,
  attackInterval: 140,
  projectileType: 'fire',
}

const PET_FROST: PetConfig = {
  id: 'pet_frost',
  name: '冰晶幼狼·雪',
  description: '冰霜巨人战败后化成的极地伙伴，大幅提升玩家生命上限',
  icon: '❄️',
  color: '#66c0e8',
  buff: { type: 'hp', value: 40 },
  skillName: '冰牙突袭',
  skillDescription: '向最近敌人扑咬并冻结其行动，造成 45 点伤害',
  attackDamage: 45,
  attackInterval: 130,
  projectileType: 'ice',
}

const PET_ABYSS: PetConfig = {
  id: 'pet_abyss',
  name: '深渊幼龙·黯',
  description: '深渊主宰最后的血脉，被净化后大幅提升玩家攻击力',
  icon: '👾',
  color: '#9b59b6',
  buff: { type: 'attack', value: 25 },
  skillName: '虚空撕裂',
  skillDescription: '撕裂空间降下虚空陨落，造成 60 点范围伤害',
  attackDamage: 60,
  attackInterval: 150,
  projectileType: 'dark',
}

const PET_SAND: PetConfig = {
  id: 'pet_sand',
  name: '沙之灵·砾',
  description: '沙漠法老王被净化后的沙之精灵，能提升玩家攻击力',
  icon: '⏳',
  color: '#eab308',
  buff: { type: 'attack', value: 12 },
  skillName: '沙暴喷射',
  skillDescription: '向前方喷出沙暴球，造成 30 点伤害并减速敌人',
  attackDamage: 30,
  attackInterval: 100,
  projectileType: 'magic',
}

const PET_SKY: PetConfig = {
  id: 'pet_sky',
  name: '云之灵·霄',
  description: '苍穹霸主化作的雷电之灵，能大幅提升玩家移动速度',
  icon: '☁️',
  color: '#38bdf8',
  buff: { type: 'speed', value: 2 },
  skillName: '雷光一闪',
  skillDescription: '召唤落雷轰击最近敌人，造成 55 点范围伤害',
  attackDamage: 55,
  attackInterval: 120,
  projectileType: 'magic',
}

const PET_CASTLE: PetConfig = {
  id: 'pet_castle',
  name: '王座之灵·辉',
  description: '黑暗皇帝的残念被净化而成的守护之灵，极大提升玩家攻击力',
  icon: '👑',
  color: '#d4af37',
  buff: { type: 'attack', value: 30 },
  skillName: '王者审判',
  skillDescription: '凝聚王者剑气斩向敌人，造成 80 点巨额伤害',
  attackDamage: 80,
  attackInterval: 140,
  projectileType: 'dark',
}

// ==================== Boss 配置 ====================
// ==================== Boss 配置 ====================
const BOSS_DRAGON: BossConfig = {
  name: '草原守护者·凯尔',
  maxHp: 1500,
  width: 80,
  height: 90,
  phases: [
    { pattern: 'melee', patterns: ['melee', 'charge'], speed: 4.5, attackDamage: 28, attackInterval: 45, hpThreshold: 1.0 },
    { pattern: 'charge', patterns: ['charge', 'melee', 'aoe'], speed: 8, attackDamage: 34, attackInterval: 32, hpThreshold: 0.6 },
    { pattern: 'aoe', patterns: ['aoe', 'charge', 'spin'], speed: 9.5, attackDamage: 40, attackInterval: 26, hpThreshold: 0.3 },
  ],
  dropExp: 200
}

const BOSS_SHADOW: BossConfig = {
  name: '暗影狼王·诺克',
  maxHp: 3400,
  width: 72,
  height: 84,
  phases: [
    { pattern: 'projectile', patterns: ['projectile', 'spin'], speed: 3.5, attackDamage: 32, attackInterval: 40, hpThreshold: 1.0 },
    { pattern: 'summon', patterns: ['summon', 'projectile', 'spin'], speed: 4.5, attackDamage: 38, attackInterval: 30, hpThreshold: 0.55 },
    { pattern: 'spin', patterns: ['spin', 'aoe', 'summon'], speed: 8, attackDamage: 46, attackInterval: 22, hpThreshold: 0.3 },
  ],
  dropExp: 300
}

const BOSS_DEMON: BossConfig = {
  name: '熔岩魔王·终焉',
  maxHp: 4800,
  width: 90,
  height: 100,
  phases: [
    { pattern: 'melee', patterns: ['melee', 'charge', 'projectile'], speed: 5.5, attackDamage: 38, attackInterval: 36, hpThreshold: 1.0 },
    { pattern: 'projectile', patterns: ['projectile', 'charge', 'aoe'], speed: 6, attackDamage: 44, attackInterval: 26, hpThreshold: 0.6 },
    { pattern: 'charge', patterns: ['charge', 'aoe', 'spin', 'summon'], speed: 11, attackDamage: 54, attackInterval: 20, hpThreshold: 0.35 },
  ],
  dropExp: 500
}

// ==================== 第4关 Boss：冰霜巨人 ====================
const BOSS_FROST: BossConfig = {
  name: '冰霜巨人·凛风',
  maxHp: 6600,
  width: 100,
  height: 110,
  phases: [
    { pattern: 'charge', patterns: ['charge', 'melee', 'projectile'], speed: 5, attackDamage: 42, attackInterval: 34, hpThreshold: 1.0 },
    { pattern: 'melee', patterns: ['melee', 'charge', 'aoe'], speed: 8, attackDamage: 50, attackInterval: 26, hpThreshold: 0.6 },
    { pattern: 'aoe', patterns: ['aoe', 'charge', 'projectile', 'spin'], speed: 10, attackDamage: 58, attackInterval: 18, hpThreshold: 0.3 },
  ],
  dropExp: 800
}

// ==================== 第5关 Boss：深渊主宰（最终 BOSS）====================
const BOSS_ABYSS: BossConfig = {
  name: '深渊主宰·灭世',
  maxHp: 11000,
  width: 115,
  height: 130,
  phases: [
    { pattern: 'projectile', patterns: ['projectile', 'charge', 'summon', 'spin'], speed: 6, attackDamage: 48, attackInterval: 30, hpThreshold: 1.0 },
    { pattern: 'aoe', patterns: ['aoe', 'projectile', 'charge', 'summon'], speed: 8, attackDamage: 56, attackInterval: 22, hpThreshold: 0.65 },
    { pattern: 'spin', patterns: ['spin', 'aoe', 'charge', 'projectile', 'summon'], speed: 13, attackDamage: 70, attackInterval: 15, hpThreshold: 0.3 },
  ],
  dropExp: 1500
}

// ==================== 第2关 Boss：沙漠法老王 ====================
const BOSS_SAND: BossConfig = {
  name: '沙漠法老王·沙赫特',
  maxHp: 13000,
  width: 84,
  height: 96,
  phases: [
    { pattern: 'projectile', patterns: ['projectile', 'melee', 'charge'], speed: 4.5, attackDamage: 40, attackInterval: 38, hpThreshold: 1.0 },
    { pattern: 'summon', patterns: ['summon', 'projectile', 'aoe'], speed: 7, attackDamage: 48, attackInterval: 28, hpThreshold: 0.6 },
    { pattern: 'aoe', patterns: ['aoe', 'charge', 'projectile', 'summon'], speed: 10, attackDamage: 58, attackInterval: 20, hpThreshold: 0.3 },
  ],
  dropExp: 1200
}

// ==================== 第6关 Boss：苍穹霸主 ====================
const BOSS_SKY: BossConfig = {
  name: '苍穹霸主·艾拉',
  maxHp: 15000,
  width: 92,
  height: 104,
  phases: [
    { pattern: 'projectile', patterns: ['projectile', 'charge', 'spin'], speed: 6, attackDamage: 48, attackInterval: 32, hpThreshold: 1.0 },
    { pattern: 'charge', patterns: ['charge', 'projectile', 'aoe'], speed: 10, attackDamage: 56, attackInterval: 24, hpThreshold: 0.6 },
    { pattern: 'spin', patterns: ['spin', 'aoe', 'charge', 'summon'], speed: 13, attackDamage: 68, attackInterval: 17, hpThreshold: 0.3 },
  ],
  dropExp: 1800
}

// ==================== 第8关 Boss：黑暗皇帝（最终 BOSS）====================
const BOSS_CASTLE: BossConfig = {
  name: '黑暗皇帝·墨格拉',
  maxHp: 20000,
  width: 120,
  height: 136,
  phases: [
    { pattern: 'charge', patterns: ['charge', 'projectile', 'aoe'], speed: 6.5, attackDamage: 56, attackInterval: 30, hpThreshold: 1.0 },
    { pattern: 'summon', patterns: ['summon', 'charge', 'spin'], speed: 9.5, attackDamage: 66, attackInterval: 22, hpThreshold: 0.65 },
    { pattern: 'spin', patterns: ['spin', 'aoe', 'charge', 'projectile', 'summon'], speed: 14, attackDamage: 80, attackInterval: 14, hpThreshold: 0.3 },
  ],
  dropExp: 3500
}

// ==================== 关卡配置 ====================
// ==================== 关卡配置 ====================
export const LEVEL_CONFIGS: LevelConfig[] = [
  // ---------- 关卡 1: 翠绿草原 ----------
  {
    id: 0,
    name: '翠绿草原',
    bossName: '草原守护者·凯尔',
    groundY: GROUND_Y,
    levelLength: 6000,
    platforms: [
      ...makeGround(6000, GROUND_Y),
      { x: 300, y: 480, width: 120, height: 16, type: 'platform' },
      { x: 600, y: 420, width: 100, height: 16, type: 'platform' },
      { x: 900, y: 460, width: 140, height: 16, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'slime', x: 350, y: GROUND_Y - 24, count: 3, delay: 60 },
        { type: 'slime', x: 500, y: GROUND_Y - 24, count: 2, delay: 100 },
      ]},
    ],
    scenes: [
      makeScene(0, '草原初道', 2000, [
        ...makeGround(2000, GROUND_Y),
        { x: 300, y: 480, width: 120, height: 16, type: 'platform' },
        { x: 600, y: 420, width: 100, height: 16, type: 'platform' },
        { x: 900, y: 460, width: 140, height: 16, type: 'platform' },
        { x: 430, y: 350, width: 90, height: 16, type: 'platform' },
        { x: 740, y: 530, width: 100, height: 16, type: 'platform' },
        { x: 1080, y: 430, width: 120, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'slime', x: 350, y: GROUND_Y - 24, count: 3, delay: 60 },
          { type: 'slime', x: 500, y: GROUND_Y - 24, count: 2, delay: 100 },
        ]},
        { enemies: [
          { type: 'bee_warrior', x: 700, y: 420, count: 3, delay: 80 },
          { type: 'slime', x: 800, y: GROUND_Y - 24, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'goblin', x: 950, y: GROUND_Y - 36, count: 3, delay: 80 },
          { type: 'bee_warrior', x: 1100, y: 460, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'slime', x: 1250, y: GROUND_Y - 24, count: 2, delay: 60, elite: true },
          { type: 'goblin', x: 1350, y: GROUND_Y - 36, count: 2, delay: 90 },
        ]},
      ], 0, {
        chests: [
          { x: 360, type: 'common' },
          { x: 620, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1100,
          length: 420,
          platforms: [
            { x: 1110, y: 400, width: 130, height: 16, type: 'platform' },
            { x: 1290, y: 320, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1340, type: 'special' }],
          eliteGuards: [{ type: 'slime', count: 1 }],
          hint: '发现隐藏石阶！跳上去看看…',
        },
      }),
      makeScene(1, '沼泽突袭', 2000, [
        ...makeGround(2000, GROUND_Y),
        { x: 220, y: 380, width: 100, height: 16, type: 'platform' },
        { x: 560, y: 330, width: 120, height: 16, type: 'platform' },
        { x: 900, y: 380, width: 130, height: 16, type: 'platform' },
        { x: 380, y: 480, width: 90, height: 16, type: 'platform' },
        { x: 760, y: 480, width: 100, height: 16, type: 'platform' },
        { x: 1120, y: 470, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'bee_warrior', x: 400, y: 380, count: 3, delay: 70 },
          { type: 'goblin', x: 650, y: GROUND_Y - 36, count: 2, delay: 100 },
        ]},
        { enemies: [
          { type: 'goblin', x: 900, y: GROUND_Y - 36, count: 3, delay: 80 },
          { type: 'bee_warrior', x: 1100, y: 330, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'slime', x: 300, y: GROUND_Y - 24, count: 3, delay: 60 },
          { type: 'goblin', x: 700, y: GROUND_Y - 36, count: 3, delay: 90 },
          { type: 'bee_warrior', x: 1000, y: 380, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'goblin', x: 1200, y: GROUND_Y - 36, count: 2, delay: 70, elite: true },
          { type: 'slime', x: 1300, y: GROUND_Y - 24, count: 2, delay: 100 },
        ]},
      ], 1, {
        chests: [
          { x: 260, type: 'common' },
          { x: 580, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1150,
          length: 400,
          platforms: [
            { x: 1160, y: 350, width: 130, height: 16, type: 'platform' },
            { x: 1330, y: 270, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1380, type: 'special' }],
          eliteGuards: [{ type: 'bee_warrior', count: 2 }],
          hint: '沼泽深处似乎有暗门…',
        },
      }),
      makeScene(2, '巨树之巅', 2000, [
        ...makeGround(2000, GROUND_Y),
        { x: 250, y: 320, width: 140, height: 16, type: 'platform' },
        { x: 620, y: 270, width: 120, height: 16, type: 'platform' },
        { x: 980, y: 320, width: 160, height: 16, type: 'platform' },
        { x: 430, y: 400, width: 90, height: 16, type: 'platform' },
        { x: 800, y: 380, width: 100, height: 16, type: 'platform' },
        { x: 1160, y: 400, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'goblin', x: 300, y: GROUND_Y - 36, count: 3, delay: 70 },
          { type: 'bee_warrior', x: 500, y: 270, count: 3, delay: 130 },
        ]},
        { enemies: [
          { type: 'goblin', x: 850, y: GROUND_Y - 36, count: 3, delay: 60 },
          { type: 'bee_warrior', x: 1100, y: 320, count: 3, delay: 140 },
        ]},
        { enemies: [
          { type: 'slime', x: 300, y: GROUND_Y - 24, count: 3, delay: 100 },
          { type: 'goblin', x: 650, y: GROUND_Y - 36, count: 4, delay: 80 },
          { type: 'bee_warrior', x: 950, y: 320, count: 3, delay: 130 },
        ]},
        { enemies: [
          { type: 'goblin', x: 1200, y: GROUND_Y - 36, count: 2, delay: 80, elite: true },
          { type: 'bee_warrior', x: 1320, y: 320, count: 2, delay: 110, elite: true },
        ]},
      ], 2, {
        chests: [
          { x: 270, type: 'gold' },
          { x: 700, type: 'common' },
        ],
        secretArea: {
          entranceX: 1100,
          length: 420,
          platforms: [
            { x: 1150, y: 340, width: 130, height: 16, type: 'platform' },
            { x: 1330, y: 260, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1380, type: 'special' }],
          eliteGuards: [{ type: 'bee_warrior', count: 2 }],
          hint: '树冠深处有微光闪烁…',
        },
      }),
    ],
    boss: BOSS_DRAGON,
    background: { skyColor: '#87CEEB', groundColor: '#5a8a3a', accentColor: '#3a6a1a' },
    // === 故事 ===
    storyTitle: '第一章 · 启程之光',
    storyIntro: '黎恩的故乡被黑暗吞噬的第七天，他握紧父亲临终前留下的长剑，踏出废墟。东方的翠绿草原是第一片尚未完全沦陷的土地，但他知道，那里已不再宁静……',
    storyOutro: '凯尔倒下，眼神中的红光褪去，恢复清明。他握住黎恩的手：「我曾被黑暗操控……请用这把剑，也救救其他被侵蚀的灵魂。」一团绿色光华从凯尔身上飘出，化作一只小史莱姆，跳到黎恩肩头。',
    bossDialog: [
      { speaker: '凯尔', text: '站住！凡踏入此地者，皆需……咳，皆需受死！' },
      { speaker: '黎恩', text: '你的眼神……是被侵蚀了？请容我帮你一把！' },
      { speaker: '凯尔', text: '愚不可及！龙人之怒，让你粉身碎骨！' },
    ],
    victoryDialog: [
      { speaker: '凯尔', text: '我……竟然被打败了。束缚我灵魂的黑暗，散去了……' },
      { speaker: '黎恩', text: '请借我力量。前方还有被侵蚀的灵魂等待拯救。' },
      { speaker: '凯尔', text: '愿我的化身「啵啵」伴你同行。去吧，少年。' },
    ],
    mapNode: { x: 20, y: 65, icon: '🌿' },
    petReward: PET_SLIME,
  },

  // ---------- 关卡 2: 暗夜森林 ----------
  {
    id: 1,
    name: '暗夜森林',
    bossName: '暗影狼王·诺克',
    groundY: GROUND_Y,
    levelLength: 6200,
    platforms: [
      ...makeGround(6200, GROUND_Y),
      { x: 250, y: 500, width: 100, height: 14, type: 'platform' },
      { x: 500, y: 430, width: 120, height: 14, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'shadow_ghost', x: 400, y: 470, count: 3, delay: 80 },
        { type: 'skeleton', x: 550, y: GROUND_Y - 40, count: 2, delay: 90 },
      ]},
    ],
    scenes: [
      makeScene(0, '月影林道', 2000, [
        ...makeGround(2000, GROUND_Y),
        { x: 250, y: 500, width: 100, height: 14, type: 'platform' },
        { x: 500, y: 430, width: 120, height: 14, type: 'platform' },
        { x: 360, y: 350, width: 100, height: 14, type: 'platform' },
        { x: 650, y: 500, width: 110, height: 14, type: 'platform' },
        { x: 900, y: 430, width: 120, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'shadow_ghost', x: 400, y: 470, count: 3, delay: 80 },
          { type: 'skeleton', x: 550, y: GROUND_Y - 40, count: 2, delay: 90 },
        ]},
        { enemies: [
          { type: 'spider_witch', x: 900, y: 470, count: 2, delay: 120 },
          { type: 'shadow_ghost', x: 1050, y: 380, count: 2, delay: 100 },
        ]},
        { enemies: [
          { type: 'skeleton', x: 350, y: GROUND_Y - 40, count: 3, delay: 70 },
          { type: 'spider_witch', x: 700, y: 430, count: 2, delay: 130 },
          { type: 'shadow_ghost', x: 950, y: 380, count: 3, delay: 110 },
        ]},
        { enemies: [
          { type: 'skeleton', x: 1200, y: GROUND_Y - 40, count: 2, delay: 80, elite: true },
          { type: 'shadow_ghost', x: 1320, y: 380, count: 2, delay: 110 },
        ]},
      ], 3, {
        chests: [
          { x: 270, type: 'common' },
          { x: 520, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1080,
          length: 420,
          platforms: [
            { x: 1090, y: 400, width: 120, height: 14, type: 'platform' },
            { x: 1260, y: 320, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1310, type: 'special' }],
          eliteGuards: [{ type: 'shadow_ghost', count: 2 }],
          hint: '月光下有虚影指引…',
        },
      }),
      makeScene(1, '枯木峡谷', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 220, y: 420, width: 110, height: 14, type: 'platform' },
        { x: 650, y: 360, width: 120, height: 14, type: 'platform' },
        { x: 1050, y: 410, width: 130, height: 14, type: 'platform' },
        { x: 430, y: 480, width: 90, height: 14, type: 'platform' },
        { x: 1250, y: 470, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'shadow_ghost', x: 300, y: 390, count: 3, delay: 70 },
          { type: 'spider_witch', x: 700, y: 420, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'dark_mage', x: 900, y: 360, count: 2, delay: 150 },
          { type: 'shadow_ghost', x: 1200, y: 290, count: 3, delay: 100 },
        ]},
        { enemies: [
          { type: 'spider_witch', x: 450, y: 420, count: 3, delay: 100 },
          { type: 'skeleton', x: 850, y: GROUND_Y - 40, count: 3, delay: 80 },
          { type: 'dark_mage', x: 1150, y: 410, count: 1, delay: 160 },
        ]},
        { enemies: [
          { type: 'dark_mage', x: 1300, y: 360, count: 1, delay: 100, elite: true },
          { type: 'skeleton', x: 1400, y: GROUND_Y - 40, count: 2, delay: 120, elite: true },
        ]},
      ], 4, {
        chests: [
          { x: 250, type: 'common' },
          { x: 680, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1200,
          length: 400,
          platforms: [
            { x: 1210, y: 380, width: 130, height: 14, type: 'platform' },
            { x: 1390, y: 300, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1440, type: 'special' }],
          eliteGuards: [{ type: 'spider_witch', count: 1 }],
          hint: '枯木后传来低语…',
        },
      }),
      makeScene(2, '银月祭坛', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 300, y: 340, width: 120, height: 14, type: 'platform' },
        { x: 700, y: 280, width: 140, height: 14, type: 'platform' },
        { x: 1100, y: 320, width: 110, height: 14, type: 'platform' },
        { x: 500, y: 420, width: 100, height: 14, type: 'platform' },
        { x: 1300, y: 410, width: 120, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'spider_witch', x: 400, y: 340, count: 3, delay: 100 },
          { type: 'dark_mage', x: 700, y: 280, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'shadow_ghost', x: 1000, y: 320, count: 3, delay: 90 },
          { type: 'dark_mage', x: 1200, y: 280, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'dark_mage', x: 350, y: 340, count: 2, delay: 140 },
          { type: 'spider_witch', x: 800, y: 280, count: 3, delay: 100 },
          { type: 'shadow_ghost', x: 1200, y: 320, count: 4, delay: 110 },
        ]},
        { enemies: [
          { type: 'dark_mage', x: 1350, y: 280, count: 2, delay: 100, elite: true },
          { type: 'shadow_ghost', x: 1450, y: 320, count: 2, delay: 120, elite: true },
        ]},
      ], 5, {
        chests: [
          { x: 320, type: 'gold' },
          { x: 800, type: 'common' },
        ],
        secretArea: {
          entranceX: 1250,
          length: 400,
          platforms: [
            { x: 1260, y: 300, width: 120, height: 14, type: 'platform' },
            { x: 1420, y: 230, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1460, type: 'special' }],
          eliteGuards: [{ type: 'dark_mage', count: 1 }],
          hint: '祭坛之下藏着密室…',
        },
      }),
    ],
    boss: BOSS_SHADOW,
    background: { skyColor: '#1a1a3a', groundColor: '#2a1a0a', accentColor: '#1a0a00' },
    storyTitle: '第二章 · 暗影迷踪',
    storyIntro: '穿过草原，黎恩来到曾经繁华的银月林地。如今树木枯死，月光也被吞噬。啵啵在他肩头抖了抖——这里潜伏着比龙人更狡猾的敌人。',
    storyOutro: '诺克身形消散，化作一缕紫雾盘旋。黎恩用剑尖挑起紫雾，将其收入水晶瓶。「你的本源尚未被污染，诺克。我会还你自由。」紫雾凝结成一只精灵，翅膀扇动如夜。',
    bossDialog: [
      { speaker: '诺克', text: '又是来送死的勇者？上一任的尸骨还在我脚下。' },
      { speaker: '黎恩', text: '你的声音里没有恨意，只有……哀伤。' },
      { speaker: '诺克', text: '……闭嘴。让我看看你的本事！' },
    ],
    victoryDialog: [
      { speaker: '诺克', text: '我输了。终于……可以安息了吗？' },
      { speaker: '黎恩', text: '不。请借我你的眼，看清楚世界的真相。' },
      { speaker: '诺克', text: '少年……你比我想象的更深。请带上我的化身「夜」。' },
    ],
    mapNode: { x: 50, y: 45, icon: '🌙' },
    petReward: PET_SHADOW,
  },

  // ---------- 关卡 3: 火焰地狱 ----------
  {
    id: 2,
    name: '火焰地狱',
    bossName: '熔岩魔王·终焉',
    groundY: GROUND_Y,
    levelLength: 6400,
    platforms: [
      ...makeGround(6400, GROUND_Y),
      { x: 200, y: 480, width: 100, height: 12, type: 'platform' },
      { x: 450, y: 400, width: 120, height: 12, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'fire_imp', x: 350, y: GROUND_Y - 32, count: 3, delay: 140 },
        { type: 'magma_golem', x: 500, y: GROUND_Y - 40, count: 1, delay: 80 },
      ]},
    ],
    scenes: [
      makeScene(0, '岩浆前哨', 2000, [
        ...makeGround(2000, GROUND_Y),
        { x: 200, y: 480, width: 100, height: 12, type: 'platform' },
        { x: 450, y: 400, width: 120, height: 12, type: 'platform' },
        { x: 330, y: 320, width: 90, height: 12, type: 'platform' },
        { x: 650, y: 500, width: 100, height: 12, type: 'platform' },
        { x: 900, y: 430, width: 110, height: 12, type: 'platform' },
      ], [
        { enemies: [
          { type: 'fire_imp', x: 350, y: GROUND_Y - 32, count: 3, delay: 140 },
          { type: 'magma_golem', x: 500, y: GROUND_Y - 40, count: 1, delay: 80 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 800, y: 440, count: 3, delay: 120 },
          { type: 'magma_golem', x: 950, y: GROUND_Y - 40, count: 1, delay: 100 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 600, y: 400, count: 4, delay: 110 },
          { type: 'magma_golem', x: 900, y: GROUND_Y - 40, count: 2, delay: 90 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 1200, y: 400, count: 2, delay: 100, elite: true },
          { type: 'magma_golem', x: 1300, y: GROUND_Y - 40, count: 1, delay: 140, elite: true },
        ]},
      ], 6, {
        chests: [
          { x: 250, type: 'common' },
          { x: 470, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1050,
          length: 400,
          platforms: [
            { x: 1060, y: 420, width: 120, height: 12, type: 'platform' },
            { x: 1230, y: 340, width: 140, height: 12, type: 'platform' },
          ],
          chests: [{ x: 1280, type: 'special' }],
          eliteGuards: [{ type: 'fire_imp', count: 2 }],
          hint: '熔岩下有灼热的气息…',
        },
      }),
      makeScene(1, '熔岩裂谷', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 300, y: 350, width: 140, height: 12, type: 'platform' },
        { x: 800, y: 300, width: 130, height: 12, type: 'platform' },
        { x: 1200, y: 360, width: 120, height: 12, type: 'platform' },
        { x: 520, y: 440, width: 100, height: 12, type: 'platform' },
        { x: 1400, y: 460, width: 110, height: 12, type: 'platform' },
      ], [
        { enemies: [
          { type: 'magma_golem', x: 400, y: GROUND_Y - 40, count: 2, delay: 60 },
          { type: 'fire_imp', x: 650, y: 350, count: 3, delay: 160 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 1000, y: 360, count: 4, delay: 110 },
          { type: 'magma_golem', x: 1300, y: GROUND_Y - 40, count: 2, delay: 70 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 500, y: 350, count: 5, delay: 100 },
          { type: 'magma_golem', x: 1000, y: GROUND_Y - 40, count: 3, delay: 80 },
        ]},
        { enemies: [
          { type: 'magma_golem', x: 1400, y: GROUND_Y - 40, count: 2, delay: 90, elite: true },
          { type: 'fire_imp', x: 1520, y: 360, count: 2, delay: 130, elite: true },
        ]},
      ], 7, {
        chests: [
          { x: 320, type: 'gold' },
          { x: 850, type: 'common' },
        ],
        secretArea: {
          entranceX: 1350,
          length: 400,
          platforms: [
            { x: 1360, y: 380, width: 120, height: 12, type: 'platform' },
            { x: 1500, y: 300, width: 130, height: 12, type: 'platform' },
          ],
          chests: [{ x: 1540, type: 'special' }],
          eliteGuards: [{ type: 'magma_golem', count: 1 }],
          hint: '裂谷深处有发光之物…',
        },
      }),
      makeScene(2, '火山核心', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 250, y: 260, width: 130, height: 12, type: 'platform' },
        { x: 650, y: 320, width: 120, height: 12, type: 'platform' },
        { x: 1100, y: 280, width: 140, height: 12, type: 'platform' },
        { x: 430, y: 400, width: 100, height: 12, type: 'platform' },
        { x: 1300, y: 380, width: 120, height: 12, type: 'platform' },
      ], [
        { enemies: [
          { type: 'magma_golem', x: 350, y: GROUND_Y - 40, count: 2, delay: 180 },
          { type: 'fire_imp', x: 700, y: 260, count: 4, delay: 130 },
        ]},
        { enemies: [
          { type: 'magma_golem', x: 900, y: GROUND_Y - 40, count: 2, delay: 150 },
          { type: 'fire_imp', x: 1200, y: 280, count: 4, delay: 140 },
        ]},
        { enemies: [
          { type: 'fire_imp', x: 500, y: 320, count: 5, delay: 100 },
          { type: 'magma_golem', x: 1000, y: GROUND_Y - 40, count: 3, delay: 120 },
        ]},
        { enemies: [
          { type: 'magma_golem', x: 1350, y: GROUND_Y - 40, count: 2, delay: 100, elite: true },
          { type: 'fire_imp', x: 1480, y: 280, count: 3, delay: 120, elite: true },
        ]},
      ], 8, {
        chests: [
          { x: 270, type: 'gold' },
          { x: 700, type: 'common' },
        ],
        secretArea: {
          entranceX: 1250,
          length: 420,
          platforms: [
            { x: 1260, y: 280, width: 120, height: 12, type: 'platform' },
            { x: 1430, y: 200, width: 140, height: 12, type: 'platform' },
          ],
          chests: [{ x: 1480, type: 'special' }],
          eliteGuards: [{ type: 'magma_golem', count: 1 }, { type: 'fire_imp', count: 1 }],
          hint: '核心深处藏着禁忌之力…',
        },
      }),
    ],
    boss: BOSS_DEMON,
    background: { skyColor: '#331111', groundColor: '#441111', accentColor: '#221100' },
    storyTitle: '第三章 · 熔岩之心',
    storyIntro: '火焰从地心涌出，黎恩追随着第三枚碎片的回响，踏入魔王沉睡的火山。啵啵与夜在他身后紧绷——他们知道，前方守护碎片的，是被黑暗侵蚀千年的古代炎之王者。',
    storyOutro: '炎之王者倒在岩浆之上，庞大的身躯化作点点火星。第三枚水晶碎片缓缓升起，落入黎恩手中。然而当他握紧碎片的瞬间，一股更深的寒意掠过心头——北境的方向，传来了另一道呼唤。',
    bossDialog: [
      { speaker: '炎之王者', text: '勇者啊……你终于来了。我等了你千年。' },
      { speaker: '黎恩', text: '你……在等我？' },
      { speaker: '炎之王者', text: '封印使我不得解脱。来吧，让我看见你的决心！' },
    ],
    victoryDialog: [
      { speaker: '炎之王者', text: '终于……自由了。少年，谢谢你。' },
      { speaker: '黎恩', text: '你也是被水晶囚禁的？这一切……到底为了什么？' },
      { speaker: '炎之王者', text: '真相在北境。带着我的化身「赤」去吧，那是最后的线索。' },
    ],
    mapNode: { x: 80, y: 25, icon: '🔥' },
    petReward: PET_DEMON,
  },
  // ---------- 关卡 4: 永冻冰原 ----------
  {
    id: 3,
    name: '永冻雪山',
    bossName: '冰霜巨人·凛风',
    groundY: GROUND_Y,
    levelLength: 7000,
    platforms: [
      ...makeGround(7000, GROUND_Y),
    ],
    waves: [
      { enemies: [
        { type: 'frost_wolf', x: 350, y: GROUND_Y - 28, count: 4, delay: 60 },
        { type: 'ice_troll', x: 600, y: GROUND_Y - 44, count: 2, delay: 110 },
      ]},
    ],
    scenes: [
      makeScene(0, '冰封平原', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 250, y: 440, width: 120, height: 16, type: 'platform' },
        { x: 600, y: 380, width: 110, height: 16, type: 'platform' },
        { x: 1000, y: 420, width: 130, height: 16, type: 'platform' },
        { x: 400, y: 300, width: 90, height: 16, type: 'platform' },
        { x: 820, y: 480, width: 100, height: 16, type: 'platform' },
        { x: 1180, y: 400, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'frost_wolf', x: 350, y: GROUND_Y - 28, count: 4, delay: 60 },
          { type: 'ice_troll', x: 600, y: GROUND_Y - 44, count: 2, delay: 110 },
        ]},
        { enemies: [
          { type: 'ice_elemental', x: 800, y: 380, count: 3, delay: 90 },
          { type: 'frost_wolf', x: 950, y: GROUND_Y - 28, count: 3, delay: 120 },
        ]},
        { enemies: [
          { type: 'ice_troll', x: 1100, y: GROUND_Y - 44, count: 2, delay: 90 },
          { type: 'ice_elemental', x: 1250, y: 420, count: 3, delay: 130 },
          { type: 'frost_wolf', x: 1400, y: GROUND_Y - 28, count: 2, delay: 150 },
        ]},
        { enemies: [
          { type: 'ice_troll', x: 1500, y: GROUND_Y - 44, count: 1, delay: 80, elite: true },
          { type: 'frost_wolf', x: 1620, y: GROUND_Y - 28, count: 2, delay: 110, elite: true },
        ]},
      ], 9, {
        chests: [
          { x: 300, type: 'common' },
          { x: 640, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1200,
          length: 440,
          platforms: [
            { x: 1210, y: 340, width: 130, height: 16, type: 'platform' },
            { x: 1400, y: 260, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1450, type: 'special' }],
          eliteGuards: [{ type: 'ice_elemental', count: 2 }],
          hint: '暴雪深处有微光闪烁…',
        },
      }),
      makeScene(1, '霜冻洞窟', 2300, [
        ...makeGround(2300, GROUND_Y),
        { x: 300, y: 360, width: 120, height: 16, type: 'platform' },
        { x: 700, y: 310, width: 130, height: 16, type: 'platform' },
        { x: 1150, y: 380, width: 120, height: 16, type: 'platform' },
        { x: 480, y: 450, width: 100, height: 16, type: 'platform' },
        { x: 1350, y: 450, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'ice_elemental', x: 420, y: 360, count: 3, delay: 80 },
          { type: 'ice_troll', x: 680, y: GROUND_Y - 44, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'frost_wolf', x: 900, y: GROUND_Y - 28, count: 4, delay: 70 },
          { type: 'ice_elemental', x: 1100, y: 310, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'ice_troll', x: 300, y: GROUND_Y - 44, count: 2, delay: 90 },
          { type: 'frost_wolf', x: 800, y: GROUND_Y - 28, count: 3, delay: 110 },
          { type: 'ice_elemental', x: 1250, y: 380, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'ice_troll', x: 1400, y: GROUND_Y - 44, count: 2, delay: 80, elite: true },
          { type: 'ice_elemental', x: 1550, y: 380, count: 2, delay: 120, elite: true },
        ]},
      ], 10, {
        chests: [
          { x: 340, type: 'gold' },
          { x: 760, type: 'common' },
        ],
        secretArea: {
          entranceX: 1300,
          length: 420,
          platforms: [
            { x: 1310, y: 300, width: 130, height: 16, type: 'platform' },
            { x: 1500, y: 220, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1550, type: 'special' }],
          eliteGuards: [{ type: 'ice_troll', count: 1 }],
          hint: '洞壁上的冰层下有蹊跷…',
        },
      }),
      makeScene(2, '冰晶王座', 2500, [
        ...makeGround(2500, GROUND_Y),
        { x: 220, y: 330, width: 120, height: 16, type: 'platform' },
        { x: 650, y: 400, width: 130, height: 16, type: 'platform' },
        { x: 1150, y: 320, width: 140, height: 16, type: 'platform' },
        { x: 1550, y: 380, width: 120, height: 16, type: 'platform' },
        { x: 900, y: 480, width: 110, height: 16, type: 'platform' },
        { x: 1750, y: 430, width: 120, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'ice_troll', x: 300, y: GROUND_Y - 44, count: 3, delay: 100 },
          { type: 'frost_wolf', x: 700, y: GROUND_Y - 28, count: 3, delay: 130 },
        ]},
        { enemies: [
          { type: 'ice_elemental', x: 800, y: 400, count: 3, delay: 80 },
          { type: 'ice_troll', x: 1100, y: GROUND_Y - 44, count: 2, delay: 120 },
          { type: 'frost_wolf', x: 1300, y: GROUND_Y - 28, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'ice_elemental', x: 500, y: 330, count: 3, delay: 90 },
          { type: 'ice_troll', x: 900, y: GROUND_Y - 44, count: 2, delay: 110 },
          { type: 'frost_wolf', x: 1500, y: GROUND_Y - 28, count: 3, delay: 130 },
        ]},
        { enemies: [
          { type: 'ice_troll', x: 1600, y: GROUND_Y - 44, count: 2, delay: 80, elite: true },
          { type: 'ice_elemental', x: 1780, y: 320, count: 2, delay: 120, elite: true },
        ]},
      ], 11, {
        chests: [
          { x: 260, type: 'gold' },
          { x: 680, type: 'common' },
          { x: 1200, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1400,
          length: 460,
          platforms: [
            { x: 1410, y: 260, width: 130, height: 16, type: 'platform' },
            { x: 1620, y: 180, width: 150, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1670, type: 'special' }],
          eliteGuards: [{ type: 'ice_troll', count: 1 }, { type: 'frost_wolf', count: 1 }],
          hint: '极光之下，冰晶王座的秘密…',
        },
      }),
    ],
    boss: BOSS_FROST,
    background: { skyColor: '#1e3a4a', groundColor: '#2a4a5a', accentColor: '#12303a' },
    storyTitle: '第四章 · 永冻之约',
    storyIntro: '火山尽头没有终点——黎恩在熔岩灰烬中找到一封来自北境的残信：「第四枚碎片沉睡于永冻冰原，凛风守护它千年。」于是，他踏着暴雪北上，穿过冰封平原与霜冻洞窟。越往北，空气越冷，仿佛连时间都被冻结。',
    storyOutro: '冰霜巨人单膝跪地，庞大的身躯碎裂成漫天冰晶。一枚被冻结千年的水晶碎片缓缓浮现，与黎恩手中的碎片共鸣。巨人化作冰晶幼狼「雪」，安静地跟在他的身后。北境的暴雪，第一次有了温度。',
    bossDialog: [
      { speaker: '凛风', text: '凡人……竟敢踏入我的永冻领域。' },
      { speaker: '黎恩', text: '你守护的碎片，属于这个世界的光明。请让开。' },
      { speaker: '凛风', text: '光明？我只记得黑暗里的永恒。让我看看你的热量！' },
    ],
    victoryDialog: [
      { speaker: '凛风', text: '我的冰……在融化。这是……千年前的感觉。' },
      { speaker: '黎恩', text: '你也是被黑暗冻结的守护者吗？' },
      { speaker: '凛风', text: '带着「雪」走吧。愿极光指引你，找到最后的真相。' },
    ],
    mapNode: { x: 62, y: 62, icon: '❄️' },
    petReward: PET_FROST,
  },
  // ---------- 关卡 5: 深渊王座 ----------
  {
    id: 4,
    name: '深渊洞窟',
    bossName: '深渊主宰·灭世',
    groundY: GROUND_Y,
    levelLength: 7400,
    platforms: [
      ...makeGround(7400, GROUND_Y),
    ],
    waves: [
      { enemies: [
        { type: 'void_wraith', x: 350, y: GROUND_Y - 32, count: 4, delay: 60 },
        { type: 'abyss_knight', x: 650, y: GROUND_Y - 46, count: 2, delay: 120 },
      ]},
    ],
    scenes: [
      makeScene(0, '深渊入口', 2300, [
        ...makeGround(2300, GROUND_Y),
        { x: 250, y: 400, width: 120, height: 16, type: 'platform' },
        { x: 700, y: 340, width: 130, height: 16, type: 'platform' },
        { x: 1150, y: 400, width: 120, height: 16, type: 'platform' },
        { x: 450, y: 500, width: 90, height: 16, type: 'platform' },
        { x: 900, y: 470, width: 100, height: 16, type: 'platform' },
        { x: 1300, y: 430, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'void_wraith', x: 350, y: GROUND_Y - 32, count: 4, delay: 60 },
          { type: 'abyss_knight', x: 650, y: GROUND_Y - 46, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'abyss_knight', x: 800, y: GROUND_Y - 46, count: 2, delay: 90 },
          { type: 'magma_golem', x: 1000, y: GROUND_Y - 40, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'void_wraith', x: 500, y: GROUND_Y - 32, count: 4, delay: 80 },
          { type: 'abyss_knight', x: 1100, y: GROUND_Y - 46, count: 2, delay: 110 },
          { type: 'void_wraith', x: 1350, y: 400, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'abyss_knight', x: 1450, y: GROUND_Y - 46, count: 2, delay: 80, elite: true },
          { type: 'void_wraith', x: 1600, y: GROUND_Y - 32, count: 3, delay: 110, elite: true },
        ]},
      ], 12, {
        chests: [
          { x: 300, type: 'gold' },
          { x: 760, type: 'common' },
        ],
        secretArea: {
          entranceX: 1250,
          length: 440,
          platforms: [
            { x: 1260, y: 300, width: 130, height: 16, type: 'platform' },
            { x: 1460, y: 220, width: 140, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1510, type: 'special' }],
          eliteGuards: [{ type: 'void_wraith', count: 2 }],
          hint: '裂隙间有陌生的低语…',
        },
      }),
      makeScene(1, '虚空长廊', 2400, [
        ...makeGround(2400, GROUND_Y),
        { x: 300, y: 350, width: 130, height: 16, type: 'platform' },
        { x: 750, y: 280, width: 130, height: 16, type: 'platform' },
        { x: 1250, y: 360, width: 120, height: 16, type: 'platform' },
        { x: 500, y: 450, width: 100, height: 16, type: 'platform' },
        { x: 1450, y: 440, width: 110, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'void_wraith', x: 400, y: GROUND_Y - 32, count: 4, delay: 70 },
          { type: 'ancient_golem', x: 800, y: GROUND_Y - 46, count: 1, delay: 130 },
        ]},
        { enemies: [
          { type: 'abyss_knight', x: 900, y: GROUND_Y - 46, count: 3, delay: 90 },
          { type: 'void_wraith', x: 1150, y: 280, count: 3, delay: 120 },
        ]},
        { enemies: [
          { type: 'ancient_golem', x: 500, y: GROUND_Y - 46, count: 2, delay: 100 },
          { type: 'void_wraith', x: 1000, y: GROUND_Y - 32, count: 3, delay: 120 },
          { type: 'abyss_knight', x: 1350, y: GROUND_Y - 46, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'ancient_golem', x: 1450, y: GROUND_Y - 46, count: 1, delay: 90, elite: true },
          { type: 'abyss_knight', x: 1600, y: GROUND_Y - 46, count: 2, delay: 120, elite: true },
        ]},
      ], 13, {
        chests: [
          { x: 340, type: 'gold' },
          { x: 800, type: 'common' },
        ],
        secretArea: {
          entranceX: 1300,
          length: 460,
          platforms: [
            { x: 1310, y: 240, width: 130, height: 16, type: 'platform' },
            { x: 1530, y: 160, width: 150, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1580, type: 'special' }],
          eliteGuards: [{ type: 'ancient_golem', count: 1 }],
          hint: '长廊尽头的虚空在微微扭曲…',
        },
      }),
      makeScene(2, '深渊王座', 2700, [
        ...makeGround(2700, GROUND_Y),
        { x: 250, y: 320, width: 130, height: 16, type: 'platform' },
        { x: 700, y: 380, width: 130, height: 16, type: 'platform' },
        { x: 1200, y: 300, width: 140, height: 16, type: 'platform' },
        { x: 1650, y: 360, width: 130, height: 16, type: 'platform' },
        { x: 950, y: 480, width: 110, height: 16, type: 'platform' },
        { x: 1850, y: 430, width: 120, height: 16, type: 'platform' },
      ], [
        { enemies: [
          { type: 'ancient_golem', x: 350, y: GROUND_Y - 46, count: 2, delay: 110 },
          { type: 'abyss_knight', x: 750, y: GROUND_Y - 46, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'void_wraith', x: 600, y: GROUND_Y - 32, count: 5, delay: 80 },
          { type: 'ancient_golem', x: 1000, y: GROUND_Y - 46, count: 1, delay: 120 },
          { type: 'abyss_knight', x: 1300, y: GROUND_Y - 46, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'ancient_golem', x: 500, y: GROUND_Y - 46, count: 2, delay: 100 },
          { type: 'void_wraith', x: 1100, y: 300, count: 3, delay: 120 },
          { type: 'magma_golem', x: 1500, y: GROUND_Y - 40, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'ancient_golem', x: 1600, y: GROUND_Y - 46, count: 2, delay: 90, elite: true },
          { type: 'void_wraith', x: 1800, y: GROUND_Y - 32, count: 3, delay: 120, elite: true },
          { type: 'abyss_knight', x: 1950, y: GROUND_Y - 46, count: 1, delay: 150, elite: true },
        ]},
      ], 14, {
        chests: [
          { x: 280, type: 'gold' },
          { x: 760, type: 'gold' },
          { x: 1250, type: 'common' },
        ],
        secretArea: {
          entranceX: 1450,
          length: 480,
          platforms: [
            { x: 1460, y: 240, width: 140, height: 16, type: 'platform' },
            { x: 1700, y: 150, width: 150, height: 16, type: 'platform' },
          ],
          chests: [{ x: 1760, type: 'special' }],
          eliteGuards: [{ type: 'ancient_golem', count: 1 }, { type: 'void_wraith', count: 2 }],
          hint: '王座之下，传来水晶的哀鸣…',
        },
      }),
    ],
    boss: BOSS_ABYSS,
    background: { skyColor: '#160a2c', groundColor: '#241232', accentColor: '#0d0518' },
    storyTitle: '终章 · 深渊的真相',
    storyIntro: '四枚碎片合一，世界却没有恢复光明。水晶的黑暗面——那个被封印千年的「灭世」，早已在深渊之下苏醒。它化作深渊主宰，吞噬一切光芒。黎恩握紧剑，带着三只被净化的伙伴，踏入最后的黑暗。',
    storyOutro: '深渊主宰轰然崩解，化作漫天的星屑。黑暗的最深处，一枚纯黑的水晶碎片悬浮着——那竟是完整水晶的最后一块。五枚碎片融为一体，亿万光芒冲天而起。黎恩站在深渊之巅，看见大地重新被阳光笼罩。征途，终于走到了终点。',
    bossDialog: [
      { speaker: '灭世', text: '你来了，黎恩。你净化了四位守护者，却不知道……我就是水晶的意志。' },
      { speaker: '黎恩', text: '不。水晶是带来光明的，而你……是它的阴影！' },
      { speaker: '灭世', text: '光明与黑暗本为一体。来吧，让我看看，你是否愿意为光明付出一切！' },
    ],
    victoryDialog: [
      { speaker: '灭世', text: '有趣……原来我的宿命，是被你这样的人终结。' },
      { speaker: '黎恩', text: '这个世界，不需要吞噬光明的黑暗。' },
      { speaker: '灭世', text: '带走我的最后一丝血脉吧。愿它……不再被深渊束缚。' },
    ],
    mapNode: { x: 88, y: 18, icon: '👿' },
    petReward: PET_ABYSS,
  },
  // ---------- 关卡 6: 金色沙漠 ----------
  {
    id: 5,
    name: '金色沙漠',
    bossName: '沙漠法老王·沙赫特',
    groundY: GROUND_Y,
    levelLength: 6400,
    platforms: [
      ...makeGround(6400, GROUND_Y),
      { x: 300, y: 480, width: 120, height: 14, type: 'platform' },
      { x: 650, y: 420, width: 100, height: 14, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'scorpion', x: 350, y: GROUND_Y - 24, count: 3, delay: 60 },
        { type: 'dune_wolf', x: 520, y: GROUND_Y - 26, count: 2, delay: 90 },
      ]},
    ],
    scenes: [
      makeScene(0, '沙丘古道', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 300, y: 480, width: 120, height: 14, type: 'platform' },
        { x: 650, y: 420, width: 100, height: 14, type: 'platform' },
        { x: 420, y: 350, width: 90, height: 14, type: 'platform' },
        { x: 850, y: 500, width: 110, height: 14, type: 'platform' },
        { x: 1100, y: 430, width: 120, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'scorpion', x: 350, y: GROUND_Y - 24, count: 3, delay: 60 },
          { type: 'dune_wolf', x: 520, y: GROUND_Y - 26, count: 2, delay: 90 },
        ]},
        { enemies: [
          { type: 'dune_wolf', x: 800, y: GROUND_Y - 26, count: 3, delay: 80 },
          { type: 'scorpion', x: 950, y: GROUND_Y - 24, count: 2, delay: 100 },
        ]},
        { enemies: [
          { type: 'sand_wraith', x: 1100, y: 400, count: 2, delay: 130 },
          { type: 'scorpion', x: 1250, y: GROUND_Y - 24, count: 3, delay: 90 },
          { type: 'dune_wolf', x: 1400, y: GROUND_Y - 26, count: 1, delay: 120 },
        ]},
        { enemies: [
          { type: 'scorpion', x: 1500, y: GROUND_Y - 24, count: 2, delay: 80, elite: true },
          { type: 'sand_wraith', x: 1650, y: 400, count: 2, delay: 110, elite: true },
        ]},
      ], 15, {
        chests: [
          { x: 280, type: 'gold' },
          { x: 620, type: 'common' },
        ],
        obstacles: [
          { x: 460, type: 'quicksand' },
          { x: 900, type: 'quicksand' },
          { x: 1400, type: 'quicksand' },
        ],
        secretArea: {
          entranceX: 1200,
          length: 420,
          platforms: [
            { x: 1210, y: 360, width: 130, height: 14, type: 'platform' },
            { x: 1390, y: 280, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1450, type: 'special' }],
          eliteGuards: [{ type: 'sand_wraith', count: 1 }],
          hint: '流沙之下似乎藏着古墓入口…',
        },
      }),
      makeScene(1, '风蚀废墟', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 250, y: 440, width: 120, height: 14, type: 'platform' },
        { x: 700, y: 380, width: 110, height: 14, type: 'platform' },
        { x: 1150, y: 430, width: 130, height: 14, type: 'platform' },
        { x: 500, y: 490, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 470, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'sand_wraith', x: 320, y: 400, count: 2, delay: 120 },
          { type: 'scorpion', x: 550, y: GROUND_Y - 24, count: 3, delay: 80 },
        ]},
        { enemies: [
          { type: 'dune_wolf', x: 800, y: GROUND_Y - 26, count: 3, delay: 70 },
          { type: 'sand_wraith', x: 1000, y: 380, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'scorpion', x: 500, y: GROUND_Y - 24, count: 2, delay: 90 },
          { type: 'sand_wraith', x: 900, y: 400, count: 3, delay: 110 },
          { type: 'dune_wolf', x: 1300, y: GROUND_Y - 26, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'dune_wolf', x: 1500, y: GROUND_Y - 26, count: 2, delay: 80, elite: true },
          { type: 'scorpion', x: 1650, y: GROUND_Y - 24, count: 2, delay: 100, elite: true },
        ]},
      ], 16, {
        chests: [
          { x: 260, type: 'common' },
          { x: 720, type: 'gold' },
        ],
        obstacles: [
          { x: 480, type: 'quicksand' },
          { x: 920, type: 'quicksand' },
          { x: 1450, type: 'quicksand' },
        ],
        secretArea: {
          entranceX: 1350,
          length: 420,
          platforms: [
            { x: 1360, y: 340, width: 130, height: 14, type: 'platform' },
            { x: 1540, y: 260, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1600, type: 'special' }],
          eliteGuards: [{ type: 'scorpion', count: 2 }],
          hint: '风化的石柱后传来沙沙声…',
        },
      }),
      makeScene(2, '法老陵墓', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 260, y: 400, width: 130, height: 14, type: 'platform' },
        { x: 680, y: 330, width: 120, height: 14, type: 'platform' },
        { x: 1100, y: 380, width: 140, height: 14, type: 'platform' },
        { x: 460, y: 470, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 440, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'sand_wraith', x: 300, y: 380, count: 3, delay: 110 },
          { type: 'scorpion', x: 600, y: GROUND_Y - 24, count: 2, delay: 80 },
        ]},
        { enemies: [
          { type: 'dune_wolf', x: 900, y: GROUND_Y - 26, count: 2, delay: 90 },
          { type: 'sand_wraith', x: 1050, y: 340, count: 3, delay: 120 },
        ]},
        { enemies: [
          { type: 'scorpion', x: 500, y: GROUND_Y - 24, count: 3, delay: 70 },
          { type: 'dune_wolf', x: 850, y: GROUND_Y - 26, count: 2, delay: 100 },
          { type: 'sand_wraith', x: 1200, y: 380, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'sand_wraith', x: 1450, y: 340, count: 2, delay: 90, elite: true },
          { type: 'scorpion', x: 1600, y: GROUND_Y - 24, count: 2, delay: 110, elite: true },
          { type: 'dune_wolf', x: 1720, y: GROUND_Y - 26, count: 1, delay: 130, elite: true },
        ]},
      ], 17, {
        chests: [
          { x: 270, type: 'gold' },
          { x: 700, type: 'gold' },
        ],
        obstacles: [
          { x: 480, type: 'quicksand' },
          { x: 920, type: 'quicksand' },
          { x: 1580, type: 'quicksand' },
        ],
        secretArea: {
          entranceX: 1500,
          length: 440,
          platforms: [
            { x: 1510, y: 320, width: 140, height: 14, type: 'platform' },
            { x: 1700, y: 240, width: 150, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1760, type: 'special' }],
          eliteGuards: [{ type: 'sand_wraith', count: 2 }],
          hint: '金色圣甲虫指引着密室的方向…',
        },
      }),
    ],
    boss: BOSS_SAND,
    background: { skyColor: '#f7c55e', groundColor: '#d9a13b', accentColor: '#7c4a12' },
    storyTitle: '第六章 · 黄金沙海',
    storyIntro: '穿过深渊的缝隙，黎恩来到烈日炙烤的金色沙海。古老的沙之王国曾在这里繁荣，如今只剩风蚀的废墟与沉睡的法老诅咒。沙丘之下，第五枚碎片的回响若隐若现。',
    storyOutro: '法老王轰然崩解，化作漫天的金沙。一尊古棺在沙海中升起，第五枚水晶碎片静静躺在其中。沙之灵「砾」从碎片中苏醒，盘旋在黎恩肩头。然而天空之上，一道更耀眼的光芒正在逼近——',
    bossDialog: [
      { speaker: '沙赫特', text: '闯入者！我守护这片沙海已有千年，法老的威严不容亵渎！' },
      { speaker: '黎恩', text: '千年……你连自己守护的是什么，都已经忘了吗？' },
      { speaker: '沙赫特', text: '住口！让我用沙暴，将你永远埋葬！' },
    ],
    victoryDialog: [
      { speaker: '沙赫特', text: '原来……我一直守着的，是渴望被解放的光明。' },
      { speaker: '黎恩', text: '你的守护结束了，法老。请让这片沙海重见天日。' },
      { speaker: '沙赫特', text: '带走我的化身「砾」吧。它比我，更渴望自由。' },
    ],
    mapNode: { x: 70, y: 20, icon: '🏜️' },
    petReward: PET_SAND,
  },
  // ---------- 关卡 7: 浮空云巅 ----------
  {
    id: 6,
    name: '浮空云巅',
    bossName: '苍穹霸主·艾拉',
    groundY: GROUND_Y,
    levelLength: 6400,
    platforms: [
      ...makeGround(6400, GROUND_Y),
      { x: 300, y: 440, width: 120, height: 14, type: 'platform' },
      { x: 680, y: 360, width: 110, height: 14, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'harpy', x: 350, y: 300, count: 3, delay: 90 },
        { type: 'cloud_imp', x: 520, y: 360, count: 2, delay: 120 },
      ]},
    ],
    scenes: [
      makeScene(0, '云海浮岛', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 300, y: 440, width: 120, height: 14, type: 'platform' },
        { x: 680, y: 360, width: 110, height: 14, type: 'platform' },
        { x: 420, y: 300, width: 90, height: 14, type: 'platform' },
        { x: 900, y: 470, width: 110, height: 14, type: 'platform' },
        { x: 1150, y: 390, width: 120, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'harpy', x: 350, y: 300, count: 3, delay: 90 },
          { type: 'cloud_imp', x: 520, y: 360, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'sky_raptor', x: 850, y: 380, count: 2, delay: 110 },
          { type: 'harpy', x: 1000, y: 300, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'cloud_imp', x: 600, y: 360, count: 3, delay: 100 },
          { type: 'harpy', x: 950, y: 280, count: 2, delay: 120 },
          { type: 'sky_raptor', x: 1250, y: 380, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'sky_raptor', x: 1450, y: 360, count: 2, delay: 90, elite: true },
          { type: 'cloud_imp', x: 1600, y: 300, count: 2, delay: 120, elite: true },
        ]},
      ], 18, {
        chests: [
          { x: 280, type: 'gold' },
          { x: 640, type: 'common' },
        ],
        secretArea: {
          entranceX: 1250,
          length: 420,
          platforms: [
            { x: 1260, y: 320, width: 130, height: 14, type: 'platform' },
            { x: 1440, y: 240, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1500, type: 'special' }],
          eliteGuards: [{ type: 'harpy', count: 2 }],
          hint: '浮岛之间有一条隐秘的云桥…',
        },
      }),
      makeScene(1, '风暴云渊', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 260, y: 420, width: 120, height: 14, type: 'platform' },
        { x: 700, y: 350, width: 110, height: 14, type: 'platform' },
        { x: 1150, y: 400, width: 130, height: 14, type: 'platform' },
        { x: 500, y: 470, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 440, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'cloud_imp', x: 320, y: 360, count: 3, delay: 100 },
          { type: 'sky_raptor', x: 550, y: 380, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'harpy', x: 820, y: 300, count: 3, delay: 90 },
          { type: 'cloud_imp', x: 1000, y: 350, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'sky_raptor', x: 500, y: 380, count: 2, delay: 100 },
          { type: 'harpy', x: 950, y: 300, count: 2, delay: 120 },
          { type: 'cloud_imp', x: 1300, y: 350, count: 3, delay: 140 },
        ]},
        { enemies: [
          { type: 'harpy', x: 1520, y: 300, count: 2, delay: 90, elite: true },
          { type: 'cloud_imp', x: 1680, y: 340, count: 2, delay: 110, elite: true },
        ]},
      ], 19, {
        chests: [
          { x: 260, type: 'common' },
          { x: 720, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1380,
          length: 420,
          platforms: [
            { x: 1390, y: 300, width: 130, height: 14, type: 'platform' },
            { x: 1570, y: 220, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1630, type: 'special' }],
          eliteGuards: [{ type: 'sky_raptor', count: 1 }],
          hint: '雷云深处有电光闪烁…',
        },
      }),
      makeScene(2, '苍穹神殿', 2100, [
        ...makeGround(2100, GROUND_Y),
        { x: 260, y: 380, width: 130, height: 14, type: 'platform' },
        { x: 700, y: 300, width: 120, height: 14, type: 'platform' },
        { x: 1100, y: 360, width: 140, height: 14, type: 'platform' },
        { x: 460, y: 450, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 420, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'sky_raptor', x: 300, y: 360, count: 3, delay: 100 },
          { type: 'cloud_imp', x: 600, y: 320, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'harpy', x: 900, y: 300, count: 3, delay: 90 },
          { type: 'cloud_imp', x: 1050, y: 320, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'cloud_imp', x: 500, y: 340, count: 2, delay: 100 },
          { type: 'sky_raptor', x: 900, y: 360, count: 2, delay: 120 },
          { type: 'harpy', x: 1250, y: 300, count: 3, delay: 140 },
        ]},
        { enemies: [
          { type: 'cloud_imp', x: 1450, y: 320, count: 2, delay: 90, elite: true },
          { type: 'harpy', x: 1600, y: 300, count: 2, delay: 110, elite: true },
          { type: 'sky_raptor', x: 1720, y: 360, count: 1, delay: 130, elite: true },
        ]},
      ], 20, {
        chests: [
          { x: 270, type: 'gold' },
          { x: 700, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1500,
          length: 440,
          platforms: [
            { x: 1510, y: 280, width: 140, height: 14, type: 'platform' },
            { x: 1700, y: 200, width: 150, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1760, type: 'special' }],
          eliteGuards: [{ type: 'cloud_imp', count: 2 }],
          hint: '神殿穹顶的圣光指引着密道…',
        },
      }),
    ],
    boss: BOSS_SKY,
    background: { skyColor: '#dff0ff', groundColor: '#8ec5e8', accentColor: '#4a7ab0' },
    storyTitle: '第七章 · 苍穹之上',
    storyIntro: '风托起黎恩的衣袍，将他送向云海之巅。漂浮的岛屿之间，天空之城若隐若现。最后两枚碎片的共鸣越来越强烈——守护它们的，是俯瞰大地的苍穹霸主。',
    storyOutro: '苍穹霸主的身影化作漫天流云，第七枚碎片在神殿中央绽放出耀眼的白光。云之灵「霄」乘着雷电落在黎恩肩头。此刻，所有碎片都指向同一个方向——那座沐浴在夕阳下的王者之城。',
    bossDialog: [
      { speaker: '艾拉', text: '凡人……是谁允许你踏上我的天空？' },
      { speaker: '黎恩', text: '我来取回属于光明的碎片。它不该被囚禁在风暴里。' },
      { speaker: '艾拉', text: '狂妄！就让苍穹的审判，让你坠落！' },
    ],
    victoryDialog: [
      { speaker: '艾拉', text: '千年的守望……原来只是为了等一个能拨开乌云的人。' },
      { speaker: '黎恩', text: '请让阳光重新洒落这片天空吧。' },
      { speaker: '艾拉', text: '愿我的化身「霄」，替你照亮前方的道路。' },
    ],
    mapNode: { x: 80, y: 30, icon: '☁️' },
    petReward: PET_SKY,
  },
  // ---------- 关卡 8: 王者城堡 ----------
  {
    id: 7,
    name: '王者城堡',
    bossName: '黑暗皇帝·墨格拉',
    groundY: GROUND_Y,
    levelLength: 6600,
    platforms: [
      ...makeGround(6600, GROUND_Y),
      { x: 300, y: 460, width: 120, height: 14, type: 'platform' },
      { x: 680, y: 380, width: 110, height: 14, type: 'platform' },
    ],
    waves: [
      { enemies: [
        { type: 'castle_guard', x: 350, y: GROUND_Y - 46, count: 2, delay: 80 },
        { type: 'gargoyle', x: 520, y: GROUND_Y - 34, count: 2, delay: 110 },
      ]},
    ],
    scenes: [
      makeScene(0, '城堡前庭', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 300, y: 460, width: 120, height: 14, type: 'platform' },
        { x: 680, y: 380, width: 110, height: 14, type: 'platform' },
        { x: 430, y: 320, width: 90, height: 14, type: 'platform' },
        { x: 900, y: 490, width: 110, height: 14, type: 'platform' },
        { x: 1150, y: 410, width: 120, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'castle_guard', x: 350, y: GROUND_Y - 46, count: 2, delay: 80 },
          { type: 'gargoyle', x: 520, y: GROUND_Y - 34, count: 2, delay: 110 },
        ]},
        { enemies: [
          { type: 'cursed_knight', x: 850, y: GROUND_Y - 46, count: 1, delay: 120 },
          { type: 'castle_guard', x: 1000, y: GROUND_Y - 46, count: 2, delay: 140 },
        ]},
        { enemies: [
          { type: 'gargoyle', x: 600, y: GROUND_Y - 34, count: 3, delay: 100 },
          { type: 'castle_guard', x: 950, y: GROUND_Y - 46, count: 2, delay: 120 },
          { type: 'cursed_knight', x: 1250, y: GROUND_Y - 46, count: 1, delay: 150 },
        ]},
        { enemies: [
          { type: 'cursed_knight', x: 1450, y: GROUND_Y - 46, count: 1, delay: 100, elite: true },
          { type: 'gargoyle', x: 1600, y: GROUND_Y - 34, count: 2, delay: 120, elite: true },
        ]},
      ], 21, {
        chests: [
          { x: 280, type: 'gold' },
          { x: 640, type: 'common' },
        ],
        secretArea: {
          entranceX: 1300,
          length: 420,
          platforms: [
            { x: 1310, y: 340, width: 130, height: 14, type: 'platform' },
            { x: 1490, y: 260, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1550, type: 'special' }],
          eliteGuards: [{ type: 'castle_guard', count: 1 }],
          hint: '城墙的砖缝里透出幽光…',
        },
      }),
      makeScene(1, '王座回廊', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 260, y: 440, width: 120, height: 14, type: 'platform' },
        { x: 700, y: 370, width: 110, height: 14, type: 'platform' },
        { x: 1150, y: 420, width: 130, height: 14, type: 'platform' },
        { x: 500, y: 480, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 450, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'cursed_knight', x: 320, y: GROUND_Y - 46, count: 2, delay: 110 },
          { type: 'gargoyle', x: 550, y: GROUND_Y - 34, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'castle_guard', x: 820, y: GROUND_Y - 46, count: 3, delay: 90 },
          { type: 'cursed_knight', x: 1000, y: GROUND_Y - 46, count: 1, delay: 130 },
        ]},
        { enemies: [
          { type: 'gargoyle', x: 500, y: GROUND_Y - 34, count: 2, delay: 100 },
          { type: 'cursed_knight', x: 900, y: GROUND_Y - 46, count: 2, delay: 120 },
          { type: 'castle_guard', x: 1300, y: GROUND_Y - 46, count: 2, delay: 150 },
        ]},
        { enemies: [
          { type: 'castle_guard', x: 1520, y: GROUND_Y - 46, count: 2, delay: 90, elite: true },
          { type: 'gargoyle', x: 1680, y: GROUND_Y - 34, count: 2, delay: 110, elite: true },
        ]},
      ], 22, {
        chests: [
          { x: 260, type: 'common' },
          { x: 720, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1380,
          length: 420,
          platforms: [
            { x: 1390, y: 320, width: 130, height: 14, type: 'platform' },
            { x: 1570, y: 240, width: 140, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1630, type: 'special' }],
          eliteGuards: [{ type: 'cursed_knight', count: 1 }],
          hint: '烛火摇曳的回廊尽头有暗门…',
        },
      }),
      makeScene(2, '魔王大殿', 2200, [
        ...makeGround(2200, GROUND_Y),
        { x: 260, y: 400, width: 130, height: 14, type: 'platform' },
        { x: 700, y: 320, width: 120, height: 14, type: 'platform' },
        { x: 1100, y: 380, width: 140, height: 14, type: 'platform' },
        { x: 460, y: 470, width: 90, height: 14, type: 'platform' },
        { x: 1400, y: 430, width: 110, height: 14, type: 'platform' },
      ], [
        { enemies: [
          { type: 'cursed_knight', x: 300, y: GROUND_Y - 46, count: 2, delay: 100 },
          { type: 'gargoyle', x: 600, y: GROUND_Y - 34, count: 2, delay: 120 },
        ]},
        { enemies: [
          { type: 'castle_guard', x: 900, y: GROUND_Y - 46, count: 2, delay: 100 },
          { type: 'cursed_knight', x: 1050, y: GROUND_Y - 46, count: 2, delay: 130 },
        ]},
        { enemies: [
          { type: 'gargoyle', x: 500, y: GROUND_Y - 34, count: 3, delay: 90 },
          { type: 'castle_guard', x: 950, y: GROUND_Y - 46, count: 2, delay: 120 },
          { type: 'cursed_knight', x: 1300, y: GROUND_Y - 46, count: 2, delay: 150 },
        ]},
        { enemies: [
          { type: 'cursed_knight', x: 1450, y: GROUND_Y - 46, count: 2, delay: 90, elite: true },
          { type: 'gargoyle', x: 1620, y: GROUND_Y - 34, count: 2, delay: 110, elite: true },
          { type: 'castle_guard', x: 1780, y: GROUND_Y - 46, count: 1, delay: 130, elite: true },
        ]},
      ], 23, {
        chests: [
          { x: 270, type: 'gold' },
          { x: 700, type: 'gold' },
        ],
        secretArea: {
          entranceX: 1500,
          length: 440,
          platforms: [
            { x: 1510, y: 300, width: 140, height: 14, type: 'platform' },
            { x: 1700, y: 220, width: 150, height: 14, type: 'platform' },
          ],
          chests: [{ x: 1760, type: 'special' }],
          eliteGuards: [{ type: 'cursed_knight', count: 2 }],
          hint: '王座背后，传来水晶的低语…',
        },
      }),
    ],
    boss: BOSS_CASTLE,
    background: { skyColor: '#4a4a56', groundColor: '#2a2a34', accentColor: '#141418' },
    storyTitle: '终章 · 王者陨落',
    storyIntro: '夕阳沉入地平线，最后的光明被王城的阴影吞噬。八枚碎片齐聚的这一刻，黑暗皇帝终于现身——他既是这座城堡的主人，也是所有黑暗的源头。黎恩握紧长剑，身后站着七位被净化的伙伴。',
    storyOutro: '黑暗皇帝的王冠落地，裂成两半。八枚水晶碎片从大殿各处飞起，在他崩解的身躯上方聚合成完整的圣水晶。亿万光芒冲天而起，穿透王城的穹顶，洒向大地。黎恩抬头，看见阳光重新笼罩了世界——征途，终于走到了终点。',
    bossDialog: [
      { speaker: '墨格拉', text: '黎恩……你终于来了。八枚碎片齐聚，这一场千年棋局，该收官了。' },
      { speaker: '黎恩', text: '墨格拉，你吞噬了那么多光明，现在，该把一切都还回来了！' },
      { speaker: '墨格拉', text: '那就用你的剑，来证明这世界的价值吧！' },
    ],
    victoryDialog: [
      { speaker: '墨格拉', text: '我败了……原来真正的黑暗，是孤独与恐惧本身。' },
      { speaker: '黎恩', text: '这个世界不需要恐惧的统治者。愿光明与你同在。' },
      { speaker: '墨格拉', text: '带走我的最后一丝意志「辉」吧。它本该属于光明。' },
    ],
    mapNode: { x: 88, y: 18, icon: '👑' },
    petReward: PET_CASTLE,
  },






]

// ==================== 全部宠物配置 ====================
export const ALL_PETS: PetConfig[] = [PET_SLIME, PET_SHADOW, PET_DEMON, PET_FROST, PET_ABYSS, PET_SAND, PET_SKY, PET_CASTLE]
