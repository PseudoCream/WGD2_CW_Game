const players = {};
const recHitboxes = [];
const speed = 100;
const jumpForce = 150;
var playersSize = 0;
var attacking;

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
  
create() {
  
    const self = this;
    this.players = this.physics.add.group();
    this.recHitboxes = this.physics.add.group();
  
    this.physics.world.setBounds(0, 0, config.width, config.height);
  
    
    this.scores = {
      blue: 0,
      red: 0
    };
    
    /** Create map */
    const map = this.make.tilemap({ key: 'tilemap', tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage('fantasy_tiles_backless', 'tiles');
    
    const groundLayer = map.createDynamicLayer('Platform_Layer', tileset, 0, 0);
    const backLayer = map.createStaticLayer('Background_Layer', tileset);
    
    groundLayer.setCollisionByProperty({ collides: true });
  
  //#region star collecting
    this.star = this.physics.add.image(randomPosition(700), randomPosition(500), 'star');
    this.physics.add.collider(this.players);
    this.physics.add.collider(this.recHitboxes);
  
    this.physics.add.overlap(this.players, this.recHitboxes, function (recHitbox, player) {
      if (recHitboxes[player.playerId].playerId !== players[player.playerId].playerId) {
        if (!players[player.playerId].invincible) {
          players[player.playerId].health -= 50;
          players[player.playerId].anim = 'hit_anim';
          players[player.playerId].invincible = true;
          console.log(players[player.playerId].health);
          if (players[player.playerId].health <= 0) {
            // Death logic          }
          }
        }
      }
    });
  
    this.physics.add.overlap(this.players, this.star, function (star, player) {
      if (players[player.playerId].team === 'red') {
        self.scores.red += 10;
      } else {
        self.scores.blue += 10;
      }
      self.star.setPosition(randomPosition(700), randomPosition(500));
      io.emit('updateScore', self.scores);
      io.emit('starLocation', { x: self.star.x, y: self.star.y });
    });
  //#endregion
  
    io.on('connection', function (socket) {
      playersSize += 1;
      if (playersSize <= 4) {
        console.log('Number of users connected: ' + playersSize);
        // create a new player and add it to our players object
        players[socket.id] = {
          rotation: 0,
          x: 300 + (playersSize * 40),
          y: 100,
          playerId: socket.id,
          team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
          health: 100,
          invincible: false,
          dead: false,
          attacking: false,
          grounded: false,
          loopAnim: false,
          anim: 'idle_anim',
          curFrame: 0,
          input: {
            left: false,
            right: false,
            up: false,
            keyA: false,
            keyD: false
          }
        };
  
        recHitboxes[socket.id] = {
          playerId: socket.id
        };
  
        // add player & their hitbox to server
        addPlayer(self, players[socket.id]);
        // setup collision for players
        playerCollision(self, groundLayer);
        // send the players object to the new player
        socket.emit('currentPlayers', players);
        // update all other players of the new player
        socket.broadcast.emit('newPlayer', players[socket.id]);
        // send the star object to the new player
        socket.emit('starLocation', { x: self.star.x, y: self.star.y });
        // send the current scores
        socket.emit('updateScore', self.scores);
  
        socket.on('disconnect', function () {
          if (playersSize > 0) {
            playersSize -= 1;
          }
          console.log('user disconnected');
          // remove player from server
          removePlayer(self, socket.id);
          // remove this player from our players object
          delete players[socket.id];
          // emit a message to all players to remove this player
          io.emit('disconnect', socket.id);
        });
  
        // when a player moves, update the player data
        socket.on('playerInput', function (inputData) {
          handlePlayerInput(self, socket.id, inputData);
        });
  
        socket.on('currentFrame', function (index) {
          setFrame(self, socket.id, index);
        });
  
        // when an attack animation is finished, update data
        socket.on('setAttack', function () {
          setAttacking(self, socket.id);
        });
      }
    });
  }
  
update() {
    this.players.getChildren().forEach((player) => {
      const input = players[player.playerId].input;
      attacking = players[player.playerId].attacking;
  
      if (!attacking && !player.dead) {
        if (input.left) {
          player.body.setVelocityX(-speed);
          player.flipX = false;
          if (!player.body.onFloor()) {
            player.anim = 'jump_anim';
          } else {
            player.anim = 'run_anim';
          }
          player.loopAnim = true;
        } else if (input.right) {
          player.body.setVelocityX(speed);
          player.flipX = true;
          if (!player.body.onFloor()) {
            player.anim = 'jump_anim';
          } else {
            player.anim = 'run_anim';
          }
          player.loopAnim = true;
        } else if (player.body.onFloor()) {
          player.body.setVelocityX(0);
          player.anim = 'idle_anim';
          player.loopAnim = true;
        }
  
        if (player.body.onFloor() && input.up) {
          player.body.setVelocityY(-jumpForce);
          player.anim = 'jump_anim';
        }
    
        if (input.keyA) {
          //console.log(`Player ${playersSize} attacked`);
          player.body.setVelocityX(0);
          player.body.setVelocityY(0);
          player.anim = 'atk_anim';
          attacking = true;
          player.loopAnim = true; 
          recHitboxes[player.playerId].x = player.x;
          recHitboxes[player.playerId].y = player.y;      
          console.log(players[player.playerId].health);
        }
      }
  
      if (input.keyD) {
        console.log(players[player.playerId].hit);
      }
  
      players[player.playerId].x = player.x;
      players[player.playerId].y = player.y;
      players[player.playerId].rotation = player.rotation;
      players[player.playerId].flipX = player.flipX;
      players[player.playerId].anim = player.anim;
      players[player.playerId].loopAnim = player.loopAnim;
      players[player.playerId].curFrame = player.curFrame;
      players[player.playerId].attacking = attacking;
    });
  
    io.emit('playerUpdates', players);
  }
}

function randomPosition(max) {
    return Math.floor(Math.random() * max) + 50;
  }
  
function handlePlayerInput(self, playerId, input) {
    self.players.getChildren().forEach((player) => {
      if (playerId === player.playerId) {
        players[player.playerId].input = input;
      }
    });
  }
  
function setAttacking(self, playerId) {
    self.players.getChildren().forEach((player) => {
      if (playerId === player.playerId) {
        players[player.playerId].attacking = false;
      }
    });
  }
  
function addPlayer(self, playerInfo) {
    const player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'playerSprite').setOrigin(0.5, 0.5);
    player.setSize(playerInfo.width, 40, true);
    player.body.collideWorldBounds = false;
    player.body.onWorldBounds = true;
    player.playerId = playerInfo.playerId;
    self.players.add(player);
  
    const hit  = self.add.rectangle(0, 0, 13, 37, 0xffffff, 0.5);
    self.physics.add.existing(hit);
    hit.playerId = playerInfo.playerId;
    self.recHitboxes.add(hit);
  
    console.log(`Player Sprite: ${player}, Hitbox Sprite: ${hit}`);
  }
  
  
  
function playerCollision(self, groundLayer) {
    self.physics.add.collider(self.players, groundLayer);    // Add collision with ground
  }
  
function countTheDead(self) {
    var dead = 0;
    self.players.getChildren().forEach((player) => {
      if (playerId === player.playerId) {
        if (player.dead) {
          dead += 1;
        }
      }
    });
  
    if (dead >= 4) {
      //self.scene.start(this.levelToLoad)
    }
  }
  
function removePlayer(self, playerId) {
    self.players.getChildren().forEach((player) => {
      if (playerId === player.playerId) {
        player.destroy();
      }
    });
  
    self.recHitboxes.getChildren().forEach((recHitbox) => {
      if (playerId === recHitbox.playerId) {
        recHitbox.destroy();
      }
    });
}