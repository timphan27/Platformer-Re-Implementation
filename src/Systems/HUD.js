/**
 * HUD.js — Manages the heads-up display elements: the collectibles counter
 * and the health counter. Both are fixed to the camera (scrollFactor = 0)
 * so they stay on-screen as the player scrolls through the level.
 *
 * Usage:
 *   const hud = new HUD(scene);
 *   hud.create();
 *   hud.incrementCollectibles();   // on pickup
 *   hud.updateHealth(newHealth);    // on damage
 */

class HUD {
    /**
     * @param {Phaser.Scene} scene - The scene this HUD belongs to
     * @param {number} totalCollectibles - The total number of collectibles in the level
     */
    constructor(scene, totalCollectibles = 3) {
        this.scene = scene;
        this.totalCollectibles = totalCollectibles;
        this.collected = 0;
        this.health = Player.MAX_HEALTH;

        // Text game objects (created in create())
        this.collectText = null;
        this.healthText = null;
    }

    /**
     * Creates the two HUD text elements positioned at the top-right of the
     * screen. Both use setScrollFactor(0) so they remain fixed relative
     * to the camera viewport, not the world.
     */
    create() {
        const screenRight = this.scene.scale.width - 240;

        // Collectibles counter: "Collectibles: X /3"
        this.collectText = this.scene.add.text(
            screenRight, 80,
            `Collectibles: 0 /${this.totalCollectibles}`,
            { fontSize: "24px", fill: "#000000" }
        ).setOrigin(1, 0).setScrollFactor(0);

        // Health counter: "Health: X"
        this.healthText = this.scene.add.text(
            screenRight, 100,
            `Health: ${this.health}`,
            { fontSize: "24px", fill: "#000000" }
        ).setOrigin(1, 0).setScrollFactor(0);
    }

    /**
     * Increments the collectible count and updates the display text.
     * Called by Level.collectItem() when the player picks up an item.
     */
    incrementCollectibles() {
        this.collected++;
        this.collectText.setText(
            `Collectibles: ${this.collected} /${this.totalCollectibles}`
        );
    }

    /**
     * Updates the displayed health value.
     * Called by Player.takeDamage() after health is decremented.
     *
     * @param {number} newHealth - The player's current health
     */
    updateHealth(newHealth) {
        this.health = newHealth;
        this.healthText.setText(`Health: ${this.health}`);
    }
}
