var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  scene: [level_1]
};

var game = new Phaser.Game(config);
var attacking;