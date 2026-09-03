<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  note?: string
  text: string
  buttonText: string
}>(), {
  note: ''
})

const { t } = useI18n()

const message = ref('')

// Бэкенда для приёма формы пока нет (нет server/api и Laravel ещё не развёрнут),
// поэтому отправка собирает письмо в почтовом клиенте — так введённый текст
// не теряется. Когда появится эндпоинт, менять только эту функцию.
function submit() {
  const href = `mailto:commercial@dc-valley.com?subject=${encodeURIComponent('Briefing request')}&body=${encodeURIComponent(message.value)}`
  window.location.href = href
}
</script>

<template>
  <section class="cta" id="contact">
    <div class="container">
      <div class="cta__top">
        <h2 class="cta__title" v-html="title"></h2>
        <p v-if="note" class="cta__note" v-html="note"></p>
      </div>

      <div class="cta__row">
        <p class="cta__text">{{ text }}</p>
        <!-- Кнопка остаётся на своём месте справа, но сабмитит форму ниже (атрибут form). -->
        <button type="submit" form="cta-form" class="btn btn--dark">{{ buttonText }} &rarr;</button>
      </div>

      <form id="cta-form" class="cta__form" @submit.prevent="submit">
        <textarea
          v-model="message"
          name="message"
          rows="4"
          required
          class="cta__textarea"
          :aria-label="t('ctaForm.messageLabel')"
          :placeholder="t('ctaForm.messagePlaceholder')"
        ></textarea>
      </form>
    </div>

    <slot name="decor" />
  </section>
</template>
