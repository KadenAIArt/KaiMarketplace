<script setup>
import { inject } from "vue";
import { gridPatternCtxKey } from "./context";


defineProps({
  row: Number,
  column: Number
})

const grid = inject(gridPatternCtxKey);
</script>

<template>
  <rect
      stroke-width="0"
      :width="grid.size - 1"
      :height="grid.size - 1"
      :x="column * grid.size + grid.offsetX + 1"
      :y="row * grid.size + grid.offsetY + 1"
  />
</template>
