<script setup>
import {onMounted, ref, watch} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import BaseSearchNFTRow from "@/components/Base/BaseSearchNFTRow.vue";
import BaseSearchCollectionRow from "@/components/Base/BaseSearchCollectionRow.vue";
import {useQueryClient, useQuery} from "@tanstack/vue-query";
import axios from "axios";
import apiConfig from "../components/util/apiConfig.js";
import {executeTransition} from "@vueuse/core";

let store = useStore();
let router = useRouter();

//Variables for this component
let isSearchOpen = ref(false);

const collections_to_show_now = ref([]);

//Runs when page is first mounted to the screen (start up)
onMounted(async () => {

  //Grab top 20 collections
  // await collections_getData();

  //Grab top 20 nfts
  nfts_to_show_now.value = [];
  // await nfts_getData();
  //
  // start_up.value = false;

});

const getInitialData = async () => {

  if (started.value === false) {
    //Set started so we dont restart
    started.value = true;

    //Grab top 20 collections
    await collections_getData();

    //Grab top 20 nfts
    nfts_to_show_now.value = [];
    await nfts_getData();
    //
    // start_up.value = false;
  }


};

const started = ref(false);

watch(isSearchOpen, async (value, oldValue) => {
  if (value === true) {
    await getInitialData();
  }
});


//Holds users search query on search bar
const searchString = ref(null);

const queryClient = useQueryClient();
const searchQuery = ref("");
const searchCategory = ref("all");
const searchData = ref("");

const fetchSearchResults = () => {
  // Invalidate and refetch
  console.log("fetchSearchResults called");
  searchResultsQuery.refetch();
};

const getSearchResults = async () => {
  console.log("getSearchResults called", searchQuery.value, searchCategory.value);

  nfts_to_show_now.value = [];
  collections_to_show_now.value = [];

  if (!searchQuery.value) return [];
  const response = await axios.get(`${apiConfig.apiHost}/api/v2nfts/search`, {
    params: {
      query: searchQuery.value,
      collectionType: "all",
      // we can add other params like limit, page etc
    },
  });
  console.log("API response", response);

  const nfts_data = response.data.metadata;
  const collections_data = response.data.collections;
  const groupednfts_data = response.data.groupedNFTs;

  const t_new_nfts_to_show = [];
  const t_new_collections_to_show = [];

  //Parse NFTs
  for (let i = 0; i < nfts_data.length; i++) {
    t_new_nfts_to_show.push(nfts_data[i]._id);
  }

  //Parse Collections
  for (let i = 0; i < collections_data.length; i++) {
    t_new_collections_to_show.push(collections_data[i].CollectionID);
  }

  nfts_to_show_now.value = t_new_nfts_to_show;
  collections_to_show_now.value = t_new_collections_to_show;

  console.log("NFTS TO SHOW NOW");
  console.log(nfts_to_show_now);

  return response.data;
};

const searchResultsQuery = useQuery({
  queryKey: ["searchResults"],
  queryFn: getSearchResults,
  enabled: false, // disable automatic refetch on mount
});

const {data: searchResults, isFetching, isError, error} = searchResultsQuery;

const c_tab = ref("collections");
const changeTab = (view) => {
  c_tab.value = view;
};

//Darkmode/Lightmode Stuff
const showDarkBG = ref(false);
const local_darkmode = ref(localStorage.getItem("kai_darkmode"));
if (local_darkmode.value === "true") {
  showDarkBG.value = true;
} else if (local_darkmode.value === "false") {
  showDarkBG.value = false;
} else {
  showDarkBG.value = false;
}

//Watch if mode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});


const nfts_to_show_now = ref([]);
const topsearch = ref(null);
const timer = ref(null);
const timer_active = ref(false);
const searchTimeOut = () => {
  if (timer_active.value === true) {
    clearTimeout(timer.value);
    timer_active.value = false;
  }
  timer_active.value = true;
  timer.value = setTimeout(() => {
    if (searchQuery.value !== "") {
      fetchSearchResults();
    } else {
      if (c_tab.value === "collections") {
        collections_to_show_now.value = [];
        collections_getData();
      }

    }
    timer_active.value = false;
  }, 800);
};

//Gets top nfts for default when search is opened
const nfts_getData = async () => {

  //First lets grab top 20 collections to display
  const nfts_payload = {
    page: 1,
    limit: 20,
    isApproved: true,
    isTop: true
  };

  let t_allCollections = await store.dispatch("accounts/getTopNFTs", nfts_payload).then(async (res) => {
    console.log("TOP NFTS:");
    console.log(res);


    let nfts_array = res[0].nfts;

    console.log("nfts_array");
    console.log(nfts_array);


    if (nfts_array) {
      //Go through the collections and get images and data
      for (let i = 0; i < nfts_array.length; i++) {
        console.log("pushing", nfts_array[i]);
        nfts_to_show_now.value.push(nfts_array[i]);
      }
      console.log("----------------- final list of nft items to show --------------------");
      console.log(nfts_to_show_now.value);
    }
  });
};

//Gets top collections data for this page
const collections_getData = async () => {

  //First lets grab top 20 collections to display
  const collection_payload = {
    page: 1,
    limit: 20,
    isApproved: true,
    isTop: true
  };

  let t_allCollections = await store.dispatch("accounts/getCollections", collection_payload).then(async (res) => {
    console.log("TOP COLLECTIONS:");
    console.log(res);

    collections_to_show_now.value = res[0].collections;

  });

  console.log("this used to grab collection data and 15 nfts and update nfts_to_show_now");
};

</script>

<template>
  <div :class="showDarkBG === false ? 'light_scroll_search' : 'dark_scroll_search' " class="w-full ">
    <div class="relative flex  text-neutral search-bar  flex-grow">
      <input
          @click="isSearchOpen = true"
          @input="searchTimeOut"
          v-model="searchQuery"
          class="bg-light_foreground pl-12 dark:bg-foreground border-transparent placeholder-neutral h-12 px-5 rounded-lg text-sm focus:outline-none flex-grow"
          type="text"
          name="search"
          ref="topsearch"
          placeholder="Search Collections, NFTs, and more.."
      />
      <button
          @click="$refs.topsearch.click()"
          role="button"
          class="absolute left-0 top-1 mt-2 ml-4 focus:outline-none"
          type="submit"
      >
        <font-awesome-icon icon="fa-light fa-magnifying-glass"/>
      </button>
    </div>

    <div
        class="max-w-2xl rounded-lg overflow-y-scroll  max-h-[54vh] bg-light/80 dark:bg-foreground/80"
        :class="[{ open: isSearchOpen }, showDarkBG === false ? 'search-ui-dark' : 'search-ui-dark ']"
    >

      <div class="glass h-[540px] py-2 pl-2 rounded-lg bg-accent/30 overflow-y-scroll dark:bg-accent/30">
        <span class="relative rounded-t-lg  w-full h-full">
            <div class="flex justify-between bg-light dark:bg-foreground  px-4 py-4 rounded-t-lg items-center">

                <div class="tabs flex text-left">
                  <a @click="changeTab('collections')" class="tab font-2 pl-0 md:text-2xl  "
                     :class="c_tab === 'collections' ? 'tab-active text-accent dark:text-white' : ''">Collections</a>
                  <a @click="changeTab('nfts')" class="tab font-2 pl-0 md:text-2xl  "
                     :class="c_tab === 'nfts' ? 'tab-active text-accent dark:text-white' : ''">NFTs</a>
                  <!--                  <a @click="changeTab('activity')" class="tab font-2 md:text-2xl"-->
                  <!--                     :class="c_tab === 'activity' ? 'tab-active text-accent dark:text-white' : ''">Activity</a>-->
                  <!--                <a @click="[changeTab('users'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'users' ? 'tab-active text-accent dark:text-white' : ''">Users</a>-->
                </div>

                <button @click="isSearchOpen = false"
                        class="px-1 py-1 w-12 relative rounded-lg group font-medium text-white font-medium inline-block">
                  <span
                      class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                  <span
                      class="h-full w-full inset-0 absolute  bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                  <span
                      class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                  <span
                      class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                  <span class="relative font-2 tracking-wide text-2xl md:px-2">            <font-awesome-icon
                      icon="fa-light fa-xmark"></font-awesome-icon></span>
                </button>
          </div>




            <section v-if="c_tab === 'nfts'">
              <ul class="w-full min-h-[430px] bg-light/90 px-2 pt-2 dark:bg-foreground/90">
                  <BaseSearchNFTRow v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx"
                                    :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : nft"
                                    class="w-full text-gray-600 dark:text-gray-400 "></BaseSearchNFTRow>
                                            <div class="text-xl rounded-lg py-5 px-4"  v-if="nfts_to_show_now.length <= 0">
                No NFTs found matching that criteria.
              </div>
                </ul>

                      <div class="w-full">
                        <hr class="h-4 rounded-b-lg mt-0 mb-1 bg-light/90 border-0 dark:bg-foreground/90">
                      </div>



            </section>

            <section v-if="c_tab === 'collections'">



              <ul class="w-full min-h-[430px] bg-light/90 px-2 pt-2 dark:bg-foreground/90">
                  <BaseSearchCollectionRow v-for="(collection, idx) in collections_to_show_now" :key="idx" :idx="idx"
                                           :id="collection._id ? collection._id : collection"
                                           class="w-full text-gray-600 dark:text-gray-400 "></BaseSearchCollectionRow>
                              <div class="text-xl rounded-lg py-5 px-4"
                                   v-if="collections_to_show_now.length <= 0">
                No collections found matching that criteria.
              </div>
              </ul>

              <div class="w-full">
                <hr class="h-4 rounded-b-lg mt-0 mb-px bg-light/90 border-0 dark:bg-foreground/90">
              </div>
            </section>
          </span>

      </div>


    </div>
  </div>
</template>

<style lang="scss" scoped>

.search-ui-dark {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  width: 50%;
  margin: auto;
  padding: 0px;
  z-index: 9999;
  max-width: 100%;
  height: 560px;
  opacity: 0;
  transition: all 0.3s ease-in;
  visibility: hidden;
  overflow: auto;
  box-shadow: rgba(0, 0, 0, 0.45) 0px 25px 20px -20px;

  &.open {
    opacity: 1;
    visibility: visible;
    transition: all 0.3s ease-in;
  }
}


.search-ui-light {
  position: absolute;
  bottom: -50vh;
  left: 0;
  right: 0;
  width: 50%;
  margin: auto;
  padding: 0.75rem 0.75rem 1.5rem 0.75rem;
  z-index: 9999;
  // background-color: #fff;
  max-width: 100%;
  height: 50vh;
  opacity: 0;
  transition: all 0.3s ease-in;
  visibility: hidden;
  overflow: auto;
  box-shadow: rgba(0, 0, 0, 0.17) 0px -23px 25px 0px inset, rgba(0, 0, 0, 0.15) 0px -36px 30px 0px inset, rgba(0, 0, 0, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px;

  &:after {
    position: absolute;
    content: "";
    height: 100%;
    width: 100%;
    left: 0;
    right: 0;
    top: 0;

    filter: blur(5px) opacity(80%);
    background-image: url(/images/gradient-light.jpg);
    background-size: cover;
  }


  &.open {
    opacity: 1;
    visibility: visible;
    transition: all 0.3s ease-in;

    &::before {
      background-image: url(/images/gradient_dark.jpg);
      background-size: cover;
    }
  }
}

@media (max-width: 576px) {
  .search-ui-dark {
    width: 95%;
  }
}

</style>
