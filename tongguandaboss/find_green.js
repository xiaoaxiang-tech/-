const fs = require('fs');
const files = ['src/components/GameCanvas.vue', 'src/game/scenes/GameScene.ts', 'src/game/entities/Enemy.ts', 'src/views/GameView.vue'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('fill') && (l.includes('34D') || l.includes('5D5') || l.includes('0f0') || l.includes('green') || l.includes('lime') || l.includes('4CA') || l.includes('8BC') || l.includes('C0C') || l.includes('0F0') || l.includes('slime') || l.includes('circle'))) {
        console.log(f + ':' + (i + 1) + ':' + l.trim());
      }
    });
  }
});
