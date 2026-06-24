<template>
  <div>
    <section class="hero-band">
      <div class="hero-copy">
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
        <h1>{{ t('home.heroTitle') }}</h1>
      </div>
    </section>

    <section class="toolbar-band">
      <div>
        <h2>{{ t('home.docTitle') }}</h2>
        <p>{{ t('home.docDesc') }}</p>
      </div>
      <label class="search-box">
        <span>{{ t('home.searchLabel') }}</span>
        <input type="search" v-model="query" :placeholder="t('home.searchPlaceholder')" />
      </label>
    </section>

    <section class="product-grid">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
      />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRepository } from "../composables/useRepository.js";
import { useI18n } from "../composables/useI18n.js";
import ProductCard from "../components/ProductCard.vue";

const { t } = useI18n();
const { getProducts, searchProducts } = useRepository();

const query = ref("");
const products = ref([]);
const allProducts = ref([]);

const filteredProducts = computed(() => {
  if (!query.value.trim()) return allProducts.value;
  return allProducts.value.filter((p) => {
    const fields = [p.name, p.title, p.summary, p.status, ...(p.tags || [])];
    return fields.join(" ").toLowerCase().includes(query.value.trim().toLowerCase());
  });
});

const totalSop = computed(() =>
  allProducts.value.reduce((sum, item) => sum + item.sopCount, 0)
);

onMounted(async () => {
  allProducts.value = await getProducts();
  products.value = allProducts.value;
});
</script>
