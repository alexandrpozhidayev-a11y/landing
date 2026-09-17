import * as THREE from 'three'
import { COLORS, RACK, DC } from '../config.js'

// ---------------------------------------------------------------------------
//  Зеркальный пол. Сцена рендерится ещё раз из отражённой камеры в небольшой
//  буфер с мипмапами, шейдер пола берёт размытое отражение и гасит его
//  с расстоянием. Плюс сетка плитки и свет холодных коридоров для кампуса.
// ---------------------------------------------------------------------------

const vert = /* glsl */ `
  uniform mat4 uTextureMatrix;
  varying vec4 vUv4;
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vUv4 = uTextureMatrix * wp;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const frag = /* glsl */ `
  uniform sampler2D tReflect;
  uniform vec3 uColor;
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  uniform float uStrength;
  uniform float uBlur;
  uniform float uAisle;
  uniform float uPairPitch;
  uniform float uBackOffset;
  uniform float uPitchX;
  uniform float uFade;
  uniform vec3 uHall; // полуширина по X, z0, z1
  uniform vec4 uClip; // x0, x1, z0, z1 — снаружи корпуса пола нет (там земля площадки)
  varying vec4 vUv4;
  varying vec3 vWorld;

  float gridLine(vec2 p, float pitch, float width) {
    vec2 q = p / pitch;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    float l = min(g.x, g.y);
    return 1.0 - smoothstep(0.0, width, l);
  }

  void main() {
    if (vWorld.x < uClip.x || vWorld.x > uClip.y || vWorld.z < uClip.z || vWorld.z > uClip.w) discard;
    vec3 col = uColor;
    float dist = length(vWorld.xz - cameraPosition.xz);
    float fade = exp(-dist * uFade);

    // отражение
    if (uStrength > 0.001) {
      vec2 uv = vUv4.xy / vUv4.w;
      vec3 r = textureLod(tReflect, uv, uBlur).rgb;
      // чуть темнее и холоднее, как полированный тёмный камень
      col += r * uStrength * fade * vec3(0.72, 0.8, 0.9);
    }

    // плитка 0.6 м и крупная сетка 3 м
    float g1 = gridLine(vWorld.xz, 0.6, 1.2);
    float g2 = gridLine(vWorld.xz, 3.0, 1.6);
    col += vec3(0.16, 0.19, 0.24) * (g1 * 0.03 + g2 * 0.07) * fade;

    // свет холодных коридоров: между парами рядов, вдоль X
    float zc = mod(vWorld.z - (uPairPitch + uBackOffset) * 0.5, uPairPitch);
    float aisleW = (uPairPitch + uBackOffset) - 1.15; // ширина коридора между фронтами
    float dz = abs(zc - uPairPitch * 0.5);
    float band = 1.0 - smoothstep(aisleW * 0.5 - 0.35, aisleW * 0.5 + 0.05, dz);
    float stripe = 1.0 - smoothstep(0.0, 0.07, abs(dz - aisleW * 0.5 + 0.08));
    float pairIdx = floor((vWorld.z + 0.5 * (uPairPitch + uBackOffset)) / uPairPitch + 0.5);
    float mag = step(0.5, mod(pairIdx + 100.0, 3.0) < 0.5 ? 1.0 : 0.0);
    vec3 aisleCol = mix(uCyan, uMagenta, mag);
    float inHall = step(abs(vWorld.x), uHall.x) * step(uHall.y, vWorld.z) * step(vWorld.z, uHall.z);
    col += aisleCol * (band * 0.03 + stripe * 0.3) * uAisle * inHall;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export class ReflectiveFloor {
  constructor(renderer, size = 80, y = 0) {
    this.renderer = renderer
    // как и в пост-обработке: без рендера в half-float — 8-битный буфер
    const gl = renderer.getContext()
    const hdr = !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float'))
    this.rt = new THREE.WebGLRenderTarget(512, 512, {
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    })
    this.rt.texture.colorSpace = THREE.LinearSRGBColorSpace
    this.textureMatrix = new THREE.Matrix4()
    this.virtualCamera = new THREE.PerspectiveCamera()
    this.virtualCamera.layers.set(1)
    this.reflectorPlane = new THREE.Plane()
    this.normal = new THREE.Vector3()
    this.reflectorWorldPosition = new THREE.Vector3()
    this.cameraWorldPosition = new THREE.Vector3()
    this.rotationMatrix = new THREE.Matrix4()
    this.lookAtPosition = new THREE.Vector3(0, 0, -1)
    this.clipPlane = new THREE.Vector4()
    this.view = new THREE.Vector3()
    this.target = new THREE.Vector3()
    this.q = new THREE.Vector4()
    this.enabled = true

    this.uniforms = {
      tReflect: { value: this.rt.texture },
      uTextureMatrix: { value: this.textureMatrix },
      uColor: { value: new THREE.Color(COLORS.floor) },
      uCyan: { value: new THREE.Color(0x9fe3ff) },
      uMagenta: { value: new THREE.Color(0xffc27a) },
      uStrength: { value: 0.65 },
      uBlur: { value: 2.6 },
      uAisle: { value: 0 },
      uPairPitch: { value: DC.PAIR_PITCH },
      uBackOffset: { value: DC.BACK_OFFSET },
      uPitchX: { value: RACK.PITCH_X },
      uFade: { value: 0.35 },
      uClip: { value: new THREE.Vector4(-1e5, 1e5, -1e5, 1e5) },
      uHall: { value: new THREE.Vector3(DC.COLS * RACK.PITCH_X + 1.0, -DC.PAIRS * DC.PAIR_PITCH + DC.BACK_OFFSET - 1.0, DC.PAIRS * DC.PAIR_PITCH + 1.0) },
    }
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.y = y
    this.mesh.name = 'floor'
    this.mesh.onBeforeRender = (renderer, scene, camera) => this.render(renderer, scene, camera)
  }

  setSize(w, h, scale = 0.5) {
    const rw = Math.max(64, Math.round(w * scale))
    const rh = Math.max(64, Math.round(h * scale))
    if (this.rt.width !== rw || this.rt.height !== rh) this.rt.setSize(rw, rh)
  }

  render(renderer, scene, camera) {
    if (!this.enabled || this.uniforms.uStrength.value <= 0.001) return
    const m = this.mesh
    const vc = this.virtualCamera

    this.reflectorWorldPosition.setFromMatrixPosition(m.matrixWorld)
    this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)
    this.rotationMatrix.extractRotation(m.matrixWorld)
    this.normal.set(0, 0, 1).applyMatrix4(this.rotationMatrix)
    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition)
    if (this.view.dot(this.normal) > 0) return // камера под полом

    this.view.reflect(this.normal).negate().add(this.reflectorWorldPosition)
    this.rotationMatrix.extractRotation(camera.matrixWorld)
    this.lookAtPosition.set(0, 0, -1).applyMatrix4(this.rotationMatrix).add(this.cameraWorldPosition)
    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition)
    this.target.reflect(this.normal).negate().add(this.reflectorWorldPosition)

    vc.position.copy(this.view)
    vc.up.set(0, 1, 0).applyMatrix4(this.rotationMatrix).reflect(this.normal)
    vc.lookAt(this.target)
    vc.far = camera.far
    vc.updateMatrixWorld()
    vc.projectionMatrix.copy(camera.projectionMatrix)

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    this.textureMatrix.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse)

    // косая плоскость отсечения — не отражать то, что под полом
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition)
    this.reflectorPlane.applyMatrix4(vc.matrixWorldInverse)
    this.clipPlane.set(this.reflectorPlane.normal.x, this.reflectorPlane.normal.y, this.reflectorPlane.normal.z, this.reflectorPlane.constant)
    const pm = vc.projectionMatrix
    this.q.x = (Math.sign(this.clipPlane.x) + pm.elements[8]) / pm.elements[0]
    this.q.y = (Math.sign(this.clipPlane.y) + pm.elements[9]) / pm.elements[5]
    this.q.z = -1.0
    this.q.w = (1.0 + pm.elements[10]) / pm.elements[14]
    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q))
    pm.elements[2] = this.clipPlane.x
    pm.elements[6] = this.clipPlane.y
    pm.elements[10] = this.clipPlane.z + 1.0
    pm.elements[14] = this.clipPlane.w

    m.visible = false
    const currentRT = renderer.getRenderTarget()
    const xr = renderer.xr.enabled
    const sa = renderer.shadowMap.autoUpdate
    renderer.xr.enabled = false
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(this.rt)
    renderer.state.buffers.depth.setMask(true)
    if (renderer.autoClear === false) renderer.clear()
    renderer.render(scene, vc)
    renderer.xr.enabled = xr
    renderer.shadowMap.autoUpdate = sa
    renderer.setRenderTarget(currentRT)
    m.visible = true
  }
}
