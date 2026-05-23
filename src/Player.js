class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Movement physics constants (from DESIGN.md section 2.3)
        this.MAX_SPEED = 600;
        this.ACCELERATION = 125;
        this.DECELERATION = 30000;
        this.JUMP_VELOCITY = -350;
        this.JUMP_CUT_FACTOR = 0.75;
        this.MAX_JUMPS = 2;
        this.CLIMB_SPEED_UP = -150;
        this.CLIMB_SPEED_DOWN = 100;

        // Health constants (from DESIGN.md section 2.5)
        this.STARTING_HEALTH = 3;
        this.INVINCIBILITY_DURATION = 2000;
        this.FLICKER_INTERVAL = 100;

        // Fall death threshold (from DESIGN.md section 2.3)
        this.DEATH_FALL_Y = 415;

        // Runtime state
        this.health = this.STARTING_HEALTH;
        this.jumpsRemaining = this.MAX_JUMPS;
        this.isInvincible = false;
        this.isClimbing = false;
        this.wasGrounded = false;
        this.flickerTimer = null;

        // Create the player sprite at the given spawn position
        // The sprite is a static 24x24 pixel image (larger than 18x18 tiles)
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(true);

        // Default facing: left (unflipped). Moving right flips horizontally.
        this.sprite.setFlip(false, false);

        // Apply horizontal drag for natural deceleration when no key is held
        this.sprite.setDragX(this.DECELERATION);
        this.sprite.setMaxVelocity(this.MAX_SPEED, 2000);
    }

    /**
     * Main per-frame update. Reads input and applies movement,
     * jump, climb, and death logic.
     */
    update(cursors) {
        if (this.scene.physics.isPaused) return;

        const onGround = this.sprite.body.blocked.down;
        const onLadder = this.checkLadder();

        // Climbing takes priority when the player is on a ladder tile
        if (onLadder) {
            this.handleClimbing(cursors);
        } else {
            // Exit climbing mode when leaving a ladder tile
            if (this.isClimbing) {
                this.isClimbing = false;
                this.sprite.body.setAllowGravity(true);
            }

            this.handleHorizontalMovement(cursors);
            this.handleJump(cursors);
            this.handleJumpCut(cursors);
        }

        // Detect landing transition (airborne → grounded) to reset jumps
        if (onGround && !this.wasGrounded && !this.isClimbing) {
            this.onLanding();
        }
        this.wasGrounded = onGround;

        // Fall death: if the player falls below the level boundary
        if (this.sprite.y > this.DEATH_FALL_Y) {
            this.scene.restartLevel();
        }
    }

    /**
     * Horizontal movement with instant direction-change stop.
     * Zeroing velocity.x before applying opposite acceleration
     * prevents a "slippery" sliding feel when reversing direction.
     */
    handleHorizontalMovement(cursors) {
        const left = cursors.left.isDown || cursors.aKey.isDown;
        const right = cursors.right.isDown || cursors.dKey.isDown;

        if (left) {
            if (this.sprite.body.velocity.x > 0) {
                this.sprite.body.velocity.x = 0;
            }
            this.sprite.setAccelerationX(-this.ACCELERATION);
            this.sprite.setFlip(false, false);
        } else if (right) {
            if (this.sprite.body.velocity.x < 0) {
                this.sprite.body.velocity.x = 0;
            }
            this.sprite.setAccelerationX(this.ACCELERATION);
            this.sprite.setFlip(true, false);
        } else {
            this.sprite.setAccelerationX(0);
        }
    }

    /**
     * Jump on just-pressed Space. Decrements the remaining jump count.
     * Both the first and second (air) jump apply the same velocity.
     */
    handleJump(cursors) {
        const jumpJustPressed = Phaser.Input.Keyboard.JustDown(cursors.space);

        if (jumpJustPressed && this.jumpsRemaining > 0) {
            this.sprite.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsRemaining--;
            this.scene.effects.playJumpSound();
        }
    }

    /**
     * Variable jump height: releasing Space while ascending
     * cuts vertical velocity by 25%, allowing short hops.
     */
    handleJumpCut(cursors) {
        if (Phaser.Input.Keyboard.JustUp(cursors.space)
            && this.sprite.body.velocity.y < 0) {
            this.sprite.body.velocity.y *= this.JUMP_CUT_FACTOR;
        }
    }

    /**
     * Ladder climbing: disables gravity and gives direct vertical
     * control. The jump key (Space) also acts as "climb up".
     */
    handleClimbing(cursors) {
        if (!this.isClimbing) {
            this.isClimbing = true;
            this.sprite.body.setAllowGravity(false);
        }

        const up = cursors.up.isDown || cursors.wKey.isDown || cursors.space.isDown;
        const down = cursors.down.isDown || cursors.sKey.isDown;

        if (up) {
            this.sprite.setVelocityY(this.CLIMB_SPEED_UP);
        } else if (down) {
            this.sprite.setVelocityY(this.CLIMB_SPEED_DOWN);
        } else {
            this.sprite.setVelocityY(0);
        }

        // Allow horizontal movement while on a ladder
        this.handleHorizontalMovement(cursors);
    }

    /**
     * Check whether the tile at the player's center position
     * on the platforms or spikes layer has the climbable property.
     * Tile ID 68 (thorny vine) appears on the spikes layer and
     * is both climbable and damaging.
     */
    checkLadder() {
        const platformsLayer = this.scene.level.platformsLayer;
        const spikesLayer = this.scene.level.spikesLayer;

        const pTile = platformsLayer.getTileAtWorldXY(this.sprite.x, this.sprite.y);
        if (pTile && pTile.properties && pTile.properties.climbable) {
            return true;
        }

        const sTile = spikesLayer.getTileAtWorldXY(this.sprite.x, this.sprite.y);
        if (sTile && sTile.properties && sTile.properties.climbable) {
            return true;
        }

        return false;
    }

    /**
     * Called once when the player transitions from airborne to grounded.
     * Resets double-jump count and triggers landing effects.
     */
    onLanding() {
        this.jumpsRemaining = this.MAX_JUMPS;
        this.scene.effects.playLandingSound();
        this.scene.effects.emitLandingParticles(this.sprite.x, this.sprite.y + 15);
    }

    /**
     * Reduces health by 1 and starts invincibility if not already
     * invincible. When health reaches 0, the level restarts.
     */
    takeDamage() {
        if (this.isInvincible) return;

        this.health--;
        this.scene.hud.updateHealth(this.health);

        if (this.health <= 0) {
            this.scene.restartLevel();
            return;
        }

        // Begin invincibility period with red tint
        this.isInvincible = true;
        this.sprite.setTint(0xff0000);

        // Flicker visibility on a timer for the invincibility visual
        this.flickerTimer = this.scene.time.addEvent({
            delay: this.FLICKER_INTERVAL,
            callback: () => {
                this.sprite.visible = !this.sprite.visible;
            },
            loop: true
        });

        // End invincibility after the configured duration
        this.scene.time.delayedCall(this.INVINCIBILITY_DURATION, () => {
            this.isInvincible = false;
            this.sprite.clearTint();
            this.sprite.visible = true;
            if (this.flickerTimer) {
                this.flickerTimer.remove();
                this.flickerTimer = null;
            }
        });
    }

    /**
     * Returns true when the player is moving horizontally on the ground,
     * used by Effects to decide whether to emit walk particles.
     */
    isMovingOnGround() {
        return this.sprite.body.blocked.down
            && Math.abs(this.sprite.body.velocity.x) > 10
            && !this.isClimbing;
    }
}
