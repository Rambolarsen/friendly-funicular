/**
 * Singleton virtual input state written by MobileControls (React) and read
 * by Player and GameScene (Phaser) alongside physical keyboard inputs.
 * All fields default to false (no input active).
 */
export const mobileInput = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  ability: false,
};
