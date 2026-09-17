import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  ChromaticAberrationEffect,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction,
  FXAAEffect,
} from 'postprocessing'

// ---------------------------------------------------------------------------
//  Пост: HDR-буфер → блум по мипмапам → лёгкая хроматика → ACES → виньетка
//  и зерно (один проход) → сглаживание (SMAA или FXAA, второй проход).
// ---------------------------------------------------------------------------

export function createPost(renderer, scene, camera) {
  // HDR-буфер нужен блуму; там, где WebGL2 не умеет рендерить в half-float
  // (старые iOS/Android), откатываемся на 8 бит — картинка чуть проще, но живая
  const gl = renderer.getContext()
  const hdr = !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float'))
  const composer = new EffectComposer(renderer, { frameBufferType: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, multisampling: 0 })
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 1.25,
    luminanceSmoothing: 0.35,
    intensity: 0.45,
    radius: 0.6,
    levels: 7,
  })
  const ca = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.00008, 0.00008),
    radialModulation: true,
    modulationOffset: 0.35,
  })
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })
  const vignette = new VignetteEffect({ eskil: false, offset: 0.35, darkness: 0.45 })
  const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN })
  noise.blendMode.opacity.value = 0.035

  const mainPass = new EffectPass(camera, bloom, ca, tone, vignette, noise)
  composer.addPass(mainPass)

  // сглаживание: SMAA (medium) при обычном dpr, FXAA при dpr ≥ 1.75 и на телефонах —
  // на Retina пикселей и так вдвое больше, SMAA high стоил 3.5 мс за кадр
  const smaa = new SMAAEffect({ preset: SMAAPreset.MEDIUM })
  const smaaPass = new EffectPass(camera, smaa)
  const fxaaPass = new EffectPass(camera, new FXAAEffect())
  fxaaPass.enabled = false
  composer.addPass(smaaPass)
  composer.addPass(fxaaPass)
  // на экран рисует активный проход сглаживания, а не «последний добавленный»
  composer.autoRenderToScreen = false
  smaaPass.renderToScreen = true
  fxaaPass.renderToScreen = false

  return {
    composer,
    bloom,
    ca,
    setBloom(v) {
      bloom.intensity = v
      bloom.blendMode.opacity.value = v > 0.001 ? 1 : 0
    },
    setAA(mode) {
      smaaPass.enabled = mode === 'smaa'
      fxaaPass.enabled = mode === 'fxaa'
      smaaPass.renderToScreen = smaaPass.enabled
      fxaaPass.renderToScreen = fxaaPass.enabled
    },
    // прогреть оба варианта сглаживания, чтобы переключение не компилировало шейдер на ходу
    // [dc-valley.com] Прогреваем только тот вариант сглаживания, который включён.
    // Компиляция шейдера SMAA на встроенной графике занимала ~12 с (FXAA — 6 мс),
    // и всё это время сцена стояла на лоадере.
    warm() {
      composer.render(0.016)
    },
    setSize(w, h) {
      composer.setSize(w, h)
    },
    render(dt) {
      composer.render(dt)
    },
    passes: { mainPass, smaa: smaaPass, fxaa: fxaaPass, bloom },
  }
}
