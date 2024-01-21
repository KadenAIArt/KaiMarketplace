<script setup>
import {onMounted, ref, computed, nextTick} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import BaseNFTCard from "@/components/Base/BaseNFTCard.vue";
import BaseAsyncNFTCard from "@/components/Base/BaseAsyncNFTCard.vue";
import BaseAsyncNFTRow from "@/components/Base/BaseAsyncNFTRow.vue";
import BaseAsyncActivityRow from "@/components/Base/BaseAsyncActivityRow.vue";
import MagneticText from "@/components/MagneticText.vue";
import MagneticTextToken from "@/components/MagneticTextToken.vue";
import {Disclosure, DisclosureButton, DisclosurePanel} from "@headlessui/vue";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import BaseProfileCard from "@/components/Base/BaseProfileCard.vue";
import { useQueryClient, useQuery } from '@tanstack/vue-query';
import axios from "axios";
import BaseAsyncCollectionCard from "@/components/Base/BaseAsyncCollectionCard.vue";
import BaseAsyncCollectionRow from "@/components/Base/BaseAsyncCollectionRow.vue";
import BaseAsyncCollectionSidebar from "@/components/Base/BaseAsyncCollectionSidebar.vue";
import apiConfig from "../../components/util/apiConfig.js";


let store = useStore();
let router = useRouter();

//Determines if url is image or video
const imageorvideo = (url) =>
    new Promise((resolve) => {
      const img = new Image();

      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });

//Wraps promises in timer
function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'))
    }, ms)

    promise
        .then(value => {
          clearTimeout(timer)
          resolve(value)
        })
        .catch(reason => {
          clearTimeout(timer)
          reject(reason)
        })
  })
}

async function fetchWithRetry(hash) {
  const link = [];
  link.push('https://kai.infura-ipfs.io/ipfs/');
  link.push('https://ipfs.io/ipfs/');
  link.push('https://kai.infura-ipfs.io/ipfs/');

  for (let i = 0; i < link.length-1; i++) {
    try {

      const response = await fetch(link[i]+hash);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // const data = await response.text(); // or response.json(), etc.
      return response;
    } catch (error) {
      console.error(`Attempt ${i+1} failed for url ${link[i]} ${hash}. Retrying...`, error);
    }
  }

  throw new Error(`All attempts failed for url ${hash}`);
}

async function determineImageLink(hash) {
  const link = [];
  link.push('https://kai.infura-ipfs.io/ipfs/');
  link.push('https://ipfs.io/ipfs/');
  link.push('https://kai.infura-ipfs.io/ipfs/');

  for (let i = 0; i < link.length-1; i++) {
    try {
      const response = await fetch(link[i]+hash);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      return link[i]+hash;
    } catch (error) {
      console.error(`Attempt ${i+1} failed for url ${link[i]} ${hash}. Retrying...`, error);
    }
  }
  throw new Error(`All attempts failed for url ${hash}`);
}

//VARIABLES FOR THIS PAGE
const account = localStorage.getItem("kai_accountName");
const loading = ref(true);
const nfts_to_show_now = ref([]);
const collections_to_show_now = ref([]);
const all_collections_for_sidebar = ref([]);
const attributes_to_show_now = ref(null);
const nft_data = ref([]);
const nfts_and_metadata = ref([]);
const nft_images = ref([]);
const get_from = ref(0);
const get_to = ref(15);
const current_page = ref(1);
const current_page_collections = ref(1);
const total_pages = ref(1);
const total_pages_collections = ref(1);
const is_currently_minting = ref(false);
const collection_image = ref('/images/kadenai_black.svg');
const is_unknown = ref(false);
const bg_visible = ref([]);
const started = ref(false);
const total_items_nfts = ref(0);
const total_items_collections = ref(0);
const medium = ref("Marmalade V2 NFTs and Collections")


const minting_to_show_now = ref([]);

const minting_getData = async()=>{

  const currently_minting_payload = {
    page: 1,
    limit: 10
  }

  let t_allCollections = await store.dispatch("accounts/getCurrentlyMinting", currently_minting_payload).then(async(res)=> {
    // console.log("CURRENTLY MINTING RES:");
    // console.log(res);

    if(res !== 0 && res[0] !== undefined && res[0] !== null){
      //Convert from {{}{}} to [{}{}]
      const collections_minting_array = Object.entries(res[0]).map((e) => ( { [e[0]]: e[1] } ));
      if(collections_minting_array){
        for(let i = 0; i < collections_minting_array.length; i++){
          minting_to_show_now.value.push(collections_minting_array[i][i]);
        }
        // console.log("----------------- final list of collections MINTING NOW --------------------");
        // console.log(minting_to_show_now.value);
      }
    }
  });


}

const fetchPageData = async()=>{

  //Grab top 20 nfts
  if(started.value === false){
    started.value = true;
    nfts_to_show_now.value = [];
    collections_to_show_now.value = [];
  }

  await collections_getData();

  await nfts_getData();

}

//Gets top collections data for this page
const collections_getData = async() =>{

  //First lets grab top 20 collections to display
  const collection_payload = {
    page: current_page_collections.value,
    limit: 20,
    isApproved: true,
    isTop: true,
    stats: true,
  }

  let t_allCollections = await store.dispatch("accounts/getCollections", collection_payload).then(async(res)=>{
    // console.log("TOP COLLECTIONS1:");
    // console.log(res);
    //
    // console.log("res[0].collections")
    // console.log(res[0].collections)


    //Displays on all 15 images of the moving banner so their css transitions begin playing
    for(let i = 0; i < 15; i++){
      bg_visible.value.push(true);
    }

    //Convert collections from {{}{}} to [{}{}]
    collections_to_show_now.value = res[0].collections;

    all_collections_for_sidebar.value = res[0].allApprovedCollections;


    if(res[0].pagination){
      total_pages_collections.value = res[0].pagination.pages;
      total_items_collections.value = res[0].pagination.total;
    }else{
      total_pages_collections.value = 1;
      total_items_collections.value = collections_to_show_now.value.length;
    }
  })
}


//Gets top nfts data for this page
const nfts_getData = async() =>{

  //First lets grab top 20 collections to display
  const nfts_payload = {
    page: current_page.value,
    limit: 20,
    isApproved: true,
    isTop: true
  }

  let t_topNFTs = await store.dispatch("accounts/getTopNFTs", nfts_payload).then(async(res)=>{
    // console.log("TOP NFTS:");
    // console.log(res);

    let nfts_array = res[0].nfts;

    // console.log("nfts_array")
    // console.log(nfts_array);

    if(res[0].pagination){
      total_pages.value = res[0].pagination.pages;
      total_items_nfts.value = res[0].pagination.total;
    }

    if(nfts_array){
      //Go through the collections and get images and data
      for(let i = 0; i < nfts_array.length; i++){
        // console.log("pushing", nfts_array[i]);
        nfts_to_show_now.value.push(nfts_array[i])
      }
      // console.log("----------------- final list of nft items to show --------------------");
      // console.log(nfts_to_show_now.value);
    }
  })
}

//Runs when page is first mounted to the screen (start up)
onMounted(async() => {

  await fetchPageData();

  //Set loading to false
  loading.value = false;

});


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

//Watch if darkmode/lightmode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});


//BIG MAIN STAGE COMPONENT SECTION
const listmode = ref(false);
const c_tab = ref('nfts')
const filters_active = ref(true);

//Toggles the sidebar filters on the main stage component
const toggleFilters = () =>{
  filters_active.value = !filters_active.value;
}

const filtersOff = () =>{
  filters_active.value = false;
}

//Switches between list view and grid view on the main stage component
const switchView = (view) =>{
  if(view === 'list'){
    listmode.value = true;
  }else{
    listmode.value = false;
  }
}

//Changes tabs between nfts/activity/users
const changeTab = (view) =>{
  c_tab.value = view;
}

//Loads more NFTs when user scrolls to bottom of page
const loadData = async() => {
  // console.log("LOADING MORE NFTS IF POSSIBLE");


  if(current_page_collections.value <= total_pages_collections.value){
    current_page_collections.value = current_page_collections.value + 1;
  }


  if(current_page.value <= total_pages.value){

    current_page.value = current_page.value + 1;

    if(searchQuery.value !== '' || is_sorting.value === true || searchQuery.value === '' && search_status.value !== 'all'){
      await fetchSearchResults()
    }else{
      await fetchPageData();
    }

  }

};



const queryClient = useQueryClient();
const searchQuery = ref('');
const searchCategory = ref('all');
const counter_page = ref(1);

const fetchSearchResults = async() => {
  // Invalidate and refetch
  // console.log('fetchSearchResults called');
  if(current_page.value === 0){current_page.value = 1}



  if(searchQuery.value !== '' || is_sorting.value === true ||  searchQuery.value === '' && search_status.value !== 'all'){

    collections_searchResultsQuery.refetch();
    searchResultsQuery.refetch();
    // if(c_tab.value === 'collections'){
    //   collections_searchResultsQuery.refetch();
    // }else{
    //   searchResultsQuery.refetch();
    // }


  }else{
    nfts_to_show_now.value = [];
    collections_to_show_now.value = [];
    await fetchPageData();
  }
};

const attributeFilter = ref({});
const active_filters_list = ref([]);

const resetStuffToShowNow = () =>{

  nfts_to_show_now.value = [];
  collections_to_show_now.value = [];

}

const setAttribute = (branch, attribute, add) =>{

  // console.log("setAttribute branch attribute add", branch, attribute, add)

  const t_filter_item = {
    name: branch,
    attribute: attribute
  }

  if(add === true){
    attributeFilter.value[branch] = attribute;


    //Check the input box if it needs to be checked
    for(let i = 0; i < attributes_to_show_now.value.length; i++){

      if(attributes_to_show_now.value.length > 0){

        if(attributes_to_show_now.value[i].branch === branch){

          if(attributes_to_show_now.value[i].attributes){

            if(attributes_to_show_now.value[i].attributes.length > 0){

              let branch_attributes = attributes_to_show_now.value[i].attributes;

              for(let k = 0; k < branch_attributes.length; k++){

                if(branch_attributes[k].name === attribute){
                  if(branch_attributes[k].checked === false){
                    branch_attributes[k].checked = true;
                  }
                }


              }

            }

          }

        }


      }

    }

    //Add the active filter to the button list of active filters on the users screen if its not there
    let matched = false;

    for(let i = 0; i < active_filters_list.value.length; i++){

      if(active_filters_list.value.length > 0){
        if(active_filters_list.value[i].name === branch && active_filters_list.value[i].attribute === attribute){
          matched = true;
        }
      }

    }
    //Push new filter onto button list so it can be displayed
    if(matched === false){
      active_filters_list.value.push(t_filter_item);
    }

  }else{
    delete attributeFilter.value[branch];

    //Uncheck the input radio box on the filter list
    for(let i = 0; i < attributes_to_show_now.value.length; i++){

      if(attributes_to_show_now.value.length > 0){

        if(attributes_to_show_now.value[i].branch === branch){

          if(attributes_to_show_now.value[i].attributes){

            if(attributes_to_show_now.value[i].attributes.length > 0){

              let branch_attributes = attributes_to_show_now.value[i].attributes;

              for(let k = 0; k < branch_attributes.length; k++){

                if(branch_attributes[k].name === attribute){
                  if(branch_attributes[k].checked === true){
                    branch_attributes[k].checked = false;
                  }
                }


              }

            }

          }

        }


      }

    }


    //Remove the filter from the button list of active filters
    for(let i = 0; i < active_filters_list.value.length; i++){
      if(active_filters_list.value.length > 0){
        if(active_filters_list.value[i].name === branch && active_filters_list.value[i].attribute === attribute){
          active_filters_list.value.splice(i, 1);
        }
      }

    }


  }

  // console.log("attributeFilter");
  // console.log(attributeFilter.value);

  searchResultsQuery.refetch();

}
const is_searching = ref(false);
const search_status = ref('all');
const getSearchResults = async () => {
  console.log("getSearchResults called", searchQuery.value, searchCategory.value);

  let returnme = "0";

  if(is_searching.value === false){

    is_searching.value = true;

    // if(c_tab.value === 'nfts' && is_searching.value === true && is_sorting.value === false){ nfts_to_show_now.value = []; }
    // if(c_tab.value === 'collections'  && is_searching.value === true && is_sorting.value === false){  collections_to_show_now.value = []; }

    console.log("SEARCH PARAMS");
    console.log("query");
    console.log(searchQuery.value);
    console.log("current_page.value");
    console.log(current_page.value);
    console.log("search_status.value")
    console.log(search_status.value)
    console.log("trying search");
    console.log("collection_id_to_sort_by.value");
    console.log(collection_id_to_sort_by.value);
    let params = {
      query: searchQuery.value !== '' ? searchQuery.value : undefined,
      limit: 15,
      page: current_page.value,
      collectionId: collection_id_to_sort_by.value,
      onSale: search_status.value === 'forsale' ? true : false
      // we can add other params like limit, page etc
    }
    console.log("params")

    console.log(params);

    try{
      const response = await axios.get(`${apiConfig.apiHost}/api/v2nfts/explorer-search`, {
        params: {
          query: searchQuery.value !== '' ? searchQuery.value : undefined,
          limit: 15,
          page: current_page.value,
          collectionId: collection_id_to_sort_by.value,
          onSale: search_status.value === 'forsale' ? true : false
          // we can add other params like limit, page etc
        },
      });

      //
      console.log("getSearchResults API response", response);

      if(response.data.pagination){
        total_pages.value = response.data.pagination.pages;
        total_items_nfts.value = response.data.pagination.total;
      }


      let t_nfts = response.data.nfts;

      for(let i = 0; i < response.data.nfts.length; i++){

        if(response.data.nfts[i]._id){
          nfts_to_show_now.value.push(response.data.nfts[i]);
        }

      }

      // console.log("NFTS TO SHOW NOW");
      // console.log(nfts_to_show_now.value);
      //
      // console.log("COLLECTIONS TO SHOW NOW");
      // console.log(collections_to_show_now.value);

      is_searching.value = false;
      return response.data;

  }catch(e){
      console.log(e);
      is_searching.value = false;
    }
  }

  is_searching.value = false;
  return 0;

};

const searchResultsQuery = useQuery({
  queryKey: ['searchResults'],
  queryFn: getSearchResults,
  enabled: false, // disable automatic refetch on mount
});

const { data: searchResults, isFetching, isError, error } = searchResultsQuery;

const reset_counter = async() =>{
  counter_page.value = 1;
  current_page.value = 1;
  total_pages.value = 1;
  nfts_to_show_now.value = [];
}


//15 Random Images via Vue Computed Property functions
const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
}

//Watches for new polling transactions and refetches data
store.watch((state, getters) => getters["accounts/getTransactionPolling"], async(val) => {

  if (val === false) {
    await fetchPageData();
  }

})

const clickCollection = async (id) => {
  await router.push({path: `/profile/${id}`});
};

const is_loading = ref(false);
const is_sorting = ref(false);
const collection_id_to_sort_by = ref(undefined)
const setSortByCollection = async(collectionid) =>{
  is_sorting.value = true;
  is_loading.value = true;
  collection_id_to_sort_by.value = collectionid;
  let turn_on_loader = setTimeout(()=>{
    is_loading.value = false;
  }, 3000);
  nfts_to_show_now.value = [];
  current_page.value = 1;
  await getSearchResults();
}
const clearSortByCollection = async() =>{
  is_sorting.value = false;
  collection_id_to_sort_by.value = undefined;
  nfts_to_show_now.value = [];
  current_page.value = 1;
  await getSearchResults();
  is_sorting.value = false;
}


const collections_getSearchResults = async () => {
  // console.log("collections_getSearchResults called", searchQuery.value, searchCategory.value);

  if(c_tab.value === 'collections'){  collections_to_show_now.value = []; }


  if (!searchQuery.value) return [];
  const response = await axios.get(`${apiConfig.apiHost}/api/v2nfts/search`, {
    params: {
      query: searchQuery.value,
      collectionType: "all",
      // we can add other params like limit, page etc
    },
  });
  // console.log("collections_getSearchResults API response", response);

  const collections_data = response.data.collections;
  total_items_collections.value = response.data.collections.length;

  const t_new_collections_to_show = [];


  if(c_tab.value === 'collections') {
    //Parse Collections
    for (let i = 0; i < collections_data.length; i++) {
      t_new_collections_to_show.push(collections_data[i].CollectionID);
    }
  }

  if(c_tab.value === 'collections') {
    collections_to_show_now.value = t_new_collections_to_show;
  }

  console.log("COLLECTIONS TO SHOW NOW");
  console.log(collections_to_show_now.value);

  return response.data;
};

const collections_searchResultsQuery = useQuery({
  queryKey: ['collections_searchResults'],
  queryFn: collections_getSearchResults,
  enabled: false, // disable automatic refetch on mount
});

const { data: searchResults_collections, isFetching_collections, isError_collections, error_collections } = collections_searchResultsQuery;



</script>
<template >

  <section>

    <!--  Medium + Screen Moving Banner-->
    <div class="z-1 hidden md:block pl-2">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">

          <transition name="bounceslow">
            <img v-if="bg_visible[7] === true" src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[6] === true" src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">

          <transition name="bounceslow">
            <img v-if="bg_visible[13] === true" src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[12] === true" src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
        </div>
      </div>
    </div>

    <!--  Small + Screen Moving Banner-->
    <div class="z-1 md:hidden block">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[5] === true" src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[6] === true" src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[7] === true" src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[8] === true" src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[11] === true" src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[11] === true" src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[12] === true" src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[13] === true" src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[14] === true" src="/images/demo_nft_8.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[5] === true" src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[6] === true" src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[7] === true" src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[8] === true" src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[11] === true" src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[5] === true" src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[5] === true" src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[6] === true" src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[7] === true" src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[8] === true" src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[11] === true" src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img v-if="bg_visible[9] === true" src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[10] === true" src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[11] === true" src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[12] === true" src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[13] === true" src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[14] === true" src="/images/demo_nft_8.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[0] === true" src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[1] === true" src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[3] === true" src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[4] === true" src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img v-if="bg_visible[5] === true" src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
      </div>
    </div >

    <!--  Top Intro Full Page Section Over Banner-->
    <div class="mx-auto hero relative z-10 " >


      <div class="container  mt-52 h-full md:mx-auto" >
        <div class="h-full w-full flex justify-center item-center text-start">
          <div class="flex flex-col h-full w-full justify-center items-start text-start">

            <!--            Large Screen Collection Info Area-->
            <div class="hidden md:flex w-full gap-4">


              <div class="flex flex-col">
                <h1 v-motion-pop
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  Explore
                </h1>
                <p  v-motion-roll-left class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  <MagneticText
                      v-slot="{ tokens }"
                      as="p"
                      class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                      :body="medium">
                    <MagneticTextToken
                        v-for="(token, index) in tokens"
                        v-slot="{ value }"
                        :key="index"
                        :threshold="40"
                        class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                      <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                    </MagneticTextToken>
                  </MagneticText>
                </p>
              </div>
            </div>


            <!--            Small Screen Collection Info Area-->
            <div class="md:hidden grid grid-cols-1 w-full gap-4">

              <div class="flex col-span-1 flex-col">
                <h1
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  Explore
                </h1>
                <p
                    class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  Marmalade V2 NFTs and Collections
                </p>
              </div>
            </div>


          </div>
        </div>

      </div>

    </div>


    <!--    Main Stage Component -->
    <transition name="slide-fade" mode="out-in">
      <div v-if="is_unknown === false">

        <div class="mt-32 z-10 relative mb-24 container mx-auto">

          <section>

            <div class="w-full">


              <div class="flex w-full gap-8 flex-col md:min-h-screen">

                <!-- Tabs -->
                <div class="tabs flex text-left">
                  <a @click="changeTab('nfts')" class="tab font-2 pl-0 text-2xl md:text-4xl  " :class="c_tab === 'nfts' ? 'tab-active text-accent dark:text-white' : ' text-neutral'">NFTs
                    <div v-if="total_items_nfts - nfts_to_show_now.length > 0" class="badge -mt-2 badge-primary text-sm text-white gap-2">
                      + {{total_items_nfts - nfts_to_show_now.length}}
                    </div>
                  </a>
                  <a @click="[changeTab('collections'), filtersOff()]" class="tab font-2 text-2xl md:text-4xl" :class="c_tab === 'collections' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Collections
                    <div v-if="total_items_collections - collections_to_show_now.length > 0" class="badge -mt-2 badge-primary text-sm text-white gap-2">
                      + {{total_items_collections - collections_to_show_now.length}}
                    </div>
                  </a>
                  <!--                <a @click="[changeTab('users'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'users' ? 'tab-active text-accent dark:text-white' : ''">Users</a>-->
                </div>


                <!-- Small Screen Options Area -->
                <div class="relative gap-4 md:hidden flex">
                  <select @change="getSearchResults" v-model="search_status" class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                    <option value="all" selected>All</option>
                    <option value="forsale" selected>For Sale</option>
                  </select>

                  <!-- Small List View Toggle -->
                  <button @click="switchView('list')" :class="listmode === true ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0"><font-awesome-icon icon=" fa-light fa-list" /></button>
                  <!-- Small Grid View Toggle -->
                  <button :disabled="c_tab === 'activity'" @click="switchView('grid')" :class="listmode === false ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0 "><font-awesome-icon icon=" fa-light fa-grid-2" /></button>

                </div>

                <!-- Large Screen Options Area -->
                <div class="flex gap-4">
                  <div class="relative flex text-neutral search-bar flex-grow">

                    <!-- Large Filter Button -->
                    <button v-if="c_tab === 'nfts'" @click="toggleFilters" :class="filters_active === true ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn mr-4 bg-light text-lg dark:bg-foreground border-0"><font-awesome-icon icon=" fa-light fa-filter-list" /></button>

                    <!-- Large Search Bar -->
                    <input
                        v-model="searchQuery"
                        @change="[reset_counter(),  fetchSearchResults()]"
                        class="bg-light_foreground pl-12 dark:bg-foreground border-transparent placeholder-neutral h-12 px-5 rounded-lg  text-sm focus:outline-none flex-grow"
                        type="search"
                        name="search"
                        placeholder="Search Collections, NFTs, and more.."
                    />
                    <button
                        role="button"
                        :class="c_tab === 'nfts' ? 'left-20' : 'left-5'"
                        class="absolute left-20 top-1 mt-2 ml-0 focus:outline-none"
                        type="submit"
                    >
                      <font-awesome-icon icon=" fa-light fa-magnifying-glass" />
                    </button>
                  </div>

                  <!-- Large Sort -->
                  <div class="relative gap-4 hidden md:flex">
                    <select  @change="[resetStuffToShowNow(), getSearchResults()]" v-model="search_status"  class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                      <option value="all" selected>All</option>
                      <option value="forsale" selected>For Sale</option>
                    </select>

                    <!-- Large List View Button -->
                    <button @click="switchView('list')" :class="listmode === true ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0"><font-awesome-icon icon=" fa-light fa-list" /></button>
                    <!-- Large Grid View Button -->
                    <button :disabled="c_tab === 'activity'" @click="switchView('grid')" :class="listmode === false ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0 "><font-awesome-icon icon=" fa-light fa-grid-2" /></button>

                  </div>

                </div>

                <div class="grid gap-6 grid-cols-6">

                  <transition name="slide-fade">
                    <div v-if="filters_active" class="hidden md:block col-span-1">

                      <div v-if="all_collections_for_sidebar.length > 0" class="flex flex-col">

                        <div class="text-lg font-2">
                          Collections
                        </div>

                        <fieldset class="space-y-2 w-full">
                          <legend class="sr-only">Filter by Collection</legend>



                          <div :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
                            <input @click="clearSortByCollection" type="radio" name="wallet" value="clearsort" id="clearsort" class="peer hidden" />

                            <label for="clearsort"
                                   class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light  dark:border-foreground dark:bg-foreground p-3 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">

                              <div class="avatar">
                                <div class="w-24 rounded-full ring ring-primary ring-offset-accent ring-offset-2">
                                  <img class=" rounded-lg h-[30px] w-[30px]" height="30" width="30"  :src="'/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
                                </div>
                              </div>

                              <div class="flex flex-col">
                                <p
                                    class="md:text-sm mt-2 font-2 text-black dark:text-light_grey">
                                  All
                                </p>

                              </div>

                            </label>
                          </div>

                          <BaseAsyncCollectionSidebar v-motion-slide-left @click="setSortByCollection(collection.name)" v-for="(collection, index) in all_collections_for_sidebar" :key="index" :name="collection.name" :id="collection._id ? collection._id : collection"></BaseAsyncCollectionSidebar>


                        </fieldset>

                      </div>

                      <!--                    <div class="flex mt-12 flex-col">-->

                      <!--                      <div class="text-lg font-2">-->
                      <!--                        Price-->
                      <!--                      </div>-->

                      <!--                      <div class="flex mt-4 gap-4">-->
                      <!--                        <input type="text" placeholder="Min" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->

                      <!--                        <input type="text" placeholder="Max" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->
                      <!--                      </div>-->

                      <!--                    </div>-->

                      <div v-if="attributes_to_show_now !== null && attributes_to_show_now.length > 0" class="flex mt-12 flex-col">

                        <div class="text-lg mb-4 font-2">
                          Properties
                        </div>

                        <section v-for="(branch, idx) in attributes_to_show_now" :key="idx">

                          <Disclosure v-slot="{ open }">
                            <DisclosureButton
                                class="flex w-full justify-between h-14 border-b-neutral/10 border-b-2 px-4 py-4 text-left focus:outline-none focus-visible:ring "
                            >
                              <span class="font-2">{{attributes_to_show_now[idx].branch}}</span>
                              <font-awesome-icon icon=" fa-light fa-xmark" :class="open ? 'rotate-90 duration-500 ' : 'rotate-360 duration-500'"
                                                 class="h-5 w-5 rotate-45 dark:text-white" />
                            </DisclosureButton>
                            <transition name="bounce">
                              <DisclosurePanel class="pt-4 mb-8 pb-2 text-sm border-b-neutral/20 border-b-2 text-gray-500">

                                <div class="relative mt-4 flex text-neutral search-bar flex-grow">

                                  <input
                                      class="bg-light_foreground  dark:bg-foreground border-transparent placeholder-neutral h-12 px-5 rounded-lg  text-sm focus:outline-none flex-grow"
                                      type="search"
                                      name="search"
                                      placeholder="Search"
                                  />
                                  <button
                                      role="button"
                                      class="absolute right-4 top-1 mt-2  focus:outline-none"
                                      type="submit"
                                  >
                                    <font-awesome-icon icon=" fa-light fa-magnifying-glass" />
                                  </button>
                                </div>



                                <div class=" mt-10 flex-col justify-center">

                                  <div v-for="(attribute, index) in attributes_to_show_now[idx].attributes" :key="index" class="flex mb-3 justify-between">
                                    <div class="flex dark:text-light font-1 text-sm gap-2">
                                      <input @change="setAttribute(attributes_to_show_now[idx].branch, attribute.name, attribute.checked)" v-model="attribute.checked" type="checkbox"  class="checkbox checkbox-accent" />
                                      {{attribute.name}}
                                    </div>
                                    <div class="font-2 text-sm dark:text-neutral">
                                      {{attribute.value}}
                                    </div>
                                  </div>


                                </div>

                              </DisclosurePanel>
                            </transition>
                          </Disclosure>
                        </section>
                      </div>

                    </div>
                  </transition>

                  <div :class="filters_active === true ? 'col-span-6 md:col-span-5' : 'col-span-6'">

                    <transition name="slide-fade">
                      <div v-if="active_filters_list.length > 0" class="flex text-lg items-center justify-start font-2 mb-4 gap-4">
                        Filters:
                        <button @click="setAttribute(filter.name, filter.attribute, false)" v-for="(filter, index) in active_filters_list" :key="index" class="btn bg-light dark:border-foreground dark:bg-foreground btn-sm">{{filter.name}} : {{filter.attribute}}    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                      </div>
                    </transition>



                    <!--            List Mode Displays-->

                    <transition name="slide-fade">
                      <div v-if="listmode === true && c_tab === 'collections'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                        <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                          <tr>

                            <th scope="col" class="px-6 flex py-3">
                              #
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Collection
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Floor Price
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Floor Change
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Volume
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Volume Change
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Items
                            </th>
                            <!--                            <th scope="col" class="pr-6 py-3 text-right">-->
                            <!--                              Owners-->
                            <!--                            </th>-->
                          </tr>
                          </thead>
                          <tbody>

                          <BaseAsyncCollectionRow v-for="(collection, idx) in collections_to_show_now" :key="idx" :size="collection.size" :stats="collection.stats" :idx="idx" :id="collection._id ? collection._id : collection"></BaseAsyncCollectionRow>

                          </tbody>
                        </table>

<!--                        <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">-->
<!--                          <InfiniteLoading class="flex" @infinite="loadData"/>-->
<!--                          Loading More-->
<!--                        </div>-->
                      </div>
                    </transition>

                    <transition name="slide-fade">
                      <div v-if="listmode === true && c_tab === 'nfts'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                        <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                          <tr>

                            <th scope="col" class="px-6 flex py-3">
                              #
                            </th>
                            <th scope="col" class="px-6 text-start py-3">
                              NFT
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Current Price
                            </th>
                            <!--                            <th scope="col" class="px-6 py-3">-->
                            <!--                              Highest Bid-->
                            <!--                            </th>-->
                            <!--                            <th scope="col" class="px-6 py-3">-->
                            <!--                              Last Sale-->
                            <!--                            </th>-->
                            <th scope="col" class="pr-6 py-3 text-right">
                              Owner
                            </th>
                          </tr>
                          </thead>
                          <tbody>

                          <BaseAsyncNFTRow v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : nft"></BaseAsyncNFTRow>

                          </tbody>
                        </table>

                        <div v-if="current_page < total_pages && is_searching === false && is_sorting === false" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>
                      </div>
                    </transition>

                    <!--            Grid Mode Collections Tab -->
                    <transition name="slide-fade">
                      <div v-if="listmode === false && c_tab === 'collections'">


                        <div class="badge badge-primary text-sm text-white gap-2">
                          Showing {{collections_to_show_now.length}} Collections
                        </div>

                        <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                          <BaseAsyncCollectionCard v-if="collections_to_show_now !== null"  v-for="(collection, idx) in collections_to_show_now" :key="idx" :id="collection._id ? collection._id : collection" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncCollectionCard>

                        </section>



                        <div v-if="current_page_collections < total_pages_collections && is_searching === false && is_sorting === false" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>

                      </div>
                    </transition>

                    <!--            Grid Mode NFTs Tab -->
                    <transition name="slide-fade">
                      <div v-if="listmode === false && c_tab === 'nfts'">

                        <div v-if="total_items_nfts - nfts_to_show_now.length > 0" class="badge badge-primary text-sm text-white gap-2">
                          Showing {{nfts_to_show_now.length}} NFTs
                        </div>

                        <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                          <BaseAsyncNFTCard  v-for="(nft, idx) in nfts_to_show_now" :key="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : nft" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncNFTCard>
                        </section>



                        <div v-if="current_page < total_pages && is_searching === false && is_sorting === false && is_loading === false || current_page < total_pages && is_searching === false && is_sorting === true && is_loading === false" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>



                      </div>
                    </transition>

                  </div>

                </div>



              </div>


            </div>


          </section>


        </div>


      </div>
    </transition>

    <transition name="slide-fade" mode="out-in">
      <div v-if="nfts_to_show_now.length === 0 && is_currently_minting === true" class="min-h-[500px] text-6xl hero">

        Coming soon!

      </div>
    </transition>


  </section>

</template>
<style lang="scss" scoped>


:deep(.spinner) {
  box-sizing: initial;
  border: 2px solid #9500F3;
  border-right-color: transparent;
  width: 23px;
  height: 23px;
  border-radius: 50%;
  animation: spin-d3e37633 .9s linear infinite;
}

.padme {
  margin-left: calc((100vw - 1300px) / 2);
}


.gallery_light {
  display: flex;
  gap: 1vw;
  overflow: hidden;
  filter: opacity(20%);

  img{
    border-radius: 1rem;
  }

  &:after{
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 65vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(255, 255, 255, 0)  0%, rgb(255, 255, 255) 20%, rgb(255, 255, 255) 100%);
  }
}

.gallery_dark {
  display: flex;
  gap: 1vw;
  overflow: hidden;
  filter: opacity(20%);
  top: -200px;
  img{
    border-radius: 0.7rem;
  }

  &:after{
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 100vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(16, 3, 3, 0)  0%, rgb(19, 19, 26) 100%);
  }
}

.gallery_line {
  flex-direction: column;
  gap: 1vw;
  height: fit-content;
  animation: slide 10s ease-in-out infinite;
  animation-direction: alternate;
}

.gallery_line:nth-child(even) {
  animation-direction: alternate-reverse;
}

.gallery_line img {
  flex: 1 1 auto;
  width: 100%;
  object-fit: cover;
}

@keyframes slide {
  0% { transform: translatey(0); }
  100% { transform: translatey(-20%); }
}



</style>
