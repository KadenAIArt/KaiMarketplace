<script setup>
import {ref, onMounted} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
let store = useStore();
let router = useRouter();

const props = defineProps({
  image: String,
  mediatype: String,
  name: String,
  collection: String,
  price: String,
  token: String,
  size:  {
    type: Number,
    default: 0
  },
  endtime: String,
  nftid:  {
    type: String,
    default: "0"
  },
  id:[String,Number],
  showbid: {
    type: Boolean,
    default: false
  },
  showsell: {
    type: Boolean,
    default: false
  },
  showtime: {
    type: Boolean,
    default: false
  },
  demo: {
    type: Boolean,
    default: false
  }
});

const loaded = ref(false);
console.log("propsimage");
console.log(props.image);

const nft_image = ref(null);


onMounted(async() => {
  if(props.image !== null){

    nft_image.value = props.image;
    try{
      let loading =  fetch(props.image).then((res)=>{
        if(res?.status === 200){
          loaded.value = true;
        }
      })
    }catch(e){
      console.log(e);
      loaded.value = true;
    }
  }else{
    nft_image.value = '/images/unrevealed.svg';
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

//Click bid stuff
const clickBid = async() =>{
  const nft_payload = {
    nft: {
      image: props.image
    }
  }
  await store.dispatch("accounts/clickBidButton", nft_payload);
}

const clickSell = async() =>{
  const nft_payload = {
    nft: {
      image: props.image
    }
  }
  await store.dispatch("accounts/clickSellButton", nft_payload);
}

const goToNFT = async (nft) => {
  console.log(nft);
  const encoded = encodeURIComponent(nft);
  await router.push({path: "/nft/"+encoded});
  // await router.push({path: `/nft/${nft}`});
};

//Determines if this card shows a button or not
const showButton = () =>{
  return props.showbid === true || props.showsell === true;
}

const clickNFT = async (nft) => {
  console.log(nft);
  const encoded = encodeURIComponent(nft);
  await router.push({path: "/nft/"+encoded});
};

</script>
<template>
  <div class="nft-item nft " :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'">
    <div class="nft-innr">
      <div :class="showDarkBG === true ? 'nft-img-dark' : 'nft-img-light'">
        <div v-if="nft_image === null"  :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class=" rounded-box h-[300px] w-[300px]"></div>
        <img @click="props.nftid !== '0' ? clickNFT(props.nftid) : '#'" v-if="nft_image !== null"
             class='tokenImage rounded-lg'  :src="nft_image"  @error="$event.target.src = '/images/kadenai_main_gradient.svg'" alt="NFT">
      </div>
      <div class="nft-cnt" :class="showDarkBG === true ? 'bg-foreground' : 'bg-light'">
        <div class="nft-mid  pt-1 px-3" :class="showButton === true ? 'dissappear' : ''">
          <div class="w-full justify-start text-start flex flex-col">
            <div v-if="loaded === true" class="text-black tracking-wider namearea font-2 text-lg dark:text-light">{{props.name.slice(0,20)}} {{props.name.length > 19 ? '...' : ''}}</div>
            <h4 v-if="loaded !== true" :class="showDarkBG === true ? 'loadingbg_dark' : 'loadingbg_light'" class="text-black tracking-wider font-2  dark:text-light"> &nbsp;</h4>
            <hr class="h-px mt-4 bg-gray-200 border-0 dark:bg-neutral-800">
            <div v-if="loaded === true" class="grid flex statsarea mb-4 justify-between grid-cols-2">

              <div class="col-span-1 flex flex-col justify-start text-start">
                <a class="mt-4 text-xs font-2  text-neutral" href="#">ID</a>
                <div class="flex mt-[0.8px] gap-2">
                  <a class="text-black leading-3 font-2 dark:text-white" href="#">{{props.id}}</a> <a class="text-black leading-3 font-0 dark:text-neutral" href="#">{{props.token}}</a>

                </div>
                  </div>

              <div class="col-span-1 flex flex-col justify-end text-end">
                <a class="mt-4 text-xs font-2  text-neutral" href="#">COLLECTION</a>
                <a class="text-black mt-[0.8px] leading-3 font-2 dark:text-white" href="#">{{(props.collection).slice(0,20)}}</a>
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

        <div v-if="showbid === true" class="w-full buybtn btn bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium'">
          Revealing Soon
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
