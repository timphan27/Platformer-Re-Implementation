/**
 * Player.js — Encapsulates the player sprite, physics, movement, jumping,
 * climbing, health, and invincibility logic. The GameScene delegates all
 * per-frame player logic here, keeping the scene's update() method short.
 *
 * Usage:
 *   const player = new Player(scene, 50, 200);
 *   player.update(cursors, keys, delta);
 */

class Player {
    /**
     * Physics constants (matching DESIGN.md §2.3)
     * Declared as static so they can be referenced from outside if needed,
     * but also copied to the instance for easy access in methods.
     */
    static MAX_SPEED = 10;           // Multiplied by 60 for velocity cap
    static ACCELERATION = 125;        // Horizontal acceleration (px/s²)
    static DECELERATION = 500;        // Drag multiplier (px/s²)
    static GRAVITY = 500;             // World gravity override (px/s²)
    static JUMP_VELOCITY = -350;      // Instantaneous Y velocity on jump
    static JUMP_CUT_FACTOR = 0.75;    // Multiply vy when jump released while ascending
    static MAX_JUMPS = 2;             // Double-jump allowance
    static CLIMB_SPEED_UP = -150;     // Vertical speed while climbing up (px/s)
    static CLIMB_SPEED_DOWN = 100;    // Vertical speed while climbing down (px/s)
    static DEATH_FALL_Y = 415;        // Y threshold for fall death
    static MAX_HEALTH = 3;            // Starting health
    static DAMAGE_PER_HIT = 1;        // Damage taken per spike contact
    static INVINCIBILITY_MS = 2000;   // Invincibility duration after damage (ms)
    static FLICKER_INTERVAL = 100;    // Visibility toggle interval during invincibility (ms)

    /**
     * @param {Phaser.Scene} scene - The scene this player belongs to
     * @param {number} x - Spawn X position (world pixels)
     * @param {number} y - Spawn Y position (world pixels)
     */
    constructor(scene, x, y) {
        this.scene = scene;

        // Create the arcade physics sprite using the preloaded "player" image
        this.sprite = scene.physics.add.sprite(x, y, "player");

        // Configure physics: max velocity and horizontal drag (deceleration)
        this.sprite.setMaxVelocity(Player.MAX_SPEED * 60);
        this.sprite.setDragX(Player.DECELERATION * 60);

        // State: jump tracking
        this.jumpsRemaining = Player.MAX_JUMPS;
        this.wasOnGround = false; // Tracks previous-frame grounded state for landing detection

        // State: health and invincibility
        this.health = Player.MAX_HEALTH;
        this.isInvincible = false;
        this.invincibleTimer = 0;

        // State: climbing
        this.isClimbing = false;

        // Reference to the platforms layer for climbable-tile lookups (set by Level)
        this.platformsLayer = null;
    }

    /**
     * Processes per-frame input and physics for the player.
     * Handles horizontal movement, jumping, climbing, invincibility,
     * landing detection, and fall-death checks.
     *
     * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors - Arrow key state
     * @param {object} keys - WASD + Space key state object
     * @param {number} delta - Frame delta time in ms
     */
    update(cursors, keys, delta) {
        this.handleInvincibility(delta);
        this.handleHorizontalMovement(cursors, keys);
        this.handleLanding();

        // Climbing check must happen before jump logic so that
        // the climb-up input (jump key) is consumed correctly
        this.handleClimbing(cursors, keys);
        this.handleJumping(keys);
        this.checkFallDeath();
    }

    // ─── Horizontal Movement ─────────────────────────────────────────

    /**
     * Reads left/right input (arrow keys + WASD) and applies acceleration.
     * Implements the "instant stop on direction change" from DESIGN.md §2.4:
     * when the player reverses direction, velocity.x is zeroed first to
     * prevent a slippery sliding feel.
     */
    handleHorizontalMovement(cursors, keys) {
        const movingLeft = cursors.left.isDown || keys.left.isDown;
        const movingRight = cursors.right.isDown || keys.right.isDown;

        if (movingLeft) {
            // Instant stop when reversing from right to left
            if (this.sprite.body.velocity.x > 0) {
                this.sprite.setVelocityX(0);
            }
            this.sprite.body.setAccelerationX(-Player.ACCELERATION);
            this.sprite.resetFlip(); // Default facing = left
        } else if (movingRight) {
            // Instant stop when reversing from left to right
            if (this.sprite.body.velocity.x < 0) {
                this.sprite.setVelocityX(0);
            }
            this.sprite.body.setAccelerationX(Player.ACCELERATION);
            this.sprite.setFlip(true, false); // Flip horizontally for right-facing
        } else {
            // No input: zero acceleration, let drag handle deceleration
            this.sprite.body.setAccelerationX(0);
        }
    }

    // ─── Jumping ──────────────────────────────────────────────────────

    /**
     * Handles jump initiation (JustDown) and the jump-cut mechanic
     * (releasing jump while ascending cuts vertical velocity by 0.75).
     * Double-jump is supported: jumpsRemaining is decremented on each jump
     * and reset to 2 on landing.
     */
    handleJumping(keys) {
        // DESIGN.md §2.4: while climbing, the Jump key acts as "climb up"
        // (velocity.y = -150), not a jump. Skip the jump logic entirely
        // so that pressing jump on a ladder doesn't waste a jump charge.
        if (this.isClimbing) return;

        // Initiate a jump only on the frame the key is first pressed
        if (Phaser.Input.Keyboard.JustDown(keys.jump) && this.jumpsRemaining > 0) {
            this.sprite.setVelocityY(Player.JUMP_VELOCITY);
            this.jumpsRemaining--;

            // Play the jump sound at 25% volume
            this.scene.sound.play("jump", { volume: 0.25 });
        }

        // Jump-cut: if the player releases jump while still ascending,
        // multiply vertical velocity by the cut factor for variable height
        if (keys.jump.isUp && this.sprite.body.velocity.y < 0) {
            this.sprite.setVelocityY(this.sprite.body.velocity.y * Player.JUMP_CUT_FACTOR);
        }
    }

    // ─── Climbing ─────────────────────────────────────────────────────

    /**
     * Checks whether the tile at the player's world position on the
     * platforms layer has the custom `climbable` property. If so,
     * disables gravity and allows vertical movement via up/down keys.
     * When no longer on a climbable tile, normal physics resume.
     *
     * DESIGN.md §2.4: "getTileAtWorldXY(player.x, player.y)" on platforms layer.
     * Both arrow keys and WASD are checked per DESIGN.md §3.
     */
    handleClimbing(cursors, keys) {
        // Look up the tile directly beneath the player's center position
        const tile = this.platformsLayer.getTileAtWorldXY(
            this.sprite.x,
            this.sprite.y
        );

        // Enter climbing mode if standing on a climbable tile
        this.isClimbing = tile?.properties?.climbable === true;

        if (this.isClimbing) {
            // Disable gravity so the player can hang on the ladder
            this.sprite.body.allowGravity = false;

            // Up / Jump held → climb up; Down held → climb down; else hang
            // Both arrow keys and WASD + Space are active simultaneously
            const movingUp = cursors.up.isDown || keys.up?.isDown || keys.jump.isDown;
            const movingDown = cursors.down.isDown || keys.down?.isDown;

            if (movingUp) {
                this.sprite.setVelocityY(Player.CLIMB_SPEED_UP);
            } else if (movingDown) {
                this.sprite.setVelocityY(Player.CLIMB_SPEED_DOWN);
            } else {
                this.sprite.setVelocityY(0);
            }
        } else {
            // Re-enable normal gravity when leaving the ladder
            this.sprite.body.allowGravity = true;
        }
    }

    // ─── Landing Detection ───────────────────────────────────────────

    /**
     * Detects the transition from airborne to grounded. On landing:
     *  - Resets jumpsRemaining to 2
     *  - Fires a landing particle burst below the player's feet
     *  - Plays the landing sound at 25% volume
     *
     * Uses body.blocked.down (true when standing on a solid surface).
     */
    handleLanding() {
        const onGround = this.sprite.body.blocked.down;

        // Detect the exact frame the player transitions from air → ground
        if (onGround && !this.wasOnGround) {
            this.jumpsRemaining = Player.MAX_JUMPS;

            // Emit a burst of 15 smoke particles below the player's feet
            this.scene.particles.emitLandingBurst(
                this.sprite.x,
                this.sprite.y + 15
            );

            // Play footstep/landing sound
            this.scene.sound.play("collect", { volume: 0.25 });
        }

        this.wasOnGround = onGround;
    }

    // ─── Invincibility ────────────────────────────────────────────────

    /**
     * Counts down the invincibility timer each frame. While invincible,
     * the player sprite flickers (visible/invisible toggle every 100ms)
     * and is tinted red. When the timer expires, clears the effects.
     *
     * @param {number} delta - Frame delta time in ms
     */
    handleInvincibility(delta) {
        if (!this.isInvincible) return;

        this.invincibleTimer -= delta;

        // Flicker: toggle visibility based on 100ms intervals
        this.sprite.visible = Math.floor(this.invincibleTimer / Player.FLICKER_INTERVAL) % 2 === 0;

        // Invincibility expired — restore normal state
        if (this.invincibleTimer <= 0) {
            this.isInvincible = false;
            this.sprite.visible = true;
            this.sprite.clearTint();
        }
    }

    // ─── Damage & Health ──────────────────────────────────────────────

    /**
     * Called by the spikes collider when the player touches a damage tile.
     * Applies damage only if the player is not currently invincible.
     * On damage: decrement health, start invincibility, tint red.
     * If health reaches 0, the level restarts.
     */
    takeDamage() {
        if (this.isInvincible) return;

        this.health -= Player.DAMAGE_PER_HIT;
        this.scene.hud.updateHealth(this.health);

        // Begin invincibility period
        this.isInvincible = true;
        this.invincibleTimer = Player.INVINCIBILITY_MS;
        this.sprite.setTint(0xff0000);

        // Death: restart the scene
        if (this.health <= 0) {
            this.scene.scene.restart();
        }
    }

    // ─── Fall Death ───────────────────────────────────────────────────

    /**
     * If the player falls below the map (Y > 415), immediately restart the level.
     */
    checkFallDeath() {
        if (this.sprite.y > Player.DEATH_FALL_Y) {
            this.scene.scene.restart();
        }
    }

    // ─── Walk Particle Positioning ────────────────────────────────────

    /**
     * Returns the offset position for walk-dust particles based on
     * the player's current facing direction, per DESIGN.md §6.1:
     *   Moving left  → (player.x + 8, player.y)
     *   Moving right → (player.x - 20, player.y)
     *
     * @returns {{ x: number, y: number, isMoving: boolean }}
     */
    getWalkParticlePosition() {
        const vx = this.sprite.body.velocity.x;
        const isMoving = Math.abs(vx) > 10; // Small threshold to avoid idle particles

        if (vx < 0) {
            return { x: this.sprite.x + 8, y: this.sprite.y, isMoving };
        } else if (vx > 0) {
            return { x: this.sprite.x - 20, y: this.sprite.y, isMoving };
        }
        return { x: this.sprite.x, y: this.sprite.y, isMoving: false };
    }
}
