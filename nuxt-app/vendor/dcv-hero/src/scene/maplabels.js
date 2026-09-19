import * as THREE from 'three'
import { CITIES, MAP_LABELS, HUB } from '../config.js'
import { geoToScene, EARTH_CENTER } from '../util/earth.js'
import { smooth, inv } from '../util/math.js'

// ---------------------------------------------------------------------------
//  Подписи карты финала: города, рамки задержек, название хаба и морского
//  кабеля. DOM поверх канваса; каждая появляется, когда до её точки дошла
//  трасса (world.reach, км от хаба по сети).
// ---------------------------------------------------------------------------

const ALT = 6000
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

export class MapLabels {
  constructor(panel, world) {
    this.world = world
    this.layer = document.createElement('div')
    this.layer.className = 'dcv-map'
    panel.appendChild(this.layer)
    this.v = new THREE.Vector3()
    this.n = new THREE.Vector3()
    const reach = world.globe.reach
    const narrow = panel.clientWidth < 520

    const add = (cls, html, geo, km, dx, dy, align = 'left') => {
      const el = document.createElement('div')
      el.className = cls
      el.innerHTML = html
      this.layer.appendChild(el)
      this.items.push({ el, pos: geoToScene(geo[0], geo[1], ALT), km, dx, dy, align, alpha: -1 })
    }
    this.items = []
    for (const l of MAP_LABELS) {
      const km = reach[l.at] ?? 0
      if (narrow && l.narrow === false) continue
      const o = narrow && l.narrow ? l.narrow : l
      add('dcv-city', l.text, CITIES[l.at], km, o.dx, o.dy, o.align)
      if (l.ms && !narrow) add('dcv-ms', `<b>${l.ms}</b><span>ms</span>`, CITIES[l.at], km + 150, l.mdx, l.mdy, 'center')
    }
    add('dcv-hubtag', HUB.name.replace(/ (?=\S+$)/, '<br>'), HUB.geo, -1, 30, -24, 'left-middle')
    add('dcv-note', 'Trans-Caspian<br>fiber optic', mid(CITIES.aktau, CITIES.sumgait), reach.sumgait, 34, 30, 'left')
  }

  update(p) {
    const w = this.world
    const { w: W, h: Hh } = w.size
    const on = smooth(inv(p, 1.26, 1.3))
    const reach = w.reach ?? 0
    const cam = w.camera
    for (const it of this.items) {
      // хаб подписывается сразу, остальное — по мере прорисовки трасс
      const a = on * (it.km < 0 ? smooth(inv(p, 1.28, 1.31)) : smooth(inv(reach, it.km - 50, it.km + 250)))
      if (a < 0.01) {
        if (it.alpha >= 0.01) it.el.style.opacity = '0'
        it.alpha = a
        continue
      }
      it.alpha = a
      // точка за горизонтом шара — прячем
      this.n.subVectors(it.pos, EARTH_CENTER).normalize()
      const facing = this.n.dot(this.v.subVectors(cam.position, it.pos).normalize())
      this.v.copy(it.pos).project(cam)
      if (facing < 0 || this.v.z > 1) {
        it.el.style.opacity = '0'
        continue
      }
      const x = (this.v.x * 0.5 + 0.5) * W + it.dx
      const y = (-this.v.y * 0.5 + 0.5) * Hh + it.dy
      const bw = it.el.offsetWidth
      const bh = it.el.offsetHeight
      let x0 = it.align === 'right' ? x - bw : it.align === 'center' ? x - bw / 2 : x
      let y0 = y - bh / 2
      x0 = Math.max(8, Math.min(W - bw - 8, x0))
      y0 = Math.max(8, Math.min(Hh - bh - 8, y0))
      it.el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`
      it.el.style.opacity = a.toFixed(3)
    }
  }
}
