/**
 * GameScene.js — Main game scene that orchestrates the Player, Level, HUD,
 * and Particles systems. Each lifecycle method (init, preload, create, update)
 * delegates to the appropriate subsystem, keeping this file thin and readable.
 *
 * Scene lifecycle (per DESIGN.md §8.2):
 *   1. init()    — Set constants & state
 *   2. preload() — Load all assets
 *   3. create()  — Instantiate subsystems, wire physics, configure camera
 *   4. update()   — Delegate per-frame logic to Player & Particles
 */

class GameScene extends Phaser.Scene {
    constructor() {
        super("gameScene");
    }

    // ─── 1. INIT ──────────────────────────────────────────────────────

    /**
     * Runs before preload. Sets the world gravity to 500 px/s²
     * (overriding the Phaser config default of 1500).
     * All game-state variables are initialized here so that
     * scene.restart() correctly resets everything.
     */
    init() {
        // Override world gravity (DESIGN.md §2.3: 500 px/s²)
        this.physics.world.gravity.y = Player.GRAVITY;
    }

    // ─── 2. PRELOAD ───────────────────────────────────────────────────

    /**
     * Loads all external assets: tilemap JSON, tileset images, the player
     * sprite, particle effect images, and audio files. Asset keys match
     * the names used in create() and by the subsystems.
     */
    preload() {
        // Tilemap data (Tiled JSON export)
        this.load.tilemapTiledJSON("map", "assets/level.tmj");

        // Tileset images — keys match the Tiled tileset names
        this.load.image("tiles", "assets/kenney_pixel-platformer/Tilemap/tilemap_packed.png");
        this.load.image("tilesBackground", "assets/kenney_pixel-platformer/Tilemap/tilemap-backgrounds_packed.png");

        // Player sprite (24×24 px, loaded as static image)
        this.load.image("player", "assets/kenney_pixel-platformer/Tiles/Characters/tile_0000.png");

        // Particle effect images
        this.load.image("particleLand", "assets/kenney_particle-pack/PNG (Transparent)/smoke_01.png");
        this.load.image("particleWalk", "assets/kenney_particle-pack/PNG (Transparent)/Rotated/trace_02_rotated.png");

        // Audio: "collect" key is the landing/footstep sound (DESIGN.md §6.2)
        this.load.audio("collect", "assets/kenney_impact-sounds/Audio/footstep_grass_000.ogg");

        // Audio: jump sound effect
        this.load.audio("jump", "assets/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/SFX_Jump_50.wav");
    }

    // ─── 3. CREATE ────────────────────────────────────────────────────

    /**
     * Instantiates all game subsystems and wires them together.
     * Each subsystem's create() handles its own setup, so this method
     * stays short even as the game grows.
     */
    create() {
        // --- Subsystems ---
        this.player = new Player(this, 50, 200);
        this.level = new Level(this);
        this.particles = new Particles(this);
        this.hud = new HUD(this, 3);

        // --- Build the level (layers, collision, overlaps) ---
        this.level.create();

        // Give the player a reference to the platforms layer for climbable-tile lookups
        this.player.platformsLayer = this.level.platformsLayer;

        // --- Build the HUD (text elements fixed to camera) ---
        this.hud.create();

        // --- Build the particle emitters ---
        this.particles.create();

        // --- Input setup ---
        this.setupInput();

        // --- Camera setup ---
        this.setupCamera();
    }

    // ─── 4. UPDATE ────────────────────────────────────────────────────

    /**
     * Runs every frame. Delegates to Player.update() for movement/jump/climb
     * logic, and to Particles.updateWalkEmitter() for the walk dust effect.
     * Keeping this method short is the main goal of the modular architecture.
     */
    update(_time, delta) {
        // Process player movement, jumping, climbing, invincibility, fall death
        this.player.update(this.cursors, this.keys, delta);

        // Update walk-particle position and emission based on player movement
        const walkPos = this.player.getWalkParticlePosition();
        this.particles.updateWalkEmitter(walkPos.x, walkPos.y, walkPos.isMoving);
    }

    // ─── Input Setup ──────────────────────────────────────────────────

    /**
     * Creates two input objects:
     *   - cursors: Phaser's built-in arrow key tracker
     *   - keys: WASD + Space for simultaneous binding
     *
     * Per DESIGN.md §3, both arrow keys and WASD are active at the same time.
     */
    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();

        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
    }

    // ─── Camera Setup ─────────────────────────────────────────────────

    /**
     * Configures the main camera to follow the player with smooth lerp,
     * a small deadzone, and a 1.5× zoom for the pixel-art aesthetic.
     * Camera bounds are set to the full map dimensions.
     */
    setupCamera() {
        this.cameras.main.setBounds(
            0, 0,
            this.level.map.widthInPixels,
            this.level.map.heightInPixels
        );

        // Follow the player with lerp (0.25) for smooth tracking
        this.cameras.main.startFollow(this.player.sprite, true, 0.25, 0.25);

        // Small deadzone: camera only moves when the player leaves this box
        this.cameras.main.setDeadzone(50, 50);

        // Zoom in 1.5× to emphasize the pixel art
        this.cameras.main.setZoom(1.5);
    }

    // ─── Level Completion ─────────────────────────────────────────────

    /**
     * Called by the Level class when the player overlaps a flag tile
     * with the `end` property. Pauses physics, shows "LEVEL COMPLETE"
     * text, and restarts the scene after a 1.5-second delay.
     */
    onLevelComplete() {
        this.physics.pause();

        // Display completion text centered on the camera viewport
        this.add.text(
            this.scale.width / 2 + 70, 80,
            "LEVEL COMPLETE",
            { fontSize: "40px", fill: "#60e649" }
        )
            .setOrigin(1, 0)
            .setScrollFactor(0);

        // Restart after 1.5 seconds
        this.time.delayedCall(1500, () => {
            this.scene.restart();
        });
    }
}
