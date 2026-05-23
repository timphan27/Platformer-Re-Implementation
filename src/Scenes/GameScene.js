class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    /**
     * init() runs before preload(). All game constants and mutable
     * state are initialised here so that scene.restart() resets them.
     */
    init() {
        // Override gravity to 500 px/s² (the config default is 1500,
        // but the design specifies an effective gravity of 500).
        this.physics.world.gravity.y = 500;

        // Player spawn coordinates
        this.SPAWN_X = 50;
        this.SPAWN_Y = 200;

        // Collectible state (3 total in the level)
        this.collectiblesCount = 0;

        // Prevent multiple level-complete triggers
        this.levelComplete = false;
    }

    /**
     * Load all external assets: tilemap JSON, tileset images,
     * the player sprite, particle textures, and audio files.
     */
    preload() {
        // Tilemap (Tiled .tmj format)
        this.load.tilemapTiledJSON('level', 'assets/level.tmj');

        // Tileset images (paths match the Kenney asset folders)
        this.load.image('tilemap_tiles', 'assets/kenney_pixel-platformer/Tilemap/tilemap_packed.png');
        this.load.image('tilemap_bg', 'assets/kenney_pixel-platformer/Tilemap/tilemap-backgrounds_packed.png');

        // Player sprite — 24×24 pixel character image
        this.load.image('player', 'assets/kenney_pixel-platformer/Tiles/Characters/tile_0000.png');

        // Particle effect textures
        this.load.image('walkParticle', 'assets/kenney_particle-pack/PNG (Transparent)/Rotated/trace_02_rotated.png');
        this.load.image('landingParticle', 'assets/kenney_particle-pack/PNG (Transparent)/smoke_01.png');

        // Audio — jump sound and landing footstep
        this.load.audio('jump', 'assets/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/SFX_Jump_50.wav');
        this.load.audio('collect', 'assets/kenney_impact-sounds/Audio/footstep_grass_000.ogg');
    }

    /**
     * Create all game objects: level, player, effects, HUD,
     * physics colliders / overlaps, and camera.
     */
    create() {
        // --- Level (tilemap + layers) ---
        this.level = new Level(this);

        // --- Player ---
        this.player = new Player(this, this.SPAWN_X, this.SPAWN_Y);

        // --- Effects (particles + audio) ---
        this.effects = new Effects(this, this.player);

        // --- HUD (collectibles + health text) ---
        this.hud = new HUD(this);

        // --- Physics: player vs platforms (solid collision) ---
        this.physics.add.collider(this.player.sprite, this.level.platformsLayer);

        // --- Physics: player vs spikes ---
        // Tile 69 (thorny vine) is both climbable and damaging. A collider
        // would push the player out, preventing climbing. Instead, we use an
        // overlap so the player can overlap with the tile (needed for
        // climbing) while still taking damage from contact.
        this.physics.add.overlap(
            this.player.sprite,
            this.level.spikesLayer,
            (_player, tile) => {
                if (tile.properties && tile.properties.damage) {
                    this.player.takeDamage();
                }
            },
            null,
            this
        );

        // --- Physics: player vs collectibles (overlap, not solid) ---
        this.physics.add.overlap(
            this.player.sprite,
            this.level.collectiblesLayer,
            // overlapCallback — collect the tile when it has collectible: true
            (_player, tile) => {
                if (tile.properties && tile.properties.collectible) {
                    this.level.collectiblesLayer.removeTileAt(tile.x, tile.y);
                    this.collectiblesCount++;
                    this.hud.updateCollectibles(this.collectiblesCount);
                }
            },
            null,
            this
        );

        // --- Physics: player vs flag (overlap triggers level complete) ---
        this.physics.add.overlap(
            this.player.sprite,
            this.level.flagLayer,
            (_player, tile) => {
                if (tile.properties && tile.properties.end) {
                    this.triggerLevelComplete();
                }
            },
            null,
            this
        );

        // --- World bounds (wider Y to allow falling below the map) ---
        const map = this.level.map;
        this.physics.world.setBounds(0, 0, map.widthInPixels, 1000);

        // --- Camera ---
        this.setupCamera();
    }

    /**
     * Configure the camera to follow the player with smooth
     * lerp, a deadzone, zoom, and map bounds.
     */
    setupCamera() {
        const cam = this.cameras.main;
        cam.startFollow(this.player.sprite, false, 0.25, 0.25);
        cam.setDeadzone(50, 50);
        cam.setZoom(1.5);

        const map = this.level.map;
        cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    }

    /**
     * Set up keyboard input: arrow keys, WASD, and Space (jump).
     * All keys are available simultaneously.
     */
    createCursors() {
        return {
            ...this.input.keyboard.createCursorKeys(),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            wKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            aKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            sKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            dKey: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    /**
     * Main per-frame update loop. Processes input and delegates
     * to Player, Effects, and other subsystems.
     */
    update() {
        // Create cursors lazily on first update (after scene is fully ready)
        if (!this.cursors) {
            this.cursors = this.createCursors();
        }

        this.player.update(this.cursors);
        this.effects.update();
    }

    /**
     * Called when the player touches a flag tile with end: true.
     * Pauses physics, shows a completion message, then restarts.
     */
    triggerLevelComplete() {
        if (this.levelComplete) return;
        this.levelComplete = true;

        this.physics.pause();

        // Display "LEVEL COMPLETE" at the top-center of the viewport
        // scrollFactor(0) keeps it pinned to the camera so it doesn't
        // drift if the camera finishes lerping after physics pause.
        const screenCenterX = this.scale.width / 2;
        this.add.text(
            screenCenterX, 80,
            'LEVEL COMPLETE',
            { fontSize: '40px', color: '#00ff00' }
        ).setOrigin(0.5).setScrollFactor(0);

        // Restart the scene after 1.5 seconds
        this.time.delayedCall(1500, () => {
            this.scene.restart();
        });
    }

    /**
     * Restart the level (called on death or fall).
     * scene.restart() re-runs init(), preload(), create() from
     * scratch, resetting all state and tile data.
     */
    restartLevel() {
        this.scene.restart();
    }
}
