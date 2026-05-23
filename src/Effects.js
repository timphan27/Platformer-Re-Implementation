class Effects {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Walk particle emitter — continuous trail while the player
        // moves on the ground. Created but initially not emitting.
        this.walkEmitter = scene.add.particles(0, 0, 'walkParticle', {
            speed: { min: 10, max: 40 },
            scale: { start: 0.15, end: 0 },
            lifespan: 300,
            quantity: 1,
            frequency: 50,
            alpha: { start: 0.6, end: 0 },
            emitting: false
        });

        // Landing particle emitter — burst (explode mode).
        // frequency: -1 means no automatic emission; triggered manually.
        this.landingEmitter = scene.add.particles(0, 0, 'landingParticle', {
            speed: { min: 10, max: 40 },
            scale: { start: 0.08, end: 0 },
            lifespan: 300,
            quantity: 15,
            frequency: -1,
            alpha: { start: 0.25, end: 0 }
        });
    }

    /**
     * Per-frame update that repositions the walk emitter behind the
     * player and toggles emission based on ground movement.
     */
    update() {
        if (this.player.isMovingOnGround()) {
            this.walkEmitter.emitting = true;

            // Position the emitter behind the player relative to
            // their facing direction (trail effect).
            if (this.player.sprite.flipX) {
                // Facing right → trail on the left
                this.walkEmitter.x = this.player.sprite.x - 20;
            } else {
                // Facing left → trail on the right
                this.walkEmitter.x = this.player.sprite.x + 8;
            }
            this.walkEmitter.y = this.player.sprite.y;
        } else {
            this.walkEmitter.emitting = false;
        }
    }

    /**
     * Trigger the landing dust-burst at the given world position.
     * Called once per landing event, not every frame.
     */
    emitLandingParticles(x, y) {
        this.landingEmitter.explode(15, x, y);
    }

    /** Play the jump sound effect. */
    playJumpSound() {
        this.scene.sound.play('jump', { volume: 0.25 });
    }

    /**
     * Play the landing / footstep sound.
     * The audio key is named 'collect' per the DESIGN.md convention
     * (the footstep sound is loaded under that key, despite the name).
     */
    playLandingSound() {
        this.scene.sound.play('collect', { volume: 0.25 });
    }
}
