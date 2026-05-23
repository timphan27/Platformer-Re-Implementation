class Level {
    constructor(scene) {
        this.scene = scene;

        // Parse the Tiled JSON tilemap (level.tmj)
        const map = scene.make.tilemap({ key: 'level' });

        // Attach the primary tileset image (tilemap_packed) to the map.
        // The first argument matches the tileset "name" in the .tmj file;
        // the second argument is the Phaser image cache key loaded in preload.
        const tileset = map.addTilesetImage('tilemap_packed', 'tilemap_tiles');
        const bgTileset = map.addTilesetImage(
            'tilemap-backgrounds_packed', 'tilemap_bg'
        );

        // Create the five tilemap layers in bottom-to-top render order.
        // Background is purely decorative — no collision.
        this.backgroundLayer = map.createLayer('background', bgTileset);

        // Platforms contain solid terrain and ladder tiles.
        // Only tiles whose custom "collides" property is true become solid.
        this.platformsLayer = map.createLayer('platforms', tileset);
        this.platformsLayer.setCollisionByProperty({ collides: true });

        // Collectibles use overlap detection (not solid).
        // Collision indices must be set so that Phaser's overlap
        // system can detect tiles on this layer.
        this.collectiblesLayer = map.createLayer('collectibles', tileset);
        this.collectiblesLayer.setCollisionByProperty({ collectible: true });

        // Flag / goal tiles also use overlap detection.
        // Same as collectibles: collision indices needed for overlap.
        this.flagLayer = map.createLayer('flag', tileset);
        this.flagLayer.setCollisionByProperty({ end: true });

        // Spikes layer — tile 69 (thorny vine) has collides, climbable,
        // and damage properties. Collision indices are needed for the
        // overlap detection in GameScene (damage is applied via overlap,
        // not collider, so the player can climb the vine while taking damage).
        this.spikesLayer = map.createLayer('spikes', tileset);
        this.spikesLayer.setCollisionByProperty({ collides: true });

        // Store the map reference for camera bounds and other queries
        this.map = map;
    }
}
