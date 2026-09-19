// ---------------------------------------------------------------------------
//  Data Center Valley — общие размеры и цвета сцены. Единицы — метры.
// ---------------------------------------------------------------------------

export const COLORS = {
  bg: 0x0c0d10,
  floor: 0x0f1014,
  cyan: 0x3ee9ff,
  magenta: 0xff3ec9,
  amber: 0xffb347,
  white: 0xf4f6f8,
}

// 2U узел: 19" стойка → 0.48 м ширина, 2U = 88.9 мм высота, 0.78 м глубина
export const SERVER = { W: 0.48, H: 0.086, D: 0.78 }
export const U = 0.04445
export const SLOT = U * 2 // шаг между узлами в стойке

// 42U стойка
export const RACK = {
  W: 0.6,
  D: 1.15,
  PITCH_X: 0.62, // шаг стоек в ряду
  SLOTS: 20, // узлов в стойке
  HERO_SLOT: 9, // герой стоит в этом слоте (0 — нижний)
  BASE: 0.1, // цоколь
  TOP: 0.08, // крышка
}
RACK.H = RACK.BASE + RACK.SLOTS * SLOT + RACK.TOP

// Центр узла в слоте s относительно низа стойки
export const slotY = (s) => RACK.BASE + s * SLOT + SLOT / 2

// Герой стоит в начале координат → низ стойки/пол находятся здесь
export const FLOOR_Y = -slotY(RACK.HERO_SLOT)

// Детальные стойки: ряд героя и ряд напротив через холодный коридор (остальное — инстансы кампуса)
export const ROW = { FROM: -12, TO: 12 }
export const FACING = { FROM: -12, TO: 12 }

// Кампус: пары рядов «спина к спине», между парами холодный коридор
export const DC = {
  PAIR_PITCH: 4.0, // шаг пар рядов по Z
  BACK_OFFSET: -1.3, // задний ряд пары относительно переднего
  PAIRS: 8, // пар в каждую сторону от героя → 17 пар, 34 ряда
  COLS: 47, // стоек в каждую сторону от героя по X → 95 колонок, минус 2 коридора = 89 стоек в ряду
  CORRIDORS: [-16, 14], // поперечные проходы (индекс колонки), ширина 3 стойки; герой-ряд (-3..4) не пересекают
}

// Лента: прогресс сцены p идёт от 0 до T_END. Узел → зал укладываются в 0..1
// (все прежние тайминги в этих единицах), здание и карта мира — 1..T_END.
// Скролл 0..1 растягивается на всю ленту, длина пина пропорциональна.
export const T_END = 1.5
export const PIN_PER_UNIT = 520 // % высоты экрана на единицу ленты

// Стадии HUD по прогрессу ленты p (0..T_END)
export const STAGES = [
  { at: 0.0, label: 'Components', title: 'Every part engineered for density' },
  { at: 0.09, label: 'Assembly', title: 'A liquid-cooled compute node comes together' },
  { at: 0.38, label: 'Node', title: '2U node: four accelerators, two CPUs, 16 DIMMs, eight NVMe bays' },
  { at: 0.52, label: 'Rack', title: '42U rack, 20 nodes, direct-to-chip cooling' },
  { at: 0.7, label: 'Row', title: 'Hot-aisle containment, 18 MW per row' },
  { at: 0.84, label: 'Hall', title: 'Thousands of racks in a single data hall' },
  { at: 1.03, label: 'Campus', title: 'Data Center Valley from above' },
  { at: 1.22, label: 'Hub', title: 'Data Center Valley: low-latency routes to Europe' },
]

// ---------------------------------------------------------------------------
//  Площадка: длинные корпуса вдоль X, зал героя — средняя секция корпуса 0.
// ---------------------------------------------------------------------------
export const SITE = {
  BW: 208, // длина корпуса по X
  BD: 75, // ширина корпуса по Z (зал героя — ±34 м)
  BH: 10, // высота стен
  PITCH: 105, // шаг корпусов по Z
  COUNT: [-3, 3], // корпуса k·PITCH, k = -3..3
}

// ---------------------------------------------------------------------------
//  Карта мира. Хаб — Экибастуз (Павлодарская обл.); координаты [долгота, широта].
// ---------------------------------------------------------------------------
export const EARTH_R = 6371000
export const HUB = { name: 'Data Center Valley', geo: [75.32, 51.72] }

export const CITIES = {
  hub: HUB.geo,
  jct: [54.2, 50.9], // развилка у Уральска — без подписи
  uralsk: [51.37, 51.23],
  moscow: [37.62, 55.75],
  stockholm: [18.07, 59.33],
  frankfurt: [8.68, 50.11],
  caspian: [52.6, 47.4], // вдоль берега к Актау — без подписи
  aktau: [51.17, 43.65],
  sumgait: [49.67, 40.59],
  istanbul: [28.98, 41.01],
  urumqi: [87.6, 43.8],
  xian: [108.9, 34.3],
}

// Трассы — цепочки точек от хаба; kind: 'fiber' синяя, 'caspian' зелёная (морской кабель).
// bend — плавный боковой изгиб в долях длины (минус — к северу на западных трассах).
// Через Уральск идёт только Москва; остальная Европа — через Сумгаит (Транскаспийский кабель).
// Порядок важен: трасса из точки описывается после той, что до неё доходит.
export const ROUTES = [
  { path: ['hub', 'jct', 'uralsk'], kind: 'fiber' },
  { path: ['uralsk', 'moscow'], kind: 'fiber' },
  { path: ['jct', 'caspian', 'aktau'], kind: 'fiber' },
  { path: ['aktau', 'sumgait'], kind: 'caspian' },
  { path: ['sumgait', 'istanbul'], kind: 'fiber' },
  { path: ['sumgait', 'frankfurt'], kind: 'fiber', bend: -0.06 },
  { path: ['sumgait', 'stockholm'], kind: 'fiber', bend: 0.1 },
  { path: ['hub', 'urumqi', 'xian'], kind: 'fiber', fadeEnd: true },
]

// Подписи карты. ms — задержка до хаба; dx/dy — смещение подписи в px;
// narrow — замена для узкой панели (телефон), narrow: false — там не показывать
export const MAP_LABELS = [
  { at: 'uralsk', text: 'Uralsk', dx: -8, dy: -16, align: 'right', narrow: false },
  { at: 'moscow', text: 'Moscow', dx: 0, dy: -18, align: 'center', ms: 52, mdx: 40, mdy: -70, narrow: { dx: 0, dy: 16, align: 'center' } },
  { at: 'stockholm', text: 'Stockholm', dx: 12, dy: -12, ms: 57, mdx: -80, mdy: -60 },
  { at: 'frankfurt', text: 'Frankfurt', dx: 0, dy: 40, align: 'center', ms: 70, mdx: -40, mdy: -62, narrow: { dx: 0, dy: -16, align: 'center' } },
  { at: 'aktau', text: 'Aktau', dx: -10, dy: -14, align: 'right' },
  { at: 'sumgait', text: 'Sumgait', dx: 0, dy: 20, align: 'center' },
  { at: 'istanbul', text: 'Istanbul', dx: -10, dy: -16, align: 'right', ms: 62, mdx: -70, mdy: 40 },
]

// Страны, которые подсвечиваются, когда до них доходит трасса (ISO 3166 numeric)
export const HIGHLIGHT = [
  { id: '398', at: 'hub' }, // Казахстан
  { id: '031', at: 'sumgait' }, // Азербайджан
  { id: '792', at: 'istanbul' }, // Турция
  { id: '752', at: 'stockholm' }, // Швеция
  { id: '276', at: 'frankfurt' }, // Германия
]
