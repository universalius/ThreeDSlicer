export const isTouchDevice = (): boolean => 'ontouchstart' in window || Boolean(navigator.maxTouchPoints);
