<script setup>
import {onMounted, ref} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import SpotlightCard2 from "@/components/SpotlightCard2.vue";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import { useQueryClient, useQuery } from '@tanstack/vue-query';
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import BaseProfileCard from "@/components/Base/BaseProfileCard.vue";
import {Disclosure, DisclosureButton, DisclosurePanel} from "@headlessui/vue";
import BaseAsyncNFTCard from "@/components/Base/BaseAsyncNFTCard.vue";
import BaseAsyncCollectionCard from "@/components/Base/BaseAsyncCollectionCard.vue";
import BaseAsyncActivityCard from "@/components/Base/BaseAsyncActivityCard.vue";
import BaseAsyncCollectionsMintingCard from "@/components/Base/BaseAsyncCollectionsMintingCard.vue";
import BaseAsyncActivityRow from "@/components/Base/BaseAsyncActivityRow.vue";
import BaseAsyncNFTRow from "@/components/Base/BaseAsyncNFTRow.vue";
import BaseAsyncCollectionRow from "@/components/Base/BaseAsyncCollectionRow.vue";
import axios from "axios";
import apiConfig from "../../components/util/apiConfig.js";
import { useHead } from '@unhead/vue'
import MagneticText from "@/components/MagneticText.vue";
import MagneticTextToken from "@/components/MagneticTextToken.vue";

//Load vuex store and vue router
let store = useStore();
let router = useRouter()

const myPage = ref({
  description: 'Buy, Sell, Create Marmalade V2 NFTs',
  name: "Kadenai Marketplace",
  image: "https://test.zethra.io/images/kadenai_v.png",
  "theme-color": "#4800F9",
  sli: "summary_large_image",
  site: "https://test.zethra.io",
  type: "webapp"
})

useHead({
  title: 'Kadenai Marketplace',
  meta: [{ name: 'description', content: () => myPage.value.description },
    { name: 'name', content: () => myPage.value.name},
    { name: 'msapplication-TileColor', content: () => myPage.value.name},
    { name: 'theme-color', content: () => myPage.value["theme-color"]},
    { name: 'image', content: () => myPage.value.image },
    { name: 'twitter:card', content: () => myPage.value.sli},
    { name: 'twitter:title', content: () => myPage.value.name},
    { name: 'twitter:description', content: () => myPage.value.description},
    { name: 'twitter:image', content: () => myPage.value.image},
    { itemprop: 'name', content: () => myPage.value.name},
    { itemprop: 'description', content: () => myPage.value.description},
    { itemprop: 'image', content: () => myPage.value.image},
    { property: 'og:site_name', content: () => myPage.value.name},
    { property: 'og:url', content: () => myPage.value.site},
    { property: 'og:type', content: () => myPage.value.type},
    { property: 'og:title', content: () => myPage.value.name},
    { property: 'og:description', content: () => myPage.value.description},
    { property: 'og:image', content: () => myPage.value.image}
  ],
})

const marmalade_collections_to_show_now = ref([])
const minting_now_collections_to_show_now = ref([]);

const fetchPageData = async()=>{
  //Grab top 20 collections
  await collections_getData();

  //Grab currently minting
  await minting_getData();

  //Grab top 20 nfts
  nfts_to_show_now.value = [];
  await nfts_getData();

  //Grab activity section
  await activity_getData();
}

//Runs when page is first mounted to the screen (start up)
onMounted(async() => {

  //Grab top 20 collections
  await fetchPageData();

  start_up.value = false;

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

//Watch if mode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});



//Watches for new polling transactions and shows modal
store.watch((state, getters) => getters["accounts/getTransactionPolling"], async(val) => {

  if (val === false) {
    await fetchPageData();
  }

})


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
const start_up = ref(true);
const bg_visible = ref([]);
const collections_to_show_now = ref([]);
const attributes_to_show_now = ref(null);
const nft_data = ref([]);
const nfts_and_metadata = ref([]);
const nft_images = ref([]);
const get_from = ref(0);
const get_to = ref(15);
const current_page = ref(1);
const total_pages = ref(1);
const explore_nfts = ref("Explore NFTs");
const explore_browse = ref("Browse the Marmalade V2 catalog.");
const forge_collections = ref("Forge Collections");
const create_collections = ref("Create Marmalade V2 collections.");
const ai_generate = ref("AI Generate");
const generate_nfts = ref("Generate NFTs with the help of AI.");
const nft_minter = ref("NFT Minter");
const mint_nfts = ref("Mint Marmalade V2 NFTs with ease.");
//List of NFTs that are displayed on this screen
const nfts_to_show_now = ref([
  {
    nftid: "id",
    collection: "Kittykad",
    name: "Kittykad #1",
    image: "/images/demo_nft_3.png",
  },
  {
    nftid: "id",
    collection: "Sphynx",
    name: "Sphynx #10",
    image: "/images/demo_nft_4.png",
  },
  {
    nftid: "id",
    collection: "Kishu Ken",
    name: "KishuKen #45",
    image: "/images/demo_nft_5.png",
  },
  {
    nftid: "id",
    collection: "KadenaMiningClub",
    name: "Miner #432",
    image: "/images/demo_nft_6.png",
  },
  {
    nftid: "id",
    collection: "KOR Blocks",
    name: "KOR #42",
    image: "/images/demo_nft_7.png",
  },
  {
    nftid: "id",
    collection: "Bulls",
    name: "Bulls #92",
    image: "/images/demo_nft_9.png",
  },
  {
    nftid: "id",
    collection: "Variation Apes",
    name: "Ape #22",
    image: "/images/demo_nft_11.png",
  },
  {
    nftid: "id",
    collection: "Badgers",
    name: "Badger #1",
    image: "https://storage.googleapis.com/kaipub/bg/badger.jpg",
  },
  {
    nftid: "id",
    collection: "Swarms",
    name: "Swarms #7",
    image: "https://storage.googleapis.com/kaipub/bg/hivewar.jpg",
  },
  {
    nftid: "id",
    collection: "Rabbits",
    name: "Rabbits #10",
    image: "https://storage.googleapis.com/kaipub/bg/rabbit.jpg",
  },
  {
    nftid: "id",
    collection: "Penguins",
    name: "Penguin #11",
    image: "/images/demo_nft_1.png",
  },
  {
    nftid: "id",
    collection: "Capybaras",
    name: "Capybaras #12",
    image: "/images/demo_nft_2.png",
  }]);

//Slider breakpoints
const breakpoints = {
  // 700px and up
  540: {
    itemsToShow: 1,
    snapAlign: 'center',
  },
  960: {
    itemsToShow: 2,
    snapAlign: 'center',
  },
  // 1024 and up
  1024: {
    itemsToShow: 4,
    snapAlign: 'start',
  },
  1280: {
    itemsToShow: 4,
    snapAlign: 'start',
  },
  1536: {
    itemsToShow: 4.9,
    snapAlign: 'start',
  },
  1745: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  1920: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  2133: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  2400: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  2560: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  2880: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
  3840: {
    itemsToShow: 4.8,
    snapAlign: 'start',
  },
};

//List of activities that are shown on this screen
const activities_to_show_now = ref(null);


//BIG MAIN STAGE COMPONENT SECTION
const listmode = ref(true);
const c_tab = ref('collections')
const filters_active = ref(false);

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
  searchQuery.value = null;
  c_tab.value = view;
}

//Loads more NFTs when user scrolls to bottom of page
const loadData = async() => {

  current_page.value = current_page.value + 1;

  if(current_page.value <= total_pages.value){

    if(searchQuery.value !== ''){
      fetchSearchResults()
    }else{
      await collections_getData();
    }

  }

};

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
        // console.log("----------------- MINTING NOW --------------------");
        // console.log(minting_to_show_now.value);
      }

    }


  });


}


//Gets top collections data for this page
const collections_getData = async() =>{

  //First lets grab top 20 collections to display
  const collection_payload = {
    page: 1,
    limit: 20,
    isApproved: true,
    isTop: true,
    stats: true,
  }

  let t_allCollections = await store.dispatch("accounts/getCollections", collection_payload).then(async(res)=>{
    // console.log("TOP COLLECTIONS:");
    // console.log(res);

    //Displays on all 15 images of the moving banner so their css transitions begin playing
    for(let i = 0; i < 15; i++){
      bg_visible.value.push(true);
    }

    const collections_array = res[0].collections

    if(collections_array){
      //Go through the collections and get images and data
      for(let i = 0; i < collections_array.length; i++){
        collections_to_show_now.value.push(collections_array[i]);

        if(start_up.value === true){
          marmalade_collections_to_show_now.value.push(collections_array[i]);
          minting_now_collections_to_show_now.value.push(collections_array[i]);
        }

      }
    }
  })

}


//Gets top nfts data for this page
const nfts_getData = async() =>{

  //First lets grab top 20 collections to display
  const nfts_payload = {
    page: 1,
    limit: 20,
    isApproved: true,
    isTop: true
  }

  let t_allCollections = await store.dispatch("accounts/getTopNFTs", nfts_payload).then(async(res)=>{
    // console.log("TOP NFTS:");
    // console.log(res);


    let nfts_array = res[0].nfts;

    // console.log("nfts_array")
    // console.log(nfts_array);



    if(nfts_array){
      //Go through the collections and get images and data
      for(let i = 0; i < nfts_array.length; i++){
        nfts_to_show_now.value.push(nfts_array[i])
      }
      // console.log("----------------- final list of nft items to show --------------------");
      // console.log(nfts_to_show_now.value);
    }
  })
}

//Gets top activity data for this page
const activity_getData = async() =>{

  //First lets grab top 20 collections to display
  const nfts_payload = {
    page: 1,
    limit: 20,
    sales: true,
    mint: false
  }

  let t_allActvity = await store.dispatch("accounts/getActivity", nfts_payload).then(async(res)=>{
    // console.log("ALL ACTIVITY:");
    // console.log(res);
    // console.log(res[0].data);

    activities_to_show_now.value = res[0].data;

  })
}

const queryClient = useQueryClient();
const searchQuery = ref('');
const searchCategory = ref('all');
const counter_page = ref(1);

//Callsed when someone types in search bar
const fetchSearchResults = () => {

  //Here we will fetch results depending on which tab the user is searching from


  //Just incase our current_page is set to 0 lets set it to 1
  if(current_page.value === 0){current_page.value = 1}

  //Depending on which tab the user is on, a different search query runs when the user types in the search bar
  if(c_tab.value === 'collections'){
    //Collections tab query

    if(searchQuery.value !== ''){
      //Perform query if user typed in search bar
      collections_searchResultsQuery.refetch();
    }else{
      //If user didnt type anything in the search bar and searched, we perform a different query
      collections_to_show_now.value = [];
      collections_getData();
    }

  }

  if(c_tab.value === 'nfts'){
    //Collections tab query

    if(searchQuery.value !== ''){
      //Perform query if user typed in search bar
      collections_searchResultsQuery.refetch();
    }else{
      //If user didnt type anything in the search bar and searched, we perform a different query
      nfts_to_show_now.value = [];
      nfts_getData();
    }

  }




};

//NFTs tab sidebar attributes stuff and filter buttons stuff
const attributeFilter = ref({});
const active_filters_list = ref([]);

//Called when a user clicks a property filter on nfts sidebar
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

  collections_searchResultsQuery.refetch();

}

const collections_getSearchResults = async () => {
  // console.log("getSearchResults called", searchQuery.value, searchCategory.value);

  if(c_tab.value === 'nfts'){ nfts_to_show_now.value = []; }
  if(c_tab.value === 'collections'){  collections_to_show_now.value = []; }


  if (!searchQuery.value) return [];
  const response = await axios.get(`${apiConfig.apiHost}/api/v2nfts/search`, {
    params: {
      query: searchQuery.value,
      collectionType: "all",
      // we can add other params like limit, page etc
    },
  });
  // console.log("API response", response);

  const nfts_data = response.data.metadata;
  const collections_data = response.data.collections;
  const groupednfts_data = response.data.groupedNFTs;

  const t_new_nfts_to_show = [];
  const t_new_collections_to_show = [];

  if(c_tab.value === 'nfts') {
    //Parse NFTs
    for (let i = 0; i < nfts_data.length; i++) {
      t_new_nfts_to_show.push(nfts_data[i]._id);
    }
  }
  if(c_tab.value === 'collections') {
    //Parse Collections
    for (let i = 0; i < collections_data.length; i++) {
      t_new_collections_to_show.push(collections_data[i].CollectionID);
    }
  }

  if(c_tab.value === 'nfts') {
    nfts_to_show_now.value = t_new_nfts_to_show;
  }
  if(c_tab.value === 'collections') {
    collections_to_show_now.value = t_new_collections_to_show;
  }


  // console.log("NFTS TO SHOW NOW");
  // console.log(nfts_to_show_now.value);
  //
  // console.log("COLLECTIONS TO SHOW NOW");
  // console.log(collections_to_show_now.value);

  return response.data;
};

const collections_searchResultsQuery = useQuery({
  queryKey: ['collections_searchResults'],
  queryFn: collections_getSearchResults,
  enabled: false, // disable automatic refetch on mount
});

const { data: searchResults, isFetching, isError, error } = collections_searchResultsQuery;

const reset_counter = async() =>{
  counter_page.value = 1;
  current_page.value = 1;
  total_pages.value = 1;
}

const clickMinter = async () => {
  await router.push({path: `/mint`});
};

const clickComingSoon = async()=>{
  alert("AI Generator coming soon!")
}

const clickExplore = async () => {
  await router.push({path: `/explore`});
};

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
          <transition name="bounceslow">
          <img v-if="bg_visible[2] === true" src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
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
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
          <img v-if="bg_visible[12] === true" src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
          <img v-if="bg_visible[13] === true" src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
          <img v-if="bg_visible[14] === true" src="/images/demo_nft_8.png" style="width: 20vw;"/>
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
    <div class="mx-auto h-screen relative z-10 bg-gradient-to-r from-white/80 to-transparent dark:from-dark/90 dark:to-transparent" >


      <div class="container h-full md:mx-auto grid grid-cols-1 md:grid-cols-1" >
        <div class="col-span-1 h-full w-full flex justify-center item-center text-start">
          <div :class="showDarkBG === true ? '' : '' " class="flex  flex-col mt-4 md:mt-0 h-full w-full justify-center items-start text-start">
            <div v-motion-pop class="flex">
              <h1
                  :class="showDarkBG === true ? '' : 'luminate' "
                  class="mt-16 mb-4 font-3 text-5xl  text-black tracking-tight xl:text-8xl dark:text-[#FAFAFB]" >
                Kadenai Marketplace
              </h1>
            </div>

            <p :class="showDarkBG === true ? 'luminate' : '' " class="opacity-70 font-0 text-black dark:text-light_grey">
              Kadena's number one Marmalade V2 Marketplace.
              <br/>
              Buy, Sell, Trade, and Create NFTs on Kadena.
            </p>
            <div v-motion-roll-left>
              <div @click="clickExplore" class="px-6 py-2.5 mt-12 h-14 flex items-center relative cursor-pointer rounded-lg group font-medium text-white font-medium inline-block">
                <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                <span class="relative font-2 text-xl tracking-wide  md:px-4">            Explore Collections
            <font-awesome-icon icon=" fa-light fa-arrow-right-long" /></span>
              </div>
            </div>

          </div>
        </div>



      </div>

    </div>

    <!--  4 Cards-->

    <div   class="md:mx-24 z-10 md:-mt-24 relative bg-transparent" >

      <div class="container mx-auto">

        <div class="grid gap-4 grid-cols-1 md:grid-cols-4">

          <transition name="bounceslow">
          <div v-if="bg_visible[0] === true" class="col-span-1">
            <SpotlightCard2
                from="rgba(72,0,249,0.30)"
                via="rgba(149,0,243,0.30)"
                :size="200"
                :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'"
                class="w-full max-w-6xl rounded-lg bg-white/10 p-0 ">
              <div class="absolute  inset-px rounded-lg bg-light/60 dark:bg-foreground/60"></div>


              <div @click="clickExplore" class="relative group h-full cursor-pointer bg-light/50 dark:bg-foreground/50 p-6 pb-8 rounded-lg border-2 border-transparent hover:border-primary/10 z-20 overflow-hidden transition-all duration-200 ease-out rounded-lg hover:bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm ">

                <div
                    class="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square"
                    aria-hidden="true">
                  <div class="absolute inset-0 translate-z-0 g-light/10 dark:bg-foreground/10 rounded-full blur-[80px]"></div>
                </div>

                <div class="flex flex-col h-full items-start  text-start justify-start">
                <span class="text-5xl dark:text-neutral group-hover:text-accent mt-2 mb-8">
                  <font-awesome-icon icon=" fa-light fa-grid  " />
                </span>
                  <p class="leading-3 uppercase text-xs pb-1 text-accent mb-1">Marketplace</p>
                  <h4 class="font-3 mb-4 dark:text-light text-xl leading-3">
                    <MagneticText
                        v-slot="{ tokens }"
                        as="p"
                        class="w-full  tracking-wide cursor-pointer  text-left font-var"
                        :body="explore_nfts">
                      <MagneticTextToken
                          v-for="(token, index) in tokens"
                          v-slot="{ value }"
                          :key="index"
                          :threshold="40"
                          class="inline-block cursor-pointer whitespace-pre">
                        <span :style="{ fontWeight: value+500 }">{{ token }}</span>
                      </MagneticTextToken>
                    </MagneticText>
                  </h4>
                  <p
                      class="mb-8 mt-2 text-[15px] font-0 dark:text-gray-300"
                  >
                    <MagneticText
                        v-slot="{ tokens }"
                        as="p"
                        class="w-full  tracking-wide cursor-pointer  text-left font-var"
                        :body="explore_browse">
                      <MagneticTextToken
                          v-for="(token, index) in tokens"
                          v-slot="{ value }"
                          :key="index"
                          :threshold="40"
                          class="inline-block cursor-pointer whitespace-pre">
                        <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                      </MagneticTextToken>
                    </MagneticText>
                  </p>

                  <div class="h-10 w-10 rounded-full bg-gradient-to-r from-primary via-accent mb-2 to-secondary group-hover:from-secondary group-hover:to-secondary p-[1px]">
                    <div class="flex h-full w-full rounded-full items-center justify-center text-accent bg-light dark:bg-foreground back">
                      <font-awesome-icon icon=" fa-light fa-arrow-right-long" />
                    </div>
                  </div>

                </div>
              </div>
            </SpotlightCard2>
          </div>
          </transition>

          <transition name="bounceslow">
          <div v-if="bg_visible[0] === true" class="col-span-1">
            <SpotlightCard2
                from="rgba(72,0,249,0.30)"
                via="rgba(149,0,243,0.30)"
                :size="200"
                :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'"
                class="w-full max-w-6xl rounded-lg bg-white/10 p-0 ">
              <div class="absolute inset-px rounded-lg bg-light/60 dark:bg-foreground/60"></div>


              <div @click="clickMinter" class="relative group h-full cursor-pointer bg-light/50 dark:bg-foreground/50 p-6 pb-8 rounded-lg border-2 border-transparent hover:border-primary/10 z-20 overflow-hidden transition-all duration-200 ease-out rounded-lg hover:bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm ">
              <div
                    class="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square"
                    aria-hidden="true">
                  <div class="absolute inset-0 translate-z-0 bg-light/10 dark:bg-foreground/10 rounded-full blur-[80px]"></div>
                </div>
                <div class="flex flex-col h-full items-start  text-start justify-start">
                <span class="text-5xl dark:text-neutral group-hover:text-accent mt-2 mb-8">
                  <font-awesome-icon icon=" fa-light fa-layer-group" />
                </span>
                  <p class="leading-3 uppercase text-xs pb-1 text-accent mb-1">TOOL</p>
                  <h4 class="font-3 mb-4 dark:text-light text-xl leading-3">                    <MagneticText
                      v-slot="{ tokens }"
                      as="p"
                      class="w-full  tracking-wide cursor-pointer  text-left font-var"
                      :body="forge_collections">
                    <MagneticTextToken
                        v-for="(token, index) in tokens"
                        v-slot="{ value }"
                        :key="index"
                        :threshold="40"
                        class="inline-block cursor-pointer whitespace-pre">
                      <span :style="{ fontWeight: value+500 }">{{ token }}</span>
                    </MagneticTextToken>
                  </MagneticText></h4>
                  <p
                      class="mb-8 mt-2 text-[15px] font-0 dark:text-gray-300"
                  >
                    <MagneticText
                        v-slot="{ tokens }"
                        as="p"
                        class="w-full  tracking-wide cursor-pointer  text-left font-var"
                        :body="create_collections">
                      <MagneticTextToken
                          v-for="(token, index) in tokens"
                          v-slot="{ value }"
                          :key="index"
                          :threshold="40"
                          class="inline-block cursor-pointer whitespace-pre">
                        <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                      </MagneticTextToken>
                    </MagneticText>
                  </p>

                  <div class="h-10 w-10 rounded-full bg-gradient-to-r from-primary via-accent mb-2 to-secondary p-[1px] group-hover:from-secondary group-hover:to-secondary">
                    <div @click="clickMinter" class="flex cursor-pointer h-full w-full rounded-full items-center justify-center text-accent bg-light dark:bg-foreground  back">
                      <font-awesome-icon icon=" fa-light fa-arrow-right-long" />
                    </div>
                  </div>

                </div>
              </div>
            </SpotlightCard2>
          </div>
          </transition>



          <transition name="bounceslow">
            <div v-if="bg_visible[0] === true" class="col-span-1">
              <SpotlightCard2
                  from="rgba(72,0,249,0.30)"
                  via="rgba(149,0,243,0.30)"
                  :size="200"
                  :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'"
                  class="w-full max-w-6xl rounded-lg bg-white/10 p-0 ">
                <div class="absolute  inset-px rounded-lg bg-light/60 dark:bg-foreground/60"></div>


                <div @click="clickMinter" class="relative group h-full cursor-pointer bg-light/50 dark:bg-foreground/50 p-6 pb-8 rounded-lg border-2 border-transparent hover:border-primary/10 z-20 overflow-hidden transition-all duration-200 ease-out rounded-lg hover:bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm ">

                  <div
                      class="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square"
                      aria-hidden="true">
                    <div class="absolute inset-0 translate-z-0 g-light/10 dark:bg-foreground/10 rounded-full blur-[80px]"></div>
                  </div>

                  <div class="flex flex-col h-full items-start  text-start justify-start">
                <span class="text-5xl dark:text-neutral group-hover:text-accent mt-2 mb-8">
                 <font-awesome-icon icon=" fa-light fa-microchip-ai" />
                </span>
                    <p class="leading-3 uppercase text-xs pb-1 text-accent mb-1">Marketplace</p>
                    <h4 class="font-3 mb-4 dark:text-light text-xl leading-3">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full  tracking-wide cursor-pointer  text-left font-var"
                          :body="ai_generate">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+500 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                    </h4>
                    <p
                        class="mb-8 mt-2 text-[15px] font-0 dark:text-gray-300"
                    >
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full  tracking-wide cursor-pointer  text-left font-var"
                          :body="generate_nfts">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                    </p>

                    <div class="h-10 w-10 rounded-full bg-gradient-to-r from-primary via-accent mb-2 to-secondary group-hover:from-secondary group-hover:to-secondary p-[1px]">
                      <div class="flex h-full w-full rounded-full items-center justify-center text-accent bg-light dark:bg-foreground back">
                        <font-awesome-icon icon=" fa-light fa-arrow-right-long" />
                      </div>
                    </div>

                  </div>
                </div>
              </SpotlightCard2>
            </div>
          </transition>




          <transition name="bounceslow">
            <div v-if="bg_visible[0] === true" class="col-span-1">
              <SpotlightCard2
                  from="rgba(72,0,249,0.30)"
                  via="rgba(149,0,243,0.30)"
                  :size="200"
                  :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'"
                  class="w-full max-w-6xl rounded-lg bg-white/10 p-0 ">
                <div class="absolute  inset-px rounded-lg bg-light/60 dark:bg-foreground/60"></div>


                <div @click="clickMinter" class="relative group h-full cursor-pointer bg-light/50 dark:bg-foreground/50 p-6 pb-8 rounded-lg border-2 border-transparent hover:border-primary/10 z-20 overflow-hidden transition-all duration-200 ease-out rounded-lg hover:bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm ">

                  <div
                      class="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square"
                      aria-hidden="true">
                    <div class="absolute inset-0 translate-z-0 g-light/10 dark:bg-foreground/10 rounded-full blur-[80px]"></div>
                  </div>

                  <div class="flex flex-col h-full items-start  text-start justify-start">
                <span class="text-5xl dark:text-neutral group-hover:text-accent mt-2 mb-8">
                  <font-awesome-icon icon=" fa-light fa-block-question" />
                </span>
                    <p class="leading-3 uppercase text-xs pb-1 text-accent mb-1">Marketplace</p>
                    <h4 class="font-3 mb-4 dark:text-light text-xl leading-3">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full  tracking-wide cursor-pointer  text-left font-var"
                          :body="nft_minter">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+500 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                    </h4>
                    <p
                        class="mb-8 mt-2 text-[15px] font-0 dark:text-gray-300"
                    >
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full  tracking-wide cursor-pointer  text-left font-var"
                          :body="mint_nfts">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                    </p>

                    <div class="h-10 w-10 rounded-full bg-gradient-to-r from-primary via-accent mb-2 to-secondary group-hover:from-secondary group-hover:to-secondary p-[1px]">
                      <div class="flex h-full w-full rounded-full items-center justify-center text-accent bg-light dark:bg-foreground back">
                        <font-awesome-icon icon=" fa-light fa-arrow-right-long" />
                      </div>
                    </div>

                  </div>
                </div>
              </SpotlightCard2>
            </div>
          </transition>


        </div>

      </div>

    </div>





    <div>


      <!--    New Component Testing-->

      <!--    Trending Collection Section-->
      <section>

        <div class="mt-32 mx-auto container">

          <div>
            <div v-motion-slide-visible-bottom>
              <div
                  class="flex justify-between  items-center"
              >
                <div
                    class="flex items-center"
                >
                  <div>
                    <a href="#">
                      <h4 class="text-4xl dark:text-light font-2">Minting Now & Later</h4>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <transition name="bounce" mode="out-in">
              <div v-if="minting_to_show_now.length > 0" class="flex mt-10 flex-col">
                <Carousel ::items-to-show="1" :breakpoints="breakpoints"  class="z-10 flex flex-col">
                  <Slide v-for="(collection, idx) in minting_to_show_now" :key="idx" >

                    <BaseAsyncCollectionsMintingCard  :id="collection._id" :_image="collection.image" :tiers="collection.tiers" :_name="collection.name" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncCollectionsMintingCard>

                  </Slide>

                  <template #addons>
                    <Navigation />
                  </template>
                </Carousel>
              </div>
            </transition>

          </div>

        </div>

      </section>

      <!--    Main Stage Component -->

      <div id="sectionexplore">

        <div  class="mt-32 z-10 relative mb-24 container mx-auto">

          <section>

            <div class="w-full">

              <div class="flex w-full gap-8 flex-col">

                <!-- Tabs -->
                <div v-motion-slide-visible-bottom class="tabs flex text-left">
                  <a @click="changeTab('collections')" class="tab font-2 pl-0 text-2xl md:text-4xl  " :class="c_tab === 'collections' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Collections</a>
                  <a @click="changeTab('nfts')" class="tab font-2 text-2xl pl-0 md:text-4xl  " :class="c_tab === 'nfts' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">NFTs</a>
                  <a @click="[changeTab('activity'), switchView('list'), filtersOff()]" class="tab text-2xl font-2 md:text-4xl" :class="c_tab === 'activity' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Activity</a>
                  <!--                <a @click="[changeTab('users'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'users' ? 'tab-active text-accent dark:text-white' : ''">Users</a>-->
                </div>

                <!-- Small Screen Options Area -->
                <div class="relative gap-4 md:hidden flex">
                  <select class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                    <option disabled selected>Trending</option>
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
                        @change="[reset_counter(), fetchSearchResults()]"
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
                    <select class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                      <option disabled selected>Trending</option>
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

                      <div class="flex flex-col">

                        <div class="text-lg font-2">
                          Status
                        </div>

                        <select class="select mt-4 w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                          <option disabled selected>All</option>
                        </select>

                      </div>

<!--                      <div class="flex mt-12 flex-col">-->

<!--                        <div class="text-lg font-2">-->
<!--                          Price-->
<!--                        </div>-->

<!--                        <div class="flex mt-4 gap-4">-->
<!--                          <input type="text" placeholder="Min" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->

<!--                          <input type="text" placeholder="Max" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->
<!--                        </div>-->

<!--                      </div>-->

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

                        <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>
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

                        <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>
                      </div>
                    </transition>

                    <transition name="slide-fade">
                      <div v-if="listmode === true && c_tab === 'activity'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                        <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                          <tr>

                            <th scope="col" class="px-6 flex py-3">
                              #
                            </th>
                            <th scope="col" class="px-6 text-left py-3">
                              NFT
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Type
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Price
                            </th>
                            <th scope="col" class="px-6 py-3">
                              From
                            </th>
                            <th scope="col" class="pr-6 py-3 text-right">
                              To
                            </th>
                          </tr>
                          </thead>
                          <tbody>

                          <BaseAsyncActivityRow v-for="(nft, idx) in activities_to_show_now" :key="idx" :idx="idx" :id="nft.nftid ? nft.nftid : nft._id ? nft._id : nft"
                                                :sale_amount="nft.sale_amount" :seller="nft.seller" :buyer="nft.buyer"></BaseAsyncActivityRow>

                          </tbody>
                        </table>
                      </div>
                    </transition>

                    <transition name="slide-fade">
                      <div v-if="listmode === true && c_tab === 'users'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                        <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                          <tr>

                            <th scope="col" class="px-6 flex py-3">
                              User
                            </th>
                            <th scope="col" class="px-6 py-3">
                              NFTs
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Bids
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Followers
                            </th>
                            <th scope="col" class="pr-6 py-3 text-right">
                              Joined
                            </th>
                          </tr>
                          </thead>
                          <tbody>

                          <tr v-for="(g, idx) in 10" :key="idx" class="bg-white border-b-2 dark:border-b-foreground/60 dark:bg-dark  rounded-lg hover:bg-light  dark:hover:bg-foreground">

                            <th scope="row" class="flex items-center px-6 h-18 py-5 mr-10 md:mr:0 text-gray-900 whitespace-nowrap dark:text-white">
                              <div class="avatar h-16 w-16">
                                <div class="rounded-full">
                                  <img src="https://loremflickr.com/50/50" />
                                </div>
                              </div>
                              <div class="pl-6 text-sm md:text-lg">
                                <div class="text-base font-semibold">squiegee</div>
                              </div>
                            </th>
                            <td class="px-6 py-4 text-sm md:text-lg">
                              <span class="text-black dark:text-light font-2">123</span>
                            </td>
                            <td class="px-6 py-4 text-sm md:text-lg">
                              <span class="text-black dark:text-light font-2">12</span>
                            </td>
                            <td  class="px-6 py-4 items-center text-sm md:text-lg">
                              <span class="text-black dark:text-light font-2">1234</span>
                            </td>

                            <td class="px-6 py-4 text-right  text-sm md:text-lg rounded-r-lg">
                              <span class="text-black dark:text-light font-2">05/24/1986</span>
                            </td>
                          </tr>

                          </tbody>
                        </table>
                      </div>
                    </transition>

                    <!--            Grid Mode Displays-->

                    <!--            Grid Mode NFTs Tab -->
                    <transition name="slide-fade">
                      <div v-if="listmode === false && c_tab === 'collections'">

                        <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                          <BaseAsyncCollectionCard  v-for="(collection, idx) in collections_to_show_now" :key="idx" :id="collection._id ? collection._id : collection" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncCollectionCard>
                        </section>



                        <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>

                      </div>
                    </transition>

                    <!--            Grid Mode NFTs Tab -->
                    <transition name="slide-fade">
                      <div v-if="listmode === false && c_tab === 'nfts'">

                        <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                          <BaseAsyncNFTCard  v-for="(nft, idx) in nfts_to_show_now" :key="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : nft" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncNFTCard>
                        </section>



                        <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                          <InfiniteLoading class="flex" @infinite="loadData"/>
                          Loading More
                        </div>

                      </div>
                    </transition>

                    <!--            Grid Mode Users Tab -->
                    <section  v-if="listmode === false && c_tab === 'users'" :class="filters_active === true ? 'md:grid-cols-4' : 'md:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                      <BaseProfileCard v-for="(pc) in 12" :key="pc" id="id" image="https://loremflickr.com/520/340"></BaseProfileCard>
                    </section>

                  </div>

                </div>



              </div>


            </div>


          </section>


        </div>


      </div>

      <!--    END Main Stage Component -->




      <section>
        <div v-motion-pop-visible  class="hero justify-center flex">

          <div @click="clickExplore" class="px-8 cursor-pointer py-2.5 mt-12 h-14 flex items-center relative rounded-lg group font-medium text-white font-medium inline-block">
            <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
            <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
            <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
            <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
            <span class="relative font-2 text-2xl tracking-wide md:px-4">            Explore All Collections
            <font-awesome-icon icon=" fa-light fa-arrow-right-long" /></span>
          </div>




        </div>
      </section>

      <section class=" mx-auto container overflow-hidden mt-32">
        <div v-motion-slide-visible-bottom>
          <div
              class="flex justify-between  items-center"
          >
            <div
                class="flex items-center"
            >
              <div>
                <a href="#">
                  <h4 class="text-4xl dark:text-light font-2">Latest Activity</h4>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="ticker-wrapper mt-6   whitespace-nowrap max-w-full">
          <div class="motivo-ticker flex inline-block text-jacarta-400 uppercase">
            <div class="inline-block flex">

              <BaseAsyncActivityCard v-for="(nft, idx) in activities_to_show_now" :key="idx" :idx="idx" :id="nft.nftid ? nft.nftid : nft._id ? nft._id : nft" :sale_amount="nft.sale_amount" ></BaseAsyncActivityCard>
            </div>
            <div class="inline-block flex">

              <BaseAsyncActivityCard v-for="(nft, idx) in activities_to_show_now" :key="idx" :idx="idx" :id="nft.nftid ? nft.nftid : nft._id ? nft._id : nft" :sale_amount="nft.sale_amount"></BaseAsyncActivityCard>
            </div>
          </div>
        </div>
      </section>



      <!--    Trending Collection Section-->
      <section>

        <div class="mt-32 mx-auto container">

          <div>
            <div v-motion-slide-visible-bottom>
              <div
                  class="flex justify-between  items-center"
              >
                <div
                    class="flex items-center"
                >
                  <div>
                    <a href="#">
                      <h4 class="text-4xl dark:text-light font-2">Marmalade V2 Collections</h4>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex mt-10 flex-col">
              <Carousel ::items-to-show="1" :breakpoints="breakpoints" :wrap-around="true" class="z-10 flex flex-col">
                <Slide v-for="(collection, idx) in marmalade_collections_to_show_now" :key="idx" >

                  <BaseAsyncCollectionCard  :id="collection._id ? collection._id : collection" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncCollectionCard>

                </Slide>

                <template #addons>
                  <Navigation />
                </template>
              </Carousel>
            </div>
          </div>

        </div>

      </section>



      <section class="mt-32 mb-20">
        <div class="mt-20 container mx-auto">
          <div v-motion-slide-visible-bottom>
            <div
                class="flex justify-between  items-center"
            >
              <div
                  class="flex items-center"
              >
                <div>
                  <a href="#">
                    <h4 class="text-4xl dark:text-light font-2">Frequently Asked Questions</h4>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <hr class="h-px mb-2 mt-10 bg-white border-0 dark:bg-foreground">
          <div v-motion-slide-visible-once-bottom class="collapse collapse-plus dark:bg-dark">
            <input class="rotate-180 text-white/50 transition-transform duration-500" type="radio" name="my-accordion-3"  />
            <div class="collapse-title mt-4 mb-4 text-xl font-2">
              What is Kadenai?
            </div>
            <div class="collapse-content ">
              <p>Kadenai is a digital sanctuary for artists, collectors, and visionaries to unleash their imagination on the Kadena Blockchain.
                <br/><br/>We believe everyone should have the opportunity to participate in the NFT revolution on Kadena, and that's why we have designed a seamless platform that caters to all your needs- From buying and selling NFTs to creating your very own masterpieces, Kadenai offers an all-in-one solution. </p>
            </div>
          </div>
          <hr class="h-px mb-2 mt-2 bg-white border-0 dark:bg-foreground">
          <div v-motion-slide-visible-once-bottom class="collapse collapse-plus dark:bg-dark">
            <input type="radio" name="my-accordion-3"  />
            <div class="collapse-title mt-4 mb-4 text-xl font-2">
              How do I create an NFT?
            </div>
            <div class="collapse-content">
              <p>Check out the Kadenai NFT Minter tool to begin creating NFTs and NFT collections.</p>
            </div>
          </div>
          <hr class="h-px mb-2 mt-2 bg-white border-0 dark:bg-foreground">
          <div v-motion-slide-visible-once-bottom class="collapse collapse-plus dark:bg-dark">
            <input type="radio" name="my-accordion-3"  />
            <div class="collapse-title mt-4 mb-4 text-xl font-2">
              Does Kadenai cost anything to use?
            </div>
            <div class="collapse-content">
              <p>Kadenai charges no fees for buying, selling, or exploring the NFT Marketplace.</p>
              <br/>
              <p>Some tools, such as the Kadenai NFT Minter, require credits to function.</p>
            </div>
          </div>
          <hr class="h-px mb-2 mt-2 bg-white border-0 dark:bg-foreground">
          <div v-motion-slide-visible-once-bottom class="collapse collapse-plus dark:bg-dark">
            <input type="radio" name="my-accordion-3"  />
            <div class="collapse-title mt-4 mb-4 text-xl font-2">
              Does Kadenai have any plans for the future?
            </div>
            <div class="collapse-content">
              <div class="flex justify-center">
                <div class="container mx-auto w-full h-full">

                  <div class="relative wrap overflow-hidden p-10 h-full">
                    <img class="-rotate-90 absolute h-full top-0 left-[300px]" width="800px" height="500px" src="/images/roadmap.svg" />
<!--                    <div class="border-2-2 border-yellow-555 absolute h-full border"-->
<!--                         style="right: 50%; border: 2px solid #FFC100; border-radius: 1%;"></div>-->
<!--                    <div class="border-2-2 border-yellow-555 absolute h-full border"-->
<!--                         style="left: 50%; border: 2px solid #FFC100; border-radius: 1%;"></div>-->
                    <div class="mb-8 flex justify-between flex-row-reverse items-center w-full left-timeline">
                      <div class="order-1 w-5/12"></div>
                      <div class="order-1 w-5/12 px-1 py-4 text-right">
                        <p class="mb-3 text-base text-yellow-300"></p>
                        <h4 class="mb-3 font-bold text-lg md:text-2xl">Marketplace</h4>
                        <p class="text-sm md:text-base leading-snug dark:text-gray-50 text-opacity-100">
                          Build the first Marmalade V2 NFT Marketplace.
                        </p>
                      </div>
                    </div>
                    <div class="mb-8 flex justify-between items-center w-full right-timeline">
                      <div class="order-1 w-5/12"></div>
                      <div class="order-1  w-5/12 px-1 py-4 text-left">
                        <p class="mb-3 text-base text-yellow-300"></p>
                        <h4 class="mb-3 font-bold text-lg md:text-2xl">Features</h4>
                        <p class="text-sm md:text-base leading-snug dark:text-gray-50 text-opacity-100">
                          Create additional Marketplace features: NFT Auctions, Mass Minting, NFT Offers, User Profile Enhancements, NFT Explorer Enhancements, and more.
                        </p>
                      </div>
                    </div>
                    <div class="mb-8 flex justify-between flex-row-reverse items-center w-full left-timeline">
                      <div class="order-1 w-5/12"></div>
                      <div class="order-1 w-5/12 px-1 py-4 text-right">
                        <p class="mb-3 text-base text-yellow-300"></p>
                        <h4 class="mb-3 font-bold text-lg md:text-2xl">Tools</h4>
                        <p class="text-sm md:text-base leading-snug dark:text-gray-50 text-opacity-100">
                          AI NFT Creation / Assistant tools.
                        </p>
                      </div>
                    </div>

                    <div class="mb-8 flex justify-between items-center w-full right-timeline">
                      <div class="order-1 w-5/12"></div>

                      <div class="order-1  w-5/12 px-1 py-4">
                        <p class="mb-3 text-base text-yellow-300"></p>
                        <h4 class="mb-3 font-bold  text-lg md:text-2xl text-left">Token</h4>
                        <p class="text-sm md:text-base leading-snug dark:text-gray-50 text-opacity-100">
                          The Kadenai token powers the Kadenai ecosystem.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>





    </div>

  </section>

</template>
<style lang="scss" scoped>

.ddown:after {
  border-radius: inherit;
  z-index: 3;
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  box-shadow: 0 -28px 84px -24px rgba(62, 39, 72, 0.3) inset;
  background: radial-gradient(103.78% 100% at 50% 0%,
      rgba(205, 118, 255, 0) 80.55%, rgba(87, 58, 123, 0.04) 100%),
  radial-gradient(120.05% 100% at 50% 0%, rgba(64, 39, 88, 0) 33.78%, rgba(56, 36, 67, 0.08) 100%), rgba(243, 226, 255, 0.01);
}

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

.motivo-ticker {
  animation-name: motivo-ticker;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-duration: 60s;
}

.motivo-ticker:hover {
  animation-play-state: paused;
}

@keyframes motivo-ticker {
  0% {
    transform: translate3d(0%, 0, 0);
  }
  100% {
    transform: translate3d(-100%, 0, 0);
  }
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
    bottom: -120px;
    left: 0px;
    width: 100%;
    height: 50vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(255, 255, 255, 0)  0%, rgba(255, 255, 255, 0.5) 10%,  rgba(255, 255, 255, 0.8) 20%, rgb(255, 255, 255) 30%, rgb(255, 255, 255) 100%);
  }
}

.gallery_dark {
  display: flex;
  gap: 1vw;
  overflow: hidden;
  filter: opacity(20%);

  img{
    border-radius: 0.7rem;
  }

  &:after{
    position: absolute;
    bottom: -120px;
    left: 0px;
    width: 100%;
    height: 50vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(16, 3, 3, 0)  0%, rgba(19, 19, 26, 0.5) 10%, rgba(19, 19, 26, 0.8) 20%, rgb(19, 19, 26) 30%, rgb(19, 19, 26) 100%);
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
