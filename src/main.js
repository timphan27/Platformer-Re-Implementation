// Phaser game configuration and entry point.
// The game is launched by opening index.html with Live Server.
const config = {
    type: Phaser.AUTO,
    width: 1400,
    height: 430,
    parent: 'phaser-game',
    pixelArt: true,               // Disable anti-aliasing for crisp pixel art
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 }, // Overridden to 500 in GameScene.init()
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);
