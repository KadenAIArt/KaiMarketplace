<script setup>
import { computed, ref } from "vue";
import { useMouseInElement } from "@vueuse/core";

const props = defineProps({
  as: {
    type: String,
    default: "div"
  },
  from: {
    type: String,
    default: "rgba(255,255,255,0.8)"
  },
  via: {
    type: String,
  },
  to: {
    type: String,
    default: "transparent"
  },
  size: {
    type: Number,
    default: 350
  },
  mode: {
    type: String,
    default: "before"
  },
});


const card = ref();
const { elementX, elementY } = useMouseInElement(card);

const spotlightColorStops = computed(() =>
    [props.from, props.via, props.to].filter(Boolean).join(","),
);
</script>

<template>
  <component
      :is="as"
      ref="card"
      :style="{
      '--x': `${elementX}px`,
      '--y': `${elementY}px`,
      '--spotlight-color-stops': spotlightColorStops,
      '--spotlight-size': `${size}px`,
      '--spotlight-gradient':
        'radial-gradient(var(--spotlight-size) circle at var(--x) var(--y), var(--spotlight-color-stops))',
    }"
      class="relative transform-gpu overflow-hidden"
      :class="[
      mode === 'before' &&
        'before:absolute before:content-empty before:inset-0 before:[background-image:var(--spotlight-gradient)]',
      mode === 'after' &&
        'after:absolute after:content-empty after:inset-0 after:[background-image:var(--spotlight-gradient)]',
    ]"
  >
    <slot />
  </component>
</template>
