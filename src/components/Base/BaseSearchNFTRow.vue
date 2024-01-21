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

      console.log(i);
      console.log("FETCHING WITH LINK ->", link[i])

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
const current_price = ref(null);
const highest_bid = ref(null);
const last_sale = ref(null);
const owner = ref(null);

//Runs when the component is mounted to the screen
onMounted(async() => {
  if(props.id !== null && props.id !== '0'){
    try{

      const nft_payload = {
        name: props.id
      }

      console.log("GETTING NFT DATA FOR NFT ->", props.id);

      //First lets get our NFT info from the backend
      let loading = await timeout(5000, store.dispatch("accounts/getNFT", nft_payload)).then(async(nftres)=>{

        console.log("NFT DATA:");
        console.log(nftres);

        //Now lets get all the NFTs info, once the NFT is loaded we set loaded state to true

        if(nftres.image !== undefined){
          image.value = nftres.image;
        }else if(nftres.image === undefined){

          if(nftres.uri !== undefined){

            //lets check if we have ipfs or https metadata
            if(nftres.uri.length > 7){
              const checkme = nftres.uri.slice(0, 7);

              if(checkme === "ipfs://"){

                console.log("IPFS METADATA");

                let loading = await fetchWithRetry(nftres.uri.slice(7)).then(async(res1)=> {

                  console.log("METADATA RESPONSE:");
                  console.log(res1);

                  let isimageipfs = await imageorvideo(res1.url);

                  console.log("imageorvideo check ->", isimageipfs);

                  if(isimageipfs === false) {
                    let ipfs_json = await res1.json();

                    if(ipfs_json.image){

                      console.log("FOUND NFT IMAGE:");
                      console.log(ipfs_json.image);

                      image.value = await determineImageLink(ipfs_json.image.slice(7));
                      name.value = ipfs_json.name;


                    }else{
                      console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
                      console.log(ipfs_json);
                      image.value = null;
                      name.value = ipfs_json.name;
                    }

                  }

                });


              }else if(checkme === "https:/"){

                console.log("HTTPS METADATA");
                //check if URI is an image or JSON
                let isimage = await imageorvideo(nftres.uri);

                console.log("imageorvideo check ->", isimage);

                try{
                  let jsontest = await timeout(10000, fetch(nftres.uri)).then(async(jsonres)=>{

                    console.log("METADATA RESPONSE:");
                    console.log(jsonres);

                    let new_json_test = await jsonres.json();

                    console.log("METADATA JSON:");
                    console.log(new_json_test);

                    if(new_json_test.image){

                      console.log("FOUND NFT IMAGE:");
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

//Brings user to the NFT page when they click a NFT
const clickNFT = async (nft) => {
  console.log(nft);
  const encoded = encodeURIComponent(nft);
  await router.push({path: "/nft/"+encoded, force: true});
};

</script>
<template>
  <li @click="clickNFT(props.id)" class="w-full cursor-pointer text-gray-600 dark:text-gray-400 ">

    <div class="flex w-full border-2  border-transparent rounded-lg hover:border-accent hover:bg-white hover:dark:bg-foreground py-4 px-4 justify-between ">

      <div class="flex gap-2">
        <div v-if="image === null" class="skeleton rounded-lg h-10 w-10"></div>
        <img v-if="image !== null" class="h-12 w-12 object-cover rounded-lg"
             :src="image || '/images/kadenai_black.svg'"
             @error="$event.target.src = '/images/kadenai_black.svg'">
        <div class="flex  flex-col">
                           <span :class="name === null ? 'skeleton px-4' : ''"
                                 class="font-2 text-xs text-black dark:text-white md:text-lg">{{ name === null ? "&nbsp;" : name }}</span>
          <span class="font-2 text-xs md:text-sm">{{ props.id }}</span>
        </div>
      </div>
<!--      <div class="hidden md:flex flex-col gap-2">-->
<!--        <a class=" text-sm font-2  text-neutral" href="#">FLOOR PRICE</a>-->
<!--        <div class="flex mt-[0.8px] gap-2">-->
<!--          <a class="text-black leading-3 font-2 dark:text-white" href="#">10</a> <a class="text-black leading-3 font-0 dark:text-neutral" href="#">KDA</a>-->
<!--        </div>-->
<!--      </div>-->
    </div>
  </li>
</template>

<style lang="scss" scoped>



</style>
