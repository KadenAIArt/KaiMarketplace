<script setup>
const props = defineProps({
  noPadding: Boolean,
  transparent: {
    Boolean,
    default: false
  },
  shadow: {
    Boolean,
    default: true
  }
})
</script>
<template>
  <div class="card flex flex-col bg-light dark:bg-foreground dark:text-white" :class="transparent===true?'bg-transparent dark:bg-transparent':''">
    <slot name="cardHeader" />
    <div class="card-body" :class="props.noPadding ? 'noPadding' : ''">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  border-radius: 10px;

  .card-body {
    -webkit-box-flex: 1;
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: 1.25rem;
    &.noPadding {
      padding: 0 !important;
    }
  }
}
</style>
