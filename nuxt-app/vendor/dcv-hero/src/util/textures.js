import * as THREE from 'three'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function tex(c, { repeat = true, srgb = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  return t
}

// Шестигранная перфорация: белое — металл, чёрное — дырка (alphaMap + alphaTest)
export function hexPerf(cols = 10, fill = 0.66) {
  const size = 256
  const [c, ctx] = canvas(size, size)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  const pitch = size / cols
  const rowH = pitch * Math.sqrt(3) / 2
  const rows = Math.round(size / rowH)
  const r = (pitch / 2) * fill
  ctx.fillStyle = '#000'
  for (let j = 0; j <= rows; j++) {
    for (let i = -1; i <= cols; i++) {
      const x = i * pitch + (j % 2 ? pitch / 2 : 0)
      const y = j * (size / rows)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return tex(c)
}

// Шлифованный металл: горизонтальные штрихи → карта шероховатости
export function brushed(dir = 'x') {
  const size = 512
  const [c, ctx] = canvas(size, size)
  ctx.fillStyle = '#8c8c8c'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 9000; i++) {
    const v = 90 + Math.random() * 90
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.5})`
    ctx.lineWidth = 0.6 + Math.random() * 1.2
    const len = 20 + Math.random() * 200
    const a = Math.random() * size
    const b = Math.random() * size
    ctx.beginPath()
    if (dir === 'x') {
      ctx.moveTo(a, b)
      ctx.lineTo(a + len, b)
    } else {
      ctx.moveTo(a, b)
      ctx.lineTo(a, b + len)
    }
    ctx.stroke()
  }
  return tex(c)
}

// Печатная плата: дорожки, площадки, шелкография
export function pcb() {
  const size = 1024
  const [c, ctx] = canvas(size, size)
  ctx.fillStyle = '#0c2219'
  ctx.fillRect(0, 0, size, size)
  // сетка внутренних слоёв
  ctx.strokeStyle = 'rgba(35,90,64,0.35)'
  ctx.lineWidth = 1
  for (let i = 0; i < size; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, size)
    ctx.stroke()
  }
  // манхэттенские дорожки
  const rnd = (n) => Math.floor(Math.random() * n)
  for (let i = 0; i < 700; i++) {
    let x = rnd(size)
    let y = rnd(size)
    const bright = Math.random() < 0.18
    ctx.strokeStyle = bright ? 'rgba(200,160,70,0.9)' : `rgba(40,${120 + rnd(60)},80,0.9)`
    ctx.lineWidth = bright ? 2 : 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segs = 2 + rnd(5)
    for (let s = 0; s < segs; s++) {
      const len = 20 + rnd(140)
      const d = rnd(4)
      if (d === 0) x += len
      else if (d === 1) x -= len
      else if (d === 2) y += len
      else y -= len
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    // площадка на конце
    ctx.fillStyle = '#c9a34a'
    ctx.beginPath()
    ctx.arc(x, y, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  // чипы и шелкография
  for (let i = 0; i < 90; i++) {
    const w = 10 + rnd(40)
    const h = 10 + rnd(40)
    const x = rnd(size - w)
    const y = rnd(size - h)
    ctx.fillStyle = '#0a0d10'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(230,235,240,0.7)'
    ctx.lineWidth = 1
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4)
  }
  // ряды контактов
  for (let i = 0; i < 60; i++) {
    const x = rnd(size)
    const y = rnd(size)
    const n = 6 + rnd(24)
    ctx.fillStyle = '#d3b45a'
    for (let k = 0; k < n; k++) ctx.fillRect(x + k * 4, y, 2, 6)
  }
  return tex(c, { srgb: true })
}

// Фронт стойки для дальних экземпляров: столбик LED и полоса подсветки (emissiveMap)
export function rackFront() {
  const w = 128
  const h = 512
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  // 20 узлов: тусклая полоска бейзела + LED
  for (let i = 0; i < 20; i++) {
    const y = 26 + i * 23
    ctx.fillStyle = 'rgba(60,70,80,0.5)'
    ctx.fillRect(18, y, w - 36, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(22, y + 6, 3, 3)
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.5
    ctx.fillRect(30 + (i % 3) * 5, y + 6, 3, 3)
    ctx.globalAlpha = 1
  }
  // вертикальная полоса подсветки по левому краю
  ctx.fillStyle = '#fff'
  ctx.fillRect(6, 16, 3, h - 32)
  return tex(c, { repeat: false })
}

// Крышка стойки сверху (для вида с высоты): рамка и кабельный лоток
export function rackTop() {
  const w = 128
  const h = 256
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = '#15171c'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#2a2d34'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, w - 6, h - 6)
  // перфорированная вентиляционная вставка, как на детальной стойке
  ctx.fillStyle = '#2a2d34'
  ctx.fillRect(14, 22, w - 28, h - 44)
  ctx.fillStyle = '#0d0e11'
  for (let j = 0; j < 22; j++) {
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 11 + (j % 2 ? 5.5 : 0)
      const y = 28 + j * 9.6
      ctx.beginPath()
      ctx.arc(x, y, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return tex(c, { repeat: false, srgb: true })
}

// Надпись (логотип на бейзеле)
export function label(text, w = 512, h = 96, font = 'bold 44px "Inter", "Helvetica Neue", Arial, sans-serif') {
  const [c, ctx] = canvas(w, h)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '6px'
  // ужимаем шрифт, пока строка не влезет в канвас: ширина зависит от того, какой шрифт
  // нашёлся в системе, и без этого хвост обрезается («…VALL»)
  const max = w - 16
  let size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1])
  while (size > 8 && ctx.measureText(text).width > max) {
    size -= 1
    ctx.font = font.replace(/\d+(?:\.\d+)?px/, `${size}px`)
  }
  ctx.fillText(text, 8, h / 2)
  return tex(c, { repeat: false, srgb: true })
}

// Инвентарная наклейка: штрих-код и серийник
export function sticker(text = 'DCV-2U-0417') {
  const w = 256
  const h = 96
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = '#e6e7e9'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#141414'
  let x = 12
  while (x < w - 96) {
    const bw = 1 + Math.floor(Math.random() * 3)
    ctx.fillRect(x, 12, bw, 42)
    x += bw + 1 + Math.floor(Math.random() * 3)
  }
  ctx.font = 'bold 17px "JetBrains Mono", Menlo, monospace'
  ctx.fillText(text, 12, 78)
  ctx.fillStyle = '#3a3a3a'
  ctx.font = '600 13px "Inter", Arial, sans-serif'
  ctx.fillText('ASSET TAG', w - 90, 30)
  ctx.fillText('DC VALLEY', w - 90, 50)
  ctx.fillStyle = '#c8102e'
  ctx.fillRect(w - 90, 62, 76, 18)
  return tex(c, { repeat: false, srgb: true })
}

// Нумерация юнитов на рейке стойки (42U снизу вверх)
export function unitNumbers(units = 42) {
  const w = 32
  const h = 2048
  const [c, ctx] = canvas(w, h)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(235,238,242,0.85)'
  ctx.font = '500 19px "JetBrains Mono", Menlo, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < units; i++) {
    const y = h - (i + 0.5) * (h / units)
    ctx.fillText(String(i + 1).padStart(2, '0'), w / 2, y)
    ctx.fillRect(4, y + h / units / 2 - 1, w - 8, 1)
  }
  return tex(c, { repeat: false, srgb: true })
}
