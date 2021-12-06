const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  scene: [level_1],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 150 }
    }
  },
  autoFocus: false
};

const game = new Phaser.Game(config);
window.gameLoaded();