class level_1 extends Phaser.Scene {
    levelToLoad
    constructor() {
        super('level_1')
    }

    preload() {
        this.load.image('star', 'assets/star_gold.png');
      
        this.load.atlas('playerSprite', 'assets/characters/LightBandit.png', 
        'assets/characters/player_1_spr.json');
      
        this.load.image('tiles', 'assets/maps/tilesets/fantasy_tiles_backless.png');
        this.load.tilemapTiledJSON('tilemap', 'assets/maps/tilemaps/WG2_Level.json');
      }
      
      /** functions for each individual player */
    create() {
        this.levelToLoad = 'level_2';

        var self = this;
        this.socket = io();
        this.players = this.add.group();
        this.recHitboxes = this.add.group();
        attacking = false;
      
        this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
        this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });
      
        /** Create map */
        const map = this.make.tilemap({ key: 'tilemap', tileWidth: 32, tileHeight: 32 })
        const tileset = map.addTilesetImage('fantasy_tiles_backless', 'tiles')
      
        const groundLayer = map.createDynamicLayer('Platform_Layer', tileset, 0, 0)
        const backLayer = map.createStaticLayer('Background_Layer', tileset)
      
        setupAnims(self);
      
        /** Display all players */
        this.socket.on('currentPlayers', function (players) {
          Object.keys(players).forEach(function (id) {
            if (players[id].playerId === self.socket.id) {
              displayPlayers(self, players[id], 'playerSprite');
            } else {
              displayPlayers(self, players[id], 'playerSprite');
            }
          });
        });
      
        this.socket.on('newPlayer', function (playerInfo) {
          displayPlayers(self, playerInfo, 'playerSprite');
          
        });
      
        this.socket.on('disconnect', function (playerId) {
          self.players.getChildren().forEach(function (player) {
            if (playerId === player.playerId) {
              player.destroy();
            }
          });
        });
      
        this.socket.on('playerUpdates', function (players) {
          Object.keys(players).forEach(function (id) {
            self.players.getChildren().forEach(function (player) {
              if (players[id].playerId === player.playerId) {
                player.setRotation(players[id].rotation);
                player.setPosition(players[id].x, players[id].y);
                player.setFlipX(players[id].flipX);
                attacking = players[id].attacking;
      
                if (players[id].anim !== player.anim) {
                  player.anims.play(players[id].anim, players[id].loopAnim);
                }
      
                if (players[id].invincible && player.anims.currentFrame.index > 2) {
                  // set invincible to false
                }
      
                if (players[id].attacking) {
                  player.anims.play('atk_anim', true);
                  if(player.anims.currentFrame.index > 3 && player.anims.currentFrame.index < 7) {
                    //self.socket.emit('activateHitbox');
                    moveHitbox(self, players[id]);
                  }
                  if(player.anims.currentFrame.index > 7) {
                    self.socket.emit('setAttack');
                  }
                }
              }
            });
          });
        });
      
        this.socket.on('updateScore', function (scores) {
          self.blueScoreText.setText('Blue: ' + scores.blue);
          self.redScoreText.setText('Red: ' + scores.red);
        });
      
        this.socket.on('starLocation', function (starLocation) {
          if (!self.star) {
            self.star = self.add.image(starLocation.x, starLocation.y, 'star');
          } else {
            self.star.setPosition(starLocation.x, starLocation.y);
          }
        });

        this.socket.on('sceneChange', function () {
          self.scene.start(self.levelToLoad);
        })
      
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.leftKeyPressed = false;
        this.rightKeyPressed = false;
        this.upKeyPressed = false;
        this.keyApressed = false;
        this.keyDpressed = false;
      }
      
    update() {
      //#region Controls
        const left = this.leftKeyPressed;
        const right = this.rightKeyPressed;
        const up = this.upKeyPressed;
        const keyA = this.keyApressed;
        const keyD = this.keyDpressed;
        const keyX = this.keyXpressed;
      
        if (this.cursors.left.isDown) {
          this.leftKeyPressed = true;
          
        } else if (this.cursors.right.isDown) {
          this.rightKeyPressed = true;
        } else {
          this.leftKeyPressed = false;
          this.rightKeyPressed = false;
        }
      
        if (this.cursors.up.isDown) {
          this.upKeyPressed = true;
        } else {
          this.upKeyPressed = false;
        }
      
        if (this.keyA.isDown) {
          this.keyApressed = true;
        } else {
          this.keyApressed = false;
        }
        
        if (this.keyD.isDown) {
          this.keyDpressed = true;
        } else {
          this.keyDpressed = false;
        }
        
        if (left !== this.leftKeyPressed || right !== this.rightKeyPressed || up !== this.upKeyPressed || keyA !== this.keyApressed || keyD !== this.keyDpressed) {
          this.socket.emit('playerInput', { left: this.leftKeyPressed , right: this.rightKeyPressed, up: this.upKeyPressed, keyA: this.keyApressed, keyD: this.keyDpressed });
        }
      //#endregion
      }
}

function setupAnims(self) {
    self.anims.create({ 
      key: 'idle_anim', 
      frames: self.anims.generateFrameNames('playerSprite', 
      { 
          prefix: 'idle_sprite0', 
          end: 4, 
      }), 
      frameRate: 6,
      repeat: -1 
  });

  self.anims.create({
      key: 'hostile_anim',
      frames: self.anims.generateFrameNames('playerSprite',
      {
          prefix: 'hostile_sprite0',
          end: 4,
      }),
      frameRate: 6,
      repeat: -1
  });

  self.anims.create({ 
      key: 'run_anim', 
      frames: self.anims.generateFrameNames('playerSprite', 
      { 
          prefix: 'run_sprite0', 
          end: 8,
      }), 
      frameRate: 6,
      repeat: -1
  });

  self.anims.create({
      key: 'atk_anim',
      frames: self.anims.generateFrameNames('playerSprite',
      {
          prefix: 'attack_sprite0',
          end: 8,
      }),
      frameRate: 6,
      repeat: 0
  });

  self.anims.create({
      key: 'death_anim',
      frames: self.anims.generateFrameNames('playerSprite',
      {
          prefix: 'death_sprite0',
          end: 9,
      }),
      frameRate: 6,
      repeat: 0,
      hideOnComplete: true
  });

  self.anims.create({
      key: 'jump_anim',
      frames: self.anims.generateFrameNames('playerSprite',
      {
          prefix: 'jump_sprite0',
          end: 1,
      }),
      repeat: -1
  });

  self.anims.create({
      key: 'hit_anim',
      frames: self.anims.generateFrameNames('playerSprite',
      {
          prefix: 'hit_sprite0',
          end: 2,
      }),
      frameRate: 2,
      repeat: 0
  });
}

function displayPlayers(self, playerInfo, sprite) {
const player = self.add.sprite(playerInfo.x, playerInfo.y, sprite).setOrigin(0.5, 0.5);
player.setSize(playerInfo.width, 40, true);
const recHitbox = self.add.rectangle(0, 0, 28, 38, 0xffffff, 0.5).setOrigin(0, 0.5);
if (playerInfo.team === 'blue') player.setTint(0x0000ff);
else player.setTint(0xff0000);
player.playerId = playerInfo.playerId;
recHitbox.playerId = playerInfo.playerId;
self.players.add(player);
self.recHitboxes.add(recHitbox);
}

function moveHitbox(self, playerInfo) {
self.recHitboxes.getChildren().forEach((recHitbox) => {
  if (recHitbox.playerId === playerInfo.playerId) {
    recHitbox.flipX = playerInfo.flipX;
    recHitbox.setPosition(playerInfo.x, playerInfo.y);
  }
});
}