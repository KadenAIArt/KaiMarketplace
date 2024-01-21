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
  image:  {
    type: String,
    default: "0"
  },
  collection:  {
    type: String,
    default: "0"
  },
  name:  {
    type: String,
    default: "0"
  },
  owner:  {
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
const nft_image = ref(null);
const nft_name = ref(null);
const showbid = ref(true);
const nft_owner = ref(null);
const current_price = ref(null);


//Runs when the component is mounted to the screen
onMounted(async() => {
  if(props.image !== null){
    nft_image.value = props.image;
    nft_name.value = props.name;
    nft_owner.value = props.owner;
    current_price.value = '-'
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

//Brings user to the NFT page when they click a NFT
const clickNFT = async (nft) => {
  console.log(nft);
  const encoded = encodeURIComponent(nft);
  await router.push({path: "/nft/"+encoded});
};

</script>
<template>
  <tr class="bg-white cursor-pointer border-b-2 dark:border-b-foreground/60 dark:bg-dark  rounded-lg hover:bg-light  dark:hover:bg-foreground">

    <td class="px-6 py-4 text-left text-lg dark:text-light font-2 rounded-l-lg">
      <span class="text-sm md:text-lg text-black dark:text-light font-2">{{idx + 1}}</span>
    </td>
    <th scope="row"  class="flex items-center px-6 py-5 rounded-l-lg mr-10 md:mr:0 text-gray-900 whitespace-nowrap dark:text-white">
      <div v-if="nft_image === null"  class="skeleton rounded-box h-[110px] w-[110px] max-h-[110px] max-w-[110px] object-contain"></div>
      <img v-if="nft_image !== null" class="h-[110px] w-[110px] max-h-[110px] max-w-[110px] object-contain rounded-lg" height="100" width="100"  :src="nft_image || '/images/kadenai_black.svg'"  @error="$event.target.src = '/images/kadenai_black.svg'" alt="NFT">
      <div class="pl-6 ">
        <p
            :class="nft_name === null ? 'skeleton px-6 w-44' : ''"
            class="md:text-lg  mt-2 font-2 break-all text-black dark:text-light_grey">
          {{nft_name === null ? '&nbsp;' : nft_name}}
        </p>
      </div>
    </th>
    <td class="px-6 py-4">
      <p
          :class="current_price === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        -
      </p>
    </td>
    <td class="px-6 py-4 text-right h-18 rounded-r-lg">
      <p
          :class="nft_owner === null ? 'skeleton' : ''"
          class="md:text-lg mt-2 font-2 text-black dark:text-light_grey">
        {{nft_owner === null ? '&nbsp;' : nft_owner.slice(0,20)+'..'}}
      </p>
    </td>
  </tr>
</template>

<style lang="scss" scoped>



</style>
