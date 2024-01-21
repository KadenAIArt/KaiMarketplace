<script setup>
import {ref, onMounted} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
let store = useStore();
let router = useRouter();

const props = defineProps({
  id:String,
  image: String
});

const loaded = ref(false);
console.log("propsimage");
console.log(props.image);



onMounted(async() => {
  if(props.demo === false){
    if(props.image !== null){
      try{
        let loading = await fetch(props.image).then((res)=>{
          if(res?.status === 200){
            loaded.value = true;
          }
        })
      }catch(e){
        console.log(e);
        loaded.value = true;
      }
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
  <div class="nft-item nft"  :class="showDarkBG === true ? 'bg-foreground custom-box-shadow4_dark' : 'bg-light custom-box-shadow4'">
    <div class="nft-innr">
      <div class="group bg-light dark:bg-foreground rounded-lg outline outline-0 hover:outline-2 outline-gray-300 hover:outline-primary-500 dark:hover:outline-primary-500 dark:outline-gray-800 shadow-outline hover:shadow-hover">
        <a href="#">
          <div class="w-full relative h-[152px] bg-cover bg-center rounded-t-lg mb-4 flex items-end justify-center" style="background-image: url(https://loremflickr.com/520/340)">
            <img alt="" src="https://loremflickr.com/320/240" class="w-14 h-14 absolute -bottom-7 left-0 right-0 mx-auto rounded-full outline outline-1 outline-white dark:outline-neutral">
          </div>
        </a>
        <div class="py-6 px-4 text-center">
          <a href="#">
            <p class="group-hover:text-primary-500 font-medium text-lg flex items-center justify-center text-gray-900 dark:text-white mr-2"> Squiegee
            </p>
          </a>
          <hr class="my-4 border-t border-gray-700">
          <!-- Stats -->
          <div class="flex justify-between dark:text-light mx-2">
            <div class="text-center">
              <span class="block font-bold text-lg">1935</span>
              <span class="text-xs dark:text-gray-400"><font-awesome-icon icon="fa-light fa-cards-blank" /> NFTs</span>
            </div>
            <div class="text-center">
              <span class="block font-bold text-lg">120k</span>
              <span class="text-xs dark:text-gray-400"><font-awesome-icon icon="fa-light fa-scale-unbalanced" /> Sales</span>
            </div>
            <div class="text-center">
              <span class="block font-bold text-lg">3350</span>
              <span class="text-xs dark:text-gray-400"><font-awesome-icon icon="fa-light fa-users" /> Followers</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

.buybtn {
  position: absolute;
  opacity: 0;
  transition: all .5s ease-in-out;
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
    .nft-img {
      height: 300px;
      transition: all .5s ease-in-out;
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
        display: flex;
        flex-flow: row wrap;
        align-items: center;
        justify-content: space-between;
        height: auto;
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
      .nft-img{
        transform: scale(1.1);
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
