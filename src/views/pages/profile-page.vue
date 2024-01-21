<script setup>
import {onMounted, ref, computed} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import BaseAsyncNFTCard from "@/components/Base/BaseAsyncNFTCard.vue";
import BaseAsyncCollectionCard from "@/components/Base/BaseAsyncCollectionCard.vue";
import BaseAsyncNFTRow from "@/components/Base/BaseAsyncNFTRow.vue";
import BaseNFTRow from "@/components/Base/BaseNFTRow.vue";
import BaseAsyncActivityRow from "@/components/Base/BaseAsyncActivityRow.vue";
import Avatar from "vue-boring-avatars";
import {Disclosure, DisclosureButton, DisclosurePanel} from "@headlessui/vue";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import BaseProfileCard from "@/components/Base/BaseProfileCard.vue";
import { useQueryClient, useQuery } from '@tanstack/vue-query';
import axios from "axios";
import BaseAsyncCollectionRow from "@/components/Base/BaseAsyncCollectionRow.vue";
import BaseNFTCard from "@/components/Base/BaseNFTCard.vue";

let store = useStore();
let router = useRouter();

//Route props /collection/userid
const props = defineProps({
  userid: {
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

//Checks links with different endpoints
async function fetchWithRetry(hash) {
  const link = [];
  link.push('https://kai.infura-ipfs.io/ipfs/');
  link.push('https://kadenai.mypinata.cloud/ipfs/');
  link.push('https://ipfs.io/ipfs/');

  for (let i = 0; i < link.length-1; i++) {
    try {

      const response = await timeout(5000, fetch(link[i]+hash));

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
  link.push('https://kadenai.mypinata.cloud/ipfs/');
  link.push('https://ipfs.io/ipfs/');

  for (let i = 0; i < link.length-1; i++) {
    try {
      const response = await timeout(5000, fetch(link[i]+hash));
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
const unrevealed_nfts_to_show_now = ref([]);
const collections_to_show_now = ref([]);
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
const total_items_nfts = ref(0);
const total_items_collections = ref(0);
const profile_image = ref(null);
const profile_account = ref(null);
const profile_name = ref("User");
const profile_bio = ref(null);
const profile_nfts = ref(null);
const profile_listed = ref(null);
const profile_collections = ref(null);
const profile_followers = ref(null);
const profile_discord = ref(null);
const profile_twitter = ref(null);
const is_unknown = ref(false);
const wallet_type = ref(null);
const is_updating = ref(false);

const collection_data = ref({
  _id: props.userid,
  creator: null,
  guard: null,
  name: null,
  size: null,
  maxSize: null,
  image: null,
});

//Runs when page is first mounted to the screen (start up)
onMounted(async() => {

  //Lets set up this page!
  //Here we grab information about the user
  if(props.userid !== "0"){

    await fetchUserProfile();

    await fetchUserData();



    let t_xwallet = localStorage.getItem("kai_isUsingXwallet");
    let t_wallet_connect = localStorage.getItem("kai_isUsingWalletConnect");

    if(t_xwallet === 'true' || t_xwallet === true){
      wallet_type.value = 'ecko';
    }else if(t_wallet_connect === 'true' || t_wallet_connect === true){
      wallet_type.value = 'wc'
    }else{
      wallet_type.value = 'zel'
    }


    // await getNGNFTs();

  }else{
    is_unknown.value = true;
  }


  //Set loading to false
  loading.value = false;

});

const fetchUserProfile = async() =>{


  let t_profile = await store.dispatch("accounts/getUserSqlData").then((res)=>{

    // console.log("PROFILE RESPONSE");
    // console.log(res);

    if(res.name !== undefined){
      profile_name.value = res.name;
    }

    if(res.description !== undefined){
      profile_bio.value = res.description;
    }

    if(res.twitter !== undefined){
      profile_twitter.value = res.twitter;
    }

    if(res.discord !== undefined){
      profile_discord.value = res.discord;
    }

  })

}

const clickUpdateProfile = async() =>{

  is_updating.value = true;

  const profile_payload = {
    name: profile_name.value,
    description: profile_bio.value,
    twitter: profile_twitter.value,
    discord: profile_discord.value
  }

  let t_update_profile = await store.dispatch("accounts/setUserSqlData", profile_payload);

}

const fetchUserData = async() =>{

  profile_name.value = "User"
  profile_account.value = props.userid;

  const user_payload = {
    name: props.userid,
    page: current_page.value,
    limit: 15,
    sales: false
  }

  try{
    let t_user_data = await store.dispatch("accounts/getUserNFTs", user_payload).then((res)=>{

      // console.log("GET USER NFTS RES");
      // console.log(res);

      if(res === 0){
        is_unknown.value = true;
      }

      if(res !== undefined && res !== null && res !== 0){
        nfts_to_show_now.value = res.data;
        profile_nfts.value = res.data.length;

        let t_collections = [];
        t_collections = collections_to_show_now.value;

        for(let i = 0; i < res.data.length; i++){
          if(res.data[i].collection !== undefined && res.data[i].collection !== null){
            if(t_collections.includes(res.data[i].collection.collectionId) === false){
              t_collections.push(res.data[i].collection.collectionId);
            }
          }
        }
        collections_to_show_now.value = t_collections;

        if(res.pagination){
          total_pages.value = res.pagination.pages;
          total_items_nfts.value = res.pagination.total;
        }
      }

    });

  }catch(e){
    console.log(e);
    is_unknown.value = true;
  }

  const unrevealed_payload = {
    name: props.userid,
    chain: "8"
  }

  let t_unrevealed_data = await store.dispatch("accounts/getUnrevealedNFTs_chain", unrevealed_payload).then((res)=>{

    // console.log("UNREVEALED RES");
    // console.log(res);

    if(res !== undefined && res !== 0){
      let t_u_nfts = res[0];

      for(let i = 0; i < t_u_nfts.length; i++){

        if(t_u_nfts[i].revealed !== undefined && t_u_nfts[i].revealed !== false){
          unrevealed_nfts_to_show_now.value.push(t_u_nfts[i])
        }

      }

    }


  })

  let counter = 0;
  let limit = 15;

  for(let i = 0; i < nfts_to_show_now.value.length; i++){

    const nft_payload = {
      name: nfts_to_show_now.value[i].nftid
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

              try{

                await fetchWithRetry(nftres.uri.slice(7)).then(async(res1)=> {

                  // console.log("RESPONSE:");
                  // console.log(res1);

                  //Check if this is an image or video type
                  let isimageipfs = await imageorvideo(res1.url);

                  let ipfs_json = await res1.json();
                  t_nft.metadata = ipfs_json;

                  //Check for image property in metadata
                  if(ipfs_json.image){

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

              // console.log("imageorvideo check ->", isimage);

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

                    t_nft.image = new_json_test.image;

                  }else{
                    console.log("CANT FIND NFT IMAGE for NFT# ->", i);
                    console.log("NFT JSON");
                    console.log(jsonres);
                    t_nft.image = null;
                  }

                  //Check for name/description properties within the metadata
                  if(new_json_test.name){t_nft.name = new_json_test.name}
                  if(new_json_test.description){t_nft.description = new_json_test.description}

                })
              }catch(e){
                console.log("CANT DETERMINE HOW TO HANDLE URI for NFT# ->", i);
                console.log(e);
                t_nft.image = null;

              }

            }
            console.log("image ->", t_nft.image);

          }


        }

      }


      //Add the nfts image to the list of random nft images we can display
      if(t_nft.image !== undefined && t_nft.image !== null && counter < limit){
        nft_images.value.push(t_nft.image);
      }

      //Lets store our new NFT in a list of parsed NFTs
      nfts_and_metadata.value.push(t_nft)


    });

    counter = counter + 1;
  }

  //Some people own less than 15 nfts, lets come up with images for those people
  if(counter < 15){

    const remainder = 15 - counter;

    for(let i = (14 - remainder); i < 15; i++){
      nft_images.value[i] = nft_images.value[getRandomInt((15 - remainder))]
    }

  }

}


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
const nfts_sort_status = ref('all');
const showUnrevealedNFTs = ref(true);
const showNFTs = ref(true);

const changeSortStatus = () =>{

  // console.log("nfts_sort_status");
  // console.log(nfts_sort_status.value);

  if(nfts_sort_status.value === 'all'){
    showUnrevealedNFTs.value = true;
    showNFTs.value = true;
  }

  if(nfts_sort_status.value === 'unrevealed'){
    showNFTs.value = false;
    showUnrevealedNFTs.value = true;
  }

}

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

  if(current_page_collections.value <= total_pages_collections.value){
    current_page_collections.value = current_page_collections.value + 1;
  }

  current_page.value = current_page.value + 1;

  if(current_page.value <= total_pages.value){

    if(searchQuery.value !== ''){
      fetchSearchResults()
    }else{
      await getData();
    }

  }

};

const getNGNFTs = async()=>{

  const user_payload = {
    name: props.userid,
  }

  try{
    let t_user_data = await store.dispatch("accounts/getAllNfts_mng", user_payload).then((res)=> {

      console.log("GET USER NG NFTS RES");
      console.log(res);
    });
  }catch(e){
    console.log(e);
  }

}

const getData = async() =>{

  if(props.userid !== "0"){

    const user_payload = {
      name: props.userid,
      page: current_page.value,
      limit: 15,
      sales: false
    }

    try{
      let t_user_data = await store.dispatch("accounts/getUserNFTs", user_payload).then((res)=>{

        console.log("GET USER NFTS RES");
        console.log(res);

        if(res === 0){
          is_unknown.value = true;
        }

        if(res !== undefined && res !== null && res !== 0){

          if(res.pagination){
            total_pages.value = res.pagination.pages;
            total_items_nfts.value = res.pagination.total;
          }

          profile_nfts.value = res.data.length;

          let t_collections = [];
          t_collections = collections_to_show_now.value;

          for(let i = 0; i < res.data.length; i++){
            if(res.data[i].collection !== undefined && res.data[i].collection !== null){
              if(t_collections.includes(res.data[i].collection.collectionId) === false){
                t_collections.push(res.data[i].collection.collectionId);
              }
            }

            nfts_to_show_now.value.push(res.data[i])
          }
          collections_to_show_now.value = t_collections;

        }

      });

    }catch(e){
      console.log(e);
      is_unknown.value = true;
    }

  }

}


const queryClient = useQueryClient();
const searchQuery = ref('');
const searchCategory = ref('all');
const counter_page = ref(1);

const fetchSearchResults = () => {
  // Invalidate and refetch
  console.log('fetchSearchResults called');
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

const setAttribute = (branch, attribute, add) =>{

  console.log("setAttribute branch attribute add", branch, attribute, add)

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

  console.log("attributeFilter");
  console.log(attributeFilter.value);

  searchResultsQuery.refetch();

}

const getSearchResults = async () => {
  console.log('getSearchResults called', searchQuery.value, searchCategory.value)

  nfts_to_show_now.value = [];

  const search_payload = {
    query: searchQuery.value,
    collection: collection_data.value._id,
    page: current_page.value,
    limit: 15,
    filter: attributeFilter.value
  }

  console.log("search_payload");
  console.log(search_payload);

  let results = [];

  let t_search_results = await store.dispatch("accounts/searchCollectionNFTs", search_payload).then((res)=>{
    console.log("-----------------search results response!");
    console.log(res);

    total_pages.value = res[0].pagination.pages;

    let t_new_nfts = res[0].nfts;
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

//Get random int
const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
}

//    await fetchUserData();
//Watches for new polling transactions and shows modal
store.watch((state, getters) => getters["accounts/getTransactionPolling"], async(val) => {

  console.log("Refreshing data");

  current_page.value = 1;
  current_page_collections.value = 1;

  let fet_ch = setTimeout(async()=> {
    await fetchUserData();
  }, 10000);

  await fetchUserData();

})

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
              <Avatar
                  :size="100"
                  variant="beam"
                  :name="props.userid.slice(0,20)"
                  :colors='["#4800F9", "#DE00EC", "#7500f3", "#9e00f9", "#DE00EC"]'
              />
<!--              <img :class="profile_image === undefined || profile_image === null ? 'skeleton' : ''"-->
<!--                   class="mt-2 object-cover flex rounded-lg h-24 w-24" style="width: 100px !important; height: 100px;" height="100" width="100"  @error="$event.target.src = '/images/kadenai_black.svg'" :src="profile_image === undefined ? '/images/kadenai_black.svg' : profile_image === null ? '/images/kadenai_black.svg' : profile_image" alt="NFT image">-->
<!--             -->
              <div class="flex flex-col">
                <h1 v-motion-pop
                    :class="profile_name === undefined || profile_name === null ? 'skeleton h-10 w-20' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black break-all tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  {{profile_name === 'User' ? props.userid.slice(0,20) : profile_name}}{{profile_name === 'User' ? "..." : ''}}
                </h1>
                <p v-motion-roll-left :class="profile_account === undefined || profile_account === null ? 'skeleton h-5 w-96' : ''"
                   class="opacity-70 mt-2 break-all font-1 text-black dark:text-light_grey">
                  <span class="font-2 dark:text-light">{{profile_account}}</span>
                </p>
              </div>
            </div>


            <!--            Small Screen Collection Info Area-->
            <div class="md:hidden grid grid-cols-1 w-full gap-4">
              <div class="col-span-1">
                <Avatar
                    :size="100"
                    variant="beam"
                    class="rounded-full"
                    :name="props.userid.slice(0,20)"
                    :colors='["#4800F9", "#DE00EC", "#7500f3", "#9e00f9", "#DE00EC"]'
                />     </div>
              <div class="flex col-span-1 flex-col">
                <h1 v-motion-pop
                    v-if="profile_name !== 'User'"
                    :class="profile_name === undefined || profile_name === null ? 'skeleton h-10 w-20' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  {{profile_name}}
                </h1>
                <p v-motion-roll-left
                    :class="profile_account === undefined || profile_account === null ? 'skeleton' : ''"
                    class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  <span class="font-2 break-all dark:text-light">{{profile_account}}</span>
                </p>
              </div>
            </div>



            <div class="flex gap-5 mt-8">
              <button v-if="profile_twitter" class="btn text-2xl px-5 border-light bg-light dark:border-foreground dark:bg-foreground">𝕏 {{profile_twitter}}</button>
              <button v-if="profile_discord" class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-brands fa-discord" /> {{profile_discord}}</button>
<!--              <button class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-brands fa-telegram" /></button>-->
<!--              <button class="btn text-xl bg-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon=" fa-light fa-globe" /></button>-->
            </div>

            <div v-if="profile_bio" class="flex flex-col mt-8">
              <p
                  :class="profile_bio === undefined || profile_bio === null ? 'skeleton h-5 w-96' : ''"
                  class="text-[15px] max-w-3xl font-0 dark:text-gray-300"
              >
                {{ profile_bio === null ? " " : profile_bio.slice(0,20) }}
              </p>
              <p
                  :class="profile_bio === undefined || profile_bio === null ? 'skeleton h-5 w-96' : ''"
                  class="text-[15px] max-w-3xl mt-2 font-0 dark:text-gray-300"
              >
                {{ profile_bio === null ? " " : "" }}
              </p>
              <p
                  :class="profile_bio === undefined || profile_bio === null ? 'skeleton h-5 w-96' : ''"
                  class="text-[15px] max-w-3xl mt-2 font-0 dark:text-gray-300"
              >
                {{ profile_bio === null ? " " : "" }}
              </p>

            </div>

            <!--            Collection Stats Area-->
            <div class="flex gap-20 mt-6">
              <div v-if="profile_nfts !== null && profile_nfts > 0" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                NFTS
              </span>
                <span>
                <span class="font-2">{{profile_nfts + unrevealed_nfts_to_show_now.length}}</span>
              </span>
              </div>

              <div v-if="profile_listed !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                LISTED
              </span>
                <span>
                <span class="font-2">{{profile_listed}}</span>
              </span>
              </div>

              <div v-if="profile_collections !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                COLLECTIONS
              </span>
                <span>
                <span class="font-2">{{profile_collections}}</span>
              </span>
              </div>

              <div v-if="profile_followers !== null" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                FOLLOWERS
              </span>
                <span>
                <span class="font-2">{{profile_followers}}</span>
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
                <a @click="changeTab('nfts')" class="tab font-2 pl-0 md:text-4xl  " :class="c_tab === 'nfts' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">NFTs
                  <div v-if="total_items_nfts - nfts_to_show_now.length > 0" class="badge -mt-2 badge-primary text-sm text-white gap-2">
                    + {{total_items_nfts - nfts_to_show_now.length}}
                  </div>
                </a>
                <a @click="[changeTab('collections'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'collections' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Collections</a>

<!--                <a @click="[changeTab('activity'), switchView('list'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'activity' ? 'tab-active text-accent dark:text-white' : ''">Activity</a>-->

                <!--                <a @click="[changeTab('favorites')]" class="tab font-2 md:text-4xl" :class="c_tab === 'favorites' ? 'tab-active text-accent dark:text-white' : ''">Favorites</a>-->
                <a v-if="account === props.userid" @click="[changeTab('settings'), switchView('list'), filtersOff()]" class="tab font-2 md:text-4xl" :class="c_tab === 'settings' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Settings</a>
              </div>

              <!-- Small Screen Options Area -->
              <div class="relative gap-4 md:hidden flex">
                <select class="select w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                  <option disabled selected>Trending</option>
                </select>

                <!-- Small List View Toggle -->
                <button @click="switchView('list')" :class="listmode === true ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0"><font-awesome-icon icon=" fa-light fa-list" /></button>
                <!-- Small Grid View Toggle -->
                <button :disabled="c_tab === 'activity' || c_tab === 'settings'" @click="switchView('grid')" :class="listmode === false ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0 "><font-awesome-icon icon=" fa-light fa-grid-2" /></button>

              </div>

              <!-- Large Screen Options Area -->
              <div class="flex gap-4">
                <div  v-if="c_tab !== 'settings'" class="relative flex text-neutral search-bar flex-grow">
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
                <div v-if="c_tab !== 'settings'" class="relative gap-4 hidden md:flex">


                  <!-- Large List View Button -->
                  <button @click="switchView('list')" :class="listmode === true ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0"><font-awesome-icon icon=" fa-light fa-list" /></button>
                  <!-- Large Grid View Button -->
                  <button :disabled="c_tab === 'activity'" @click="switchView('grid')" :class="listmode === false ? 'bg-gradient-to-tr from-primary to-secondary text-white' : 'dark:bg-foreground'" class="btn bg-light dark:bg-foreground border-0 "><font-awesome-icon icon=" fa-light fa-grid-2" /></button>

                </div>

              </div>

              <div class="grid gap-6 grid-cols-6">

                <!--           NFT Sidebar Filters Area -->
                <transition name="slide-fade">
                  <div v-if="filters_active" class="hidden md:block col-span-1">

                    <div class="flex flex-col">

                      <div class="text-lg font-2">
                        Status
                      </div>

                      <select @change="changeSortStatus()" v-model="nfts_sort_status" class="select mt-4 w-full bg-light_foreground dark:bg-foreground border-transparent placeholder-neutral rounded-lg text-sm focus:outline-none">
                        <option value="all" selected>All</option>
                        <option value="unrevealed">Unrevealed</option>
                      </select>

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

                      <div class="text-lg font-2">
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

                <!--           Settings Sidebar Area -->
                <transition name="slide-fade">
                  <div v-if="c_tab === 'settings'" class="hidden md:block col-span-1">

                    <div class="text-lg font-2">
                      Settings
                    </div>

                    <a href="#wallet">
                    <div class="flex mt-8 border-b-2 py-4 group cursor-pointer dark:border-b-foreground/60 justify-between">

                      <a href="#wallet">
                        <div class="group-active:text-accent group-hover:text-secondary">
                          Wallet
                        </div>
                      </a>

                      <a href="#wallet">
                      <div class="group-active:text-accent group-hover:text-secondary">
                        <font-awesome-icon icon="fa-light fa-arrow-right-long" />
                      </div>
                      </a>

                    </div>
                    </a>

                    <a href="#profile">
                    <div class="flex mt-0 border-b-2 py-4 group cursor-pointer dark:border-b-foreground/60 justify-between">
                      <div class="group-active:text-accent group-hover:text-secondary">
                        Profile
                      </div>
                      <div class="group-active:text-accent group-hover:text-secondary">
                        <font-awesome-icon icon="fa-light fa-arrow-right-long" />
                      </div>
                    </div>
                    </a>

<!--                    <div class="flex mt-0 border-b-2 py-4 group cursor-pointer dark:border-b-foreground/60 justify-between">-->
<!--                      <div class="group-active:text-accent group-hover:text-secondary">-->
<!--                        Notifications-->
<!--                      </div>-->
<!--                      <div class="group-active:text-accent group-hover:text-secondary">-->
<!--                        <font-awesome-icon icon="fa-light fa-arrow-right-long" />-->
<!--                      </div>-->
<!--                    </div>-->

                  </div>
                </transition>

                <div :class="filters_active === true || c_tab === 'settings' ? 'col-span-6 md:col-span-5' : 'col-span-6'">

                  <!--            Filter Button Display Area-->
                  <transition name="slide-fade">
                    <div v-if="active_filters_list.length > 0" class="flex text-lg items-center justify-start font-2 mb-4 gap-4">
                      Filters:
                      <button @click="setAttribute(filter.name, filter.attribute, false)" v-for="(filter, index) in active_filters_list" :key="index" class="btn bg-light dark:border-foreground dark:bg-foreground btn-sm">{{filter.name}} : {{filter.attribute}}    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                  </transition>


                  <!--            List Mode Displays-->

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


                        <BaseAsyncNFTRow  v-if="showNFTs === true" v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx" :id="nft.nftid ? nft.nftid : null"></BaseAsyncNFTRow>

                          <BaseNFTRow v-if="unrevealed_nfts_to_show_now.length > 0 && showUnrevealedNFTs === true" v-for="(nft,idx) in unrevealed_nfts_to_show_now" :idx="idx+nfts_to_show_now.length" image="/images/unrevealed.svg" :id="nft['token-id'] ? nft['token-id'].int : null" :name="nft['token-id'] ? 'Unrevealed #'+nft['token-id'].int : null" :owner="props.userid" :collection="nft['collection'] ? nft['collection'] : null"></BaseNFTRow>

                        </tbody>
                      </table>

                      <div v-if="nfts_to_show_now.length === 0" class="min-h-[500px] text-6xl text-gray-500/30 hero">

                        No nfts found!

                      </div>

                      <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
                        <InfiniteLoading class="flex" @infinite="loadData"/>
                        Loading More
                      </div>
                    </div>
                  </transition>

                  <transition name="slide-fade">
                    <div v-if="listmode === true && c_tab === 'collections'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                      <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                        <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                        <tr>

                          <th scope="col" class="px-6 flex py-3">
                            #
                          </th>
                          <th scope="col" class="px-6 text-start py-3">
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

                      <div v-if="collections_to_show_now.length === 0" class="min-h-[500px] text-6xl text-gray-500/30 hero">

                        No collections found!

                      </div>

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

                        <BaseAsyncActivityRow v-for="(nft, idx) in nfts_to_show_now" :key="idx" :idx="idx" :id="nft.nftid ? nft.nftid : nft.tokenId ? nft.tokenId : nft._id ? nft._id : nft._id " :sale_amount="nft.sale_amount" :seller="nft.seller" :buyer="nft.buyer"></BaseAsyncActivityRow>

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

                      <div class="badge badge-primary text-sm text-white gap-2">
                        Showing {{nfts_to_show_now.length}} NFTs
                      </div>

                      <transition name="slide-fade" mode="out-in">
                        <div v-if="nfts_to_show_now.length === 0" class="min-h-[500px] text-6xl text-gray-500/30 hero">

                          No nfts found!

                        </div>
                      </transition>

                      <section v-if="showNFTs === true" :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                        <BaseAsyncNFTCard  v-for="(nft, idx) in nfts_to_show_now" :key="idx" :id="nft.nftid ? nft.nftid : nft._id ? nft._id : null" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncNFTCard>
                      </section>

                      <section v-if="unrevealed_nfts_to_show_now.length > 0 && showUnrevealedNFTs === true" :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                        <BaseNFTCard  v-for="(nft, idx) in unrevealed_nfts_to_show_now" :key="idx" :id="nft['token-id'] ? nft['token-id'].int : null" :collection="nft['collection'] ? nft['collection'] : null" :showbid="true" :image="null" :demo="false" name="Unrevealed" class="cursor-pointer col-span-1  mt-8 "></BaseNFTCard>
                      </section>


                      <div v-if="current_page < total_pages" class="flex flex-col text-neutral mt-20 justify-center items-center text-center">
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

                      <div v-if="collections_to_show_now.length === 0" class="min-h-[500px] text-6xl text-gray-500/30 hero">

                        No collections found!

                      </div>


                      <section :class="filters_active === true ? 'md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'" class="max-w-full grid grid-cols-1 gap-4 ">
                        <BaseAsyncCollectionCard  v-for="(collection, idx) in collections_to_show_now" :key="idx" :id="collection._id ? collection._id : collection" class="cursor-pointer col-span-1  mt-8 "></BaseAsyncCollectionCard>
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


                  <!--            Settings Tab Area -->
                  <transition name="slide-fade">
                    <div v-if="c_tab === 'settings'">

                      <div class="grid-cols-1 flex gap-8 flex-col justify-center items-center text-center dark:text-white">

                        <section class="w-full max-w-4xl" id="wallet">
                          <div v-if="wallet_type === 'wc'" class="max-w-4xl py-8 px-6 rounded-lg w-full bg-light dark:bg-foreground">
                            <div class="flex text-3xl font-2 justify-start">
                              Wallet
                            </div>
                            <div class="rounded-lg mt-8 bg-foreground">
                              <label
                                  class="flex gap-4 items-center justify-start rounded-lg border-0 bg-white dark:border-foreground dark:bg-dark p-6 text-sm "
                              >
                                <div>
                                  <img src="/images/walletconnect.svg">
                                </div>

                                <div class="flex flex-col">
                                  <p class="dark:text-light font-2 text-xl">Wallet Connect</p>

                                  <p class="text-neutral">Linx, Ecko, Koala</p>
                                </div>

                              </label>
                            </div>
                          </div>

                          <div v-if="wallet_type === 'ecko'" class="max-w-4xl py-8 px-6 rounded-lg w-full bg-light dark:bg-foreground">
                            <div class="flex text-3xl font-2 justify-start">
                              Wallet
                            </div>
                            <div class="rounded-lg mt-8 bg-foreground">
                              <label
                                  class="flex gap-4 items-center justify-start rounded-lg border-0 bg-white dark:border-foreground dark:bg-dark p-6 text-sm "
                              >
                                <div>
                                  <img src="/images/ecko.png">
                                </div>

                                <div class="flex flex-col">
                                  <p class="dark:text-light font-2 text-xl">Ecko Wallet</p>
                                </div>

                              </label>
                            </div>
                          </div>

                          <div v-if="wallet_type === 'zel'" class="max-w-4xl py-8 px-6 rounded-lg w-full bg-light dark:bg-foreground">
                            <div class="flex text-3xl font-2 justify-start">
                              Wallet
                            </div>
                            <div class="rounded-lg mt-8 bg-foreground">
                              <label
                                  class="flex gap-4 items-center justify-start rounded-lg border-0 bg-white dark:border-foreground dark:bg-dark p-6 text-sm "
                              >
                                <div>
                                  <img src="/images/zelcore.png">
                                </div>

                                <div class="flex flex-col">
                                  <p class="dark:text-light font-2 text-xl">Zelcore Wallet</p>
                                </div>

                              </label>
                            </div>
                          </div>
                        </section>


                        <div id="profile" class="max-w-4xl py-8 px-6 rounded-lg w-full bg-light dark:bg-foreground">
                          <div class="flex text-3xl font-2 justify-start">
                            Profile
                          </div>
                          <div class="form-control mt-8 w-full">
                            <label class="label w-full">
                              <span class="label-text font-2 uppercase text-neutral">Username</span>
                            </label>
                            <input v-model="profile_name" type="text" placeholder="Username?" class="input  w-full" />
                          </div>
                          <div class="form-control mt-8 w-full">
                            <label class="label w-full">
                              <span class="label-text font-2 uppercase text-neutral">BIO</span>
                            </label>
                            <textarea v-model="profile_bio" type="text" placeholder="Bio?" class="textarea w-full" />
                          </div>
<!--                          <div class="form-control mt-8 w-full">-->
<!--                            <label class="label w-full">-->
<!--                              <span class="label-text font-2 uppercase text-neutral">Email</span>-->
<!--                            </label>-->
<!--                            <input type="text" placeholder="Username?" class="input  w-full" />-->
<!--                          </div>-->
                          <div class="form-control mt-8 w-full">
                            <label class="label w-full">
                              <span class="label-text font-2 uppercase text-neutral">Twitter</span>
                            </label>
                            <input v-model="profile_twitter" type="text" placeholder="Twitter?" class="input  w-full" />
                          </div>
                          <div class="form-control mt-8 w-full">
                            <label class="label w-full">
                              <span class="label-text font-2 uppercase text-neutral">Discord</span>
                            </label>
                            <input v-model="profile_discord" type="text" placeholder="Discord?" class="input  w-full" />
                          </div>

                          <div v-if="is_updating === false" class="flex w-full">
                            <div @click="clickUpdateProfile" class="px-6 py-2.5 mt-12 h-12 flex items-center relative cursor-pointer justify-center rounded-lg group text-white font-medium w-full">
                              <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                              <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                              <span class="relative font-2 text-lg tracking-wide  md:px-4">Update</span>
                            </div>
                          </div>

                          <button v-if="is_updating === true" disabled class="mt-12 btn w-full btn-primary">Update</button>

                        </div>

<!--                        <div class="max-w-4xl py-8 px-6 rounded-lg w-full bg-light dark:bg-foreground">-->
<!--                          <div class="flex text-3xl font-2 justify-start">-->
<!--                            Notifications-->
<!--                          </div>-->
<!--                          <div class="form-control mt-8 w-full">-->
<!--                            <label class="label cursor-pointer">-->

<!--                              <span class="label-text uppercase flex font-2 text-neutral text-lg flex-col">Remember me</span>-->
<!--                              <input type="checkbox" class="toggle toggle-lg toggle-secondary" checked />-->
<!--                            </label>-->
<!--                          </div>-->
<!--                        </div>-->

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
      <div v-if="nfts_to_show_now.length === 0 && is_unknown === true" class="min-h-[500px] text-6xl hero">

        Profile not found.

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

  img{
    border-radius: 0.7rem;
  }

  &:after{
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 65vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(16, 3, 3, 0)  0%, rgb(19, 19, 26) 20%, rgb(19, 19, 26) 100%);
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
