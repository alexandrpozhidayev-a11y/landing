export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
// 0..1 внутри отрезка [a,b]
export const inv = (v, a, b) => clamp((v - a) / (b - a))
export const smooth = (t) => t * t * (3 - 2 * t)
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
export const easeOutBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)
// Плавно 0→1 на [a,b] и обратно 1→0 на [c,d]
export const envelope = (v, a, b, c, d) => smooth(inv(v, a, b)) * (1 - smooth(inv(v, c, d)))
// Экспоненциальное сглаживание, независимое от fps
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt))
