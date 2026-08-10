<script setup lang="ts">
const { t, tm, messages } = useI18n()

const accordionItems = computed(() => {
  let items = tm('faq.items') as any[]
  if (!Array.isArray(items) || items.length === 0) {
    items = (messages.value.en as any)?.faq?.items || []
  }
  return items.map((item: any) => ({
    title: item.title,
    text: item.text,
    list: item.list ? (item.list as any[]) : undefined
  }))
})
</script>

<template>
  <div>
    <Breadcrumb :current="t('breadcrumb.platform')" />

    <section class="faq">
      <div class="container faq__row">
        <div class="faq__aside">
          <div>
            <p class="faq__note">{{ t('faq.note1') }}</p>
            <a href="mailto:commercial@dc-valley.com" class="btn btn--dark">{{ t('faq.requestMeeting') }}</a>
          </div>
          <p class="faq__note">{{ t('faq.note2') }}</p>
        </div>

        <div class="faq__body">
          <h1 class="faq__title">{{ t('faq.title') }}</h1>
          <AppAccordion :items="accordionItems" :default-open="1" />
        </div>
      </div>
    </section>

    <SectionCta
      :title="t('home.cta.title')"
      :note="t('home.cta.note')"
      :text="t('home.cta.text')"
      :button-text="t('home.cta.button')"
    />
  </div>
</template>
