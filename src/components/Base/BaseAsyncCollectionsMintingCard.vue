<script setup>
import {ref, onMounted} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
let store = useStore();
let router = useRouter();

const props = defineProps({
  id:  {
    type: String,
    default: "0"
  },
  _name:  {
    type: String,
    default: "0"
  },
  _image:  {
    type: String,
    default: "0"
  },
  tiers: {
    type: [Object, String],
    default: "0"
  }
});

//Checks if image or video
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

//Sorting algo
function schwartzianSort(array, f, asc) {
  for (let i = array.length; i;) {
    const o = array[--i];
    array[i] = [].concat(f.call(o, o, i), o);
  }
  array.sort(function(a, b) {
    for (let i = 0, len = a.length; i < len; ++i) {
      if (a[i] != b[i]) return a[i] < b[i] ? asc ? -1 : 1 : 1;
    }
    return 0;
  });
  for (let i = array.length; i;) {
    array[--i] = array[i][array[i].length - 1];
  }
  return array;
}

//Variables for this component
const loaded = ref(false);
const image = ref(null);
const name = ref(null);
const price = ref(null);
const size = ref(null);
const token = ref(null);
const showbid = ref(true);
const current_tier = ref(null);
const sorted_tiers = ref(null);

//Runs when the component is mounted to the screen
onMounted(async() => {

  //Lets bind image and name from props
  image.value = props._image;
  name.value = props._name

  //Set defaults
  let t_current_tier = null;

  //And bind our tiers, we shall sort these soon
  sorted_tiers.value = props.tiers;

  //Before modifying, lets get collection data for this collection
  if(props.id !== "0"){

    try{
      //Get collection
      const c_payload = {
        id: props.id
      }
      // console.log("GETTING NOW_MINTING COLLECTION DATA FOR COLLECTION ->", props.id);
      let t_collection_data = await store.dispatch("accounts/getCollection", c_payload).then(async(colres)=>{

        // console.log("COLLECTION NOW_MINTING RES ->");
        // console.log(colres);

        //Parse name from collection, should be same as props._name
        if(colres.name){
          name.value = colres.name;
        }
        //Parse size from collection, we will compare this size to tier size to see if a tier has sold out
        if(colres.size){
          size.value = colres.size;
        }

      });
    }catch(e){
      console.log(e);
    }

    try{
      //Get active tier
      const t_payload = {
        name: name.value,
        chain: "8"
      }
      // console.log("GETTING ACTIVE TIER DATA FOR COLLECTION ->", name.value);
      let t_collection_data = await store.dispatch("accounts/getActiveSaleTier_chain", t_payload).then(async(colres)=>{

        // console.log("ACTIVE TIER RES ->");
        // console.log(colres);
        t_current_tier = colres;

      });
    }catch(e){
      console.log(e);
    }

  }

  if(t_current_tier !== "0" && t_current_tier !== 0){

    // console.log("t_current_tier");
    // console.log(t_current_tier);

    //Set nulls and defaults for our logic
    t_current_tier.started = null;
    t_current_tier.ended = null;
    t_current_tier.sold_out = false;

    //Get seconds since start / end / current time and get tier mint limit
    const tier_start_time = new Date(t_current_tier.startTime.time ? t_current_tier.startTime.time : t_current_tier.startTime.timep).getTime();
    const tier_end_time = new Date(t_current_tier.endTime.time ? t_current_tier.endTime.time : t_current_tier.endTime.timep).getTime();
    const current_time = new Date().getTime();

    const tier_start_date = new Date(t_current_tier.startTime.time ? t_current_tier.startTime.time : t_current_tier.startTime.timep);
    const tier_end_date = new Date(t_current_tier.endTime.time ? t_current_tier.endTime.time : t_current_tier.endTime.timep);
    const current_date = new Date();

    const current_tier_limit = t_current_tier.limit;

    // console.log("t_current_tier.endTime.time");
    // console.log(t_current_tier.endTime.time);
    // console.log("tier_end_time");
    // console.log(tier_end_time);

    //Save seconds to tier
    t_current_tier.started_seconds = tier_start_time;
    t_current_tier.ended_seconds = tier_end_date - current_date;

    //Check if tier has started due to time
    if(current_time > tier_start_time){
      t_current_tier.started = true;
    }else{
      t_current_tier.started = false;
    }

    //Check if tier has ended due to time expire
    if(current_time > tier_end_time){
      t_current_tier.ended = true;
    }else{
      t_current_tier.ended = false;
    }

    //Check if current minted size is greater than tier size
    if(current_tier_limit > size.value){
      t_current_tier.sold_out = true;
    }

    current_tier.value = t_current_tier;

    price.value = current_tier.value.cost;
    token.value = current_tier.value.currencyType;

    // console.log("CURRENT_TIER FINAL", current_tier.value);


  }else {
    //BACKUP DETERMINE CURRENT TIER
    //If we couldn't get active tier from pact endpoint, lets parse it from the first call:

    //Sort tiers by time
    if(sorted_tiers.value !== "0"){

      // console.log("sorted_tiers");
      // console.log(sorted_tiers.value);

      sorted_tiers.value = schwartzianSort(sorted_tiers.value, function(o) {
        return o.startTime
      }, true)

      for(let i = 0; i < sorted_tiers.value.length; i++){

        //Set nulls and defaults for our logic
        sorted_tiers.value[i].started = null;
        sorted_tiers.value[i].ended = null;
        sorted_tiers.value[i].sold_out = false;

        //Get seconds since start / end / current time and get tier mint limit
        const tier_start_time = new Date(sorted_tiers.value[i].startTime).getTime();
        const tier_end_time = new Date(sorted_tiers.value[i].endTime).getTime();
        const current_time = new Date().getTime();
        const current_tier_limit = sorted_tiers.value[i].limit;

        const tier_start_date = new Date(sorted_tiers.value[i].startTime);
        const tier_end_date = new Date(sorted_tiers.value[i].endTime);
        const current_date = new Date().getTime();;

        //Save seconds to tier
        sorted_tiers.value[i].started_seconds = tier_start_time;
        sorted_tiers.value[i].ended_seconds = tier_end_date - current_date;

        //Check if tier has started due to time
        if(current_time > tier_start_time){
          sorted_tiers.value[i].started = true;
        }else{
          sorted_tiers.value[i].started = false;
        }

        //Check if tier has ended due to time expire
        if(current_time > tier_end_time){
          sorted_tiers.value[i].ended = true;
        }else{
          sorted_tiers.value[i].ended = false;
        }

        //Check if current minted size is greater than tier size
        if(current_tier_limit > size.value){
          sorted_tiers.value[i].sold_out = true;
        }

        //Check if tier has started but not ended and set to current tier
        if(sorted_tiers.value[i].started === true && sorted_tiers.value[i].ended === false){
          current_tier.value = sorted_tiers.value[i];
        }

      }

      // console.log("SORTED_TIERS", JSON.stringify(sorted_tiers.value));
      // console.log("CURRENT_TIER", current_tier.value);

    }

  }








  const currently_minting_payload = {
    page: 1,
    limit: 10
  }

  let minting_now_collections = [];
  let all_tiers = null;

  let t_allCollections = await store.dispatch("accounts/getCurrentlyMinting", currently_minting_payload).then(async (res) => {
    // console.log("CURRENTLY MINTING RES:");
    // console.log(res);

    if (res !== 0 && res[0] !== undefined && res[0] !== null) {

      //Convert from {{}{}} to [{}{}]
      const collections_minting_array = Object.entries(res[0]).map((e) => ({[e[0]]: e[1]}));

      if (collections_minting_array) {
        for (let i = 0; i < collections_minting_array.length; i++) {
          minting_now_collections.push(collections_minting_array[i][i]);
        }
        // console.log("----------------- minting_now_collections --------------------");
        // console.log(minting_now_collections);
      }

    }

    if (minting_now_collections.length > 0) {

      for (let k = 0; k < minting_now_collections.length; k++) {

        if (minting_now_collections[k]._id === props.id) {

          all_tiers = minting_now_collections[k].tiers;

          size.value = minting_now_collections[k].currentIndex - 1;

          if(minting_now_collections[k].totalSupply && minting_now_collections[k].totalSupply !== 0 && size.value >= minting_now_collections[k].totalSupply){
            current_tier.value.sold_out = true;
          }

        }

      }


    }
  });





  //Finally lets set the card to loaded
  loaded.value = true;

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


//Determines if this card shows a button or not
const showButton = () =>{
  return true;
}

//Brings user to the collection mint page when the user clicks the card
const clickNFT = async () => {
  const encoded = encodeURIComponent(props.id);
  const encoded_name = encodeURIComponent(props._name);
  await router.push({path: "/collection/mint/"+encoded+"/"+encoded_name});
};

</script>
<template>

  <div class="nft-item nft " :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'">
    <div class="nft-innr">
      <div :class="showDarkBG === true ? 'nft-img-dark' : 'nft-img-light'">

        <div v-if="image === null"  :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class=" rounded-box h-[300px] w-[300px]"></div>
        <img @click="id !== '0' ? clickNFT(id) : '#'" v-if="image !== null"
             class='tokenImage rounded-lg'  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
      </div>

      <div  v-if="current_tier !== null" class="w-full absolute bg-cover bg-center bottom-1/3 right-[0px] rounded-lg mb-4 flex items-end nfttimer justify-center">
        <div v-if="current_tier.sold_out === false" class="flex text-xl gap-4 bg-white dark:bg-foreground px-3 rounded-lg py-1 justify-start text-start items-start">
          <span class="text-neutral dark:text-neutral font-2">Live:</span>
          <vue-countdown v-if="current_tier !== null" :time="current_tier.ended_seconds" v-slot="{ days, hours, minutes, seconds }">
            <span class="font-2">{{ days }}</span>d <span class="font-2">{{ hours }}</span>h <span class="font-2">{{ minutes }}</span>m <span class="font-2">{{ seconds }}</span>s
          </vue-countdown>
        </div>

        <div v-if="current_tier.sold_out === true" class="flex text-xl gap-4 bg-white dark:bg-foreground px-3 rounded-lg py-1 justify-start text-start items-start">
          <span class="text-neutral dark:text-neutral font-2">Sold out!</span>
        </div>
        </div>

      <div class="nft-cnt" :class="showDarkBG === true ? 'bg-foreground' : 'bg-light'">
        <div class="nft-mid  pt-1 px-3" :class="showButton === true ? 'dissappear' : ''">
          <div class="w-full justify-start text-start flex flex-col">
            <div v-if="name !== null" class="text-black tracking-wider namearea font-2 text-lg dark:text-light">{{name.slice(0,20)}} {{name.length > 19 ? '...' : ''}}</div>
            <h4 v-if="name === null" :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="text-black tracking-wider font-2  dark:text-light"> &nbsp;</h4>
            <hr class="h-px mt-4 bg-gray-200 border-0 dark:bg-neutral-800">
            <div v-if="loaded === true" class="grid flex statsarea mb-4 justify-between grid-cols-2">

              <div class="col-span-1 flex flex-col justify-start text-start">
                <a class="mt-4 text-xs font-2  text-neutral" href="#">MINT PRICE</a>
                <div class="flex mt-[1.8px] gap-2">
                  <a class="text-black leading-3 font-2 dark:text-white" href="#">{{price}}</a> <a class="text-black leading-3 font-0 dark:text-neutral" href="#">{{token}}</a>

                </div>
              </div>

              <div class="col-span-1 flex flex-col justify-end text-end">
                <a class="mt-4 text-xs font-2  text-neutral" href="#">TYPE</a>
                <a class="text-black mt-[0.8px] leading-3 font-2 dark:text-white" href="#">Minting</a>
              </div>

            </div>

            <div v-if="loaded !== true" class="grid flex mb-4 justify-between grid-cols-2">

              <div class="col-span-1 flex flex-col justify-start text-start">
                <a :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="mt-2 text-sm font-2  text-neutral" href="#">&nbsp;</a>
                <a :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="text-black leading-3 dark:text-neutral-400" href="#">&nbsp;</a>
              </div>

              <div class="col-span-1 flex flex-col justify-end text-end">
                <a :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="mt-2 text-sm font-2  text-neutral" href="#">&nbsp;</a>
                <a :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="text-black leading-3 dark:text-neutral-400" href="#">&nbsp;</a>
              </div>

            </div>


          </div>
        </div>

        <div @click="clickNFT" v-if="showbid === true && current_tier !== null" class="w-full buybtn btn bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium'">
          <span v-if="current_tier.sold_out !== true">Mint</span><span v-if="current_tier.sold_out === true">Sold Out!</span>
        </div>

      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

.ddown:before{
  border: 1px solid rgba(226,232,255,.1);
  content: "";
  left: 0;
  top: 0;
  position: absolute;
  width: calc(100% - 2px);
  height: calc(100% - 2px);
  border-radius: inherit;
  pointer-events: none;

}

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
  box-shadow: 0 -28px 84px -24px #e2e8ff1f inset;
  background: radial-gradient(103.78% 100% at 50% 0%,rgba(118,146,255,0) 80.55%,rgba(122,150,255,.04) 100%),radial-gradient(120.05% 100% at 50% 0%,rgba(226,232,255,0) 33.78%,rgba(226,232,255,.08) 100%),rgba(226,232,255,.01);
}

.buybtn {
  position: absolute;
  opacity: 0;
  transition: all .3s ease-in-out;
  bottom: 0;
  left:10px;
  width: 280px;
}

.nft-item {
  max-width: 300px;
  width: 300px !important;
  overflow: hidden;
  transition: all .5s ease-in-out;
  .nfttimer{
    transition: all .2s ease-in-out;
  }
  .nft-innr {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    .nft-img-dark {
      height: 300px;
      transition: all .5s ease-in-out;
      &:after{
        transition: all .4s ease-in-out;
        position: absolute;
        bottom: 0px;
        left: 0px;
        width: 100%;
        height: 50px;
        z-index: 101;
        content: "";
        opacity: 0;
        background: linear-gradient(180deg, rgba(16, 3, 3, 0)  0%,  rgba(28, 28, 36, 0.5) 10%,  rgba(28, 28, 36, 0.8) 20%,  rgba(28, 28, 36, 1) 40%,  rgba(28, 28, 36, 1) 100%);
      }
      img {
        object-fit: cover;
        max-width: 100%;
        width: 100%;
        height: 100%;

      }
    }
    .nft-img-light {
      height: 300px;
      transition: all .5s ease-in-out;
      &:after{
        transition: all .4s ease-in-out;
        position: absolute;
        bottom: 0px;
        left: 0px;
        width: 100%;
        height: 50px;
        z-index: 101;
        content: "";
        opacity: 0;
        background: linear-gradient(180deg, rgba(244, 244, 244, 0)  0%,  rgba(244, 244, 244, 0.5)  10%, rgba(244, 244, 244, 0.8)  20%,  rgba(244, 244, 244, 1)  40%,  rgba(244, 244, 244,1)  100%);
      }
      img {
        object-fit: cover;
        max-width: 100%;
        width: 100%;
        height: 100%;

      }
    }
    .nft-cnt {
      position: relative;
      padding: 15px 10px 15px;
      z-index: 1;

      &::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: -1;
      }
      &::after {
        content: "";
        position: absolute;
        background: transparent;
        background-image: var(--back);
        background-size: cover;
        width: 100%;
        height: 100%;
        transform: rotate(180deg);
        background-position: center center;
        top: 0;
        left: 0;
        z-index: -2;
      }
      .nft-ico-grp {
        position: absolute;
        top: -15px;
        .ico {
          position: absolute;
          display: inline-block;
          top: 0;
          left: 0;
          margin: 0;
          z-index: 1;
          transition: all .5s ease-in-out;

          &:first-child {
            left: 0;
          }
          &:nth-child(2) {
            left: 15px;
          }
          &:last-child {
            left: 30px;
            margin-right: 0px
          }
          &:hover {
            //                 z-index: 10;
            img {
              border-color: #f3ecec;
            }
          }
          img {
            width: 25px;
            height: 25px;
            object-fit: cover;
            border: 2px solid rgb(101 101 101 / 50%);
            border-radius: 10%;
          }
        }
      }
      .nft-mid {
        transition: all .3s ease-in-out;
        display: flex;
        flex-flow: row wrap;
        align-items: center;
        justify-content: space-between;
        height: auto;
        .namearea{
          transition: all .5s ease-in-out;
        }
        .statsarea{
          transition: all .5s ease-in-out;
        }
        .left {
          display: block;
          text-align: left;
          h4 {
            font-size: 18px;
            font-weight: 700;
            text-transform: capitalize;
            line-height: 1.2;
            margin: 0 0 5px;
          }
          a {
            position: relative;
            display: inline-block;

            &:after {
              content: "";
              position: absolute;
              left: 0;
              bottom: 0;
              width: 0%;
              height: 1px;
              background: #fff;
              transition: all .5s linear;
            }
          }
        }
        .right {
          text-align: right;
          h3 {
            font-size: 18px;
            font-weight: 500;
            text-transform: capitalize;
            line-height: 1.2;
            margin: 0 0 5px;
          }
          p {
            font-size: 16px;
            margin: 0 0 5px
          }
        }
      }
      .nft-bot {
        opacity: 0;
        width: 250px;
        transition: transform 0.4s ease;
        position: absolute;
        bottom: -20px;
        display: flex;
        flex-flow: row wrap;
        justify-content: space-between;
        margin: 15px 0 0;
      }


    }
    &:hover{

      transform: scale(1.015);
      .buybtn{
        opacity: 1;
        transform: translateY(-15px);
      }
      .nft-mid{
        transform: translateY(-40px);
      }
      .nfttimer{
        transform: translateY(-40px);
      }
      .nft-img-dark{
        transform: scale(1.1);
        &:after {
          bottom: 0px;
          left: 0px;
          opacity: 1;
        }
      }
      .nft-img-light{
        transform: scale(1.1);
        &:after {
          bottom: 0px;
          left: 0px;
          opacity: 1;
        }
      }
      .dissappear{
        opacity: 0;
      }
    }
  }
}


.nft{
  display: flex;
  user-select:none;
  max-width: 300px !important;
  margin: 1rem auto;
  border-radius: .7rem;
  border: none;
  overflow: hidden;
  transition: .5s all;
}


.loadingbg_dark {
  background-image: linear-gradient(90deg, #292929 0px, #2c2c2c 30px, #292929 60px);
  background-size: calc(160px + 160px);
  animation: refresh 1.2s infinite ease-out;
}

.loadingbg_light {
  background-image: linear-gradient(90deg, #e2e2e2 0px, #efefef 30px, #e2e2e2 60px);
  background-size: calc(160px + 160px);
  animation: refresh 1.2s infinite ease-out;
}

/* Animation */
@keyframes refresh {
  0% {
    background-position: calc(-160px);
  }
  60%, 100% {
    background-position: 160px;
  }
}






</style>
