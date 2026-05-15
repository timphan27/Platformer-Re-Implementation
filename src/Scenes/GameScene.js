class GameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    init() {
        //movement settings for player

        this.MAX_SPEED = 10;
        this.ACCELERATION = 125;
        this.DECELERATION = 500;

        // JUMP (feel-based values)
        this.GRAVITY = 500;
        this.JUMP_VELOCITY = -350; //velocity of jump
        this.JUMP_HOLD_FORCE = -20;

        this.physics.world.gravity.y = this.GRAVITY;

        // collectibles
        this.collected = 0;
        this.totalCollectibles = 3;

        //double jump variables
        this.jumpsRemaining = 2;

        //starting health 
        this.health = 3;
    }

    preload() {
        this.load.image("tiles", "assets/kenney_pixel-platformer/Tilemap/tilemap_packed.png"); //load tilemap
        this.load.image("tilesBackground", "assets/kenney_pixel-platformer/Tilemap/tilemap-backgrounds_packed.png"); //load tilemap for background
        this.load.tilemapTiledJSON("map", "assets/level.tmj"); // //load json of level 

        this.load.image("player", "assets/kenney_pixel-platformer/Tiles/Characters/tile_0000.png"); //load player sprite

        this.load.image("particleLand", "assets/kenney_particle-pack/PNG (Transparent)/smoke_01.png"); //load particle effects for landing
        this.load.image("particleWalk", "assets/kenney_particle-pack/PNG (Transparent)/Rotated/trace_02_rotated.png"); //load particle effects for walking 

        this.load.audio("collect", "assets/kenney_impact-sounds/Audio/footstep_grass_000.ogg"); //load sound effect for player landing
        this.load.audio("jump", "assets/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/SFX_Jump_50.wav")
    }


    create() {

        this.isClimbing = false; //tracks if the player is able to perform climibing actions

        //create level from tilemap
        this.map = this.make.tilemap({ key: "map" });
        this.tileset = this.map.addTilesetImage('tilemap_packed', 'tiles'); //add platformer asset tilemaps
        this.tilesetBackground = this.map.addTilesetImage('tilemap-backgrounds_packed', 'tilesBackground'); //add background tileset

        this.backgroundLayer = this.map.createLayer('background', this.tilesetBackground, 0, 0); //add background layer

        this.platformsLayer = this.map.createLayer('platforms', this.tileset, 0, 0); //add platform layer

        this.collectiblesLayer = this.map.createLayer('collectibles', this.tileset, 0, 0); //add collectibles layer
        this.spikesLayer = this.map.createLayer('spikes', this.tileset, 0, 0); //add spikes layer

        this.flagLayer = this.map.createLayer('flag', this.tileset, 0, 0); //add flag layer

        this.platformsLayer.setCollisionByProperty({ //enable collision for platforms with property collides = true in Tiled
            collides: true
        });
        this.spikesLayer.setCollisionByProperty({ //make all spikes with collision property true so player can collide with them and take damage
            collides: true
        });
        //create player
        this.player = this.physics.add.sprite(
            50,
            200,
            "player"
        );


        // MOVEMENT VALUES
        this.player.setMaxVelocity(this.MAX_SPEED * 60);
        this.player.setDragX(this.DECELERATION * 60);

        this.physics.add.collider(  //make player collide with objects on platforms layer
            this.player,
            this.platformsLayer
        );

        this.physics.add.collider(
            this.player,
            this.spikesLayer,
            this.takeDamage,
            (player, tile) => tile.properties.damage === true,
            this
        );



        this.cursors = this.input.keyboard.createCursorKeys();

        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        //camera

        this.cameras.main.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        this.cameras.main.startFollow(this.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(1.5);

        this.physics.add.overlap( //check for overlap between player and collectibles layer
            this.player,
            this.collectiblesLayer,
            this.collectItem,
            (player, tile) => tile.properties.collectible === true, ///only call collectItem if collectible property is true for tile
            this
        );

        this.physics.add.overlap(
            this.player,
            this.flagLayer,
            this.finishLevel,
            (player, tile) => tile.properties.end === true, ///only call finishLevel if flag property is true for tile
            this
        );


        this.collectText = this.add.text( //show how many collectibles player has out of total
            this.scale.width - 240,
            80,
            "Collectibles: 0 /" + this.totalCollectibles,
            {
                fontSize: "24px",
                fill: "#000000"
            }
        ).setOrigin(1, 0).setScrollFactor(0);

        this.healthText = this.add.text( //show playe HEALTH
            this.scale.width - 240,
            100,
            "Health: " + this.health,
            {
                fontSize: "24px",
                fill: "#000000"
            }
        ).setOrigin(1, 0).setScrollFactor(0);

        this.walkParticles = this.add.particles( //create particle emitter for player walking
            0,
            0,
            "particleWalk",
            {
                speed: { min: 10, max: 40 },
                scale: { start: 0.15, end: 0 },
                lifespan: 300,
                quantity: 1,
                frequency: 50,
                alpha: { start: 0.6, end: 0 },

                emitting: false
            }
        );

        this.landParticles = this.add.particles( //create particle emitter for player landing
            0,
            0,
            "particleLand",
            {
                speed: { min: 10, max: 40 },
                scale: { start: 0.08, end: 0 },
                lifespan: 300,
                quantity: 1,
                frequency: -1,
                alpha: { start: 0.25, end: 0 },

                emitting: false
            }
        );


    }


    update() {

        if (this.isInvincible) {
            this.invincibleTimer -= this.game.loop.delta; //if player is invicible subtract timer by time since last frame

            // flicker effect
            this.player.visible = Math.floor(this.invincibleTimer / 100) % 2;

            if (this.invincibleTimer <= 0) { //if timer runs out turn off invincibility
                this.isInvincible = false;
                this.player.visible = true;
                this.player.clearTint();
            }
        }

        if (this.keys.left.isDown) { //accelerate left
            if (this.player.body.velocity.x > 0) { //if moving right, stop immediately to avoid slippery feel
                this.player.setVelocityX(0);
            }
            this.player.body.setAccelerationX(-this.ACCELERATION);
            this.player.resetFlip();


            this.walkParticles.setPosition( //set position of particle emitter
                this.player.x + 8,
                this.player.y
            );

            this.walkParticles.emitting = true;
        }

        else if (this.keys.right.isDown) { //accelerate right
            if (this.player.body.velocity.x < 0) { //if moving left, stop immediately to avoid slippery feel
                this.player.setVelocityX(0);
            }
            this.player.body.setAccelerationX(this.ACCELERATION);
            this.player.setFlip(true, false);


            this.walkParticles.setPosition( //set position of particle emitter
                this.player.x - 20,
                this.player.y
            );

            this.walkParticles.emitting = true;
        }
        else {
            //stop acceleration when idle
            this.player.body.setAccelerationX(0);
            this.walkParticles.emitting = false; //stop particle effect for walk if idle
        }

        //JUMP ---------------
        const onGround = this.player.body.blocked.down; //used to check if player is being blocked from below

        if (onGround && !this.wasOnGround) { //check if the player was not already on the ground
            this.jumpsRemaining = 2; //reset jumps when on ground

            this.landParticles.explode( //create particle at player position below the feet when they land
                15,
                this.player.x,
                this.player.y + 15
            );
            this.sound.play("collect", { //play sound effect when player lands
                volume: 0.25
            });
        }

        this.wasOnGround = onGround; //store whether player was on ground for next frame as a boolean

        // START JUMP
        if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.jumpsRemaining > 0) { //if jump key just pressed and player has jumps remaining
            this.player.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsRemaining--;
            this.sound.play("jump", { //play sound effect when player jumps
                volume: 0.25
            });
        }

        // CUT JUMP IF RELEASED EARLY
        if (this.keys.jump.isUp && this.player.body.velocity.y < 0) { //if jump key released and player is still moving upward
            this.player.setVelocityY(this.player.body.velocity.y * 0.75);
        }

        //if player falls below map, restart level.
        if (this.player.y > 415) {
            this.scene.restart();
        }

        //climbing actions 
        if (this.isClimbing) {

            // cancel gravity effect so the player can stand in mid air
            this.player.setVelocityY(0);
            this.player.body.allowGravity = false; 

            // move up 
            if (this.keys.up?.isDown || this.keys.jump.isDown) {
                this.player.setVelocityY(-150);
            }
            // move down
            else if (this.keys.down?.isDown) {
                this.player.setVelocityY(100);
            }
            else {  //stop vertical movement
                this.player.setVelocityY(0);
            }

        } else {
            // restore normal physics when NOT on ladder
            this.player.body.allowGravity = true;
        }

        //CHECK THE TILE THAT THE PLAYER IS ON AND CHECK IF IT IS A CLIMABLE TILE on the platformsLayer
        const tile = this.platformsLayer.getTileAtWorldXY(
            this.player.x,
            this.player.y
        );

        this.isClimbing = tile?.properties?.climbable === true; //check if player is on a tile with the climbable property to determine if they can climb
    }

    collectItem(player, tile) { //callback when the player collides with a collectible tile

        this.collectiblesLayer.removeTileAt(tile.x, tile.y); //remove tile

        this.collected++; //increment counter
        this.collectText.setText("Collectibles: " + this.collected + " /" + this.totalCollectibles); //update text for collectible total

    }



    finishLevel() { //call when player reaches flag at end of level

        this.physics.pause();

        this.collectText = this.add.text( //show how many collectibles player has out of total
            this.scale.width / 2 + 70,
            80,
            "LEVEL COMPLETE",
            {
                fontSize: "40px",
                fill: "#60e649"
            }
        )
            .setOrigin(1, 0)
            .setScrollFactor(0);

        this.time.delayedCall(1500, () => {
            this.scene.restart();
        });
    }

    takeDamage(player, tile) { //call when the player collides with a spike tile with the damage property set to true
        if (this.isInvincible) return;

        this.health--;

        this.healthText.setText("Health: " + this.health); //update health text

        this.isInvincible = true;
        this.invincibleTimer = 2000;

        this.player.setTint(0xff0000);

        if (this.health == 0) { //if player health is reduced to 0, restart level
            this.scene.restart();
        }
    }
}














