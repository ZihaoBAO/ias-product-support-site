<template>
  <div v-if="loading" class="content-band narrow">
    <p class="loading-state">加载中...</p>
  </div>
  <div v-else-if="error" class="content-band narrow">
    <h1>加载失败</h1>
    <pre>{{ error }}</pre>
  </div>
  <section v-else class="manual-section">
    <div class="sop-heading">
      <div>
        <span class="source-chip">审核对照</span>
        <h2>{{ sheet.title }}</h2>
        <p class="section-lead">此视图仅用于内部核对，客户默认阅读文档化页面。</p>
      </div>
      <router-link :to="`/products/${product.id}`" class="audit-link">返回文档</router-link>
    </div>

    <div class="audit-sheet-nav">
      <router-link
        v-for="item in manual.sourceSheets"
        :key="item.slug"
        :class="{ active: item.slug === activeSlug }"
        :to="`/products/${product.id}/audit/${item.slug}`"
      >{{ item.title }}</router-link>
    </div>

    <div class="excel-table-shell">
      <table class="excel-table">
        <thead>
          <tr>
            <th>#</th>
            <th v-for="col in sheet.dimensions?.maxColumn" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sheet.rows" :key="row.index">
            <th class="row-index">{{ row.index }}</th>
            <td
              v-for="cell in row.cells"
              :key="`${row.index}-${cell.col}`"
              v-show="!cell.covered"
              :rowspan="cell.merge?.rowspan"
              :colspan="cell.merge?.colspan"
              :style="cellInlineStyle(cell)"
              v-html="cell.text ? cell.text.replace(/\n/g, '<br>') : ''"
            ></td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="sheet.images?.length" class="audit-images">
      <h3>原始图片 ({{ sheet.images.length }})</h3>
      <div class="step-images">
        <figure v-for="image in sheet.images" :key="image.id">
          <img :src="imageUrl(image)" :alt="image.id" loading="lazy" />
          <figcaption>{{ image.id }} · row {{ image.anchor?.from?.row }}, col {{ image.anchor?.from?.col }}</figcaption>
        </figure>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ref, inject, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useRepository } from "../composables/useRepository.js";

const route = useRoute();
const product = inject("product", {});
const manual = inject("manual", { sourceSheets: [] });
const { getExcelSheetByProductId } = useRepository();

const sheet = ref({ title: "", rows: [], dimensions: {} });
const loading = ref(true);
const error = ref("");

const activeSlug = computed(() => route.params.sheetSlug);

function cellInlineStyle(cell) {
  const style = cell.style || {};
  const rules = [];
  if (style.fill) rules.push(`background:${style.fill}`);
  if (style.font?.bold) rules.push("font-weight:800");
  if (style.alignment?.horizontal) rules.push(`text-align:${style.alignment.horizontal}`);
  return rules.length ? rules.join(";") : "";
}

function imageUrl(image) {
  const file = image.file || image.src || "";
  return file.replace(/^\.\//, "/");
}

async function loadSheet(slug) {
  if (!slug) return;
  loading.value = true;
  error.value = "";
  try {
    sheet.value = await getExcelSheetByProductId(product.value.id, slug);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const slug = activeSlug.value || manual.value.sourceSheets?.[0]?.slug;
  if (slug) loadSheet(slug);
});

watch(activeSlug, (newSlug) => {
  if (newSlug) loadSheet(newSlug);
});
</script>
