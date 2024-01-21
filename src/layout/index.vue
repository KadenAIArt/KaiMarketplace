<script setup>
import {ref} from "vue";
import { useStore } from 'vuex'
import Header from './Header.vue'
import Footer from './Footer.vue'

let store = useStore()

//Darkmode/Lightmode Stuff
const showDarkBG = ref(false);
const datatheme = ref('light');
const local_darkmode = ref(localStorage.getItem("kai_darkmode"));
if (local_darkmode.value === "true") {
  showDarkBG.value = true;
  datatheme.value = 'dark';
} else if (local_darkmode.value === "false") {
  showDarkBG.value = false;
  datatheme.value = 'light';
} else {
  showDarkBG.value = false;
  datatheme.value = 'light';
}

//Watch if mode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});

</script>

<template  >
  <div  class="app-admin-wrap-layout-2 " :data-theme="showDarkBG === true ? 'dark' : 'light'">
    <Header />
    <div

        class="main-content-wrap"
    >
      <main>
        <div
            class="main-content-wrap overflow-x-hidden flex flex-col flex-grow print-area pt-10 "
        >
          <div >
            <router-view v-slot="{ Component }" :key="$route.fullPath">
              <transition name="slide-fade" mode="out-in">
                <component  :is="Component" />
              </transition>
            </router-view>
          </div>
          <div class="flex-grow-1"></div>
          <Footer />
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>


.flex-grow-1 {
  -webkit-box-flex: 1 !important;
  -ms-flex-positive: 1 !important;
  flex-grow: 1 !important;
}

.app-admin-wrap-layout-2 {
  width: 100%;
  height: 100%;

  .main-content-wrap {

    margin: auto;
    min-height: calc(100vh - 60px);
    padding-top: 0px;
    transition: all 0.24s ease-in-out;

    .main-content-body {
      min-height: calc(100vh - 80px);
    }

    &.wide {
      width: 100%;
      margin-left: 190px;
      padding-right: 90px;
      transition: all 0.24s ease-in-out;

    }

    &.full {
      width: 100%;
      margin-left: 0px;
      transition: all 0.24s ease-in-out;

    }

    @media screen and (max-width: 991px) {
      width: 100%;
      margin-left: 0px;
      padding-right: 5px;
      padding-left: 5px;
    }
  }
}
</style>
