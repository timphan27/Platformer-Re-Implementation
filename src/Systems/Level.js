/**
 * Level.js — Handles tilemap creation, layer setup, collision configuration,
 * and all collider/overlap callbacks. This keeps the GameScene's create()
 * method clean by encapsulating the Tiled level loading logic.
 *
 * The class stores references to each tilemap layer so that other systems
 * (Player, Particles) can access them (e.g., for climbable-tile lookups).
 *
 * Usage:
 *   const level = new Level(scene);
 *   level.create();  // builds layers & sets up physics
 *   // level.platformsLayer is now available for Player.climbing checks
 */

class Level {
    /**
     * @param {Phaser.Scene} scene - The scene this level belongs to
     */
    constructor(scene) {
        this.scene = scene;

        // Tilemap and tileset references
        this.map = null;
        this.tileset = null;
        this.tilesetBackground = null;

        // Layer references — public so Player/HUD can read them
        this.backgroundLayer = null;
        this.platformsLayer = null;
        this.collectiblesLayer = null;
        this.spikesLayer = null;
        this.flagLayer = null;
    }

    /**
     * Builds the full level: creates the tilemap from the preloaded JSON,
     * adds tileset images, creates all five layers in render order,
     * and configures collision/overlap callbacks.
     *
     * Must be called after preload() has loaded "map", "tiles", "tilesBackground".
     */
    create() {
        this.createTilemap();
        this.createLayers();
        this.setupCollision();
    }

    // ─── Tilemap & Tilesets ──────────────────────────────────────────

    /**
     * Creates the tilemap object and links the two tileset images.
     * The Tiled map file references tilesets by name; those names must
     * match the first argument to addTilesetImage().
     */
    createTilemap() {
        this.map = this.scene.make.tilemap({ key: "map" });

        // Primary tileset: 20×9 grid of 18×18 tiles (firstgid = 1)
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tiles");

        // Background tileset: 10×4 grid of 18×18 tiles (firstgid = 181)
        this.tilesetBackground = this.map.addTilesetImage(
            "tilemap-backgrounds_packed",
            "tilesBackground"
        );
    }

    // ─── Layer Creation ──────────────────────────────────────────────

    /**
     * Creates all five tilemap layers in the correct render order
     * (bottom to top): background → platforms → collectibles → spikes → flag.
     * Each layer name must match the layer name in the Tiled editor.
     */
    createLayers() {
        // Background: decorative only, no collision
        this.backgroundLayer = this.map.createLayer(
            "background", this.tilesetBackground, 0, 0
        );

        // Platforms: solid terrain + climbable ladder tiles
        this.platformsLayer = this.map.createLayer(
            "platforms", this.tileset, 0, 0
        );

        // Collectibles: overlap-only layer for pickup items
        this.collectiblesLayer = this.map.createLayer(
            "collectibles", this.tileset, 0, 0
        );

        // Spikes: solid collider layer with damage process callback
        this.spikesLayer = this.map.createLayer(
            "spikes", this.tileset, 0, 0
        );

        // Flag: overlap-only layer that triggers level completion
        this.flagLayer = this.map.createLayer(
            "flag", this.tileset, 0, 0
        );
    }

    // ─── Collision & Overlap Setup ───────────────────────────────────

    /**
     * Configures tile collision properties and registers all physics
     * interactions between the player sprite and each layer:
     *
     *  - Platforms: solid collision (collides: true tiles block the player)
     *  - Spikes: solid collision with a process callback that filters for
     *    tiles having damage: true — only those deal damage
     *  - Collectibles: overlap detection — tile is removed on pickup
     *  - Flag: overlap detection — triggers level completion
     */
    setupCollision() {
        const player = this.scene.player;

        // Platforms: tiles with collides:true are solid
        this.platformsLayer.setCollisionByProperty({ collides: true });

        // Spikes: tiles with collides:true are solid (player can stand on them)
        // The process callback filters so only damage:true tiles invoke takeDamage
        this.spikesLayer.setCollisionByProperty({ collides: true });

        // Player ↔ Platforms collider (standard solid collision)
        this.scene.physics.add.collider(player.sprite, this.platformsLayer);

        // Player ↔ Spikes collider with damage filter
        this.scene.physics.add.collider(
            player.sprite,
            this.spikesLayer,
            // Collision callback: delegate to Player.takeDamage()
            () => player.takeDamage(),
            // Process callback: only fire if the tile has damage: true
            (_player, tile) => tile.properties.damage === true,
            this.scene
        );

        // Player ↔ Collectibles overlap (no solid collision)
        this.scene.physics.add.overlap(
            player.sprite,
            this.collectiblesLayer,
            // Overlap callback: remove tile, increment counter, update HUD
            (_player, tile) => this.collectItem(tile),
            // Process callback: only fire if the tile has collectible: true
            (_player, tile) => tile.properties.collectible === true,
            this.scene
        );

        // Player ↔ Flag overlap (no solid collision)
        this.scene.physics.add.overlap(
            player.sprite,
            this.flagLayer,
            // Overlap callback: trigger level completion
            () => this.scene.onLevelComplete(),
            // Process callback: only fire if the tile has end: true
            (_player, tile) => tile.properties.end === true,
            this.scene
        );
    }

    // ─── Collectible Pickup ──────────────────────────────────────────

    /**
     * Removes the collected tile from the map, increments the collectible
     * counter, and updates the HUD text. Called by the collectibles overlap.
     *
     * @param {Phaser.Tilemaps.Tile} tile - The tile the player overlapped
     */
    collectItem(tile) {
        this.collectiblesLayer.removeTileAt(tile.x, tile.y);
        this.scene.hud.incrementCollectibles();
    }
}
