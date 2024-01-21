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


//Variables for this component
const loaded = ref(false);
const image = ref(null);
const name = ref(null);
const price = ref(null);
const coin_name = ref(null);
const size = ref(null);
const token = ref(null);
const pactid = ref(null);
const showbid = ref(false);
const showbuy = ref(false);
const is_owner = ref(false);
const is_for_sale = ref(false);
const end_date = ref(null);
const seller = ref(null);

//Runs when the component is mounted to the screen
onMounted(async() => {
    if(props.id !== null && props.id !== '0'){
      try{

        const nft_payload = {
          name: props.id
        }

        // console.log("GETTING NFT DATA FOR NFT ->", props.id);

        //Get users account from store, it should be logged in
        const accountNameToVerify = localStorage.getItem("kai_accountName");
        const accountNameToVerify2 = localStorage.getItem("kai_accountName");

        //First lets get our NFT info from the backend
        let loading = await timeout(5000, store.dispatch("accounts/getNFT", nft_payload)).then(async(nftres)=>{

          // console.log("NFT DATA:");
          // console.log(nftres);

          if(nftres !== undefined && nftres !== null && nftres !== 0){

            //Lets check if the user is the owner of this nft
            if(nftres.account !== undefined){
              if(accountNameToVerify === nftres.account || accountNameToVerify2 === nftres.account){
                is_owner.value = true;
              }
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

                    // console.log("IPFS METADATA");

                    let loading = await fetchWithRetry(nftres.uri.slice(7)).then(async(res1)=> {

                      // console.log("METADATA RESPONSE:");
                      // console.log(res1);

                      let isimageipfs = await imageorvideo(res1.url);

                      // console.log("imageorvideo check ->", isimageipfs);

                      if(isimageipfs === false) {
                        let ipfs_json = await res1.json();

                        // console.log("ipfs_json");
                        // console.log(ipfs_json);

                        if(ipfs_json.image){

                          // console.log("FOUND NFT IMAGE:");
                          // console.log(ipfs_json.image);

                          image.value = await determineImageLink(ipfs_json.image.slice(7));
                          name.value = ipfs_json.name;


                        }else{
                          console.log("CANT FIND NFT IMAGE FOR NFT ->", props.id);
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
                          // console.log(jsonres);
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

            // console.log("CHECKING FOR SALESDATA FOR NFT ->", name);
            // console.log(nftres.salesData);
            //Now lets go through this nfts sales data if it exists
            if(nftres.salesData && nftres.salesData !== null){

              //Lets check if this nft is for sale, and if the user is the seller, if so, then they are the owner of this nft
              if(nftres.salesData.seller !== undefined && nftres.salesData.seller !== null && nftres.salesData.seller === accountNameToVerify){
                nftres.account = nftres.salesData.seller
                is_owner.value = true;
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

                      // console.log("nftres.account ->", nftres.account)
                      // console.log("accountNameToVerify ->", accountNameToVerify)

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
  const encoded = encodeURIComponent(nft);
  await router.push({path: "/nft/"+nft});
}

//Opens market listing modal when user clicks "Auction" button on a NFT card
const clickSell = async() =>{
  const nft_payload = {
    nft: {
      id: props.id,
      image: image.value,
      name: name.value
    }
  }
  await store.dispatch("accounts/clickSellButton", nft_payload);
}

const clickUpdateListing = async()=>{
  const nft_payload = {
    nft: {
      id: props.id,
      image: image.value,
      name: name.value,
      price: price.value,
      coin_name: coin_name.value,
      token: token.value,
      pactid: pactid.value,
      seller: seller.value
    }
  }
  await store.dispatch("accounts/clickUpdateListingButton", nft_payload);
}

const clickBuy = async()=>{
  const nft_payload = {
    nft: {
      id: props.id,
      image: image.value,
      name: name.value,
      price: price.value,
      coin_name: coin_name.value,
      token: token.value,
      pactid: pactid.value,
      seller: seller.value,
    }
  }
  await store.dispatch("accounts/clickBuyButton", nft_payload);
}


</script>
<template>
  <div v-motion-pop class="nft-item nft group" :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'">
    <div class="nft-innr">

      <div :class="showbid === true ? showDarkBG === true ? 'nft-img-dark' : 'nft-img-light' : 'nft-img'">
        <div v-if="image === null"  :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class=" rounded-box h-[300px] w-[300px]"></div>
        <img @click="id !== '0' ? clickNFT(id) : '#'" v-if="image !== null"
             class='tokenImage rounded-lg'  :src="image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
      </div>

      <button @click="clickSell" v-if="is_owner === true  && is_for_sale === false" class="opacity-0 btn btn-xs group-hover:opacity-100 absolute top-[25px] right-7 uppercase rounded-md text-xs font-2 flex items-center justify-center bg-primary-500 dark:text-white hover:bg-primary-600 transition-all duration-200 z-10"> Market </button>
      <button @click="clickUpdateListing" v-if="is_owner === true && is_for_sale === true"  class="opacity-0 btn btn-xs group-hover:opacity-100 absolute top-[25px] right-7 uppercase rounded-md text-xs font-2 flex items-center justify-center bg-primary-500 dark:text-white hover:bg-primary-600 transition-all duration-200 z-10"> For Sale </button>

      <div class="nft-cnt" :class="showDarkBG === true ? 'bg-foreground' : 'bg-light'">
        <div :class="showbid === true ? 'nft-mid-t' : ''" class="nft-mid  pt-1 px-3" >
          <div class="w-full justify-start text-start flex flex-col">
            <div v-if="name !== null" class="text-black tracking-wider namearea font-2 text-lg dark:text-light">{{name.slice(0,20)}} {{name.length > 19 ? '...' : ''}}</div>
            <h4 v-if="name === null" :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="text-black tracking-wider font-2  dark:text-light"> &nbsp;</h4>
            <hr class="h-px mt-4 bg-gray-200 border-0 dark:bg-neutral-800">
            <div v-if="loaded === true" class="grid flex statsarea mb-4 justify-between grid-cols-2">

              <div v-if="showbid === true && showbuy === true || is_for_sale === true" class="col-span-1 flex flex-col justify-start text-start">
                <a  class="mt-4 text-sm font-2  text-neutral" href="#">PRICE</a>
              </div>

              <div v-if="showbid !== true && showbuy !== true && is_for_sale === false" class="col-span-2 flex flex-col justify-start text-start">
                <a  class="mt-4 text-sm  font-2  text-neutral" href="#">{{(props.id).slice(0,28)}}..</a>
              </div>




              <div  v-if="showbid === true && showbuy === true || is_for_sale === true" class="col-span-1 flex flex-col justify-end text-end">
                <a class="mt-4 text-sm font-2  text-neutral" href="#"> {{price}} <a class="text-black leading-3 font-0 dark:text-neutral" href="#">{{coin_name}}</a></a>
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

        <div @click="clickNFT" v-if="showbid === true && showbuy === false" class="w-full buybtn btn bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium'">
          Bid
        </div>

        <div @click="clickBuy" v-if="showbid === true && showbuy === true" class="w-full buybtn btn bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium'">
          Buy Now
        </div>

      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>


.buybtn {
  position: absolute;
  opacity: 0;
  visibility: hidden;
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
  .nft-innr {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    transition: all .5s ease-in-out;
    .nft-img{
      height: 300px;
      img {
        object-fit: scale-down;
        max-width: 100%;
        width: 100%;
        height: 100%;

      }
    }
    .nft-img-dark {
      height: 300px;
      transition: all .5s ease-in-out;
      &:after{
        transition: all .4s ease-in-out;
        visibility: hidden;
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
        object-fit: scale-down;
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
        visibility: hidden;
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
        object-fit: scale-down;
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
        visibility: visible;
        transform: translateY(-15px);
      }
      .nft-mid-t{
        transform: translateY(-40px);
      }
      .nft-img-dark{
        visibility: visible;
        transform: scale(1.1);
        &:after {
          visibility: visible;
          bottom: 0px;
          left: 0px;
          opacity: 1;
        }
      }
      .nft-img-light{
        visibility: visible;
        transform: scale(1.1);
        &:after {
          visibility: visible;
          bottom: 0px;
          left: 0px;
          opacity: 1;
        }
      }
      .dissappear{
        opacity: 0;
        visibility: hidden;
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
