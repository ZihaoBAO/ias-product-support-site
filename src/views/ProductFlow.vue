<template>
  <section class="manual-section">
    <h2>{{ td(manual.troubleshootingFlow?.title) || "" }}</h2>
    <div class="timeline-list">
      <article
        v-for="step in manual.troubleshootingFlow?.steps || []"
        :key="step.number"
        class="timeline-step"
      >
        <span>{{ step.number || "•" }}</span>
        <div>
          <h3>{{ td(step.title) }}</h3>
          <p v-for="(detail, i) in step.details" :key="i" v-html="td(detail.text)"></p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { inject } from "vue";
import { useI18n } from "../composables/useI18n.js";

const { td } = useI18n();
const manual = inject("manual", { troubleshootingFlow: { steps: [] } });
</script>
