<script setup lang="ts">
// Модалка «Let’s talk» страницы v2 — открывается кнопками Contact us / Let’s talk / Contact.
// Нативный <dialog>: фокус остаётся внутри, Esc и клик по фону закрывают.
// Отправка — POST /api/contact (server/api/contact.post.ts), письмо уходит на info@.
// Стили свои (scoped): v2.css подключён scoped к странице и сюда не доходит,
// а переменные --v2-* наследуются — диалог лежит внутри .v2.

const { t, locale } = useI18n()

const CONTACT_EMAIL = 'info@dc-valley.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Field = 'name' | 'email' | 'consent'

const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({ name: '', email: '', company: '', project: '', consent: false, website: '' })
const errors = reactive<Partial<Record<Field, 'required' | 'email'>>>({})
const status = ref<'idle' | 'sending' | 'sent' | 'error' | 'rate'>('idle')

function open() {
  if (status.value === 'sent') reset()
  dialog.value?.showModal()
  document.documentElement.style.overflow = 'hidden'
}

function close() {
  dialog.value?.close()
}

function onClose() {
  document.documentElement.style.overflow = ''
  if (status.value === 'sent') reset()
}

// Панель занимает весь <dialog>, поэтому клик с target === dialog — это клик по фону.
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

function clearErrors() {
  for (const key of Object.keys(errors) as Field[]) delete errors[key]
}

function reset() {
  Object.assign(form, { name: '', email: '', company: '', project: '', consent: false, website: '' })
  clearErrors()
  status.value = 'idle'
}

function validate(): boolean {
  clearErrors()
  const email = form.email.trim()
  if (!form.name.trim()) errors.name = 'required'
  if (!email) errors.email = 'required'
  else if (!EMAIL_RE.test(email)) errors.email = 'email'
  if (!form.consent) errors.consent = 'required'
  return Object.keys(errors).length === 0
}

function focusFirstError() {
  nextTick(() => {
    const first = (['name', 'email', 'consent'] as Field[]).find(field => errors[field])
    if (first) dialog.value?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  })
}

async function submit() {
  if (status.value === 'sending') return
  if (!validate()) {
    focusFirstError()
    return
  }

  status.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: { ...form, locale: locale.value } })
    status.value = 'sent'
  }
  catch (err) {
    const { statusCode, data } = err as { statusCode?: number, data?: { data?: { errors?: typeof errors } } }
    if (statusCode === 422 && data?.data?.errors) {
      Object.assign(errors, data.data.errors)
      status.value = 'idle'
      focusFirstError()
    }
    else {
      status.value = statusCode === 429 ? 'rate' : 'error'
    }
  }
}

function errorText(field: Field): string {
  if (errors[field] === 'email') return t('v2.contact.errors.email')
  return field === 'consent' ? t('v2.contact.errors.consent') : t('v2.contact.errors.required')
}

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="v2-contact" aria-labelledby="v2-contact-title" @click="onDialogClick" @close="onClose">
    <div class="v2-contact__panel">
      <div class="v2-contact__top">
        <p class="v2-contact__eyebrow">{{ t('v2.contact.eyebrow') }}</p>
        <button type="button" class="v2-contact__close" @click="close">
          {{ t('v2.contact.close') }} <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <template v-if="status === 'sent'">
        <h2 id="v2-contact-title" class="v2-contact__title">{{ t('v2.contact.successTitle') }}</h2>
        <p class="v2-contact__text" role="status">{{ t('v2.contact.successText') }}</p>
        <button type="button" class="v2-contact__submit" @click="close">{{ t('v2.contact.close') }}</button>
      </template>

      <form v-else novalidate @submit.prevent="submit">
        <h2 id="v2-contact-title" class="v2-contact__title">{{ t('v2.contact.title') }}</h2>

        <label class="v2-contact__field">
          <span class="v2-contact__label">{{ t('v2.contact.name') }} *</span>
          <input
            v-model="form.name"
            name="name"
            type="text"
            autocomplete="name"
            maxlength="200"
            :placeholder="t('v2.contact.namePlaceholder')"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'v2-contact-name-error' : undefined"
          >
          <span v-if="errors.name" id="v2-contact-name-error" class="v2-contact__error">{{ errorText('name') }}</span>
        </label>

        <label class="v2-contact__field">
          <span class="v2-contact__label">{{ t('v2.contact.email') }} *</span>
          <input
            v-model="form.email"
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            maxlength="254"
            placeholder="name@company.com"
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'v2-contact-email-error' : undefined"
          >
          <span v-if="errors.email" id="v2-contact-email-error" class="v2-contact__error">{{ errorText('email') }}</span>
        </label>

        <label class="v2-contact__field">
          <span class="v2-contact__label">{{ t('v2.contact.company') }}</span>
          <input
            v-model="form.company"
            name="company"
            type="text"
            autocomplete="organization"
            maxlength="200"
            :placeholder="t('v2.contact.companyPlaceholder')"
          >
        </label>

        <label class="v2-contact__field">
          <span class="v2-contact__label">{{ t('v2.contact.project') }}</span>
          <textarea
            v-model="form.project"
            name="project"
            rows="1"
            maxlength="5000"
            :placeholder="t('v2.contact.projectPlaceholder')"
          />
        </label>

        <!-- Ловушка для ботов: людям не видна, заполненной сервер заявку не отправит -->
        <div class="v2-contact__hp" aria-hidden="true">
          <input v-model="form.website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>

        <label class="v2-contact__consent">
          <input
            v-model="form.consent"
            name="consent"
            type="checkbox"
            :aria-invalid="!!errors.consent"
            :aria-describedby="errors.consent ? 'v2-contact-consent-error' : undefined"
          >
          <span>{{ t('v2.contact.consent') }}</span>
        </label>
        <p v-if="errors.consent" id="v2-contact-consent-error" class="v2-contact__error">{{ errorText('consent') }}</p>

        <p class="v2-contact__note">* {{ t('v2.contact.required') }}</p>

        <p v-if="status === 'error'" class="v2-contact__alert" role="alert">
          {{ t('v2.contact.errors.send') }} <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
        </p>
        <p v-if="status === 'rate'" class="v2-contact__alert" role="alert">{{ t('v2.contact.errors.rate') }}</p>

        <button type="submit" class="v2-contact__submit" :disabled="status === 'sending'">
          {{ status === 'sending' ? t('v2.contact.sending') : t('v2.contact.submit') }} <span aria-hidden="true">&#8599;</span>
        </button>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.v2-contact {
    width: min(560px, calc(100% - 32px));
    max-width: none;
    max-height: calc(100dvh - 32px);
    margin: auto;
    padding: 0;
    border: 0;
    background: var(--v2-bg);
    color: var(--v2-ink);
    font-family: var(--v2-font-text);
    overflow-y: auto;
    overscroll-behavior: contain;
}

.v2-contact::backdrop {
    background: rgba(12, 12, 12, 0.88);
}

.v2-contact__panel {
    padding: clamp(24px, 5vw, 36px);
}

.v2-contact__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.v2-contact__eyebrow,
.v2-contact__close,
.v2-contact__label,
.v2-contact__note,
.v2-contact__submit {
    font-family: var(--v2-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.v2-contact__eyebrow {
    margin: 0;
    font-size: 10px;
    color: var(--v2-muted);
}

.v2-contact__close {
    padding: 6px 0 6px 12px;
    border: 0;
    background: none;
    font-size: 10px;
    color: var(--v2-ink);
    cursor: pointer;
}

.v2-contact__title {
    margin: 18px 0 6px;
    font-family: var(--v2-font-display);
    font-size: clamp(44px, 10vw, 64px);
    font-weight: 800;
    line-height: 0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
}

.v2-contact__text {
    margin: 18px 0 28px;
    font-size: 16px;
    line-height: 1.5;
}

.v2-contact__field {
    display: block;
    margin-top: 22px;
}

.v2-contact__label {
    display: block;
    font-size: 9px;
    color: var(--v2-muted);
}

/* 16px — иначе iOS увеличивает страницу при фокусе на поле */
.v2-contact__field input,
.v2-contact__field textarea {
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 4px 0 10px;
    border: 0;
    border-bottom: 1px solid var(--v2-line);
    border-radius: 0;
    background: transparent;
    font: inherit;
    font-size: 16px;
    color: var(--v2-ink);
    outline: none;
    transition: border-color 0.2s ease;
}

.v2-contact__field textarea {
    resize: none;
    field-sizing: content;
    max-height: 160px;
}

.v2-contact__field input::placeholder,
.v2-contact__field textarea::placeholder {
    color: var(--v2-muted);
}

.v2-contact__field input:focus,
.v2-contact__field textarea:focus {
    border-bottom-color: var(--v2-ink);
}

.v2-contact__field [aria-invalid='true'] {
    border-bottom-color: #B3261E;
}

.v2-contact__error,
.v2-contact__alert {
    display: block;
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.4;
    color: #B3261E;
}

.v2-contact__alert {
    margin-top: 16px;
    font-size: 13px;
}

.v2-contact__alert a {
    color: inherit;
}

.v2-contact__hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

.v2-contact__consent {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 28px;
    font-size: 13px;
    line-height: 1.4;
    cursor: pointer;
}

.v2-contact__consent input {
    flex: none;
    width: 20px;
    height: 20px;
    margin: 0;
    border: 1px solid var(--v2-ink);
    border-radius: 0;
    background: transparent;
    appearance: none;
    cursor: pointer;
}

.v2-contact__consent input:checked {
    background: var(--v2-ink);
    box-shadow: inset 0 0 0 4px var(--v2-bg);
}

.v2-contact__consent input[aria-invalid='true'] {
    border-color: #B3261E;
}

.v2-contact__consent input:focus-visible,
.v2-contact__close:focus-visible,
.v2-contact__submit:focus-visible {
    outline: 2px solid var(--v2-orange);
    outline-offset: 2px;
}

.v2-contact__note {
    margin: 18px 0 0;
    font-size: 9px;
    color: var(--v2-muted);
}

.v2-contact__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin-top: 18px;
    padding: 18px 20px;
    border: 0;
    background: var(--v2-orange);
    font-size: 11px;
    color: var(--v2-ink);
    cursor: pointer;
    transition: background 0.2s ease;
}

.v2-contact__submit:hover {
    background: #C9481F;
}

.v2-contact__submit:disabled {
    opacity: 0.6;
    cursor: progress;
}
</style>
