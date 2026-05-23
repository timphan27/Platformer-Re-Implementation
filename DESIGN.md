# Hasty Dash — Game Design Document

## 1. Overview

**Hasty Dash** is a 2D side-scrolling platformer game where the player navigates a horizontally-scrolling level filled with platforms, hazards, and collectibles. The player must reach the end-of-level flag while avoiding spike hazards and collecting optional items. The game features double-jump and ladder-climbing mechanics.

- **Genre:** 2D Side-scrolling Platformer
- **Perspective:** Side view, horizontally scrolling
- **Engine:** Phaser 3 (Arcade Physics)
- **Art Style:** Pixel art (18x18 pixel tiles), Kenney "Pixel Platformer" asset pack
- **Screen Resolution:** 1400 x 430 pixels, camera zoom 1.5x

---

## 2. Player Character

### 2.1 Visual Representation

- **Sprite:** A single static pixel-art character image (`tile_0000.png` from the Kenney Pixel Platformer Characters folder).
- **Size:** Approximately 18x18 pixels (one tile unit).
- **Facing:** The sprite is flipped horizontally based on movement direction. Moving left = default facing. Moving right = horizontally flipped (setFlip(true, false)).

### 2.2 Spawn Position

- **X:** 50 pixels, **Y:** 200 pixels (world coordinates).

### 2.3 Movement Physics

All values use Phaser Arcade Physics conventions (pixels-per-second for velocity, pixels-per-second² for acceleration/drag). The physics engine runs at 60 FPS.

| Parameter | Value | Notes |
|---|---|---|
| Gravity (Y) | 500 px/s² | Applied globally; overrides the Phaser config default |
| Max Horizontal Velocity | 600 px/s | MAX_SPEED (10) * 60 |
| Horizontal Acceleration | 125 px/s² | Applied when a movement key is held |
| Horizontal Drag (Deceleration) | 30,000 px/s² | DECELERATION (500) * 60; applied automatically when no movement key is held |
| Jump Velocity (Y) | -350 px/s | Instantaneous velocity set on jump press |
| Jump Cut Factor | 0.75 | If jump key released while ascending, vertical velocity multiplied by 0.75 to cut the jump short |
| Jumps Allowed | 2 (double jump) | Reset to 2 when landing on ground |
| Climb Speed Up | -150 px/s | Vertical velocity while on a ladder pressing up/jump |
| Climb Speed Down | 100 px/s | Vertical velocity while on a ladder pressing down |
| Death Fall Y | > 415 px | If player's Y exceeds this, level restarts |

### 2.4 Movement Behavior Details

**Direction Change — Instant Stop:**
When the player changes direction (e.g., was moving right, now pressing left), the current horizontal velocity is immediately zeroed before applying acceleration in the new direction. This prevents a "slippery" feel:

- If pressing left and current velocity.x > 0: set velocity.x = 0, then apply acceleration.x = -125
- If pressing right and current velocity.x < 0: set velocity.x = 0, then apply acceleration.x = +125
- If no movement key: acceleration.x = 0 (drag handles deceleration)

**Jump Behavior:**
- On jump key **just pressed** (not held): set velocity.y = -350, decrement jumpsRemaining by 1
- Jumps are available only when jumpsRemaining > 0
- On jump key **released** while velocity.y < 0 (ascending): multiply velocity.y by 0.75 (cut the jump short for variable height)
- When landing (transition from airborne to ground): reset jumpsRemaining to 2

**Ladder Climbing:**
- A tile beneath the player is checked each frame using `getTileAtWorldXY(player.x, player.y)`
- If that tile has the custom property `climbable: true`, the player enters climbing mode
- While climbing:
  - Gravity is disabled (`allowGravity = false`)
  - Vertical velocity is set based on input:
    - Up or Jump key held: velocity.y = -150
    - Down key held: velocity.y = 100
    - Neither: velocity.y = 0 (player hangs in place)
- When no longer on a climbable tile:
  - Gravity is re-enabled (`allowGravity = true`)
  - Normal physics resume

### 2.5 Health System

| Parameter | Value |
|---|---|
| Starting Health | 3 |
| Damage per Spike Hit | 1 |
| Invincibility Duration | 2000 ms (2 seconds) |
| Invincibility Visual | Player tinted red (0xff0000), sprite flickers (visibility toggles every 100ms based on timer) |
| Death Condition | Health reaches 0 → level restarts |

**Invincibility Behavior:**
- When taking damage, the player becomes invincible for 2 seconds
- During invincibility, no further damage can be taken
- The player sprite is tinted red and flickers (visible/invisible toggling)
- When the invincibility timer expires: tint is cleared, visibility restored to true, invincibility flag set to false

---

## 3. Controls

| Action | Key Binding |
|---|---|
| Move Left | Arrow Left or A |
| Move Right | Arrow Right or D |
| Move Up / Climb Up | Arrow Up or W |
| Move Down / Climb Down | Arrow Down or S |
| Jump | Space bar |

Both arrow keys and WASD keys are active simultaneously. The jump key (Space) also functions as "climb up" while on a ladder.

---

## 4. Level Design

### 4.1 Level Format

Levels are defined in **Tiled Map Editor** format (`.tmj` JSON files). The level file used is `assets/level.tmj`.

| Property | Value |
|---|---|
| Map Width | 250 tiles |
| Map Height | 20 tiles |
| Tile Size | 18 x 18 pixels |
| Total Pixel Dimensions | 4500 x 360 pixels |
| Orientation | Orthogonal |
| Render Order | Right-down |

### 4.2 Tilemap Layers

The level contains 5 tile layers, rendered in this order (bottom to top):

| Layer Name | Tileset | Purpose |
|---|---|---|
| `background` | `tilemap-backgrounds_packed` | Decorative background tiles (sky, clouds, etc.) — no collision |
| `platforms` | `tilemap_packed` | Solid terrain tiles the player collides with; also contains climbable (ladder) tiles |
| `collectibles` | `tilemap_packed` | Collectible item tiles — overlap detection, no collision |
| `flag` | `tilemap_packed` | End-of-level flag tiles — overlap detection, triggers level complete |
| `spikes` | `tilemap_packed` | Spike hazard tiles — collider with damage callback |

### 4.3 Tilesets

Two tilesets are used:

**Primary Tileset (`tilemap_packed`):**
- Image: `kenney_pixel-platformer/Tilemap/tilemap_packed.png`
- Size: 360 x 162 pixels
- Layout: 20 columns x 9 rows
- Tile count: 180 tiles
- Tile size: 18 x 18 pixels, no spacing or margin
- First global ID: 1
- Individual tile images also available in `kenney_pixel-platformer/Tiles/` (tile_0000.png through tile_0179.png)

**Background Tileset (`tilemap-backgrounds_packed`):**
- Image: `kenney_pixel-platformer/Tilemap/tilemap-backgrounds_packed.png`
- Size: 192 x 72 pixels
- Layout: 10 columns x 4 rows
- Tile count: 40 tiles
- Tile size: 18 x 18 pixels, no spacing or margin
- First global ID: 181

**Note:** The individual character sprite files are 24x24 pixels, while the packed tilemap tiles are 18x18 pixels. The player sprite loaded separately from the Characters folder retains its original 24x24 size.

### 4.4 Tile Custom Properties

Tiles in the `tilemap_packed` tileset have custom properties set in Tiled that drive gameplay:

| Property | Type | Effect | Tiles with this Property |
|---|---|---|---|
| `collides` | bool | Player collides with this tile (solid platform) | IDs: 0-6, 12-15, 20-25, 29, 32, 40, 42-43, 52, 60-63, 72, 80-83, 100-103, 153-156 |
| `collectible` | bool | Player can collect this tile (overlap) | ID: 27 |
| `climbable` | bool | Player can climb on this tile (ladder) | IDs: 51, 68, 71 |
| `damage` | bool | Tile damages the player on collision | ID: 68 |
| `end` | bool | Tile triggers level completion (overlap) | IDs: 41, 111, 131 |

**Important: Tile ID 68** is both `climbable` and `damage` — it represents a thorny vine or similar climbable hazard. The player can climb it but takes damage on contact. It also has `collides: true`, making it a solid surface.

**Important: Tile ID 41** has both `collides: true` and `end: true`. It appears on the `flag` layer, which uses overlap detection, so the collision property does not interfere with the end trigger.

### 4.5 Collision Behavior by Layer

**Platforms Layer:**
- Uses `setCollisionByProperty({ collides: true })` — only tiles with the `collides` property set to true are solid
- Standard solid collision: player cannot pass through from any direction
- The climbable tiles (IDs 51, 71) are on this layer; they do NOT have `collides: true`, so they are not solid — the player can walk through them but can climb on them

**Spikes Layer:**
- Uses `setCollisionByProperty({ collides: true })` for collision detection
- Uses a **collider** (not overlap) with a process callback that checks `tile.properties.damage === true`
- **Consequence:** Spikes are solid — the player can stand on top of them. The player takes damage on contact, but the spikes also act as solid platforms
- Damage is only applied when the tile has `damage: true` (tile ID 68 is the only spike tile with this property)

**Collectibles Layer:**
- Uses **overlap** detection (not collision) — collectible tiles are not solid
- Overlap callback is triggered only when `tile.properties.collectible === true`
- When collected: the tile is removed from the layer, the counter increments, and the HUD text updates

**Flag Layer:**
- Uses **overlap** detection — flag tiles are not solid
- Overlap callback is triggered only when `tile.properties.end === true`

---

## 5. Game Systems

### 5.1 Collectibles System

| Parameter | Value |
|---|---|
| Total Collectibles in Level | 3 |
| Collection Method | Overlap detection between player and collectible tiles |
| Tile ID | 27 (has `collectible: true` property) |
| On Collection | Tile removed from map, counter incremented |
| HUD Display | "Collectibles: X /3" (top-right of screen) |

Collectibles are optional — the player can complete the level without collecting all of them. The collectible count is displayed but has no gameplay effect.

### 5.2 Spike / Damage System

| Parameter | Value |
|---|---|
| Damage Tile ID | 68 (has `damage: true` and `climbable: true` and `collides: true`) |
| Collision Type | Solid collider with damage process callback |
| Damage per Contact | 1 health point |
| Invincibility After Hit | 2 seconds |
| Invincibility Visual | Red tint + flickering visibility |
| Death at 0 Health | Level restarts (scene.restart()) |

### 5.3 Level Completion System

| Parameter | Value |
|---|---|
| Trigger | Overlap with a tile having `end: true` property |
| End Tile IDs | 41, 111, 131 |
| On Completion | Physics paused, "LEVEL COMPLETE" text displayed (green, 40px font), level restarts after 1.5 seconds |
| Completion Text Position | Top-center area of screen |

### 5.4 Fall Death System

| Parameter | Value |
|---|---|
| Death Condition | Player Y position > 415 pixels |
| On Fall Death | Level restarts immediately (scene.restart()) |

### 5.5 Landing Detection

When the player transitions from airborne to grounded (checked via `body.blocked.down`):
- Jumps remaining reset to 2
- Landing particle effect plays (smoke puff below player feet)
- Landing sound plays at 0.25 volume

---

## 6. Visual Effects & Audio

### 6.1 Particle Effects

**Walk Particles:**
- Asset: `kenney_particle-pack/PNG (Transparent)/Rotated/trace_02_rotated.png`
- Behavior: Continuous emission while moving (emitting: true), stops when idle (emitting: false)
- Speed: 10-40 px/s (random range)
- Scale: starts at 0.15, ends at 0
- Lifespan: 300 ms
- Quantity: 1 particle per emission
- Frequency: 50 ms
- Alpha: starts at 0.6, ends at 0
- Position offset (moving left): player.x + 8, player.y
- Position offset (moving right): player.x - 20, player.y

**Landing Particles:**
- Asset: `kenney_particle-pack/PNG (Transparent)/smoke_01.png`
- Behavior: Burst emission on landing (explode mode, not continuous)
- Speed: 10-40 px/s (random range)
- Scale: starts at 0.08, ends at 0
- Lifespan: 300 ms
- Quantity: 1 particle per burst, 15 particles total in the explosion
- Frequency: -1 (manual trigger only)
- Alpha: starts at 0.25, ends at 0
- Position: player.x, player.y + 15 (below the player's feet)

### 6.2 Audio

| Sound Key | Asset File | When Played | Volume |
|---|---|---|---|
| `collect` | `kenney_impact-sounds/Audio/footstep_grass_000.ogg` | Player lands on ground | 0.25 |
| `jump` | `8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/.../SFX_Jump_50.wav` | Player jumps | 0.25 |

**Note:** Despite the sound key name "collect", the footstep sound is actually played on landing, not on collecting items. There is no sound played when collecting items.

### 6.3 HUD (Heads-Up Display)

Both HUD elements are fixed to the camera (scrollFactor = 0):

| Element | Position | Font | Color | Content |
|---|---|---|---|---|
| Collectibles Counter | Top-right (x: screenWidth - 240, y: 80), origin (1, 0) | 24px | Black (#000000) | "Collectibles: X /3" |
| Health Counter | Below collectibles (x: screenWidth - 240, y: 100), origin (1, 0) | 24px | Black (#000000) | "Health: X" |

### 6.4 Camera

| Parameter | Value |
|---|---|
| Follow Target | Player sprite |
| Follow Lerp | 0.25 (both X and Y) |
| Deadzone | 50 x 50 pixels |
| Zoom | 1.5x |
| Bounds | Full map size (0, 0 to map.widthInPixels, map.heightInPixels) |

---

## 7. Art Asset Inventory

### 7.1 Tilemap Assets

| Asset | Path | Description |
|---|---|---|
| Primary Tileset Image | `assets/kenney_pixel-platformer/Tilemap/tilemap_packed.png` | 360x162px, 20x9 grid of 18x18px tiles (180 tiles total), no spacing/margin |
| Background Tileset Image | `assets/kenney_pixel-platformer/Tilemap/tilemap-backgrounds_packed.png` | 192x72px, 10x4 grid of 18x18px tiles (40 tiles total), no spacing/margin |
| Level File | `assets/level.tmj` | Tiled JSON map file, 250x20 tiles, 5 layers |
| Tiled Session | `assets/platformer-level1.tiled-session` | Tiled editor session file |

### 7.2 Individual Tile Images

| Category | Path | Size | Count |
|---|---|---|---|
| Tiles | `assets/kenney_pixel-platformer/Tiles/tile_0000.png` through `tile_0179.png` | 18x18px each | 180 |
| Characters | `assets/kenney_pixel-platformer/Tiles/Characters/tile_0000.png` through `tile_0026.png` | 24x24px each | 27 |
| Backgrounds | `assets/kenney_pixel-platformer/Tiles/Backgrounds/tile_0000.png` through `tile_0023.png` | 24x24px each | 24 |

### 7.3 Player Sprite

- **Asset:** `assets/kenney_pixel-platformer/Tiles/Characters/tile_0000.png`
- **Size:** 24x24 pixels (larger than the 18x18 tile size — the player extends slightly beyond one tile)
- **Loaded as:** static image (no sprite sheet or animation frames)

### 7.4 Particle Effect Images

| Asset | Path |
|---|---|
| Smoke (landing) | `assets/kenney_particle-pack/PNG (Transparent)/smoke_01.png` |
| Trace (walking) | `assets/kenney_particle-pack/PNG (Transparent)/Rotated/trace_02_rotated.png` |

### 7.5 Audio Assets

| Asset | Path | Format |
|---|---|---|
| Footstep/landing | `assets/kenney_impact-sounds/Audio/footstep_grass_000.ogg` | OGG |
| Jump | `assets/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/8_BIT_[50_SFX]_Jump_Free_Sound_Effects_N1_BY_jalastram/SFX_Jump_50.wav` | WAV |

### 7.6 Asset Licenses

All Kenney assets (pixel-platformer, impact-sounds, particle-pack) are released under the **CC0 (Creative Commons Zero)** license — free for any use. The jump sound effects by jalastram are also free sound effects.

---

## 8. Game Flow

### 8.1 State Machine

```
[Level Start]
     |
     v
[Playing] <----(scene.restart on death/fall)----+
     |                                           |
     | (touch end tile)                          |
     v                                           |
[Level Complete]                                 |
     |                                           |
     | (1.5s delay)                              |
     v                                           |
[Level Restart] ---------------------------------+
```

### 8.2 Scene Lifecycle

1. **init()** — Set all game constants and state variables (health, collectibles, jump count, physics values)
2. **preload()** — Load tilemap JSON, tileset images, player sprite, particle images, audio files
3. **create()** — Create tilemap layers, set up collision by property, create player sprite, configure camera, set up collider/overlap callbacks, create HUD text and particle emitters
4. **update()** — Process input, apply movement/jump/climbing physics, handle invincibility timer, detect fall death

### 8.3 Level Restart Behavior

On death (health reaches 0 or player falls below the map) or level completion, the **entire scene restarts** via `this.scene.restart()`. This resets:
- Player position to spawn (50, 200)
- Health to 3
- Collectible count to 0
- All tiles restored (collectibles re-appear)
- All physics and state reset

---

## 9. Re-Implementation Notes

### 9.1 Critical Behavior for Faithful Reproduction

1. **Direction-change instant stop:** When changing direction, velocity.x is zeroed immediately before acceleration is applied. This is critical to the game feel — without it, the player will slide when changing direction.

2. **Jump cut mechanic:** Releasing the jump key while ascending multiplies velocity.y by 0.75. This allows variable jump height: tapping jump gives a short hop, holding gives a full jump.

3. **Double jump:** The player has 2 jumps. The second jump in mid-air applies the same velocity (-350) as the first. Jumps reset only when landing (body.blocked.down transitions from false to true).

4. **Spike tiles are solid:** Spikes use a collider (not overlap), meaning the player can stand on them. This is a design choice, not a bug. The player takes damage on contact but is also physically supported by the spike tile.

5. **Ladder detection by tile position:** The climbable check uses `getTileAtWorldXY(player.x, player.y)` on the **platforms layer** — the tile directly at the player's center position. If that tile has `climbable: true`, the player enters climbing mode. This means the player must be positioned on or within the ladder tile, not merely adjacent to it.

6. **Ladder + damage interaction:** Tile ID 68 is both climbable and damaging. When the player is on this tile, they enter climbing mode (gravity disabled, vertical control enabled) but also take damage if not invincible.

7. **Gravity override:** The game sets gravity to 500 px/s² in init(), overriding the config value of 1500. The effective gravity is 500.

8. **Camera lerp and deadzone:** The camera follows with a lerp factor of 0.25 (smooth but not instant) and a 50x50 deadzone (small movements within this box don't move the camera).

9. **Pixel art rendering:** The game uses `pixelArt: true` rendering mode, which disables texture smoothing/anti-aliasing. This is essential for the pixel art aesthetic — without it, tiles and sprites will appear blurry when scaled.

### 9.2 Tiled Property Mapping

When loading the level in a new engine, the custom tile properties from the `.tmj` file must be read and mapped to game behaviors:

| Tiled Property | Game Behavior |
|---|---|
| `collides: true` | Tile is solid (blocks player movement) |
| `collectible: true` | Tile can be collected via overlap; removed on collection |
| `climbable: true` | Player enters climbing mode when overlapping this tile |
| `damage: true` | Player takes 1 damage on collision with this tile |
| `end: true` | Overlap triggers level completion |

### 9.3 Key Tile IDs Reference

For the `tilemap_packed` tileset (firstgid = 1), the following tile IDs have gameplay significance:

| Tile ID | Properties | Visual Description (likely) |
|---|---|---|
| 0-6 | collides | Ground/terrain blocks (top row of tileset) |
| 12-15 | collides | Terrain blocks (second row segment) |
| 20-25 | collides | Terrain blocks (third row segment) |
| 27 | collectible | Collectible item (coin/gem) |
| 29 | collides | Single solid block |
| 32 | collides | Single solid block |
| 40 | collides | Solid block |
| 41 | collides, end | Flag/goal marker |
| 42-43 | collides | Solid blocks |
| 51 | climbable | Ladder segment (no collision) |
| 52 | collides | Solid block |
| 60-63 | collides | Terrain blocks |
| 68 | climbable, collides, damage | Thorny vine / climbable hazard |
| 71 | climbable | Ladder segment |
| 72 | collides | Solid block |
| 80-83 | collides | Terrain blocks |
| 100-103 | collides | Terrain blocks |
| 111 | end | Flag top / goal marker |
| 131 | end | Flag / goal marker |
| 153-156 | collides | Terrain blocks |
