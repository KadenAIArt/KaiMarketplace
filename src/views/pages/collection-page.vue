<script setup>
import {onMounted, ref, computed, reactive} from "vue";
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

let store = useStore();
let router = useRouter();

//Route props /collection/collectionid
const props = defineProps({
  collectionid: {
    type: String,
    default: "0"
  }
});

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

      // console.log(i);
      // console.log("FETCHING WITH LINK ->", link[i])

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
const total_items_nfts = ref(0);
const attributes_to_show_now = ref(null);
const nft_data = ref([]);
const nfts_and_metadata = ref([]);
const nft_images = ref([]);
const get_from = ref(0);
const get_to = ref(15);
const current_page = ref(1);
const total_pages = ref(1);
const search_for_sales = ref(false);
const is_currently_minting = ref(false);
const collection_image = ref('/images/kadenai_black.svg');
const is_unknown = ref(false);
const status = ref("all");

const medium = ref("")
const collection_data = ref({
  _id: props.collectionid,
  creator: null,
  guard: null,
  name: null,
  size: null,
  maxSize: null,
  image: null,
});


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

  await minting_getData();

  //Here we grab information about the collection the user is looking at
  if(props.collectionid !== "0"){

    const c_payload = {
      id: props.collectionid,
      page: 1
    }


    if(minting_to_show_now.value.length > 0){
      for(let k = 0; k < minting_to_show_now.value.length; k++){
        console.log( minting_to_show_now.value[k]._id);
        if(props.collectionid === minting_to_show_now.value[k]._id){
          console.log("THIS COLLECTION IS CURRENTLY MINTING")
          is_currently_minting.value = true;
          collection_image.value = minting_to_show_now.value[k].image;
        }
      }
    }


    //Get collection data
    let t_collection_data = await store.dispatch("accounts/getCollection", c_payload).then(async(res)=>{

      // console.log("COLLECTION DATA:");
      // console.log(res);

      if(res === 0 || res === '0'){
        is_unknown.value = true;
      }

      if(res.pagination){
        total_pages.value = res.pagination.pages;
        total_items_nfts.value = res.pagination.total;
      }

      //Lets get and set our collection data to be displayed on the page
      if(res.creator){collection_data.value.creator = res.creator;  medium.value = res.creator;}
      if(res.guard){collection_data.value.guard = res.guard}
      if(res.maxSize){collection_data.value.maxSize = res.maxSize}
      if(res.name){collection_data.value.name = res.name;}
      if(res.size){collection_data.value.size = res.size}
      if(res._id){collection_data.value._id = res._id}
      if(res.image){collection_data.value.image = res.image; collection_image.value = res.image;}
      if(res.pagination){total_pages.value = res.pagination.pages}

      //Set initial data to null, we will get this data from the NFTs using the loops below
      collection_data.value.floor_price = null;
      collection_data.value.listed = null;
      collection_data.value.supply = null;
      collection_data.value.owners = null;

      let attributeList = [];
      let attributeNames = [];

      // console.log("attributeSummary response")
      // console.log(res.attributeSummary);

      attributes_to_show_now.value = res.attributeSummary


      //Get images for a background banner and load some nfts
      //First we get 15 NFTs to be displayed on this page, and 15 images for the background banner
      let limit = 15;

      //Make sure our limit doesnt exceed the number of NFTs in this collection
      if(res.tokens){
        if(res.tokens.length === 0){
          is_unknown.value = true;
        }

        if(res.tokens.length > 15){
          limit = 15;
        }else{
          limit = res.tokens.length;
        }
      }

      //Empty the screen of NFTs
      nfts_to_show_now.value = [];

      //Record all NFTs in collection, we will parse all NFTs for stats shortly
      nft_data.value = res.tokens;

      //We now have total supply, lets display it to our user
      collection_data.value.supply = res.tokens.length;

      //Lets grab 15 NFTs to be immediately queued to be displayed on the users screen
      for(let i = 0; i < limit; i++){
        nfts_to_show_now.value.push(res.tokens[i]);
      }

      //Lets keep track and count up to 15 nfts
      let counter = 0;

      //We create a temporary object to store our nft in
      let t_nft = null;

      //Lets grab 15 images for the moving banner in the background from the NFTs with a loop
      for(let i = 0; i < res.tokens.length; i++){

        // console.log("LIMIT 15->", i);

        const nft_payload = {
          name: res.tokens[i].tokenId
        }

        //Lets grab a NFT's data from the API
        let t_nft_res = await timeout(10000, store.dispatch("accounts/getNFT", nft_payload)).then(async(nftres)=> {

          // console.log("NFT ->", i);
          // console.log(nftres)

          //We set our temporary NFT to our direct result from the API
          let t_nft = nftres;

          //Lets check if this NFT has an image to display
          if(nftres.image !== undefined){
            t_nft.image = nftres.image;
          }else if(nftres.image === undefined){

            //Lets go through the NFTs URI metadata for an image
            if(nftres.uri !== undefined){

              //lets check if we have ipfs or https metadata
              if(nftres.uri.length > 7){
                const checkme = nftres.uri.slice(0, 7);

                if(checkme === "ipfs://"){

                  // console.log("IPFS NFT METADATA");

                  try{

                    await fetchWithRetry(nftres.uri.slice(7)).then(async(res1)=> {

                      // console.log("RESPONSE:");
                      // console.log(res1);

                      //Check if this is an image or video type
                      let isimageipfs = await imageorvideo(res1.url);

                      console.log("imageorvideo check ->", isimageipfs)


                      let ipfs_json = await res1.json();
                      t_nft.metadata = ipfs_json;

                      //Check for image property in metadata
                      if(ipfs_json.image){

                        // console.log("IMAGE:");
                        // console.log(ipfs_json.image);

                        // t_nft.image = 'https://ipfs.io/ipfs/'+ipfs_json.image.slice(7);

                        t_nft.image = await determineImageLink(ipfs_json.image.slice(7));

                        // console.log("METADATA JSON:");
                        // console.log(ipfs_json);


                      }else{
                        // console.log(ipfs_json);
                        t_nft.image = null;
                      }

                      //Check for name/description properties
                      if(ipfs_json.name){t_nft.name = ipfs_json.name}
                      if(ipfs_json.description){t_nft.description = ipfs_json.description}



                    });


                  }catch(e){
                    console.log(e);
                  }

                }else if(checkme === "https:/"){

                  // console.log("HTTPS NFT METADATA");
                  //check if URI is an image or JSON metadata
                  let isimage = await imageorvideo(nftres.uri);

                  console.log("imageorvideo check ->", isimage);

                  try{
                    await timeout(10000, fetch(nftres.uri)).then(async(jsonres)=>{

                      // console.log("METADATA:");
                      // console.log(jsonres);

                      let new_json_test = await jsonres.json();
                      t_nft.metadata = new_json_test;

                      // console.log("METADATA JSON:");
                      // console.log(new_json_test);

                      //Check for image property within the json
                      if(new_json_test.image){

                        // console.log("IMAGE:");
                        t_nft.image = new_json_test.image;
                        // console.log(t_nft.image);

                      }else{
                        // console.log("CANT FIND NFT IMAGE for NFT# ->", i);
                        // console.log("NFT JSON");
                        // console.log(jsonres);
                        t_nft.image = null;
                      }

                      //Check for name/description properties within the metadata
                      if(new_json_test.name){t_nft.name = new_json_test.name}
                      if(new_json_test.description){t_nft.description = new_json_test.description}

                    })
                  }catch(e){
                    // console.log("CANT DETERMINE HOW TO HANDLE URI for NFT# ->", i);
                    // console.log(e);
                    t_nft.image = null;

                  }

                }
                // console.log("image ->", t_nft.image);

              }


            }

          }

          //Pick out a image for the collection icon at top of screen
          if(collection_data.value.image === null && t_nft.image !== undefined && t_nft.image !== null){ collection_data.value.image = t_nft.image}

          // console.log("GOING TO ADD IMAGE TO NFT");
          // console.log(t_nft.image);
          // console.log("counter", counter);
          //Add the nfts image to the list of random nft images we can display
          if(t_nft.image !== undefined && t_nft.image !== null && counter < limit){
            // console.log("ALSO ADDING NFT TO BACKGROUND")
            nft_images.value.push(t_nft.image);
          }

          //Lets store our new NFT in a list of parsed NFTs
          nfts_and_metadata.value.push(t_nft)


        });

        counter = counter + 1;
      }

      //We need atleast 15 images for our cool banner, lets do something to make sure we always have 15 images even when there are less than 15 images for us to use
      if(counter < 15){

        const remainder = 15 - counter;

        // console.log("NFTS REMAINING ->", remainder);
        // console.log("t_nft", t_nft);

        for(let i = (14 - remainder); i < 15; i++){
          nft_images.value[i] = nft_images.value[getRandomInt((15 - remainder))]
        }

      }

    });

  }else{
    is_unknown.value = true;
  }

  // console.log("FINAL NFTS AND METADATA ----------->");
  // console.log(nfts_and_metadata);

}

//Runs when page is first mounted to the screen (start up)
onMounted(async() => {

  //Lets set up this page!
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

  current_page.value = current_page.value + 1;

  if(current_page.value <= total_pages.value){

    if(searchQuery.value !== ''){
      fetchSearchResults()
    }else{
      await getData();
    }

  }

};


const getData = async() =>{

  if(props.collectionid !== "0"){

    const c_payload = {
      id: props.collectionid,
      page: current_page.value
    }

    //Get collection data
    let t_collection_data = await store.dispatch("accounts/getCollection", c_payload).then(async(res)=>{

      // console.log("COLLECTION DATA:");
      // console.log(res);

      //Lets get and set our collection data to be displayed on the page
      if(res.creator){collection_data.value.creator = res.creator}
      if(res.guard){collection_data.value.guard = res.guard}
      if(res.maxSize){collection_data.value.maxSize = res.maxSize}
      if(res.name){collection_data.value.name = res.name}
      if(res.size){collection_data.value.size = res.size}
      if(res._id){collection_data.value._id = res._id}
      if(res.image){collection_data.value.image = res.image}
      if(res.pagination){total_pages.value = res.pagination.pages}

      //Set initial data to null, we will get this data from the NFTs using the loops below
      collection_data.value.floor_price = null;
      collection_data.value.listed = null;
      collection_data.value.supply = null;
      collection_data.value.owners = null;

      //First we get 15 NFTs to be displayed on this page, and 15 images for the background banner
      let limit = 15;

      //Make sure our limit doesnt exceed the number of NFTs in this collection
      if(res.tokens){
        if(res.tokens.length > 15){
          limit = 15;
        }else{
          limit = res.tokens.length;
        }
      }


      //Record all NFTs in collection, we will parse all NFTs for stats shortly
      nft_data.value = [...nft_data.value, ...res.tokens];

      //We now have total supply, lets display it to our user
      collection_data.value.supply = res.tokens.length;

      //Lets grab 15 NFTs to be immediately queued to be displayed on the users screen
      for(let i = 0; i < limit; i++){
        nfts_to_show_now.value.push(res.tokens[i]);
      }
    });

  }

}


const queryClient = useQueryClient();
const searchQuery = ref('');
const searchCategory = ref('all');
const counter_page = ref(1);

const fetchSearchResults = () => {
  // Invalidate and refetch
  // console.log('fetchSearchResults called');
  if(current_page.value === 0){current_page.value = 1}

  if(searchQuery.value !== ''){
    searchResultsQuery.refetch();
  }else{
    nfts_to_show_now.value = [];
    getData();
  }
};

const attributeFilter = ref({});
const active_filters_list = ref([]);
const attributeFilter_r = reactive({});
const attributeFilter_c = {};

const setAttribute = (branch, attribute) =>{

  // console.log("setAttribute branch attribute add", branch, attribute)

  const t_filter_item = {
    name: branch,
    attribute: attribute
  }

  //First lets check if the branch exists, if not, lets create it and add the attribute to it
  // console.log("1. Checking if branch exists ->", branch);
  if(attributeFilter_c[branch] === undefined){
    // console.log("2. Branch dont exist");
    //Create the branch by turning it into an array
    attributeFilter_c[branch] = [];
    //Add the new attribute to the branch
    attributeFilter_c[branch].push(attribute);
    //Add the new filter to the filter list
    active_filters_list.value.push(t_filter_item);
  }else{
    // console.log("2. Branch exists");
    //If the branch exists, lets check if it contains the attribute, if not, this is a new attribute we should push into the branch
    // console.log("3. Checking if branch contains attribute ->", attribute);
    if(attributeFilter_c[branch].includes(attribute) === false){
      // console.log("4. Branch dont contain attribute");
      //Add the new attribute to the branch
      attributeFilter_c[branch].push(attribute);
      //Add the new filter to the filter list
      active_filters_list.value.push(t_filter_item);
    }else{
      // console.log("4. Branch contains attribute");
      //The branch and attribute already exists, we should remove this attribute from the branch array

      //Remove the filter from the branch
      // console.log("5. Removing attribute from branch");
      // console.log("attributeFilter_c[branch]");
      // console.log(attributeFilter_c[branch]);
      // console.log("attributeFilter_c[branch].length");
      // console.log(attributeFilter_c[branch].length);
      // console.log("searching through branch")
      for(let i = 0; i < attributeFilter_c[branch].length; i++){
        // console.log("i ->", i);
        // console.log("checking if branch/attribute is equal");
        // console.log("attributeFilter_c.branch[i]");
        // console.log(attributeFilter_c[branch][i]);
        if(attributeFilter_c[branch][i] === attribute){
          attributeFilter_c[branch].splice(i, 1);
        }
      }

      //Lets check if the branch is empty, if it is, lets delete it
      // console.log("6. Checking if branch is empty");
      // console.log("attributeFilter_c[branch].length");
      // console.log(attributeFilter_c[branch].length);
      if(attributeFilter_c[branch].length === 0){
        delete attributeFilter_c[branch];
      }

      // console.log("7. Removing query from active filter list", branch, attribute);
      //Finally, Remove the filter from the list of active filters
      for(let i = 0; i < active_filters_list.value.length; i++){
        if(active_filters_list.value.length > 0){
          if(active_filters_list.value[i].name === branch && active_filters_list.value[i].attribute === attribute){
            active_filters_list.value.splice(i, 1);
          }
        }
      }
    }

  }


  // console.log("attributeFilter");
  // console.log(attributeFilter_c);

  searchResultsQuery.refetch();

}

const getSearchResults = async () => {
  // console.log('getSearchResults called', searchQuery.value, searchCategory.value)

  nfts_to_show_now.value = [];

  let filter_object = attributeFilter_c;

  // console.log("FILTER OBJECT");
  // console.log(filter_object)

  // filter_object = {
  //   Territory: ['territory_11']
  // }

  // console.log("status.value");
  // console.log(status.value);

  const search_payload = {
    query: searchQuery.value,
    collection: collection_data.value._id,
    page: current_page.value,
    limit: 15,
    filter: filter_object,
    forsale: status.value === 'forsale' ? true : false
  }

  // console.log("search_payload");
  // console.log(search_payload);

  let results = [];

  let t_search_results = await store.dispatch("accounts/searchCollectionNFTs", search_payload).then((res)=>{
    // console.log("-----------------search results response!");
    // console.log(res);

    total_pages.value = res[0].pagination.pages;

    let t_new_nfts = res[0].nfts;

    total_items_nfts.value = res[0].pagination.total;

    results = res;

    //Push search results onto nft list being shown on screen
    nfts_to_show_now.value = t_new_nfts;
  });

  return results;
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


</script>
<template >

  <section>

    <!--  Medium + Screen Moving Banner-->
    <div :class="showDarkBG === false ? 'lighten' : 'darken '" class="z-1 darken hidden md:block pl-2 ">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark '" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">

          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
      </div>
    </div>

    <!--  Small + Screen Moving Banner-->
    <div class="z-1 md:hidden block">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]" style="width: 19vw;"/>
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
              <img v-if="is_currently_minting === false" :class="collection_data.image === undefined || collection_data.image === null ? 'skeleton' : ''"
                  class="mt-2 object-cover flex rounded-lg h-24 w-24" style="width: 100px !important; height: 100px;" height="100" width="100"  @error="$event.target.src = '/images/kadenai_black.svg'" :src="collection_data.image === undefined ? '/images/kadenai_black.svg' : collection_data.image === null ? '/images/kadenai_black.svg' : collection_data.image" alt="NFT image">
              <img v-if="is_currently_minting === true" :class="collection_image === null ? 'skeleton' : ''"
                   class="mt-2 object-cover flex rounded-lg h-24 w-24" style="width: 100px !important; height: 100px;" height="100" width="100"  @error="$event.target.src = '/images/kadenai_black.svg'" :src="collection_image" alt="NFT image">



              <div class="flex flex-col">
                <h1
                    :class="collection_data.name === undefined || collection_data.name === null ? 'skeleton' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  {{collection_data.name}}
                </h1>
                <p @click="clickCollection(collection_data.creator)" :class="collection_data.creator === undefined || collection_data.creator === null ? 'skeleton' : ''"
                    class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                   <MagneticText
                    v-slot="{ tokens }"
                    as="p"
                    class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                    :body="medium">
                     By:
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
              <div v-if="is_currently_minting === false" class="col-span-1">
                <img
                    :class="collection_data.image === undefined || collection_data.image === null ? 'skeleton' : ''"
                    class="mt-2 flex rounded-lg " height="100" width="100"  @error="$event.target.src = '/images/kadenai_black.svg'" :src="collection_data.image === undefined ? '/images/kadenai_black.svg' : collection_data.image === null ? '/images/kadenai_black.svg' : collection_data.image" alt="NFT image">
              </div>
              <div v-if="is_currently_minting === true" class="col-span-1">
                <img
                    :class="collection_image === null ? 'skeleton' : ''"
                    class="mt-2 flex rounded-lg " height="100" width="100"   :src="collection_image" alt="NFT image">
              </div>

              <div class="flex col-span-1 flex-col">
                <h1
                    :class="collection_data.name === undefined || collection_data.name === null ? 'skeleton' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  {{collection_data.name}}
                </h1>
                <p
                    :class="collection_data.creator === undefined || collection_data.creator === null ? 'skeleton' : ''"
                    class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  By: <span class="font-2 dark:text-light">{{collection_data.creator}}</span>
                </p>
              </div>
            </div>

            <!--            Collection Social Buttons-->
<!--            <div class="flex gap-5 mt-8">-->
<!--              <button class="btn text-2xl px-5 border-light bg-light dark:border-foreground dark:bg-foreground">𝕏</button>-->
<!--              <button class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-brands fa-discord" /></button>-->
<!--              <button class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-brands fa-telegram" /></button>-->
<!--              <button class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon=" fa-light fa-globe" /></button>-->
<!--            </div>-->

<!--            Description area-->
<!--            <div class="flex mt-8">-->
<!--              <p-->
<!--                  class="text-[15px] max-w-3xl font-0 dark:text-gray-300"-->
<!--              >-->
<!--                {{collection_data.description}}-->
<!--              </p>-->
<!--            </div>-->

            <!--            Collection Stats Area-->
            <div class="flex gap-20 mt-6">
              <div v-if="collection_data.floor_price !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                FLOOR PRICE
              </span>
                <span>
                <span class="font-2">{{collection_data.floor_price}}</span> <span class="text-neutral">KDA</span>
              </span>
              </div>

              <div v-if="collection_data.listed !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                LISTED
              </span>
                <span>
                <span class="font-2">{{collection_data.listed}}</span>
              </span>
              </div>

              <div v-if="collection_data.size !== null && collection_data.size > 0" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                SUPPLY
              </span>
                <span>
                <span class="font-2">{{collection_data.size}}</span>
              </span>
              </div>

              <div v-if="collection_data.owners !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                OWNERS
              </span>
                <span>
                <span class="font-2">{{collection_data.owners}}</span>
              </span>
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

              <div class="flex w-full gap-8 flex-col">

                <!-- Tabs -->
                <div class="tabs flex text-left">
                  <a @click="changeTab('nfts')" class="tab font-2 text-2xl pl-0 md:text-4xl  " :class="c_tab === 'nfts' ? 'tab-active  text-accent dark:text-white' : ''">NFTs
                    <div v-if="total_items_nfts - nfts_to_show_now.length > 0 && c_tab === 'nfts'" class="badge -mt-2 badge-primary text-sm text-white gap-2">
                      + {{total_items_nfts - nfts_to_show_now.length}}
                    </div>
                  </a>
                  <a @click="[changeTab('activity'), switchView('list'), filtersOff()]" class="tab font-2 text-2xl md:text-4xl" :class="c_tab === 'activity' ? 'tab-active text-accent dark:text-white' : ''">Activity</a>
                  <!--                <a @click="[changeTab('users'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'users' ? 'tab-active text-accent dark:text-white' : ''">Users</a>-->
                </div>

                <!-- Small Screen Options Area -->
                <div class="relative gap-4 md:hidden flex">
                  <select @change="getSearchResults" v-model="status"  class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                    <option value="all" selected>All</option>
                    <option value="forsale">For Sale</option>
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
                    <select @change="getSearchResults" v-model="status" class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                      <option value="all" selected>All</option>
                      <option value="forsale">For Sale</option>
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

<!--                      <div class="flex flex-col">-->

<!--                        <div class="text-lg font-2">-->
<!--                          Status-->
<!--                        </div>-->

<!--                        <select @change="getSearchResults" v-model="status" class="select mt-4 w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">-->
<!--                          <option value="all" selected>All</option>-->
<!--                          <option value="forsale">For Sale</option>-->
<!--                        </select>-->

<!--                      </div>-->

                      <!--                    <div class="flex mt-12 flex-col">-->

                      <!--                      <div class="text-lg font-2">-->
                      <!--                        Price-->
                      <!--                      </div>-->

                      <!--                      <div class="flex mt-4 gap-4">-->
                      <!--                        <input type="text" placeholder="Min" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->

                      <!--                        <input type="text" placeholder="Max" class="input bg-light dark:bg-foreground w-full max-w-xs" />-->
                      <!--                      </div>-->

                      <!--                    </div>-->


                      <div v-if="attributes_to_show_now !== null" class="flex mt-12 flex-col">

                        <div class="text-lg mb-4 font-2">
                          Properties
                        </div>

                        <section v-for="(value, branch, idx) in attributes_to_show_now" :key="idx">

                          <Disclosure v-slot="{ open }">
                            <DisclosureButton
                                class="flex w-full justify-between h-14 border-b-neutral/10 border-b-2 px-4 py-4 text-left focus:outline-none focus-visible:ring "
                            >
                              <span class="font-2">{{branch}}</span>
                              <font-awesome-icon icon=" fa-light fa-xmark" :class="open ? 'rotate-90 duration-500 ' : 'rotate-360 duration-500'"
                                                 class="h-5 w-5 rotate-45 dark:text-white" />
                            </DisclosureButton>
                            <transition name="bounce">
                              <DisclosurePanel class="pt-4 mb-8 pb-2 text-sm border-b-neutral/20 border-b-2 text-gray-500">

<!--                                <div class="relative mt-4 flex text-neutral search-bar flex-grow">-->

<!--                                  <input-->
<!--                                      class="bg-light_foreground  dark:bg-foreground border-transparent placeholder-neutral h-12 px-5 rounded-lg  text-sm focus:outline-none flex-grow"-->
<!--                                      type="search"-->
<!--                                      name="search"-->
<!--                                      placeholder="Search"-->
<!--                                  />-->
<!--                                  <button-->
<!--                                      role="button"-->
<!--                                      class="absolute right-4 top-1 mt-2  focus:outline-none"-->
<!--                                      type="submit"-->
<!--                                  >-->
<!--                                    <font-awesome-icon icon=" fa-light fa-magnifying-glass" />-->
<!--                                  </button>-->
<!--                                </div>-->



                                <div class=" mt-10 flex-col justify-center">

                                  <div v-for="(attribute, index) in value" :key="index" class="flex mb-3 justify-between">
                                    <div class="flex dark:text-light font-1 text-sm gap-2">
                                      <input @change="setAttribute(branch, index)"  type="checkbox"  class="checkbox checkbox-accent" />
                                      {{index}}
                                    </div>
                                    <div class="font-2 text-sm dark:text-neutral">
                                      {{attribute}}
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
                      <div v-if="listmode === true && c_tab === 'nfts'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                        <div v-if="total_items_nfts - nfts_to_show_now.length > 0" class="badge badge-primary text-sm text-white gap-2">
                          Showing {{nfts_to_show_now.length}} NFTs
                        </div>
                        <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                          <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                          <tr>

                            <th scope="col" class="px-6 flex py-3">
                              #
                            </th>
                            <th scope="col" class="px-6 py-3">
                              NFT
                            </th>
                            <th scope="col" class="px-6 py-3">
                              Current Price
                            </th>
                            <!--                          <th scope="col" class="px-6 py-3">-->
                            <!--                            Highest Bid-->
                            <!--                          </th>-->
                            <!--                          <th scope="col" class="px-6 py-3">-->
                            <!--                            Last Sale-->
                            <!--                          </th>-->
                            <th scope="col" class="pr-6 py-3 text-right">
                              Owner
                            </th>
                          </tr>
                          </thead>
                          <tbody>

                          <BaseAsyncNFTRow v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : null"></BaseAsyncNFTRow>

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

                          <BaseAsyncActivityRow v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : null"></BaseAsyncActivityRow>

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
                      <div v-if="listmode === false && c_tab === 'nfts'">

                        <section v-if="nfts_to_show_now !== null">
                          <div v-if="total_items_nfts - nfts_to_show_now.length > 0" class="badge badge-primary text-sm text-white gap-2">
                            Showing {{nfts_to_show_now.length}} NFTs
                          </div>

                          <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                            <BaseAsyncNFTCard  v-for="(nft, idx) in nfts_to_show_now" :key="idx" :id="nft.tokenId ? nft.tokenId : nft._id ? nft._id : null" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncNFTCard>
                          </section>



                          <section v-if="nfts_to_show_now.length > 0">
                            <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                              <InfiniteLoading class="flex" @infinite="loadData"/>
                              Loading More
                            </div>
                          </section>
                        </section>



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
