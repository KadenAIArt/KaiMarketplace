<script setup>
import { ref, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import {useStore} from "vuex";
import {useRouter} from "vue-router";
let store = useStore();
let router = useRouter();


const props = defineProps({
  id:  {
    type: String,
    default: "0"
  },
  name:  {
    type: String,
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

//Runs when the component is mounted to the screen
onMounted(async() => {
  if(props.id !== null && props.id !== '0'){
    try{

      const c_payload = {
        id: props.id
      }

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
                              console.log(ipfs_json);
                              image.value = '/images/kadenai_black.svg';
                            }

                          }

                        });

                      }catch(e){
                        console.log(e);
                        // console.log("COULNDT FIND NFT URI");
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

              //The collection has loaded
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

const checker = ref(false);

</script>
<template>
  <div :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
    <input v-model="checker" type="radio" name="wallet" :value="props.id" :id="props.id" class="peer hidden" />

    <label :for="props.id"
           class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light  dark:border-foreground dark:bg-foreground p-3 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">

      <div class="avatar">
        <div class="w-24 rounded-full ring ring-primary ring-offset-accent ring-offset-2">
          <div v-if="image === null"  class="skeleton rounded-box h-[30px] w-[30px]"></div>
          <img v-if="image !== null" class=" rounded-lg h-[30px] w-[30px]" height="30" width="30"  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
        </div>
      </div>

      <div class="flex flex-col">
        <p
            :class="name === null ? 'skeleton' : ''"
            class="md:text-sm mt-2 font-2 text-black dark:text-light_grey">
          {{name === null ? '&nbsp;' : name.slice(0,20)}}
        </p>

      </div>

    </label>
  </div>
</template>

<style lang="scss" scoped>


</style>
