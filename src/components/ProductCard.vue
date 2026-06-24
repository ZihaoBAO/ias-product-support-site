<template>
  <article class="product-card">
    <div class="product-card-head">
      <span class="product-code">{{ product.name }}</span>
    </div>
    <h3>{{ display.title }}</h3>
    <p>{{ display.summary }}</p>
    <dl class="meta-grid compact">
    </dl>
    <div class="tag-row">
      <span v-for="tag in display.tags" :key="tag">{{ tag }}</span>
    </div>
    <router-link class="text-link" :to="`/products/${product.id}`">{{ t('card.open') }}</router-link>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();

const props = defineProps({
  product: { type: Object, required: true }
});

const display = computed(() => ({
  title: t(`products.${props.product.id}.title`) || props.product.title,
  summary: t(`products.${props.product.id}.summary`) || props.product.summary,
  tags: t(`products.${props.product.id}.tags`) || props.product.tags || []
}));
</script>
