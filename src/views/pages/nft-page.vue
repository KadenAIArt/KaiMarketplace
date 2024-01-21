<script setup>
import {onMounted, ref} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import "v3-infinite-loading/lib/style.css";
import MagneticText from "@/components/MagneticText.vue";
import MagneticTextToken from "@/components/MagneticTextToken.vue";

let store = useStore();
let router = useRouter();

const props = defineProps({
  nftid: {
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

function coinName_contract(namespace, name) {
  let newnamespace = namespace + ".";
  let newname = name;
  if (namespace === null || namespace === "null") {
    newnamespace = "";
  }
  if (name === null || name === "null") {
    newname = "";
  }
  return newnamespace + newname;
}

function coinName_short(fungible) {
  const name = coinName_contract(fungible.refName.namespace, fungible.refName.name);
  if(name === 'coin' || name === ' coin'){
    return 'KDA';
  }
  return name;
}


//Variables for this component
const loaded = ref(false);
const image = ref(null);
const name = ref(null);
const medium = ref("user")
const description = ref(null);
const attributes = ref(null);
const price = ref(null);
const size = ref(null);
const token = ref(null);
const coin_name = ref(null);
const pactid = ref(null);
const seller = ref(null);
const showbid = ref(null);
const showbuy = ref(null);
const is_for_sale = ref(null);
const current_price = ref(null);
const highest_bid = ref(null);
const minimum_bid = ref(null);
const last_sale = ref(null);
const owner = ref(null);
const rank = ref(null);
const current_date = ref(null);
const sale_type = ref(null);
const end_time = ref(null);

//Runs when the component is mounted to the screen
onMounted(async() => {
  const accountNameToVerify = localStorage.getItem("kai_accountName");
  if(props.nftid !== null && props.nftid !== '0'){
    try{

      const nft_payload = {
        name: props.nftid,
        includesales: true
      }

      console.log("GETTING NFT DATA FOR NFT ->", props.nftid);

      //First lets get our NFT info from the backend
      let loading = await timeout(5000, store.dispatch("accounts/getNFT", nft_payload)).then(async(nftres)=>{

        console.log("NFT DATA:");
        console.log(nftres);

        if(nftres.account){
          medium.value = nftres.account;
        }

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

                    console.log("ipfs_json");
                    console.log(ipfs_json);

                    if(ipfs_json.image){

                      console.log("FOUND NFT IMAGE:");
                      console.log(ipfs_json.image);

                      // image.value = 'https://ipfs.io/ipfs/'+ipfs_json.image.slice(7);
                      image.value = await determineImageLink(ipfs_json.image.slice(7));

                      if(ipfs_json.name){name.value = ipfs_json.name;}
                      if(ipfs_json.description){description.value = ipfs_json.description;}
                      if(ipfs_json.attributes){attributes.value = ipfs_json.attributes;}


                    }else{
                      console.log("CANT FIND NFT IMAGE FOR NFT ->", props.nftid);
                      console.log(ipfs_json);
                      image.value = null;
                      if(ipfs_json.name){name.value = ipfs_json.name;}
                      if(ipfs_json.description){description.value = ipfs_json.description;}
                      if(ipfs_json.attributes){attributes.value = ipfs_json.attributes;}
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

                      if(new_json_test.name){name.value = new_json_test.name;}
                      if(new_json_test.description){description.value = new_json_test.description;}
                      if(new_json_test.attributes){attributes.value = new_json_test.attributes;}

                    }else{
                      console.log("CANT FIND NFT IMAGE FOR NFT ->", props.nftid);
                      console.log(jsonres);
                      image.value = null;
                      if(new_json_test.name){name.value = new_json_test.name;}
                      if(new_json_test.description){description.value = new_json_test.description;}
                      if(new_json_test.attributes){attributes.value = new_json_test.attributes;}
                    }

                  })
                }catch(e){
                  //failed to fetch uri
                  console.log("CANT PROCESS URI FOR NFT ->", props.nftid);
                  console.log(e);
                  image.value = null;

                }

              }

            }

          }

        }



        //Now lets go through this nfts sales data if it exists
        if(nftres.salesData && nftres.salesData !== null){

          console.log("CHECKING FOR SALESDATA FOR NFT ->", name)

          if(nftres.salesData.seller !== undefined && nftres.salesData.seller !== null && nftres.salesData.seller === accountNameToVerify){
            nftres.account = nftres.salesData.seller;
          }

          try{

            if(nftres.salesData.saleType !== undefined){

              if(nftres.salesData.saleType === 'fixed' && nftres.salesData.isActive === true){

                price.value = nftres.salesData.salePrice;
                token.value = nftres.salesData.fungible;
                pactid.value = nftres.salesData._id;
                seller.value = nftres.salesData.seller;

                coin_name.value = coinName_short(nftres.salesData.fungible);

                if(nftres.salesData.timeout === 0){
                  //This token is forsale

                  console.log("nftres.account ->", nftres.account)
                  console.log("accountNameToVerify ->", accountNameToVerify)

                  if(nftres.account === accountNameToVerify){
                    //This user owns this NFT so lets show the "For Sale" button on the card so they can manage the sale
                    is_for_sale.value = true;
                  }else{
                    //Show buy now button on this card, overwriting the showbid
                    showbuy.value = true;
                    showbid.value = true;
                  }


                }else{

                  const tier_end_time = new Date(nftres.salesData.timeout.time ? nftres.salesData.timeout.time : nftres.salesData.timeout.timep ? nftres.salesData.timeout.timep : nftres.salesData.timeout).getTime();
                  const current_time = new Date().getTime();
                  //Check if the sale is still on-going
                  if (current_time < tier_end_time) {

                    if(nftres.account === accountNameToVerify){
                      //This user owns this NFT so lets show the "For Sale" button on the card so they can manage the sale
                      is_for_sale.value = true;
                    }else{
                      //Show buy now button on this card, overwriting the showbid
                      showbuy.value = true;
                      showbid.value = true;
                    }


                  }

                  end_date.value = tier_end_time;

                }



              }

            }

          }catch(e){
            console.log(e);
          }

        }



        if(nftres.salesData){

          if(nftres.salesData.saleType !== undefined){

            sale_type.value = nftres.salesData.saleType;

            console.log("NFT HAS SALES DATA");

            current_date.value = new Date().getTime();

            current_date.value = current_date.value / 1000;

            if(nftres.salesData['end-date']){

              end_time.value = nftres.salesData['end-date'].int;

            }

            console.log("nftres.salesData['highest-bid']");
            console.log(nftres.salesData['highest-bid']);

            if(nftres.salesData['highest-bid']){

              highest_bid.value = nftres.salesData["highest-bid"];

              console.log("highest_bid");
              console.log(highest_bid);

            }else{
              highest_bid.value = 0;
            }

            if(nftres.salesData['reserve-price']){

              minimum_bid.value = nftres.salesData['reserve-price'];

              console.log("minimum_bid");
              console.log(minimum_bid);

            }

          }

        }

        //Parse account out of NFT
        if(nftres.account){ owner.value = nftres.account; }

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


//VARIABLES FOR THIS PAGE
const account = localStorage.getItem("kai_accountName");

//Runs when user clicks buy now
const clickBuy = async()=>{
  console.log("CLICKING BUY BUTTON");
  const nft_payload = {
    nft: {
      id: props.nftid,
      image: image.value,
      name: name.value,
      price: price.value,
      coin_name: coin_name.value,
      token: token.value,
      pactid: pactid.value,
      seller: seller.value,
    }
  }
  console.log("BUY NFT PAYLOAD");
  console.log(nft_payload);
  await store.dispatch("accounts/clickBuyButton", nft_payload);
}

const c_tab = ref('overview')


const clickProfile = async () => {
  await router.push({path: `/profile/${owner.value}`});
};

</script>
<template >

  <section>

    <!--  Medium + Screen Moving Banner-->
    <div v-if="image !== null" :class="showDarkBG === false ? 'lighten' : 'darken '" class="z-1  hidden md:block pl-2 ">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark '" class="absolute">
        <div class="flex gallery_line">
          <img v-for="(g) in 3" :key="g" :src="image" style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 3" :key="g" :src="image"  style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 3" :key="g" :src="image"  style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 3" :key="g" :src="image"   style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 3" :key="g" :src="image"  style="width: 20vw"/>
        </div>
      </div>
    </div>

    <!--  Small + Screen Moving Banner-->
    <div v-if="image !== null" class="z-1 md:hidden block">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <img v-for="(g) in 10" :key="g" :src="image" style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 10" :key="g" :src="image" style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 10" :key="g" :src="image" style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 10" :key="g" :src="image" style="width: 20vw;"/>
        </div>
        <div class="flex gallery_line">
          <img v-for="(g) in 10" :key="g" :src="image" style="width: 20vw;"/>
        </div>
      </div>

    </div >

    <!--  Top Intro Full Page Section Over Banner-->
    <div class="mx-auto hero relative z-10 " >
      <div class="container  mt-8 h-full md:mx-auto" >
      </div>
    </div>


    <div>


      <!--    New Component Testing-->

      <div class="mt-20 md:mt-56 z-10 relative mb-24 container mx-auto">

        <section>

          <div class="w-full">

            <div class="flex w-full gap-8 flex-col">


              <div class="grid mb-24 gap-x-32 grid-cols-1 md:grid-cols-12">



                <div v-if="c_tab === 'overview'" class="col-span-1 md:col-span-6 md:px-8">
                  <section class="md:hidden mb-8">
                    <div v-motion-roll-left class="flex w-full justify-between ">
                      <div class="flex  gap-2">
                        <div v-if="image === null"  class="skeleton rounded-lg h-10 w-10"></div>
                        <img v-if="image !== null" class="h-12 w-12 object-cover rounded-lg object-scale-down"  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'">
                        <div class="flex  flex-col">
                          <span :class="name === null ? 'skeleton px-4' : ''" class="font-2 text-lg">{{name === null ? '&nbsp;' : name}}</span>
                          <span class="font-2 text-xs">{{props.nftid}}</span>
                        </div>
                      </div>
<!--                      <div class="flex gap-2">-->
<!--                        <button class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-light  fa-heart" /></button>-->
<!--                        <button class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-light  fa-share" /></button>-->
<!--                      </div>-->
                    </div>

                    <div v-motion-pop class="flex mt-4 text-4xl font-2">
                      <span :class="name === null ? 'skeleton px-4' : ''">{{name === null ? '&nbsp;' : name}}</span>
                    </div>

                    <div v-motion-roll-left class="flex gap-10">
                      <div class="break-all">
                        <span class="font-2 text-sm" :class="owner === null ? 'skeleton px-10' : ''">
                        <MagneticText
                            v-slot="{ tokens }"
                            as="p"
                            class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                            :body="medium">
                     Owned By:
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
                      </div>
                    </div>
                  </section>

                  <div v-if="image === null"  class="skeleton rounded-box h-[640px] w-[640px]"></div>

                  <img v-if="image !== null" :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'"   class="w-full rounded-lg object-scale-down" :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" />


                </div>



                <div v-if="c_tab === 'overview'" class="col-span-1 md:col-span-6 md:px-8">

                  <section class="hidden md:block">
                    <div v-motion-slide-right class="flex w-full justify-between ">
                      <div class="flex  gap-2">
                        <div v-if="image === null"  class="skeleton rounded-lg h-10 w-10"></div>
                        <img v-if="image !== null" class="h-12 w-12 object-cover rounded-lg"  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'">
                        <div class="flex  flex-col">
                          <span :class="name === null ? 'skeleton px-4' : ''" class="font-2 text-lg">{{name === null ? '&nbsp;' : name}}</span>
                          <span class="font-2 text-sm">{{props.nftid}}</span>
                        </div>

                      </div>
<!--                      <div class="flex gap-2">-->
<!--                        <button class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-light  fa-heart" /></button>-->
<!--                        <button class="btn text-xl bg-light border-light dark:border-foreground dark:bg-foreground"><font-awesome-icon icon="fa-light  fa-share" /></button>-->
<!--                      </div>-->
                    </div>

                    <div v-motion-pop :class="name === null ? 'skeleton' : ''" class="flex mt-2 text-4xl font-2">
                      {{name === null ? '&nbsp;' : name}}
                    </div>

                    <div v-motion-slide-right class="flex mt-2 gap-4">
<!--                      <div >-->
<!--                        <span class="text-neutral text-xs">Rank:</span> <span class="font-2 text-xs" :class="rank === null ? 'skeleton px-2' : ''"> {{rank === null ? '&nbsp;' : rank}}</span>-->
<!--                      </div>-->
                      <div @click="clickProfile()">
                        <span class="text-neutral text-sm"></span> <span class="font-2 text-sm" :class="owner === null ? 'skeleton px-10' : ''"> <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="medium">
                    Owned By:
                  <MagneticTextToken
                      v-for="(token, index) in tokens"
                      v-slot="{ value }"
                      :key="index"
                      :threshold="40"
                      class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                    <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                  </MagneticTextToken>
                </MagneticText></span>
                      </div>
                    </div>
                  </section>


                  <div v-if="sale_type === 'fixed'"  :class="showDarkBG === false ? 'custom-box-shadow4' : ''" class=" bg-light dark:bg-foreground mt-12 p-6 flex-col rounded-lg">

<!--                    <div v-if="sale_type === 'marmalade-sale.conventional-auction'" class="flex text-xl gap-4 justify-start text-start items-start">-->
<!--                      <span class="text-neutral font-2">Sale ends in:</span>-->

<!--                      <vue-countdown :time="(end_time - current_date) * 1000" v-slot="{ days, hours, minutes, seconds }">-->
<!--                        <span class="font-2">{{ days }}</span> d <span class="font-2">{{ hours }}</span> h <span class="font-2">{{ minutes }}</span> m <span class="font-2">{{ seconds }}</span> s-->
<!--                      </vue-countdown>-->

<!--                    </div>-->




                    <div  class="flex mt-2 w-full justify-between">
                      <div v-if="sale_type === 'fixed'" class="uppercase flex justify-between font-2 w-full text-sm">
                        <span class="text-neutral text-xl">PRICE</span>
                        <div class="text-xl">
                          {{price}} <span class="font-1 text-neutral">{{coin_name}}</span>
                        </div>
                      </div>

<!--                      <div v-if="sale_type === 'marmalade-sale.conventional-auction'" class="uppercase flex-col font-2 text-sm">-->
<!--                        <span class="text-neutral">MINIMUM BID</span>-->
<!--                        <div class="text-xl">-->
<!--                          {{minimum_bid}}-->
<!--                        </div>-->
<!--                      </div>-->
<!--                      <div v-if="sale_type === 'marmalade-sale.conventional-auction'" class="uppercase flex-col font-2 text-sm">-->
<!--                        <span class="text-neutral">HIGHEST OFFER</span>-->
<!--                        <div class="text-xl">-->
<!--                          {{highest_bid}}-->
<!--                        </div>-->
<!--                      </div>-->
<!--                      <div  class="uppercase flex-col font-2 text-sm">-->
<!--                        <span class="text-neutral">ROYALTYS</span>-->
<!--                        <div class="text-xl">-->
<!--                          4<span class="font-1 text-neutral">%</span>-->
<!--                        </div>-->
<!--                      </div>-->
<!--                      <div v-if="sale_type !== 'marmalade-sale.conventional-auction'" class="uppercase flex-col font-2 text-sm">-->
<!--                        <span class="text-neutral">LAST SALE</span>-->
<!--                        <div class="text-xl">-->
<!--                          10 <span class="font-1 text-neutral">KDA</span>-->
<!--                        </div>-->
<!--                      </div>-->
                    </div>
                    <div  v-if="sale_type === 'fixed'" class="divider relative w-full"></div>
                    <div v-if="sale_type === 'fixed'" class="mb-4">
                      <a @click="clickBuy" class="px-6 mt-8 h-16 flex justify-center py-4 w-full relative rounded group font-medium text-white font-medium inline-block">
                        <span class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                        <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>
                        <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                        <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>
                        <span class="relative font-2 flex items-center gap-4 tracking-wide text-xl md:px-4"><font-awesome-icon icon=" fa-light fa-wallet" /> Buy Now</span>
                      </a>
                    </div>

<!--                    <div v-if="sale_type === 'marmalade-sale.conventional-auction'" class="mb-4 mt-12">-->
<!--                      <a href="#_" class="px-6 mt-0 h-16 flex justify-center py-4 w-full relative rounded group font-medium text-white font-medium inline-block">-->
<!--                        <span class="absolute top-0 left-0 w-full h-full rounded opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>-->
<!--                        <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded opacity-50 from-primary to-secondary"></span>-->
<!--                        <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>-->
<!--                        <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded bg-gradient-to-r to-secondary from-primary"></span>-->
<!--                        <span class="relative font-2 flex items-center gap-4 tracking-wide text-xl md:px-4"><font-awesome-icon icon=" fa-light fa-wallet" /> Place Bid</span>-->
<!--                      </a>-->
<!--                    </div>-->

<!--                    <button v-if="sale_type !== 'marmalade-sale.conventional-auction' && sale_type !== 'marmalade-sale.fixed-sale'" class="btn w-full mt-12 text-xl h-16 text-center items-center flex normal-case btn-outline btn-accent"><font-awesome-icon icon=" fa-light fa-tag" /> Make Offer</button>-->

                  </div>


                  <div  class="mt-8">
                    <div :class="showDarkBG === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="collapse rounded-lg collapse-plus">
                      <input type="checkbox" class="peer" />
                      <div class="collapse-title text-xl font-2 p-6 bg-light dark:bg-foreground  ">
                        Properties
                      </div>
                      <div class="collapse-content bg-light dark:bg-foreground">
                        <div v-if="attributes === null || attributes.length <= 0" class="flex w-full">
                          <div  class="grid gap-2 h-full w-full grid-cols-3">

                            <div class="col-span-1">
                              <div class="flex justify-center text-center py-8 w-full h-full rounded-lg bg-white dark:bg-dark">
                                <div class="flex p-2 flex-col w-full">
                                  <span class="font-2 text-xs md:text-sm break-all uppercase text-neutral">
                                    No
                                  </span>
                                  <span class="font-2 tracking-wider md:text-xl">
                                    Traits
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        <div v-if="attributes !== null && attributes.length > 0" class="flex p-2 mt-0 h-full flex-col w-full">

                          <div  class="grid gap-2 h-full grid-cols-3">

                            <div v-for="(attribute, idx) in attributes" :key="idx" class="col-span-1">
                              <div class="flex justify-center text-center py-8 w-full h-full rounded-lg bg-white dark:bg-dark">
                                <div class="flex p-2 flex-col w-full">
                                  <span class="font-2 text-xs md:text-sm break-all uppercase text-neutral">
                                    {{attribute.trait_type ? attribute.trait_type : attribute.trait ?  attribute.trait : ''}}
                                  </span>
                                  <span class="font-2 tracking-wider md:text-xl">
                                    {{attribute.value}}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>

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
    content: "yo";
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
    content: "yo";
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
