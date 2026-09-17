import * as THREE from 'three'

// Задник: большая сфера с вертикальным градиентом, как бумажный фон в студии.
export function buildBackdrop() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x1a1c21) },
      uMid: { value: new THREE.Color(0x0f1013) },
      uBottom: { value: new THREE.Color(0x08090b) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.7, y)) : mix(uMid, uBottom, smoothstep(0.0, -0.4, y));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), mat)
  mesh.name = 'backdrop'
  mesh.renderOrder = -10
  mesh.layers.enable(1)
  return mesh
}
