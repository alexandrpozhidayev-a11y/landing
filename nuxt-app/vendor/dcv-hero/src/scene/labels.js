import * as THREE from 'three'
import { RACK, FLOOR_Y } from '../config.js'
import { envelope } from '../util/math.js'

// ---------------------------------------------------------------------------
//  Выноски, привязанные к 3D-точкам: подпись в DOM, линия-указка в SVG.
//  Каждая живёт в своём окне прогресса и проецируется каждый кадр.
// ---------------------------------------------------------------------------

const ITEMS = [
  { key: 'gpu1', text: 'Accelerators', sub: '4 modules, direct-to-chip cold plates', off: [0, 0.03, 0], dx: -170, dy: -70, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'cpu1', text: 'CPUs', sub: '2 sockets, 192 cores', off: [0, 0.03, 0], dx: 140, dy: -60, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'dimm12', text: 'Memory', sub: '16 DIMMs, 2 TB', mobile: false, off: [0, 0.02, 0], dx: 150, dy: 30, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'loop', text: 'Liquid-cooling loop', sub: 'Direct-to-chip, 40 °C inlet', mobile: false, off: [0, 0.02, -0.1], dx: -120, dy: -90, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'nvme2', text: 'Storage', sub: '8 NVMe bays, 61 TB', off: [0, 0, 0.02], dx: -150, dy: 60, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'fan3', text: 'Fan wall', sub: '6 counter-rotating fans', mobile: false, off: [0, 0.04, 0], dx: 120, dy: 90, win: [-0.2, -0.1, 0.1, 0.16] },
  { key: 'bezel', text: 'Node online', sub: '10 kW', off: [0.1, 0, 0], dx: 120, dy: -80, win: [0.47, 0.5, 0.535, 0.565] },
  { key: 'rackTop', text: '42U rack', sub: '20 nodes, 80 accelerators', off: [0, RACK.H, 0.3], dx: 90, dy: -50, win: [0.63, 0.655, 0.685, 0.715] },
  { key: 'pdu', text: 'Dual-feed PDU', sub: '200 kW per rack', off: [0.25, RACK.H * 0.6, -0.5], dx: 110, dy: 40, win: [0.645, 0.665, 0.685, 0.715] },
  { key: 'row', text: 'Row 17', sub: '89 racks, 18 MW, hot-aisle containment', off: [0, 0, 0], dx: 40, dy: -90, win: [0.775, 0.795, 0.835, 0.865] },
  { key: 'campus', text: 'Data hall', sub: '34 rows, 3,000 racks', off: [0, 0, 0], dx: 60, dy: -60, win: [0.93, 0.965, 0.99, 1.02] },
  { key: 'site', text: 'Data Center Valley', sub: '7 buildings, on-site substation', off: [0, 0, 0], dx: 70, dy: -70, win: [1.12, 1.15, 1.18, 1.21] },
]

export class Labels {
  constructor(panel, world) {
    this.world = world
    this.layer = document.createElement('div')
    this.layer.className = 'dcv-labels'
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('class', 'dcv-leaders')
    panel.appendChild(this.svg)
    panel.appendChild(this.layer)
    this.pt = { x: 0, y: 0, behind: false }

    // фиктивные якоря для ряда и кампуса
    this.rowAnchor = new THREE.Object3D()
    this.rowAnchor.position.set(0.35, FLOOR_Y + RACK.H + 0.1, 0)
    world.scene.add(this.rowAnchor)
    this.campusAnchor = new THREE.Object3D()
    this.campusAnchor.position.set(0.35, 0, -1.5)
    world.scene.add(this.campusAnchor)

    // на узкой панели часть выносок опускаем — иначе наезжают друг на друга и на HUD
    const narrow = panel.clientWidth < 520
    this.items = ITEMS.filter((it) => !narrow || it.mobile !== false).map((it) => {
      const el = document.createElement('div')
      el.className = 'dcv-label'
      el.innerHTML = `<span class="dcv-label__text">${it.text}${it.sub != null ? `<small>${it.sub}</small>` : ''}</span>`
      this.layer.appendChild(el)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
      line.setAttribute('class', 'dcv-leader')
      this.svg.appendChild(line)
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      dot.setAttribute('class', 'dcv-leader-dot')
      dot.setAttribute('r', '3')
      this.svg.appendChild(dot)
      const obj = it.key === 'row' ? this.rowAnchor : it.key === 'campus' ? this.campusAnchor : it.key === 'site' ? world.site.anchor : world.anchors[it.key]
      return { ...it, el, line, dot, obj, offset: new THREE.Vector3(...it.off), alpha: 0 }
    })
  }

  update(p) {
    const { w, h } = this.world.size
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    for (const it of this.items) {
      const a = it.obj ? envelope(p, it.win[0], it.win[1], it.win[2], it.win[3]) : 0
      if (a < 0.01) {
        if (it.alpha >= 0.01) {
          it.el.style.opacity = '0'
          it.line.style.opacity = '0'
          it.dot.style.opacity = '0'
        }
        it.alpha = a
        continue
      }
      it.alpha = a
      const pt = this.world.project(it.obj, this.pt, it.offset)
      if (pt.behind) continue
      const left = it.dx < 0
      const bw = it.el.offsetWidth || 120
      const bh = it.el.offsetHeight || 22
      // левый край подписи, зажатый внутри панели
      const x0 = Math.max(10, Math.min(w - bw - 10, left ? pt.x + it.dx - bw : pt.x + it.dx))
      const ly = Math.max(10 + bh / 2, Math.min(h - 10 - bh / 2, pt.y + it.dy))
      it.el.style.transform = `translate(${x0}px, ${ly - bh / 2}px)`
      it.el.style.opacity = a.toFixed(3)
      // ломаная: якорь → излом → ближний край подписи
      const edge = left ? x0 + bw + 6 : x0 - 6
      const kx = left ? Math.max(edge, pt.x - Math.abs(pt.y - ly)) : Math.min(edge, pt.x + Math.abs(pt.y - ly))
      it.line.setAttribute('points', `${pt.x},${pt.y} ${kx},${ly} ${edge},${ly}`)
      it.line.style.opacity = (a * 0.7).toFixed(3)
      it.dot.setAttribute('cx', pt.x)
      it.dot.setAttribute('cy', pt.y)
      it.dot.style.opacity = a.toFixed(3)
    }
  }
}
