// GPU-время кадра через EXT_disjoint_timer_query_webgl2 (Chrome). Только для отладки.
export class GpuTimer {
  constructor(gl) {
    this.gl = gl
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
    this.queries = []
    this.samples = []
    this.active = null
  }
  get supported() {
    return !!this.ext
  }
  begin() {
    if (!this.ext || this.active) return
    const q = this.gl.createQuery()
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q)
    this.active = q
  }
  end() {
    if (!this.active) return
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT)
    this.queries.push(this.active)
    this.active = null
    this.poll()
  }
  poll() {
    const gl = this.gl
    while (this.queries.length) {
      const q = this.queries[0]
      const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT)
      const avail = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)
      if (!avail && !disjoint) break
      if (avail && !disjoint) {
        this.samples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
        if (this.samples.length > 90) this.samples.shift()
      }
      gl.deleteQuery(q)
      this.queries.shift()
    }
  }
  median() {
    if (!this.samples.length) return 0
    const a = [...this.samples].sort((x, y) => x - y)
    return a[a.length >> 1]
  }
}
