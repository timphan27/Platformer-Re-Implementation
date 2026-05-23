class HUD {
    constructor(scene) {
        this.scene = scene;
        const screenW = scene.scale.width;

        // Collectibles counter — fixed to the camera (scrollFactor 0)
        // Positioned at the top-right of the screen.
        this.collectiblesText = scene.add.text(
            screenW - 240, 80,
            'Collectibles: 0 /3',
            { fontSize: '24px', color: '#000000' }
        ).setOrigin(1, 0).setScrollFactor(0);

        // Health counter — below the collectibles text, also camera-fixed
        this.healthText = scene.add.text(
            screenW - 240, 100,
            'Health: 3',
            { fontSize: '24px', color: '#000000' }
        ).setOrigin(1, 0).setScrollFactor(0);
    }

    /** Update the collectibles display to the current count. */
    updateCollectibles(count) {
        this.collectiblesText.setText('Collectibles: ' + count + ' /3');
    }

    /** Update the health display to the current value. */
    updateHealth(health) {
        this.healthText.setText('Health: ' + health);
    }
}
