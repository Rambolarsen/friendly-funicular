"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnDeathBurst = spawnDeathBurst;
const phaser_1 = __importDefault(require("phaser"));
function spawnDeathBurst(scene, x, y, color) {
    const count = phaser_1.default.Math.Between(6, 8);
    for (let index = 0; index < count; index += 1) {
        const particle = scene.add.rectangle(x, y, 8, 8, color).setDepth(18);
        const angle = phaser_1.default.Math.FloatBetween(0, Math.PI * 2);
        const distance = phaser_1.default.Math.Between(40, 80);
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            alpha: 0,
            scaleX: 0.4,
            scaleY: 0.4,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                particle.destroy();
            },
        });
    }
}
