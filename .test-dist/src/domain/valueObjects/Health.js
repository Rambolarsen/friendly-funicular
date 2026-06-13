"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Health = void 0;
class Health {
    current;
    max;
    constructor(current, max) {
        this.current = current;
        this.max = max;
    }
    static of(max) {
        return new Health(max, max);
    }
    take(damage) {
        return new Health(Math.max(0, this.current - damage), this.max);
    }
    isDead() {
        return this.current <= 0;
    }
}
exports.Health = Health;
