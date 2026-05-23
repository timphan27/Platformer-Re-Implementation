"use strict"

// Phaser game configuration object
let config = {
    // Mount the game canvas inside the #phaser-game div
    parent: 'phaser-game',

    // Use the Canvas renderer (faster for pixel-art games)
    type: Phaser.CANVAS,

    // Pixel-art rendering: disables texture smoothing so scaled sprites
    // appear crisp instead of blurry
    render: {
        pixelArt: true
    },

    // Game viewport dimensions (DESIGN.md §1: 1400 × 430 pixels)
    width: 1400,
    height: 430,

    // Arcade physics — gravity is overridden to 500 in GameScene.init()
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: true
        }
    },

    // Scene stack: only GameScene is needed for this single-level game
    scene: [GameScene]
};

// Create the Phaser game instance
const game = new Phaser.Game(config);
