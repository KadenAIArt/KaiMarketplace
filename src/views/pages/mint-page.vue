<script setup>
import {computed, onMounted, ref} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import "add-to-calendar-button";
import axios from "axios";
import apiConfig from "@/components/util/apiConfig";
import BaseNFTCard from "@/components/Base/BaseNFTCard.vue";
import MagneticText from "@/components/MagneticText.vue";
import MagneticTextToken from "@/components/MagneticTextToken.vue";

let store = useStore();
let router = useRouter();

const props = defineProps({
  collectionid: {
    type: String,
    default: "0"
  },
  collectionname: {
    type: String,
    default: "0"
  },
});

//Wraps promises in timer
function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);

    promise
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(reason => {
          clearTimeout(timer);
          reject(reason);
        });
  });
}

async function fetchWithRetry(hash) {
  const link = [];
  link.push("https://kai.infura-ipfs.io/ipfs/");
  link.push("https://ipfs.io/ipfs/");
  link.push("https://kai.infura-ipfs.io/ipfs/");

  for (let i = 0; i < link.length - 1; i++) {
    try {

      console.log(i);
      console.log("FETCHING WITH LINK ->", link[i]);

      const response = await fetch(link[i] + hash);


      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // const data = await response.text(); // or response.json(), etc.
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for url ${link[i]} ${hash}. Retrying...`, error);
    }
  }

  throw new Error(`All attempts failed for url ${hash}`);
}

async function determineImageLink(hash) {
  const link = [];
  link.push("https://kai.infura-ipfs.io/ipfs/");
  link.push("https://ipfs.io/ipfs/");
  link.push("https://kai.infura-ipfs.io/ipfs/");

  for (let i = 0; i < link.length - 1; i++) {
    try {
      const response = await fetch(link[i] + hash);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      return link[i] + hash;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for url ${link[i]} ${hash}. Retrying...`, error);
    }
  }
  throw new Error(`All attempts failed for url ${hash}`);
}


const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
};

//Determines if url is image or video
const imageorvideo = (url) =>
    new Promise((resolve) => {
      const img = new Image();

      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });

//Page refs
const name = ref(null);
const description = ref(null);
const size = ref(null);
const price = ref(null);
const token = ref(null);
const collection_image = ref("/images/kadenai_main_gradient.svg");
const creator = ref(null);
const creator_guard = ref(null);
const current_tiers = ref(null);
const max_size = ref(null);
const nft_images = ref(["/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg",
  "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg",
  "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg", "/images/kadenai_main_gradient.svg"]);
const loading = ref(true);
const current_tier = ref(null);
const add2calandar = ref(null);
const owners = ref(0);
const discord_link = ref(null);
const twitter_link = ref(null);
const telegram_link = ref(null);
const web_link = ref(null);
const unrevealed_nfts_to_show_now = ref([]);
const user_owned_count = ref(0);
const max_user_limit = ref(0);
const current_max_nfts_user_can_buy = ref(null);
const max_purchasable_final = ref(null);
const has_max_size = ref(false);

const getUserCollections = async (name) => {

  const response = await axios.get(`${apiConfig.apiHost}/api/v2collections/getcollectionbyname/${name}`, {
    withCredentials: true
  });

}



const getRefreshPageData = async()=> {

  //Lets set up this page!
  let account_name = localStorage.getItem("kai_accountName");
  name.value = props.collectionname;
  let t_current_tier = null;
  let current_tier_limit = null;

  //Here we grab information about the collection the user is looking at
  if (props.collectionid !== "0") {

    const c_payload = {
      id: props.collectionid,
      page: 1
    };

    try {

      //Get collection data
      let t_collection_data = await store.dispatch("accounts/getCollection", c_payload).then(async (res) => {

        console.log("COLLECTION DATA:");
        console.log(res);

        //If we have collection data, lets go through it and get stuff and images
        if (res !== 0) {

          //Lets get and set our collection data to be displayed on the page
          if (res.creator) {
            creator.value = res.creator;
          }
          if (res.guard) {
            creator_guard.value = res.guard;
          }
          if (res.maxSize) {
            max_size.value = res.maxSize;
          }
          if (res.name) {
            name.value = res.name;
          }
          if (res.size) {
            console.log("res.size is here");
            size.value = res.size;
          }
          if (res.image) {
            collection_image.value = res.image;
          }
          if (res.description) {
            description.value = res.description;
          }

          size.value = res.size;
          console.log("Res.size", res.size);
          console.log("size", size.value);

          //Get images for a background banner and load some nfts
          //First we get 15 NFTs to be displayed on this page, and 15 images for the background banner
          let limit = 15;

          //Make sure our limit doesnt exceed the number of NFTs in this collection
          if (res.tokens) {
            if (res.tokens.length > 15) {
              limit = 15;
            } else {
              limit = res.tokens.length;
            }
          }

          if (res.tokens && res.tokens.length > 0) {

            nft_images.value = [];

            //Lets keep track and count up to 15 nfts
            let counter = 0;

            //We create a temporary object to store our nft in
            let t_nft = null;

            //Lets grab 15 images for the moving banner in the background from the NFTs with a loop
            for (let i = 0; i < res.tokens.length; i++) {

              console.log("LIMIT 15->", i);

              const nft_payload = {
                name: res.tokens[i].tokenId
              };

              //Lets grab a NFT's data from the API
              let t_nft_res = await timeout(10000, store.dispatch("accounts/getNFT", nft_payload)).then(async (nftres) => {

                console.log("NFT ->", i);
                console.log(nftres);

                //We set our temporary NFT to our direct result from the API
                let t_nft = nftres;

                //Lets check if this NFT has an image to display
                if (nftres.image !== undefined) {
                  t_nft.image = nftres.image;
                } else if (nftres.image === undefined) {

                  //Lets go through the NFTs URI metadata for an image
                  if (nftres.uri !== undefined) {

                    //lets check if we have ipfs or https metadata
                    if (nftres.uri.length > 7) {
                      const checkme = nftres.uri.slice(0, 7);

                      if (checkme === "ipfs://") {

                        console.log("IPFS NFT METADATA");

                        try {

                          await fetchWithRetry(nftres.uri.slice(7)).then(async (res1) => {

                            console.log("RESPONSE:");
                            console.log(res1);

                            //Check if this is an image or video type
                            let isimageipfs = await imageorvideo(res1.url);

                            console.log("imageorvideo check ->", isimageipfs);


                            let ipfs_json = await res1.json();
                            t_nft.metadata = ipfs_json;

                            //Check for image property in metadata
                            if (ipfs_json.image) {

                              console.log("IMAGE:");
                              console.log(ipfs_json.image);

                              // t_nft.image = 'https://ipfs.io/ipfs/'+ipfs_json.image.slice(7);

                              t_nft.image = await determineImageLink(ipfs_json.image.slice(7));

                              console.log("METADATA JSON:");
                              console.log(ipfs_json);


                            } else {
                              console.log(ipfs_json);
                              t_nft.image = null;
                            }

                            //Check for name/description properties
                            if (ipfs_json.name) {
                              t_nft.name = ipfs_json.name;
                            }
                            if (ipfs_json.description) {
                              t_nft.description = ipfs_json.description;
                            }


                          });


                        } catch (e) {
                          console.log(e);
                        }

                      } else if (checkme === "https:/") {

                        console.log("HTTPS NFT METADATA");
                        //check if URI is an image or JSON metadata
                        let isimage = await imageorvideo(nftres.uri);

                        console.log("imageorvideo check ->", isimage);

                        try {
                          await timeout(10000, fetch(nftres.uri)).then(async (jsonres) => {

                            console.log("METADATA:");
                            console.log(jsonres);

                            let new_json_test = await jsonres.json();
                            t_nft.metadata = new_json_test;

                            console.log("METADATA JSON:");
                            console.log(new_json_test);

                            //Check for image property within the json
                            if (new_json_test.image) {

                              console.log("IMAGE:");
                              t_nft.image = new_json_test.image;
                              console.log(t_nft.image);

                            } else {
                              console.log("CANT FIND NFT IMAGE for NFT# ->", i);
                              console.log("NFT JSON");
                              console.log(jsonres);
                              t_nft.image = null;
                            }

                            //Check for name/description properties within the metadata
                            if (new_json_test.name) {
                              t_nft.name = new_json_test.name;
                            }
                            if (new_json_test.description) {
                              t_nft.description = new_json_test.description;
                            }

                          });
                        } catch (e) {
                          console.log("CANT DETERMINE HOW TO HANDLE URI for NFT# ->", i);
                          console.log(e);
                          t_nft.image = null;

                        }

                      }
                      console.log("image ->", t_nft.image);

                    }


                  }

                }

                //Pick out a image for the collection icon at top of screen
                if (collection_image.value === "/images/kadenai_main_gradient.svg") {
                  collection_image.value = t_nft.image;
                }


                console.log("GOING TO ADD IMAGE TO NFT");
                console.log(t_nft.image);
                console.log("counter", counter);
                //Add the nfts image to the list of random nft images we can display
                if (t_nft.image !== undefined && t_nft.image !== null && counter < limit) {
                  console.log("ALSO ADDING NFT TO BACKGROUND");
                  nft_images.value.push(t_nft.image);
                }


              });

              counter = counter + 1;
            }

            //We need atleast 15 images for our cool banner, lets do something to make sure we always have 15 images even when there are less than 15 images for us to use
            if (counter < 15) {

              const remainder = 15 - counter;

              console.log("NFTS REMAINING ->", remainder);
              console.log("t_nft", t_nft);

              for (let i = (14 - remainder); i < 15; i++) {
                nft_images.value[i] = nft_images.value[getRandomInt((15 - remainder))];
              }
            }
          }

        }


      });

    } catch (e) {
      console.log(e);
    }


    //Now lets get some information about the current sales tier
    try {
      //Get active tier
      const t_payload = {
        name: name.value,
        chain: "8"
      };
      console.log("GETTING ACTIVE TIER DATA FOR COLLECTION ->", name.value);
      let t_collection_data = await store.dispatch("accounts/getActiveSaleTier_chain", t_payload).then(async (colres) => {

        console.log("ACTIVE TIER RES ->");
        console.log(colres);
        t_current_tier = colres;

      });
    } catch (e) {
      console.log(e);
    }

    //If we got tier data, lets go through it and get some stuff
    if (t_current_tier !== "0" && t_current_tier !== 0 && t_current_tier !== null) {

      console.log("t_current_tier");
      console.log(t_current_tier);

      //Set nulls and defaults for our logic
      t_current_tier.started = null;
      t_current_tier.ended = null;
      t_current_tier.sold_out = false;

      //Get seconds since start / end / current time and get tier mint limit
      const tier_start_time = new Date(t_current_tier.startTime.time ? t_current_tier.startTime.time : t_current_tier.startTime.timep).getTime();
      const tier_end_time = new Date(t_current_tier.endTime.time ? t_current_tier.endTime.time : t_current_tier.endTime.timep).getTime();
      const current_time = new Date().getTime();
      current_tier_limit = t_current_tier.limit;
      const tier_start_date = new Date(t_current_tier.startTime.time ? t_current_tier.startTime.time : t_current_tier.startTime.timep);
      const tier_end_date = new Date(t_current_tier.endTime.time ? t_current_tier.endTime.time : t_current_tier.endTime.timep);
      const current_date = new Date().getTime();

      //Save seconds to tier and date
      t_current_tier.started_seconds = tier_start_time;
      t_current_tier.ended_seconds = tier_end_date - current_date;
      t_current_tier.start_date = tier_start_date;
      t_current_tier.end_date = tier_end_date;


      //Check if tier has started due to time
      if (current_time > tier_start_time) {
        t_current_tier.started = true;
      } else {
        t_current_tier.started = false;
      }

      //Check if tier has ended due to time expire
      if (current_time > tier_end_time) {
        t_current_tier.ended = true;
      } else {
        t_current_tier.ended = false;
      }

      //Check if current minted size is greater than tier size
      if (size.value !== null) {
        if (current_tier_limit > size.value) {
          t_current_tier.sold_out = true;
        }
      }

      //Set current tier data
      current_tier.value = t_current_tier;

      //Get price and token
      price.value = current_tier.value.cost;
      token.value = current_tier.value.currencyType;

      if(current_tier.value.limit){
        max_user_limit.value = current_tier.value.limit.int ? current_tier.value.limit.int : current_tier.value.limit
      }

      console.log("CURRENT_TIER FINAL", current_tier.value);

    }

    //Lets get all minting collections so we can get some tier data out of them
    const currently_minting_payload = {
      page: 1,
      limit: 10
    }

    let minting_now_collections = [];
    let all_tiers = null;

    let t_allCollections = await store.dispatch("accounts/getCurrentlyMinting", currently_minting_payload).then(async (res) => {
      console.log("CURRENTLY MINTING RES:");
      console.log(res);

      if (res !== 0 && res[0] !== undefined && res[0] !== null) {

        //Convert from {{}{}} to [{}{}]
        const collections_minting_array = Object.entries(res[0]).map((e) => ({[e[0]]: e[1]}));

        if (collections_minting_array) {
          for (let i = 0; i < collections_minting_array.length; i++) {
            minting_now_collections.push(collections_minting_array[i][i]);
          }
          console.log("----------------- minting_now_collections --------------------");
          console.log(minting_now_collections);
        }

      }

      if (minting_now_collections.length > 0) {

        for (let k = 0; k < minting_now_collections.length; k++) {

          if (minting_now_collections[k]._id === props.collectionid) {

            all_tiers = minting_now_collections[k].tiers;
            description.value = minting_now_collections[k].description;
            size.value = minting_now_collections[k].currentIndex - 1;

            //Double check size
            if (size.value !== null) {
              if (current_tier_limit > size.value) {
                current_tier.value.sold_out = true;
              }
            }


          }

        }

      }

      if (all_tiers !== null) {

        console.log("ALL TIERS");
        console.log(all_tiers);

        for (let m = 0; m < all_tiers.length; m++) {
          const tier_start_time = new Date(all_tiers[m].startTime.time ? all_tiers[m].startTime.time : all_tiers[m].startTime.timep ? all_tiers[m].startTime.timep : all_tiers[m].startTime).getTime();
          const tier_end_time = new Date(all_tiers[m].endTime.time ? all_tiers[m].endTime.time : all_tiers[m].endTime.timep ? all_tiers[m].endTime.timep : all_tiers[m].endTime).getTime();
          all_tiers[m].start_seconds = tier_start_time;
          all_tiers[m].end_seconds = tier_end_time;

          const current_time = new Date().getTime();
          //Check if tier has started due to time
          if (current_time > tier_start_time) {
            all_tiers[m].started = true;
          } else {
            all_tiers[m].started = false;
          }

          //Check if tier has ended due to time expire
          if (current_time > tier_end_time) {
            all_tiers[m].ended = true;
          } else {
            all_tiers[m].ended = false;
          }


        }

        console.log("ALL TIERS FINAL");
        console.log(all_tiers);
        current_tiers.value = all_tiers;

      }


    });

    const unrevealed_payload = {
      name: localStorage.getItem("kai_accountName"),
      chain: "8"
    }

    let t_unrevealed_data = await store.dispatch("accounts/getUnrevealedNFTs_chain", unrevealed_payload).then((res)=>{

      console.log("UNREVEALED RES");
      console.log(res);

      console.log("UNREVEALED RES");
      console.log(res);

      if(res !== undefined && res !== 0){
        let t_u_nfts = res[0];

        for(let i = 0; i < t_u_nfts.length; i++){

          if(t_u_nfts[i].revealed !== undefined && t_u_nfts[i].revealed !== false){
            unrevealed_nfts_to_show_now.value.push(t_u_nfts[i])
          }

        }

      }

      user_owned_count.value = unrevealed_nfts_to_show_now.value.length;

    })

    if(max_user_limit.value !== 0){
      current_max_nfts_user_can_buy.value = max_user_limit.value - user_owned_count.value;
    }

    if(max_size === 0 || max_size === '0'){
      has_max_size.value = false;
    }else{
      has_max_size.value = true;
    }
    if(current_max_nfts_user_can_buy !== null){
      has_max_size.value = true;
    }
    if(has_max_size.value = true){

      if(current_max_nfts_user_can_buy.value > (max_size.value - size.value)){
        max_purchasable_final.value = (max_size.value - size.value);
      }else{
        max_purchasable_final.value = current_max_nfts_user_can_buy.value;
      }

    }
  }
}

//Runs when page is first mounted to the screen (start up)
onMounted(async () => {


  await getRefreshPageData();

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

//Watch if mode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});


//VARIABLES FOR THIS PAGE
const account = localStorage.getItem("kai_accountName");
const c_tab = ref("overview");

const changeTab = (view) => {
  c_tab.value = view;
};


const nfts_to_show_now = ref([
  {
    nftid: "1",
    collection: "collection",
    name: "nft #1",
    image: "/images/kadenai_main_gradient.svg",
  },
  {
    nftid: "2",
    collection: "collection",
    name: "nft #1",
    image: "/images/kadenai_main_gradient.svg",
  },
  {
    nftid: "3",
    collection: "collection",
    name: "nft #1",
    image: "/images/kadenai_main_gradient.svg",
  },
  {
    nftid: "4",
    collection: "collection",
    name: "nft #1",
    image: "/images/kadenai_main_gradient.svg",
  },
  {
    nftid: "5",
    collection: "collection",
    name: "nft #1",
    image: "/images/kadenai_main_gradient.svg",
  }]);

const nft_to_show_now = ref({
  nftid: "5",
  collection: "collection",
  name: "nft #1",
  image: "/images/kadenai_main_gradient.svg",
});

const mint_quantity = ref(0);

const click_increase = () => {
  if(has_max_size.value === true){
    if( (mint_quantity.value + 1) <= max_purchasable_final.value){
      mint_quantity.value = mint_quantity.value + 1;
    }
  }else{
    mint_quantity.value = mint_quantity.value + 1;
  }
};

const click_decrease = () => {
  if(has_max_size.value === true){
    if( (mint_quantity.value - 1) >= 0){
      mint_quantity.value = mint_quantity.value - 1;
    }
  }else{
    mint_quantity.value = mint_quantity.value - 1;
  }
};

const reduceBalance = (balance, prec = 12) => {
  if (balance) {
    if (balance.int) balance = balance.int;
    if (balance.decimal) balance = balance.decimal;

    if (parseFloat(balance) % 1 === 0) {
      return parseInt(balance);
    }

    return Math.trunc(parseFloat(balance) * Math.pow(10, prec)) / Math.pow(10, prec);
  }

  if (balance === 0) return 0;
};

const clickMint = async () => {

  const s_payload = {
    chain: "8"
  };

  //first lets get our parameters set up for this mint
  let t_splitter_account = await store.dispatch("accounts/getSplitterAccount_chain", s_payload).then(async (res) => {

    console.log("SPLITTER RES");
    console.log(res);

    const mint_payload = {
      splitter_account: res,
      quantity: mint_quantity.value,
      collection_name: name.value,
      amount: Number(mint_quantity.value) * Number(price.value)
    };

    if (token.value === "USD") {

      const price_payload = {
        chain: "8",

      };

      let t_price = await store.dispatch("accounts/getUSDQuoteOracle_chain", price_payload).then((res) => {

        console.log("getUSDQuoteOracle_chain res");
        console.log(res);

        if (res !== 0) {
          mint_payload.amount = (Number(mint_quantity.value) * (Number(price.value) / Number(res["kda-usd-price"]))).toFixed(12);
        }

      });

    }

    let t_mint_nft = await store.dispatch("accounts/mintUnrevealedNFT", mint_payload).then(async(res) => {

      console.log("MINT FUNCTION RESPONSE:");
      console.log(res);

      await getRefreshPageData();

    });


  });

};

const clickCalendar = () => {

  add2calandar.value.hover();
};


const getStartDate = computed(() => {
  if (current_tier.value !== null) {
    const date = current_tier.value.start_date;

    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // Months start from 0 in JavaScript
    const day = ("0" + date.getDate()).slice(-2);

    return `${year}-${month}-${day}`;
  } else {
    return 0;
  }
});

const getEndDate = computed(() => {
  if (current_tier.value !== null) {
    const date = current_tier.value.end_date;

    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // Months start from 0 in JavaScript
    const day = ("0" + date.getDate()).slice(-2);

    return `${year}-${month}-${day}`;
  } else {
    return 0;
  }
});

const getEndTime = computed(() => {
  if (current_tier.value !== null) {
    const date = current_tier.value.end_date;

    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);

    return `${hours}:${minutes}`;
  } else {
    return 0;
  }
});

const getStartTime = computed(() => {
  if (current_tier.value !== null) {
    const date = current_tier.value.start_date;

    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);

    return `${hours}:${minutes}`;
  } else {
    return 0;
  }
});

//Watches for new polling transactions and refreshes data
store.watch((state, getters) => getters["accounts/getTransactionPolling"], async(val) => {

    if (val === true) {
      await getRefreshPageData();
    }

    if (val === false) {
      await getRefreshPageData();
    }

})

const clickSwitchImage = (image)=>{
  console.log("CLICK", image);
  console.log("image", nft_images.value[image])
  collection_image.value = nft_images.value[image];
}

let clickCollection = async () => {
  const name = props.collectionid;
  await router.push({path: `/collection/${name}`});
};

</script>
<template>

  <section>

    <!--  Medium + Screen Moving Banner-->
    <div :class="showDarkBG === false ? 'lighten' : 'darken '" class="z-1 darken hidden md:block pl-2 ">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark '" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">

          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
      </div>
    </div>

    <!--  Small + Screen Moving Banner-->
    <div class="z-1 md:hidden block">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[5]" :src="nft_images[5] ? nft_images[5] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[6]" :src="nft_images[6] ? nft_images[6] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[7]" :src="nft_images[7] ? nft_images[7] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[8]" :src="nft_images[8] ? nft_images[8] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[9]" :src="nft_images[9] ? nft_images[9] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounce">
            <img v-if="nft_images[10]" :src="nft_images[10] ? nft_images[10] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[11]" :src="nft_images[11] ? nft_images[11] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[12]" :src="nft_images[12] ? nft_images[12] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[13]" :src="nft_images[13] ? nft_images[13] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[14]" :src="nft_images[14] ? nft_images[14] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[0]" :src="nft_images[0] ? nft_images[0] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[1]" :src="nft_images[1] ? nft_images[1] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[2]" :src="nft_images[2] ? nft_images[2] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[3]" :src="nft_images[3] ? nft_images[3] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
          <transition name="bounce">
            <img v-if="nft_images[4]" :src="nft_images[4] ? nft_images[4] : nft_images[nft_images.length-1]"
                 style="width: 19vw;"/>
          </transition>
        </div>
      </div>
    </div>

    <!--  Top Intro Full Page Section Over Banner-->
    <div class="mx-auto hero relative z-10 ">


      <div class="container mt-20 md:mt-52 h-full md:mx-auto">
        <div class="h-full w-full flex justify-center item-center text-start">
          <div class="flex flex-col h-full w-full justify-center items-start text-start">

            <div v-if="current_tier !== null && current_tier.ended === false && current_tier.started === false" class="mb-4">
              <a href="#_"
                 class="px-4 py-2 mt-12 flex justify-center w-full relative rounded group font-medium text-white font-medium inline-block">
                <span
                    class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                <span
                    class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>
                <span
                    class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                <span
                    class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>
                <span class="relative font-2 flex items-center gap-4 tracking-wide text-sm md:px-4"><font-awesome-icon
                    icon=" fa-light fa-calendar"/> Minting Soon</span>
              </a>
            </div>

            <div v-if="current_tier !== null && current_tier.ended === false && current_tier.started === true" class="mb-4">
              <a href="#_"
                 class="px-4 py-2 mt-12 flex justify-center w-full relative rounded group font-medium text-white font-medium inline-block">
                <span
                    class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                <span
                    class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>
                <span
                    class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                <span
                    class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>
                <span v-if="max_size > 0 && size < max_size" class="relative font-2 flex items-center gap-4 tracking-wide text-sm md:px-4"><font-awesome-icon
                    icon=" fa-light fa-calendar"/> Minting Now</span>
                <span v-if="max_size > 0 && size !== max_size" class="relative font-2 flex items-center gap-4 tracking-wide text-sm md:px-4"><font-awesome-icon
                    icon=" fa-light fa-calendar"/> Minting Now</span>
                <span v-if="max_size > 0 && max_size === size" class="relative font-2 flex items-center gap-4 tracking-wide text-sm md:px-4"><font-awesome-icon
                    icon=" fa-light fa-calendar"/> Sold out!</span>
                <span v-if="max_size === 0" class="relative font-2 flex items-center gap-4 tracking-wide text-sm md:px-4"><font-awesome-icon
                    icon=" fa-light fa-calendar"/> Now Minting</span>
              </a>
            </div>

            <div class="hidden md:flex w-full gap-4">
              <img :class="collection_image === undefined || collection_image === null ? 'skeleton' : ''"
                   class="mt-2 object-cover flex rounded-lg h-24 w-24" style="width: 100px !important; height: 100px;"
                   height="100" width="100" @error="$event.target.src = '/images/kadenai_black.svg'"
                   :src="collection_image === undefined ? '/images/kadenai_black.svg' : collection_image === null ? '/images/kadenai_black.svg' : collection_image"
                   alt="NFT image">
              <div class="flex flex-col">
                <h1
                    v-if="name !== undefined && name !== null"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]">
                  {{ name }}
                </h1>
                <h1
                    v-if="name === undefined || name === null"
                    :class="name === undefined || name === null ? 'skeleton h-10 w-30' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]">

                  {{ name }}
                </h1>
<!--                <p :class="creator === undefined || creator === null ? 'skeleton w-52' : ''"-->
<!--                   class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">-->
<!--                  <span v-if="creator">-->
<!--                    By: <span class="font-2 dark:text-light">{{ creator }}</span>-->
<!--                  </span>-->

<!--                  <span v-if="!creator" class="w-32 h-10">-->
<!--                    &nbsp;-->
<!--                  </span>-->

<!--                </p>-->

                <p @click="clickCollection" class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  <span class="font-2 dark:text-light">
                                   <MagneticText
                                       v-slot="{ tokens }"
                                       as="p"
                                       class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                                       :body="props.collectionid">
                     ID:
                  <MagneticTextToken
                      v-for="(token, index) in tokens"
                      v-slot="{ value }"
                      :key="index"
                      :threshold="40"
                      class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                    <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                  </MagneticTextToken>
                </MagneticText>
                </span>
                </p>
              </div>
            </div>


            <div class="md:hidden grid grid-cols-1 w-full gap-4">
              <div class="col-span-1">
                <img :class="collection_image === undefined || collection_image === null ? 'skeleton' : ''"
                     class="mt-2 object-cover flex rounded-lg h-24 w-24" style="width: 100px !important; height: 100px;"
                     height="100" width="100" @error="$event.target.src = '/images/kadenai_black.svg'"
                     :src="collection_image === undefined ? '/images/kadenai_black.svg' : collection_image === null ? '/images/kadenai_black.svg' : collection_image"
                     alt="NFT image">
              </div>
              <div class="flex col-span-1 flex-col">
                <h1
                    v-if="name !== undefined && name !== null"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]">
                  {{ name }}
                </h1>
                <h1
                    v-if="name === undefined || name === null"
                    :class="name === undefined || name === null ? 'skeleton h-10 w-30' : ''"
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]">

                  {{ name }}
                </h1>
                <p class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  ID: <span class="font-2 dark:text-light">{{ props.collectionid }}</span>
                </p>
              </div>
            </div>

            <div class="flex gap-5 mt-8">
              <button v-if="twitter_link !== null"
                      class="btn text-2xl px-5 bg-light border-light dark:border-foreground dark:bg-foreground">𝕏
              </button>
              <button v-if="discord_link !== null"
                      class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground">
                <font-awesome-icon icon="fa-brands fa-discord"/>
              </button>
              <button v-if="telegram_link !== null"
                      class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground">
                <font-awesome-icon icon="fa-brands fa-telegram"/>
              </button>
              <button v-if="web_link !== null"
                      class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground">
                <font-awesome-icon icon=" fa-light fa-globe"/>
              </button>
            </div>

            <div class="flex mt-8">
              <p
                  class="text-[15px] max-w-3xl font-0 dark:text-gray-300"
              >
                {{ description }}
              </p>
            </div>

            <div class="flex gap-20 mt-6">
              <div v-if="price !== null && max_size !== 0 && size <= max_size || price !== null && max_size === 0" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                MINT NOW
              </span>
                <span>
                <span class="font-2">{{ price }}</span> <span class="text-neutral">{{ token }}</span>
              </span>
              </div>

              <!--              <div v-if="current_tier !== null" class="flex flex-col">-->
              <!--              <span class="font-2 text-neutral text-xs">-->
              <!--                TYPE-->
              <!--              </span>-->
              <!--                <span>-->
              <!--                <span class="font-2">{{current_tier.tierType}}</span>-->
              <!--              </span>-->
              <!--              </div>-->

              <div class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                NFTS
              </span>
                <span>
                <span class="font-2">{{ size }}</span>
              </span>
              </div>

              <div v-if="max_size !== null && max_size !== 0" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                MAX SUPPLY
              </span>
                <span>
                <span class="font-2">{{ max_size }}</span>
              </span>
              </div>

              <div v-if="owners !== null && owners !== 0" class="flex flex-col">
              <span class="font-2 text-neutral text-xs">
                OWNERS
              </span>
                <span>
                <span class="font-2">{{ owners }}</span>
              </span>
              </div>
            </div>


          </div>
        </div>

      </div>

    </div>


    <div>


      <!--    New Component Testing-->

      <div class="mt-20 md:mt-32 z-10 relative mb-24 container mx-auto">

        <section>

          <div class="w-full">

            <div class="flex w-full gap-8 flex-col">

              <div class="tabs flex text-left">
                <a @click="changeTab('overview')" class="tab font-2 pl-0 text-2xl md:text-4xl  "
                   :class="c_tab === 'overview' ? 'tab-active dark:text-white' : ''">Overview</a>
<!--                <a @click="[changeTab('activity')]" class="tab font-2 text-2xl md:text-4xl"-->
<!--                   :class="c_tab === 'activity' ? 'tab-active dark:text-white' : ''">Activity</a>-->
              </div>


              <div class="grid mb-24 gap-6 grid-cols-1 md:grid-cols-12">

                <transition name="slide-fade">
                  <div v-if="c_tab === 'overview'" class="hidden md:block col-span-1">

                    <div class="flex gap-5 mt-0 p-1 flex-col max-h-[620px] overflow-y-hidden overflow-x-hidden">

                      <div @click="clickSwitchImage(idx)"  v-for="(nft, idx) in nft_images" :key="idx"
                           :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'"
                           class="group  rounded-lg relative">
                        <img class="w-full rounded-lg object-cover"
                             :src="nft"/>
                        <div
                            class="absolute top-0 rounded-lg cursor-pointer left-0 w-full h-full flex flex-col justify-center items-center dark:bg-dark opacity-75 hover:bg-dark hover:opacity-5">
                        </div>
                      </div>


                    </div>


                  </div>
                </transition>


                <div v-if="c_tab === 'overview'" class="col-span-1 md:col-span-5 ">
                  <img
                      :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'"
                      class="w-full rounded-lg"  style="object-fit: scale-down;" :src="collection_image"/>
                </div>

                <div v-if="c_tab === 'overview'" class="hidden md:block col-span-1">
                  &nbsp;
                </div>

                <div v-if="c_tab === 'overview'" class="col-span-1 md:col-span-5">
                  <div :class="showDarkBG === false ? 'custom-box-shadow4' : ''"
                       class=" bg-light dark:bg-foreground p-6 flex-col rounded-lg">
                    <div v-if="current_tier !== null" class="flex text-xl gap-4 justify-start text-start items-start">
                      <span class="text-neutral font-2">{{ current_tier.tierType }} Minting Until:</span>

                      <vue-countdown v-if="current_tier !== null" :time="current_tier.ended_seconds"
                                     v-slot="{ days, hours, minutes, seconds }">
                        <span class="font-2">{{ days }}</span>d <span class="font-2">{{ hours }}</span>h <span
                          class="font-2">{{ minutes }}</span>m <span class="font-2">{{ seconds }}</span>s
                      </vue-countdown>

                    </div>
                    <div class="divider relative w-full"></div>
                    <div class="flex mt-8 justify-between">
                      <div class="uppercase font-2 text-sm">
                        SUPPLY
                      </div>
                      <div class="uppercase font-2 text-sm">
                        {{ size }}/<span class="text-neutral">{{ max_size }}</span>
                      </div>
                    </div>
                    <div class="flex mt-2">
                      <progress class="progress h-4 w-full progress-primary " :value="size" :max="max_size"></progress>
                    </div>
                    <!--                    <div class="mb-4">-->
                    <!--                      <div @click="clickCalendar" class="px-6 mt-12 flex justify-center h-16 w-full relative rounded group font-medium text-white font-medium inline-block">-->
                    <!--                        <span class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>-->
                    <!--                        <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>-->
                    <!--                        <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>-->
                    <!--                        <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>-->
                    <!--                        <span class="relative font-2 flex items-center gap-4 tracking-wide text-xl md:px-4"><font-awesome-icon icon=" fa-light fa-calendar" /> Set a Reminder</span>-->
                    <!--                      </div>-->
                    <!--                    </div>-->

                    <div v-if="current_tier !== null && current_tier.ended === false" class="w-full mt-12 flex">
                      <add-to-calendar-button
                          v-if="max_size > 0 && size < max_size"
                          style="display: flex; width: 100%;"
                          ref="add2calandar"
                          customCss="/images/atcb-new.css"
                          name="NFT"
                          label=""
                          options="'Apple','Google'"
                          location="Kadenai NFT Marketplace"
                          :startDate="getStartDate"
                          :endDate="getEndDate"
                          :startTime="getStartTime"
                          :endTime="getEndTime"
                      ></add-to-calendar-button>
                    </div>


<!--                    <div v-if="size < max_size" class="flex mt-12 flex-col md:flex-row gap-4 justify-between">-->
                    <div v-if="size < max_size" class="flex mt-12 flex-col md:flex-row gap-4 justify-between">
                      <div class="flex flex-1 flex-col">
                        <div class="join">
                          <button @click="click_decrease" class="btn join-item h-16 rounded-l-lg">
                            <font-awesome-icon icon=" fa-light fa-minus"/>
                          </button>
                          <input v-model="mint_quantity" type="number" step="1" min="0" :max="max_purchasable_final"
                                 class="input flex w-full h-16 md:w-24 justify-center text-center text-xl placeholder:text-xl placeholder:text-center join-item"
                                 placeholder="0"/>
                          <button @click="click_increase" class="btn join-item h-16 rounded-r-lg">
                            <font-awesome-icon icon=" fa-light fa-plus"/>
                          </button>
                        </div>
                      </div>
                      <div class="flex min-w-fit w-full">
                        <div @click="clickMint"
                             class="flex cursor-pointer justify-center md:h-full h-16 w-full relative rounded group font-medium text-white font-medium inline-block">
                          <span
                              class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                          <span
                              class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>
                          <span
                              class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                          <span
                              class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>
                          <span class="relative font-2 flex items-center gap-4 tracking-wide text-xl md:px-4"><font-awesome-icon
                              icon=" fa-light fa-calendar"/> Mint Now</span>
                        </div>
                      </div>

                    </div>

                    <div v-if="size >= max_size" class="flex mt-12 flex-col md:flex-row gap-4 justify-between">

                      <div class="flex min-w-fit h-16 w-full">
                        <div
                             class="flex cursor-pointer justify-center md:h-full h-16 w-full relative rounded group font-medium text-white font-medium inline-block">
                          <span
                              class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                          <span
                              class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>
                          <span
                              class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                          <span
                              class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>
                          <span class="relative font-2 flex items-center gap-4 tracking-wide text-xl md:px-4"> Sold out !</span>
                        </div>
                      </div>

                    </div>


                  </div>

                  <div class="mt-8">
                    <div :class="showDarkBG === true ? '' : 'custom-box-shadow4'"
                         class="collapse  rounded-lg collapse-plus">
                      <input type="checkbox" class="peer"/>
                      <div class="collapse-title text-xl font-2 p-6 bg-light dark:bg-foreground  ">
                        Mint Schedule
                      </div>
                      <div class="collapse-content bg-light dark:bg-foreground">
                        <div class="flex p-2 mt-0 flex-col w-full">

                          <div v-for="(tier, idx) in current_tiers" :key="idx"
                              class="flex justify-between border-b-2 border-b-neutral/20">

                            <div v-if="tier.ended === true && tier.started === true" class="flex mt-6 mb-6">
                              <div
                                  class="rounded-full p-6 text-accent text-2xl flex items-center justify-center text-center bg-dark">
                                <font-awesome-icon icon=" fa-light fa-check"/>
                              </div>
                            </div>
                            <div v-if="tier.started === false" class="flex mt-6 mb-6">
                              <div
                                  class="rounded-full p-6 text-accent text-2xl flex items-center justify-center text-center bg-dark">
                                <font-awesome-icon icon=" fa-light fa-lock"/>
                              </div>
                            </div>
                            <div v-if="tier.ended === false && tier.started === true" class="flex mt-6 mb-6">
                              <div
                                  class="rounded-full p-6 text-2xl flex items-center justify-center text-center bg-gradient-to-tl text-white from-primary to-secondary">
                                <font-awesome-icon icon=" fa-light fa-ellipsis"/>
                              </div>
                            </div>

                            <div class="flex flex-grow px-4 justify-center flex-col">
                              <div class="font-2 text-neutral uppercase text-sm">{{tier.tierType}}</div>
                              <div v-if="tier.ended === true" class="font-2">Closed</div>
                              <div v-if="tier.ended === false && tier.started === true" class="font-2">Open</div>
                              <div v-if="tier.started === false" class="font-2">{{ new Date(tier.startTime).toLocaleString()}}</div>
                            </div>
                            <div class="flex justify-center flex-col">
                              <div class="font-2 text-neutral uppercase text-sm">MINT</div>
                              <div><span class="font-2">{{tier.cost}}</span> <span class="text-neutral">{{tier.currencyType}}</span></div>
                            </div>

                          </div>


                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                <!--           Activity Display-->
                <div v-if="c_tab === 'activity'" class="col-span-12">


                  <transition name="slide-fade">
                    <div v-if="c_tab === 'activity'" class="relative  w-full overflow-x-auto sm:rounded-lg">
                      <table class="w-full  table-auto text-sm text-center text-gray-500 dark:text-gray-400">
                        <thead class="text-xs  text-gray-700 uppercase bg-gray-50 dark:bg-dark dark:text-neutral">
                        <tr>

                          <th scope="col" class="px-6 flex py-3">
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

                        <tr v-for="(g, idx) in 10" :key="idx"
                            class="bg-white border-b-2 border-b-foreground/60 dark:bg-dark  rounded-lg hover:bg-light  dark:hover:bg-foreground">

                          <th scope="row"
                              class="flex items-center px-6 py-5 mr-10 md:mr:0 text-gray-900 rounded-lg whitespace-nowrap dark:text-white">
                            <img class=" rounded-lg" height="100" width="100" src="https://loremflickr.com/100/100"
                                 alt="Jese image">
                            <div class="pl-6">
                              <div class="text-sm md:text-lg">NFT Name</div>
                            </div>
                          </th>
                          <td class="px-6 py-4 text-sm md:text-lg">
                            <span class="text-black dark:text-light font-2">Purchased</span>
                          </td>
                          <td class="px-6 py-4 text-sm md:text-lg">
                            <span class="text-black dark:text-light font-2">150</span> KDA
                          </td>
                          <td class="px-6 py-4 items-center text-sm md:text-lg">
                            <span class="text-black dark:text-light font-2">k:52d...214</span>
                          </td>

                          <td class="px-6 py-4 text-right  text-sm md:text-lg rounded-r-lg">
                            <span class="text-black dark:text-light font-2">k:52d...214</span>
                          </td>
                        </tr>

                        </tbody>
                      </table>
                    </div>
                  </transition>

                </div>




              </div>


              <transition name="slide-fade">
                <section v-if="unrevealed_nfts_to_show_now.length > 0">
                  <p class="text-xl font-1">You currently own <span class="font-2">{{unrevealed_nfts_to_show_now.length}}</span> {{ name }} NFTs</p>
                  <div class="divider"></div>
                  <div   class="max-w-full w-full grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    <BaseNFTCard  v-for="(nft, idx) in unrevealed_nfts_to_show_now" :key="idx" :id="nft['token-id'] ? nft['token-id'].int : null" :collection="nft['collection'] ? nft['collection'] : null" :showbid="true" :image="null" :demo="false" name="Unrevealed" class="cursor-pointer col-span-1  mt-8 "></BaseNFTCard>
                  </div>
                </section>

              </transition>
            </div>


          </div>


        </section>


      </div>

      <!--    END New Component Testing-->


    </div>


  </section>


</template>
<style lang="scss" scoped>

.collapse-plus > .collapse-title:after {
  position: absolute;
  display: block;
  height: 0.5rem;
  width: 0.5rem;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
  transition-duration: 300ms;
  top: 0.9rem;
  right: 1.4rem;
  content: "+";
  pointer-events: none;
  display: flex;
  flex-direction: row;
  justify-content: center;
  justify-items: center;
  font-size: larger;
  padding-top: 10px;
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

  img {
    border-radius: 1rem;
  }

  &:after {
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 65vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgb(255, 255, 255) 20%, rgb(255, 255, 255) 100%);
  }
}

.gallery_dark {
  display: flex;
  gap: 1vw;
  overflow: hidden;
  filter: opacity(20%);

  img {
    border-radius: 0.7rem;
  }

  &:after {
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 65vh;
    z-index: 101;
    content: "";
    background: linear-gradient(180deg, rgba(16, 3, 3, 0) 0%, rgb(19, 19, 26) 20%, rgb(19, 19, 26) 100%);
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
  0% {
    transform: translatey(0);
  }
  100% {
    transform: translatey(-20%);
  }
}


</style>
