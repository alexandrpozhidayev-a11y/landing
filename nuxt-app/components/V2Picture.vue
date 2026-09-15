<script setup lang="ts">
// Картинка страницы v2 с отдельным кадром для телефона (art direction).
// <NuxtPicture> умеет только один src, а на мобильном нужен другой кадр —
// другие пропорции, без вшитых плашек (public/asset/v2/mobile/*). Поэтому
// <picture> собран вручную через useImage(): те же WebP + запасной JPEG и те же
// варианты _ipx, которые генерируются при сборке (ipxStatic).
//
// Мобильный кадр — до 599px. Его варианты не шире оригинала: растягивать
// исходник ipx-ом бессмысленно, это только лишний вес. Если положить кадр
// крупнее (в 2x-3x), нужные размеры 390/780/1170 появятся сами —
// достаточно поправить mobile-width / mobile-height.

const props = withDefaults(defineProps<{
  src: string
  width: number
  height: number
  sizes: string
  mobileSrc: string
  mobileWidth: number
  mobileHeight: number
  alt: string
  // LCP-картинка: грузится сразу, с preload высокого приоритета
  priority?: boolean
}>(), { priority: false })

const MOBILE_MEDIA = '(max-width: 599px)'
const DESKTOP_MEDIA = '(min-width: 600px)'
const FORMATS = ['webp', 'jpeg'] as const

const $img = useImage()
const quality = $img.options.quality

// ширина телефона при плотности экрана 1x / 2x / 3x
const mobileWidths = computed(() => [
  ...[390, 780, 1170].filter(w => w < props.mobileWidth),
  props.mobileWidth
])

const mobile = computed(() => FORMATS.map(format => ({
  type: `image/${format}`,
  srcset: mobileWidths.value
    .map(w => `${$img(props.mobileSrc, { width: w, format, quality })} ${w}w`)
    .join(', ')
})))

const desktop = computed(() => FORMATS.map(format => ({
  type: `image/${format}`,
  ...$img.getSizes(props.src, {
    sizes: props.sizes,
    modifiers: { width: props.width, height: props.height, format, quality }
  })
})))

if (props.priority) {
  useHead({
    link: [
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: MOBILE_MEDIA, imagesrcset: mobile.value[0]!.srcset, imagesizes: '100vw' },
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: DESKTOP_MEDIA, imagesrcset: desktop.value[0]!.srcset, imagesizes: desktop.value[0]!.sizes }
    ]
  })
}
</script>

<template>
  <picture>
    <source
      v-for="source in mobile"
      :key="source.type"
      :media="MOBILE_MEDIA"
      :type="source.type"
      :srcset="source.srcset"
      sizes="100vw"
      :width="mobileWidth"
      :height="mobileHeight"
    >
    <source
      :type="desktop[0]!.type"
      :srcset="desktop[0]!.srcset"
      :sizes="desktop[0]!.sizes"
      :width="width"
      :height="height"
    >
    <img
      :src="desktop[1]!.src"
      :srcset="desktop[1]!.srcset"
      :sizes="desktop[1]!.sizes"
      :width="width"
      :height="height"
      :alt="alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      decoding="async"
    >
  </picture>
</template>
