<script setup>
import { ref, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import {useStore} from "vuex";
import {useRouter} from "vue-router";
let store = useStore();
let router = useRouter();

const containerRef = ref(null)


const props = defineProps({
  id:  {
    type: String,
    default: "0"
  },
  size:  {
    type: [String, Number],
    default: 0
  },
  stats:  {
    type: [Object, String],
    default: "0"
  },
  idx:  {
    type: Number,
    default: 0
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

async function fetchWithRetry(hash) {
  const link = [];
  link.push('https://kai.infura-ipfs.io/ipfs/');
  link.push('https://ipfs.io/ipfs/');
  link.push('https://kai.infura-ipfs.io/ipfs/');

  for (let i = 0; i < link.length-1; i++) {
    try {

      const response = await fetch(link[i]+hash);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

//Variables for this component
const loaded = ref(false);
const image = ref(null);
const name = ref(null);
const floor_price = ref(null);
const floor_change = ref(null);
const volume = ref(null);
const volume_change = ref(null);
const items = ref(null);
const owners = ref(null);
const token = ref(null);
const showbid = ref(true);
const BTNS = ref()

//Runs when the component is mounted to the screen
onMounted(async() => {
  if(props.id !== null && props.id !== '0'){
    try{

      const c_payload = {
        id: props.id
      }

      BTNS.value = document.querySelectorAll('tr')
      BTNS.value.forEach(BTN => BTN.addEventListener('pointermove', UPDATE))

      // console.log("GETTING COLLECTION DATA FOR COLLECTION ->", props.id);

      let t_collection_data = await store.dispatch("accounts/getCollection", c_payload).then(async(colres)=>{


        //Parse name from collection
        if(colres.name){
          name.value = colres.name;
        }

        if(colres.tokens){

          if(colres.tokens[0]){

            const nft_payload = {
              name: colres.tokens[0].tokenId
            }

            //First lets get our NFT info from the backend
            let loading = await timeout(5000, store.dispatch("accounts/getNFT", nft_payload)).then(async(nftres)=>{

              // console.log("NFT DATA:");
              // console.log(nftres);

              //Now lets get all the NFTs info, once the NFT is loaded we set loaded state to true

              if(nftres.image !== undefined){
                image.value = nftres.image;
              }else if(nftres.image === undefined){



                if(nftres.uri !== undefined){



                  //lets check if we have ipfs or https metadata
                  if(nftres.uri.length > 7){
                    const checkme = nftres.uri.slice(0, 7);

                    if(checkme === "ipfs://"){

                      // console.log("IPFS METADATA");

                      try{
                        let loading = await fetchWithRetry(nftres.uri.slice(7)).then(async(res1)=> {

                          // console.log("METADATA RESPONSE:");
                          // console.log(res1);

                          let isimageipfs = await imageorvideo(res1.url);

                          // console.log("imageorvideo check ->", isimageipfs);

                          if(isimageipfs === false) {
                            let ipfs_json = await res1.json();

                            if(ipfs_json.image){

                              // console.log("FOUND NFT IMAGE:");
                              // console.log(ipfs_json.image);

                              image.value = await determineImageLink(ipfs_json.image.slice(7));


                            }else{
                              console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
                              // console.log(ipfs_json);
                              image.value = '/images/kadenai_black.svg';
                            }

                          }

                        });

                      }catch(e){
                        console.log(e);
                        console.log("COULNDT FIND NFT URI");
                        image.value = '/images/kadenai_black.svg';
                      }


                    }else if(checkme === "https:/"){

                      // console.log("HTTPS METADATA");
                      //check if URI is an image or JSON
                      let isimage = await imageorvideo(nftres.uri);

                      // console.log("imageorvideo check ->", isimage);

                      try{
                        let jsontest = await timeout(10000, fetch(nftres.uri)).then(async(jsonres)=>{

                          // console.log("METADATA RESPONSE:");
                          // console.log(jsonres);

                          let new_json_test = await jsonres.json();

                          // console.log("METADATA JSON:");
                          // console.log(new_json_test);

                          if(new_json_test.image){

                            // console.log("FOUND NFT IMAGE:");
                            image.value = new_json_test.image;

                          }else{
                            console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
                            // console.log(jsonres);
                            image.value = '/images/kadenai_black.svg';
                          }

                        })
                      }catch(e){
                        //failed to fetch uri
                        console.log("CANT PROCESS URI FOR NFT ->", props.id);
                        console.log(e);
                        image.value = '/images/kadenai_black.svg';

                      }

                    }

                  }

                }else{
                  image.value = '/images/kadenai_black.svg';
                }

              }


              //The nft has loaded
              loaded.value = true;

            })


          }else{
            image.value = '/images/kadenai_black.svg';
          }

        }else{
          image.value = '/images/kadenai_black.svg';
        }


      });



    }catch(e){
      console.log(e);
      loaded.value = true;
    }
  }else{
    loaded.value = true;
  }


  if(props.stats !== "0"){
    floor_price.value = props.stats.floorPrice;
    floor_change.value = props.stats.floorPriceChangePercentage;
    volume.value = props.stats.totalVolume;
    volume_change.value = props.stats.volumeChangePercentage;
  }

  if(props.size){
    items.value = props.size;
  }


  if(floor_price.value === null || floor_price.value === 0 || floor_price.value === "0"){ floor_price.value = "-" }
  if(floor_change.value === null){ floor_change.value = "-" }
  if(volume.value === null){ volume.value = "-" }
  if(volume_change.value === null){ volume_change.value = "-" }
  if(items.value === null){ items.value = "-" }
  if(owners.value === null){ owners.value = "-" }

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


//Brings user to the collection page when they click a card
const clickCollection = async (collection) => {
  const encoded = encodeURIComponent(collection);
  await router.push({path: "/collection/"+encoded});
};

const target = ref();

const UPDATE = ({target, x, y }) => {
  const bounds = containerRef.value.getBoundingClientRect()
  containerRef.value.style.setProperty('--x', x - bounds.left)
  containerRef.value.style.setProperty('--y', y - bounds.top)
}

</script>
<template>
<!--  <tr ref="target" v-motion-slide-right @click="clickCollection(props.id)" class="bg-white cursor-pointer border-b-2 dark:border-b-foreground/60 dark:bg-dark  rounded-lg hover:bg-light  dark:hover:bg-foreground">-->
  <tr ref="containerRef" v-motion-slide-right @click="clickCollection(props.id)" class=" back bg-white cursor-pointer border-b-2 dark:border-b-foreground/60 dark:bg-dark  rounded-lg hover:bg-light  dark:hover:bg-foreground">

    <td class="px-6 py-4 text-left text-lg dark:text-light font-2 rounded-l-lg">
      <span class="back">
    <span></span>
  </span>
      <span class="text-sm md:text-lg text-black dark:text-light font-2">{{idx + 1}}</span>
    </td>
    <th scope="row"  class="flex items-center px-6 py-5 rounded-l-lg mr-10 md:mr:0 text-gray-900 whitespace-nowrap dark:text-white">

      <div v-if="image === null"  class="skeleton rounded-box h-[110px] w-[110px]"></div>
      <img v-if="image !== null" class=" rounded-lg h-[110px] w-[110px]" height="100" width="100"  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
      <div class="pl-6 ">
        <p
            :class="name === null ? 'skeleton px-6 w-44' : ''"
            class="md:text-lg  mt-2 font-2 text-black dark:text-light_grey">
          {{name === null ? '&nbsp;' : name === '-' ? '-' : name.slice(0,20)}}
        </p>
      </div>
    </th>
    <td class="px-6 py-4">
      <p
          :class="floor_price === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        {{floor_price === null ? '&nbsp;' : floor_price === '-' ? '-' : floor_price}}
      </p>
    </td>
    <td class="px-6 py-4">
      <p
          :class="floor_change === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        <span :class="floor_change > 0 ? 'text-green-600' : floor_change < 0 ? 'text-red-600' : ''">
          {{floor_change === null ? '&nbsp;' : floor_change === '-' ? '-' : floor_change+"%"}}
        </span>

      </p>
    </td>
    <td class="px-6 py-4">
      <p
          :class="volume === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        {{volume === null ? '&nbsp;' : volume}}
      </p>
    </td>
    <td class="px-6 py-4">
      <p
          :class="volume_change === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
         <span :class="volume_change > 0 ? 'text-green-600' : volume_change < 0 ? 'text-red-600' : ''">
           {{volume_change === null ? '&nbsp;' : volume_change === '-' ? '-' : volume_change+"%"}}
         </span>
      </p>
    </td>
    <td class="px-6 py-4">
      <p
          :class="items === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        {{items === null ? '&nbsp;' : items}}
      </p>
    </td>
<!--    <td class="px-6 py-4 text-right h-18 rounded-r-lg">-->
<!--      <p-->
<!--          :class="owners === null ? 'skeleton' : ''"-->
<!--          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">-->
<!--        {{owners === null ? '&nbsp;' : owners}}-->
<!--      </p>-->
<!--    </td>-->
  </tr>
</template>

<style lang="scss" scoped>

:root {
  --bg: hsl(0 0% 6%);
  --fg: hsl(0 0% 90%);
}


tr {
  --button-bg: var(--bg);
  --button-fg: var(--fg);
  --hover-bg: var(--fg);
  color: var(--button-fg);
  font-family: sans-serif;
  padding: 1rem 2rem;
  border-radius: 100px;
  border: 2px solid var(--button-fg);
  background: var(--button-bg);
  cursor: pointer;
  touch-action: none;
  position: relative;
  overflow: hidden;
}

tr:nth-of-type(2) {
  --button-bg: var(--fg);
  --hover-bg: var(--fg);
  color: var(--bg);
}

tr .back {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: 100px;
}

.back > span {
  left: calc(var(--x, 0) * 1px);
  top: calc(var(--y, 0) * 1px);
  width: 30%;
  display: inline-block;
  aspect-ratio: 1;
  background: rgba(91, 91, 91, 0.05) !important;
  transform: translate(-50%, -50%) scale(var(--active, 0));
  transition: transform 0.25s;
  background: var(--hover-bg);
  position: absolute;
  pointer-events: none;
  overflow: hidden;
  mix-blend-mode: luminosity;
  border-radius: 50%;
}

tr:is(:hover, :focus-visible) {
  --active: 1.5;
}

tr:active {
  --active: 3;
}

tr:active .back > span {
  transition: transform 0.15s;
}

@supports (transition-timing-function: linear(0, 1)) {
  tr:is(:hover, :focus-visible) .back > span {
    transition-duration: 0.5s;
    transition-timing-function: linear(
            0, 0.5007 7.21%, 0.7803 12.29%,
            0.8883 14.93%, 0.9724 17.63%,
            1.0343 20.44%, 1.0754 23.44%,
            1.0898 25.22%, 1.0984 27.11%,
            1.1014 29.15%, 1.0989 31.4%,
            1.0854 35.23%, 1.0196 48.86%,
            1.0043 54.06%, 0.9956 59.6%,
            0.9925 68.11%, 1
    );
  }
}

</style>
