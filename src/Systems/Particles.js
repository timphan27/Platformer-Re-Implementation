/**
 * Particles.js — Manages walk-dust and landing-smoke particle emitters.
 * Keeps particle logic separate from the main scene, making the create()
 * and update() methods shorter and the particle system easier to tune.
 *
 * Two emitter types:
 *   1. Walk particles — continuous trail while moving (trace_02_rotated.png)
 *   2. Landing particles — burst on touchdown (smoke_01.png)
 *
 * Usage:
 *   const particles = new Particles(scene);
 *   particles.create();
 *   // In update(): particles.updateWalkEmitter(playerX, playerY, isMoving)
 *   // On landing: particles.emitLandingBurst(x, y)
 */

class Particles {
    /**
     * @param {Phaser.Scene} scene - The scene these particles belong to
     */
    constructor(scene) {
        this.scene = scene;

        // Phaser particle emitter game objects
        this.walkEmitter = null;
        this.landEmitter = null;
    }

    /**
     * Creates both particle emitters with the parameters specified in
     * DESIGN.md §6.1. Emitters start inactive and are toggled by update().
     */
    create() {
        // Walk dust: continuous emission while the player is moving
        this.walkEmitter = this.scene.add.particles(
            0, 0,
            "particleWalk",
            {
                speed: { min: 10, max: 40 },   // Random speed range for natural look
                scale: { start: 0.15, end: 0 }, // Shrink from 0.15 → 0 over lifetime
                lifespan: 300,                   // Particles live 300ms
                quantity: 1,                     // 1 particle per emission
                frequency: 50,                   // Emit every 50ms when active
                alpha: { start: 0.6, end: 0 },  // Fade from 60% → 0% opacity
                emitting: false                  // Start inactive; enabled in update()
            }
        );

        // Landing smoke: burst emission on touchdown
        this.landEmitter = this.scene.add.particles(
            0, 0,
            "particleLand",
            {
                speed: { min: 10, max: 40 },   // Random speed range
                scale: { start: 0.08, end: 0 }, // Small scale for subtle puff
                lifespan: 300,
                quantity: 1,                     // 1 particle per sub-emission
                frequency: -1,                   // Manual trigger only (explode mode)
                alpha: { start: 0.25, end: 0 },  // Subtle fade
                emitting: false
            }
        );
    }

    /**
     * Updates the walk-particle emitter position and emission state.
     * Should be called every frame from the scene's update().
     *
     * @param {number} x - World X position for the emitter
     * @param {number} y - World Y position for the emitter
     * @param {boolean} isMoving - Whether the player is actively moving
     */
    updateWalkEmitter(x, y, isMoving) {
        this.walkEmitter.setPosition(x, y);
        this.walkEmitter.emitting = isMoving;
    }

    /**
     * Fires a one-shot burst of landing-smoke particles at the given position.
     * Called by Player.handleLanding() on the frame the player touches down.
     *
     * @param {number} x - World X position (player's feet)
     * @param {number} y - World Y position (below the player's feet)
     */
    emitLandingBurst(x, y) {
        // explode(count, x, y) emits `count` particles in a single burst
        this.landEmitter.explode(15, x, y);
    }
}
