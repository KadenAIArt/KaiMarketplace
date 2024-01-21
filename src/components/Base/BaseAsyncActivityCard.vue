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
  sale_amount:  {
    type: [String, Number],
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

//Variables for this component
const loaded = ref(false);
const image = ref(null);
const name = ref(null);
const price = ref(null);
const size = ref(null);
const token = ref(null);
const showbid = ref(true);
const action_type = ref(null);
const action_price = ref(null);
const action_from = ref(null);
const action_to = ref(null);

//Runs when the component is mounted to the screen
onMounted(async() => {
  if(props.id !== null && props.id !== '0'){
    try{

      const nft_payload = {
        name: props.id
      }

      // console.log("GETTING NFT DATA FOR NFT ->", props.id);

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
                      name.value = ipfs_json.name;


                    }else{
                      // console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
                      // console.log(ipfs_json);
                      image.value = null;
                      name.value = ipfs_json.name;
                    }

                  }

                });


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
                      name.value = new_json_test.name;

                    }else{
                      console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
                      console.log(jsonres);
                      image.value = null;
                      name.value = new_json_test.name;
                    }

                  })
                }catch(e){
                  //failed to fetch uri
                  console.log("CANT PROCESS URI FOR NFT ->", props.id);
                  console.log(e);
                  image.value = null;

                }

              }

            }

          }

        }

        //The nft has loaded
        loaded.value = true;

      })
    }catch(e){
      console.log(e);
      loaded.value = true;
    }
  }else{
    loaded.value = true;
  }

  if(price.value === null){price.value = ''}

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
  await router.push({path: "/nft/"+encoded});
};


</script>
<template>
  <div :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="bg-light mt-8 mb-8 card dark:bg-foreground rounded-lg px-2 py-2 w-[420px]  mx-2 hover:bg-high h-36 hover:scale-105 ease-in flex justify-start items-start duration-500">

    <!--                        Large Screen -->
    <div @click="clickCollection(props.id)" class="flex cursor-pointer w-full ">


      <div v-if="image === null"  class="skeleton rounded-box h-[130px] w-[180px]"></div>
      <img v-if="image !== null" class="h-[130px] w-[130px] min-h-[130px] min-w-[130px] max-h-[130px] max-w-[130px] object-cover rounded-lg" height="100" width="100"  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">


      <div class="w-full flex flex-col pl-4 items-start text-start justify-start">
        <div :class="name === null ? 'skeleton px-6 w-44' : ''" class="font-3 text-lg mb-1 normal-case tracking-wide pt-2">
          {{name === null ? '&nbsp;' : name.slice(0,20)}}
        </div>
        <div  :class="price === null ? 'skeleton rounded-box px-6 w-44' : ''">
          <span class="font-2 text-lg">{{price}}</span> <span class="text-neutral text-lg"> &nbsp;</span>
        </div>
        <div class="w-full">
          <hr class="h-px mt-5 bg-gray-200 border-0 dark:bg-gray-700">
        </div>
        <div v-if="loaded === true"  class="flex w-full pr-2 text-center items-center justify-between">

          <div class="text-accent text-xs font-2 mt-5">
            <font-awesome-icon icon="fa-light fa-cart-shopping" />
            Purchased
          </div>

          <div class="text-neutral normal-case text-xs mt-5 ">
            {{props.sale_amount}} KDA
          </div>

        </div>
        <div v-if="loaded !== true"  class="flex w-full pr-2 mt-2 pb-1 text-center items-center justify-between">

          <div :class="showDarkBG === true ? 'skeleton' : 'skeleton'" class="text-accent rounded-box text-sm font-2 w-1/2 mt-2" >
            &nbsp;
          </div>

          <div :class="showDarkBG === true ? 'skeleton' : 'skeleton'" class="text-accent rounded-box text-sm font-2 w-1/4 mt-2" >
            &nbsp;
          </div>

        </div>


      </div>
    </div>

  </div>
</template>

<style lang="scss" scoped>


.loadingbg_dark {
  background-image: linear-gradient(90deg, #292929 0px, #2c2c2c 30px, #292929 60px);
  background-size: calc(180px + 180px);
  animation: refresh 1.2s infinite ease-out;
}

.loadingbg_light {
  background-image: linear-gradient(90deg, #e2e2e2 0px, #efefef 30px, #e2e2e2 60px);
  background-size: calc(180px + 180px);
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

.tokenVideo {
  border-radius: .5rem;
  max-width: 100%;
  height: 30vh;
  object-fit: cover;
}



.card{
  user-select:none;
  transition: .5s all;
  &:hover{
    transform: scale(1.015);
  }
}

</style>
