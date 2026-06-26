<template>
  <section class="manual-section">
    <div class="sop-heading">
      <div>
        <h2>{{ td(doc.title) }}</h2>
      </div>
      <button
        class="back-btn"
        @click="router.back()"
      >{{ t('sop.back') }}</button>
    </div>

    <div class="version-tabs">
      <button
        v-for="(version, index) in doc.versions"
        :key="version.id"
        :class="{ active: activeVersion === index }"
        type="button"
        @click="activeVersion = index"
      >{{ td(version.label) }}</button>
    </div>

    <section
      v-for="(version, index) in doc.versions"
      :key="version.id"
      v-show="activeVersion === index"
      class="version-panel"
    >
      <div v-if="version.resources?.length" class="resource-stack">
        <div
          v-for="(resource, ri) in version.resources"
          :key="ri"
          v-show="resource.rows?.length"
          class="resource-panel"
        >
          <h4>{{ td(resource.title) }}</h4>
          <template v-if="resource.title === 'Tools & Consumables' || resource.title === 'Tools, consumables and document metadata'">
            <div class="tools-consumables-grid">
              <div class="tools-col">
                <strong class="col-heading">{{ t('sop.tools') }}</strong>
                <ul>
                  <li v-for="item in getToolsConsumables(resource.rows).tools" :key="item.sourceCell">{{ td(item.text) }}</li>
                </ul>
              </div>
              <div class="consumables-col">
                <strong class="col-heading">{{ t('sop.consumables') }}</strong>
                <ul>
                  <li v-for="item in getToolsConsumables(resource.rows).consumables" :key="item.sourceCell">{{ td(item.text) }}</li>
                </ul>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="resource-row" v-for="(row, rj) in resource.rows" :key="rj">
              <span v-for="(cell, ck) in row.cells" :key="ck">{{ td(cell.text) }}</span>
            </div>
          </template>
        </div>
      </div>

      <div class="step-list">
        <article v-for="step in version.steps" :key="step.id" class="step-card">
          <div class="step-number">{{ step.number }}</div>
          <div class="step-body">
            <p v-html="td(step.instruction)"></p>
            <div v-if="step.reference">
              <router-link
                v-if="step.reference.targetDocId"
                class="reference-link"
                :to="`/products/${product.id}/sop/${step.reference.targetDocId}`"
              >{{ td(step.reference.label) }}</router-link>
              <span v-else class="reference-link muted-note">{{ td(step.reference.label) }}</span>
            </div>
            <div v-if="step.images?.length" class="step-images-row">
              <div class="step-images">
                <figure v-for="image in step.images" :key="image.id">
                  <img :src="image.src" :alt="`${step.number} ${image.id}`" loading="lazy" />
                  <figcaption>{{ image.id }} · row {{ image.anchor?.from?.row }}</figcaption>
                </figure>
              </div>
              <aside v-if="step.sideNotes" class="step-side-notes">
                <div class="side-col">
                  <ul>
                    <li v-for="(text, i) in step.sideNotes.left" :key="'l'+i">{{ td(text) }}</li>
                  </ul>
                </div>
                <div class="side-col">
                  <ul>
                    <li v-for="(text, i) in step.sideNotes.right" :key="'r'+i">{{ td(text) }}</li>
                  </ul>
                </div>
              </aside>
            </div>
            <p v-else-if="step.noImage" class="image-note muted-note">{{ t('sop.noImage') }}</p>
          </div>
        </article>
      </div>
    </section>

    <section v-if="unmatchedImages.length" class="unmatched-panel">
      <h3>{{ t('sop.unmatched') }}</h3>
      <div class="step-images">
        <figure v-for="image in unmatchedImages" :key="image.id">
          <img :src="image.src" :alt="image.id" loading="lazy" />
          <figcaption>{{ image.id }} · {{ image.reason }}</figcaption>
        </figure>
      </div>
    </section>

    <details v-if="doc.annexCells?.length" class="source-annex">
      <summary>{{ t('sop.annex') }}</summary>
      <p v-for="cell in doc.annexCells" :key="cell.address">
        <code>{{ cell.address }}</code>
        <span v-html="cell.text"></span>
      </p>
    </details>
  </section>
</template>

<script setup>
import { ref, computed, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../composables/useI18n.js";

const { t, td } = useI18n();
const route = useRoute();
const router = useRouter();
const product = inject("product", {});
const manual = inject("manual", { documents: [] });

const activeVersion = ref(0);

const doc = computed(() => {
  const docId = route.params.docId;
  return manual.value.documents?.find((entry) => entry.id === docId) || manual.value.documents?.[0] || {};
});

watch(() => route.params.docId, () => {
  activeVersion.value = 0;
});

const unmatchedImages = computed(() =>
  (doc.value.unmatchedImages || []).filter((img) => img.reason !== "cover-or-title-image")
);

function getToolsConsumables(rows) {
  const tools = [];
  const consumables = [];
  for (const row of rows) {
    const sorted = [...row.cells].sort((a, b) => a.col - b.col);
    if (sorted.length === 0) continue;
    tools.push(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      consumables.push(sorted[i]);
    }
  }
  return { tools, consumables };
}
</script>
