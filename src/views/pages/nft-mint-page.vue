<script setup>
import {onMounted, ref, computed} from "vue";
import {useStore} from "vuex";
import {useRouter} from "vue-router";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {Disclosure, DisclosureButton, DisclosurePanel} from "@headlessui/vue";
import BaseNFTCard from "@/components/Base/BaseNFTCard.vue";

let store = useStore();
let router = useRouter();


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

//VARIABLES FOR THIS PAGE
const account = localStorage.getItem("kai_accountName");
const loading = ref(true);
const nft_images = ref([]);
const nft_image = ref(null);
const nft_image2 = ref(null);
const nft_image3 = ref(null);
const nft_preview_image = ref(null);
const choice_collection = ref('no_collection');
const choice_royalty = ref('no_royalty');
const new_royalty_amount = ref(0);

const clickReplace = () =>{
  nft_preview_image.value = null;
}

//Handles when someone changes image input field
const onFileChange_image = async (e) => {
  let files = e.target.files || e.dataTransfer.files;
  if (!files.length) return;
  nft_image.value = files[0];
  await readFile_image(files[0]);
};

//Gets called when someone changes image input field
const readFile_image = async (file) => {
  let reader = new FileReader();
  reader.onload = e => {
    const imgObj = new Image();
    imgObj.src = e.target.result;
    nft_preview_image.value = imgObj.src;
  };
  reader.readAsDataURL(file);
};


//Adding / Removing traits logic
const new_trait_type = ref(null);
const new_trait_value = ref(null);

//Final List of nft traits, sent with NFT metadata
const TraitData = ref([]);

//Remove trait from trait data
const removeTrait = (idx) => {
  TraitData.value.splice(idx, 1);
};

//Remove trait from trait data
const clearTraits = () => {
  TraitData.value = [];
};

//Adds a trait to trait metadata list
const addTrait = () => {
  const t_new_trait = {
    "trait": new_trait_type.value,
    "value": new_trait_value.value
  };
  TraitData.value.push(t_new_trait);
  new_trait_type.value = null;
  new_trait_value.value = null;
};

const getRefreshPageData = async()=>{
  //Lets get users name so we can get their collections
  let name = localStorage.getItem("kai_accountName");
  //Assign mint to address as user
  nft_mint_to_address.value = name;

  //Lets get a users collections
  const collectionPayload = {
    name: name
  };
  user_collections_mv2.value = await store.dispatch("accounts/getUserCollectionData", collectionPayload);

  user_collections_final_mv2.value = [];

  if(user_collections_mv2.value !== null && user_collections_mv2.value !== 0 && user_collections_mv2.value !== undefined){

    for(let i = 0; i<user_collections_mv2.value.length; i++){

      let collection_object = {
        name: user_collections_mv2.value[i].name,
        value: user_collections_mv2.value[i]._id,
      }

      user_collections_final_mv2.value.push(collection_object);

    }

  }

  let new_collection_object = {
    name: '+ New Collection',
    value: 'new',
  }

  user_collections_final_mv2.value.push(new_collection_object);

  let new_collection_object2 = {
    name: '[REFRESH COLLECTION LIST]',
    value: '-refresh-',
  }

  user_collections_final_mv2.value.push(new_collection_object2);
}

//Runs when our page is mounted
onMounted(async() => {

   await getRefreshPageData();

  //Set loading to false
  loading.value = false;

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

//Watch if darkmode/lightmode change and update page
store.watch((state, getters) => getters["accounts/getDarkmode"], async (val) => {
  showDarkBG.value = val;
});


//Current Tab
const c_tab = ref('single')

//Changes tabs between nfts/activity/users
const changeTab = (view) =>{
  c_tab.value = view;
}

//Get random int
const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
}


//Collection selection/creation logic
const collection = ref(null);
const new_collection_name = ref(null);
const new_collection_size = ref(0);
const new_collection_id = ref(null);

const collectionChange_mng = async(change) =>{

 const clonedArray = Object.assign([], user_collections_final_mv2.value);

  for(let i = 0; i < clonedArray.length; i++){

    if(clonedArray[i].value === change){
      new_collection_name.value = clonedArray[i].name;
    }

  }

  if(change === 'new'){
    //window.my_modal_6.showModal()
    document.getElementById('my_modal_create_mng').showModal()
  }else if(change === '-refresh-'){
    //window.my_modal_6.showModal()
    collectionSelector.value.clear();
    collectionSelector.value.close();
    await getRefreshPageData();
  }else{
    new_collection_id.value = change
  }
}

const collectionSelector = ref(null);
const collectionSelector_mng = ref(null);

const user_collections_mv2 = ref(null);
const user_collections_final_mv2 = ref(null);
const isCreatingCollection = ref(false);
//Collection creation
const clickCreateCollection = async() =>{

  if(isCreatingCollection.value === false){
    isCreatingCollection.value = true;
    const t_guard = store.getters["accounts/getAccountKeys"]
    const new_collection_guard = t_guard[0];

    const collection_payload = {
      name: new_collection_name.value,
      size: new_collection_size.value,
      id: new_collection_name.value,
      guard: new_collection_guard
    }

    let new_collection_object = {
      name: new_collection_name.value,
      value: new_collection_name.value,
    }

    user_collections_final_mv2.value = [new_collection_object];



    await store.dispatch("accounts/createNewCollection", collection_payload).then(async()=>{
      my_modal_create_mng.close();
      await getRefreshPageData();
    });

  }


}

//Opens the create collection modal
const openCollectionModal = () =>{
  document.getElementById('my_modal_create_mng').showModal()
}


const determinePolicy = () =>{
  if(choice_collection.value === "collection" && choice_royalty.value === "royalty"){
    return "DEFAULT_COLLECTION_ROYALTY";
  }else if (choice_collection.value === "no_collection" && choice_royalty.value === "royalty"){
    return "DEFAULT_ROYALTY";
  }else if (choice_collection.value === "collection" && choice_royalty.value === "no_royalty"){
    return "DEFAULT_COLLECTION"
  }else if (choice_collection.value === "no_collection" && choice_royalty.value === "no_royalty"){
    return "DEFAULT";
  }
}

const nft_mint_to_address = ref(null);
const nft_royalty_account = ref(null);
const nft_authors = ref(null);
const nft_external_url = ref(null);
const nft_description = ref(null);
const nft_name = ref(null);
const currently_minting = ref(false);


//User clicks mint
const clickMint = async() =>{

  if(nft_name.value !== null){

    if(nft_description.value !== null){

      if(nft_image.value !== null){

        let user_credits = await store.getters["accounts/getUserCredits"];

        if(user_credits >= 1){

          let can_proceed = false;
          let policy = determinePolicy();
          if(policy === "DEFAULT_COLLECTION_ROYALTY" || policy === "DEFAULT_ROYALTY"){

            if(new_royalty_amount.value !== 0){
              can_proceed = true;
            }else{
              alert("Please set a royalty fee greater than 0%");
            }

          }else{
            can_proceed = true;
          }

          if(can_proceed === true){

            // console.log(determinePolicy);

            currently_minting.value = true;

            const backend_mint_payload = {
              image:  new File([nft_image.value], nft_image.value.name, {type: nft_image.value.type}),
              name: nft_name.value,
              description: nft_description.value,
              traits: TraitData.value,
              policy: determinePolicy()
            }

            //Send token to backend and it returns tokenID and URI
            const { tokenId, metadataHash: uri } = await store.dispatch("accounts/backendMint", backend_mint_payload);


            //Get collection ID payload
            const collection_payload = {
              name: new_collection_name.value
            }

            //Get collection ID
            const collection_id = await store.dispatch("accounts/createCollectionID", collection_payload).then(async(res)=>{

              // console.log("COLLECTION ID RES");
              // console.log(res);

              //Store collection id if it isnt 0
              const collectionid = res;

              //Check mint_to_address and get guard
              const check_payload = {
                name: nft_mint_to_address.value,
                chain: "8",
                tokenA: "coin"
              }


              //Look up guard
              await store.dispatch("accounts/getUserAccount_chain", check_payload).then(async(res)=>{


                // console.log("CHECK ADDRESS RESPONSE ->");
                // console.log(res);

                //Create mint payload
                if(res !== 0 && res.guard){
                  const mint_payload = {
                    policy: determinePolicy(),
                    uri: uri,
                    tokenid: tokenId,
                    collectionid: collectionid,
                    royalty: new_royalty_amount.value,
                    mint_to_guard: res.guard,
                    mint_to_account: nft_mint_to_address.value,
                    nft_preview_image: nft_preview_image.value,
                    nft_name: nft_name.value
                  }

                  //Mint
                  await store.dispatch("accounts/mintNFT", mint_payload);
                }

              });

            })


          }else{
            alert("Please correct any issues with your NFT Royalty Settings.")
          }



        }else{
          alert("You need at least 1 Kadena Credit to mint an NFT. Please purchase some credits from the Kadenai Credit store.")
        }


      }else{
        alert("Please select an image for your NFT.");
      }

    }else{
      alert("Please give your NFT a description.");
    }

  }else{
    alert("Please give your NFT a name.")
  }



  currently_minting.value = false;
}


//Checks an account that someone will mint to, to see if it exists
const checkMintToAddress = async() =>{
  const check_payload = {
    name: nft_mint_to_address.value,
    chain: "8",
    tokenA: "coin"
  }

  await store.dispatch("accounts/getUserAccount_chain", check_payload).then((res)=>{
    console.log("ADDRESS CHECK ->");
    console.log(res);
  })
}

//Verifys length of a name for user input verification
const checkName = computed(() => {
  if(nft_name.value !== null){
    if(nft_name.value !== ""){
      try{
        if(nft_name.value.length > 0){
          return true;
        }else{
          return false;
        }
      }catch{
        return false;
      }
    }else{
      return false;
    }
  }else{
    return true;
  }
});

//Verifies description
const checkDescription = computed(() => {
  if(nft_description.value !== null){
    if(nft_description.value !== ""){
      try{
        if(nft_description.value.length > 0){
          return true;
        }else{
          return false;
        }
      }catch{
        return false;
      }
    }else{
      return false;
    }
  }else{
    return true;
  }
});


const t_parsed_nfts = [{
  image: "/images/kadenai_black.svg",
  name: "New NFT",
  description: "The new NFT",
  id: "t:123"
},
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  },
  {
    image: "/images/kadenai_black.svg",
    name: "New NFT",
    description: "The new NFT",
    id: "t:123"
  }]

const test = () =>{
  my_modal_create_mng.close()
}

//Watches for new polling transactions and shows modal
store.watch((state, getters) => getters["accounts/getTransactionPolling"], async(val) => {

  isCreatingCollection.value = false;

  if (val === false) {
    await getRefreshPageData();
  }

})

const clickComingSoon = () =>{
  alert("Tutorials coming soon!")
}

</script>
<template >

  <section>

    <!--    Create Collection Modal-->
    <section>
      <dialog id="my_modal_create_mng" class="modal  modal-bottom sm:modal-middle">
        <form method="dialog" class="modal-box dark:bg-foreground border-0 font-bold">
          <div class="mb-5">
            <div>
              <div class="card-header flex justify-between">
                <p @click="test" class="font-bold dark:text-white text-3xl">
                  Create collection
                </p>
                <div>
                  <button class="btn px-4 text-accent rounded-full"> <font-awesome-icon icon="fa-light fa-xmark" />  </button>
                </div>
              </div>
              Lets create your new collection..
            </div>
            <section v-if="isCreatingCollection === true">
              <div class="p-4 sm:p-10 text-center overflow-y-auto">
                <!-- Icon -->
                <span class="mb-4 inline-flex justify-center items-center w-[62px] h-[62px] rounded-full border-4 border-yellow-50 bg-yellow-100 text-yellow-500">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"></path>
                    </svg>
                    </span>
                <!-- End Icon -->

                <h3 class="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
                  New Transaction!
                </h3>
                <p class="text-gray-500">
                  We just sent a new transaction to your wallet to create your collection!
                </p>

              </div>
            </section>
            <section>
              <div
                  class="justify-between items-center mt-4 mb-3"
              >

                <div class="form-control mt-8 w-full">
                  <label class="label w-full">
                    <span class="label-text font-2 uppercase">Give your Collection a Name</span>
                  </label>
                  <input v-model="new_collection_name" type="text" :disabled="isCreatingCollection" placeholder="Eg, My Collection" :class="new_collection_name === null || new_collection_name === '' ? 'italic' : ''" class="input  w-full"/>
                </div>


              </div>
              <div
                  class="justify-between items-center mb-3"
              >
                <div class="form-control mt-0 w-full">
                  <label class="label w-full">
                    <span class="label-text font-2 uppercase">Maximum Number of NFTs (0 for infinity)</span>
                  </label>
                  <input v-model="new_collection_size" type="text" :disabled="isCreatingCollection" placeholder="0" :class="new_collection_size === null || new_collection_size === '' ? 'italic' : ''" class="input  w-full"/>
                </div>
              </div>
            </section>



          </div>
          <div class="modal-action">
            <!-- if there is a button in form, it will close the modal -->
            <div class="flex w-full">
              <div class="w-full">
                <button v-if="new_collection_name === null || new_collection_name === '' || new_collection_size === null || new_collection_size === '' || isCreatingCollection === true" class="btn font-2 mt-0 text-xl w-full">
                  Create
                </button>
                <div v-if="isCreatingCollection === false && new_collection_name !== null && new_collection_name !== '' && new_collection_size !== null && new_collection_size !== ''" @click="clickCreateCollection" class="px-6 py-2.5 mt-0 h-14 flex items-center text-center justify-center relative rounded-lg group font-medium text-white ">
                  <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                  <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                  <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                  <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                  <span class="relative font-2 tracking-wide  md:px-4">             Create</span>
                </div>
              </div>
            </div>

          </div>


        </form>
      </dialog>
    </section>


    <!--  Medium + Screen Moving Banner-->
    <div :class="showDarkBG === false ? 'lighten' : 'darken '" class="z-1 darken hidden md:block pl-2 ">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark '" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img  src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img  src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img  src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_8.png" style="width: 20vw;"/>
          </transition>
        </div>
      </div>
    </div>


    <!--  Small + Screen Moving Banner-->
    <div class="z-1 md:hidden block">
      <div :class="showDarkBG === false ? 'gallery_light' : 'gallery_dark'" class="absolute">
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>

        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_8.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_3.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_4.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_5.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img  src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
        </div>
        <div class="flex gallery_line">
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/rabbit.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_1.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_2.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_6.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_7.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_8.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/badger.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/dragon.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/drag2.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="https://storage.googleapis.com/kaipub/bg/femwarrior.jpg" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_9.png" style="width: 20vw;"/>
          </transition>
          <transition name="bounceslow">
            <img src="/images/demo_nft_10.png" style="width: 20vw;"/>
          </transition>
        </div>
      </div>
    </div >

    <!--  Top Intro Full Page Section Over Banner-->
    <div class="mx-auto hero relative z-10 " >


      <div class="container  mt-52 h-full md:mx-auto" >
        <div class="h-full w-full flex justify-center item-center text-start">
          <div class="flex flex-col h-full w-full justify-center items-start text-start">

            <!--            Large Screen Collection Info Area-->
            <div class="hidden md:flex w-full gap-4">
              <div class="flex flex-col">
                <h1 v-motion-pop
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  Mint NFT
                </h1>
                <p v-motion-roll-left class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  <span class="font-2 dark:text-light">Create Marmalade V2 NFTs</span>
                </p>
              </div>
            </div>


            <!--            Small Screen Collection Info Area-->
            <div class="md:hidden grid grid-cols-1 w-full gap-4">
              <div class="flex col-span-1 flex-col">
                <h1
                    class="mt-0 mb-4 font-2 text-5xl text-black tracking-tight xl:text-6xl dark:text-[#FAFAFB]" >
                  Mint NFT
                </h1>
                <p
                    class="opacity-70 mt-2 font-1 text-black dark:text-light_grey">
                  <span class="font-2 dark:text-light">Create Kadena NFTs</span>
                </p>
              </div>
            </div>


          </div>
        </div>

      </div>

    </div>


    <!--    Main Stage Component -->
    <div>

      <div class="mt-32 z-10 relative mb-24 container mx-auto">

        <section>

          <div class="w-full">

            <div class="flex w-full gap-8 flex-col">

              <!-- Tabs -->
              <div class="tabs flex text-left">
                <a @click="changeTab('single')" class="tab font-2 pl-0 md:text-4xl  " :class="c_tab === 'single' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Single Mint</a>
<!--                <a @click="[changeTab('mass')]" class="tab font-2 md:text-4xl" :class="c_tab === 'mass' ? 'tab-active text-accent dark:text-white' : ''">Mass Mint</a>-->
                <a @click="[changeTab('tutorials')]" class="tab font-2 md:text-4xl" :class="c_tab === 'tutorials' ? 'tab-active text-accent dark:text-white' : 'text-neutral'">Tutorials</a>
              </div>


              <div class="grid gap-6 grid-cols-6 mt-4">

                <div class="col-span-6">

                  <!--            Tab Area Displays-->

                  <!--           Single Mint Area-->
                  <transition name="slide-fade">
                    <div v-if="c_tab === 'single'" class="relative  w-full overflow-x-auto sm:rounded-lg">

                      <!--           Drag and Drop           Step 1-->
                        <div v-if="nft_preview_image === null" class="relative justify-center bg-light dark:bg-foreground box w-full h-full items-center rounded-box font-bold p-4" >

                          <div class="p-[3px] border-2 border-dashed border-gray-300 dark:border-accent/40 dark:hover:border-secondary/40 h-full w-full flex justify-center rounded-lg">
                             <label v-if="nft_preview_image === null" for="fileInput" class="cursor-pointer group flex flex-col p-20 justify-center h-[320px] md:h-full w-full items-center bg-white dark:bg-dark  rounded-lg outline outline-1 hover:outline-2 outline-gray-300 hover:outline-primary-500 dark:hover:outline-secondary/10 dark:outline-gray-800 shadow-outline hover:shadow-hover">
                              <svg class="w-9 h-9 fill-gray-700 dark:fill-accent group-hover:fill-primary-500" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3.6 13C1.61175 13 0 11.4163 0 9.46429C0 7.92232 1.00425 6.61116 2.405 6.12746C2.40175 6.06116 2.4 5.99487 2.4 5.92857C2.4 3.75804 4.19 2 6.4 2C7.8825 2 9.175 2.79185 9.8675 3.9692C10.2475 3.69665 10.7075 3.57143 11.2 3.57143C12.525 3.57143 13.6 4.60513 13.6 5.92857C13.6 6.22812 13.5425 6.51295 13.44 6.77813C14.9 7.06786 16 8.33728 16 9.85714C16 11.5931 14.5675 13 12.8 13H3.6ZM5.575 7.67187C5.3425 7.90268 5.3425 8.27589 5.575 8.4846C5.81 8.73504 6.19 8.73504 6.4025 8.4846L7.4 7.54665V10.8393C7.4 11.1658 7.6675 11.4286 8 11.4286C8.3325 11.4286 8.6 11.1658 8.6 10.8393V7.54665L9.575 8.4846C9.81 8.73504 10.19 8.73504 10.4025 8.4846C10.6575 8.27589 10.6575 7.90268 10.4025 7.67187L8.4025 5.70759C8.19 5.47924 7.81 5.47924 7.575 5.70759L5.575 7.67187Z"></path>
                              </svg>
                              <p class="text-gray-900 dark:text-accent/50">Drag &amp; drop your file</p>
                              <div class="flex flex-col justify-center items-center my-2">
                                <small class="text-gray-700 dark:text-accent/70 text-center"> PNG, JPG, JPEG, GIF, SVG, WEBP, MP4 or MP3 </small>
                                <small class="text-gray-700 dark:text-accent/70 text-center"> Max 10mb </small>
                              </div>
                              <small class="text-gray-700 dark:text-accent/50 text-center my-1"> or choose a file </small>
                              <button @click="$refs.nft_image2.click()" class="w-1/ btn btn-wide flex text-center items-center dark:text-light justify-center ring ring-primary/30 border-primary/30  bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium mt-4">Browse Image</button>

                            </label>
                            <input ref="nft_image2" v-on:change="onFileChange_image($event)" type="file" name="image" class="hidden" id="fileInput">

                          </div>

                        </div>

                      <!--           NFT Info           Step 2-->
                      <div v-if="nft_preview_image !== null" class="grid grid-cols-12">

                        <div class="col-span-7">

                          <div class="bg-light dark:bg-foreground rounded-lg px-6 py-4 pt-8">

                            <div class="font-2 text-3xl">
                              NFT Description
                            </div>

                            <p class="text-light_grey italic mt-2">
                              Let's fill out some details about your new NFT
                            </p>

                            <transition name="bounce">
                              <div class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                                Is this NFT part of a collection? <div class="tooltip" data-tip="Refresh collections list"><button @click="getRefreshPageData()" v-if="choice_collection === 'collection'" class="btn btn-xs p-0 ml-2 pl-2"><font-awesome-icon icon=" fa-light fa-arrows-rotate" class="mr-2" /></button> </div>
                              </div>
                            </transition>
                            <transition name="bounce">
                              <div class="flex w-full gap-14">
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_collection" value="no_collection" type="radio" name="radio-collection" checked class="radio radio-secondary"  />
                                    <span class="text-lg font-2 pl-4">No</span>
                                  </label>
                                </div>
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_collection" value="collection" type="radio" name="radio-collection" class="radio radio-secondary"  />
                                    <span class="text-lg font-2 pl-4">Yes</span>
                                  </label>
                                </div>
                              </div>
                            </transition>

                                        <div v-if="choice_collection === 'collection'" class="mb-7 mt-4 relative w-full bg-white dark:bg-dark group rounded-md z-20">
                                          <Multiselect
                                              v-model="collection"
                                              ref="collectionSelector"
                                              @change="collectionChange_mng($event)"
                                              placeholder="Select Collection"
                                              :classes="{container: 'relative mx-auto border-2 border-transparent w-full flex items-center justify-end cursor-pointer items-center rounded-md border-0 text-light_foreground dark:bg-dark px-0 py-1 transition-all  hover:shadow-none'
                                            , option: 'flex items-center dark:bg-dark justify-start box-border text-left cursor-pointer text-accent leading-snug py-2 px-3'
                                            , optionPointed: 'text-gray-800 dark:text-gray-300 bg-accent/30 dark:bg-foreground/90',
                                            optionSelected: 'dark:text-white bg-accent/30 dark:bg-foreground',
                                            dropdown: 'max-h-60 absolute -left-px -right-px bottom-0 transform translate-y-full border-2 dark:border-neutral/30 rounded-lg -mt-px overflow-y-scroll z-50 bg-light_foreground dark:bg-dark flex flex-col rounded-b',
                              dropdownTop: '-translate-y-full top-px bottom-auto rounded-b-none rounded-t',
                              dropdownHidden: 'hidden',
                                            placeholder: 'flex items-center h-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug pl-3.5 text-light_grey italic rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5',
                                            optionDisabled: 'text-gray-300 cursor-not-allowed',
                                            optionSelectedPointed: 'dark:text-white bg-accent/30 opacity-90',
                                            containerActive: 'ring-2 border-2 border-neutral/30 ring-neutral ring-offset-2 dark:ring-offset-foreground ring-opacity-30',
                                            optionSelectedDisabled: 'text-green-100 bg-green-500 bg-opacity-50 cursor-not-allowed'}"
                                              label="name"
                                              :options="user_collections_final_mv2"
                                          >
                                            <template v-slot:singlelabel="{ value }">
                                              <div class="multiselect-single-label">
                                                <span class="m-4">
                                            {{ value.name }}
                                          </span>
                                              </div>
                                            </template>

                                            <template v-slot:option="{ option }">
                                              <span class="m-4">
                                            {{ option.name }}
                                          </span>
                                            </template>
                                          </Multiselect>

                                        </div>

                              <div class="form-control mt-8 w-full">
                                <label class="label w-full">
                                  <span class="label-text font-2 uppercase">Give your NFT a Name </span>
                                </label>

                                <input v-model="nft_name" type="text" placeholder="E.g, My Awesome NFT" class="input italic w-full " :class="checkName === false ? 'ring-1 ring-red-600' : ''" />
                              </div>
                              <div class="form-control mt-8 w-full">
                                <label class="label w-full">
                                  <span class="label-text font-2 uppercase">Description</span>
                                </label>
                                <textarea v-model="nft_description"  type="text" placeholder="Write something about your NFT" class="textarea italic w-full"  :class="checkDescription === false ? 'ring-1 ring-red-600' : ''" />
                              </div>
                              <div class="form-control mt-8 w-full">
                                <label class="label w-full">
                                  <span class="label-text font-2 uppercase">External URL (Optional)</span>
                                </label>
                                <input  v-model="nft_external_url"  type="text" placeholder="Add your website URL" class="input italic w-full" />
                              </div>
                              <div class="form-control mt-8 w-full">
                                <label class="label w-full">
                                  <span class="label-text font-2 uppercase">Authors (Optional)</span>
                                </label>
                                <input  v-model="nft_authors"  type="text" placeholder="Who created this NFT?" class="input italic w-full" />
                              </div>

                            <div class="divider mt-8"></div>

                            <div class="mb-7 mt-8 w-full bg-light_foreground dark:bg-foreground  rounded-box">

                              <div class="dark:text-white rounded-t-box flex justify-between">
                                <div class="flex flex-col">

                                  <div class="font-2 text-3xl">
                                   Traits
                                  </div>

                                  <p class="text-light_grey italic mt-2">
                                    Give your NFT some Traits
                                  </p>
                                </div>


                              </div>

                              <div
                                  class="block w-full overflow-x-auto whitespace-nowrap borderless hover"
                              >
                                <div
                                    class="dataTable-wrapper dataTable-loading no-footer fixed-columns"
                                >
                                  <div
                                      class="dataTable-container block w-full overflow-x-auto whitespace-nowrap borderless hover"
                                  >
                                    <table
                                        :class="TraitData.length === 0 ? 'mt-0' : 'mt-4'"
                                        class="table-3 dataTable-table border-collapse max-w-full w-full"
                                        style="border-spacing: 10px; border-collapse: separate;"
                                    >
                                      <thead>
                                      <tr>
                                        <th
                                            class="text-left pl-4 border-0 text-xs  dark:border-dark dark:text-neutral pb-3 mb-3 text-gray-500 font-semibold w-48"
                                        >
                                          <span v-if="TraitData.length !== 0">Trait</span>
                                        </th>


                                        <th
                                            class="text-left pl-4 border-0 text-xs  dark:border-dark dark:text-neutral pb-3 mb-3 text-gray-500 font-semibold w-32"
                                        >
                                          <span v-if="TraitData.length !== 0">Value</span>
                                        </th>

                                        <th
                                            class="text-left border-0 dark:border-dark dark:text-gray-300 pb-3 mb-3 text-gray-500 font-semibold w-32"
                                        >
                                        </th>
                                      </tr>
                                      </thead>
                                      <tbody>
                                      <tr class="border-0 border-gray-200 dark:border-dark group cursor-pointer "
                                          v-for="(item, index) in TraitData"
                                          :key="index"
                                      >
                                        <td class="py-3 px-4 bg-light dark:bg-dark/50 rounded-box text-left group-hover:bg-gray-100 dark:group-hover:bg-dark">
                                          <p class="text-primary   dark:text-accent">
                                            {{ item.trait }}
                                          </p>
                                        </td>

                                        <td class="py-3 px-4 bg-light dark:bg-dark/50 rounded-box text-left group-hover:bg-gray-100 dark:group-hover:bg-dark">
                                          <p class="text-primary dark:text-accent">
                                            {{ item.value }}
                                          </p>
                                        </td>


                                        <td class="py-3 ">
                                          <div class="flex items-end justify-end">
                                            <button
                                                @click="removeTrait(index)"
                                                icon
                                                rounded
                                                class="mr-3 text-danger dark:bg-transparent border-primary hover:text-error"
                                            >
                                              <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  class="h-5 w-8"
                                                  viewBox="0 0 20 20"
                                                  fill="currentColor"
                                              >
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                    clip-rule="evenodd"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              <div class="flex gap-8 w-full mt-2">
                                <div class="form-control mt-0 w-full">
                                  <label class="label w-full">
                                    <span class="label-text font-2 uppercase">Trait Type</span>
                                  </label>
                                  <input v-model="new_trait_type" type="text" placeholder="eg: Background" class="input italic w-full" />
                                </div>
                                <div class="form-control mt-0 w-full">
                                  <label class="label w-full">
                                    <span class="label-text font-2 uppercase">Value</span>
                                  </label>
                                  <input v-model="new_trait_value" type="text" placeholder="eg: White" class="input italic w-full" />
                                </div>
                              </div>

                              <button @click="addTrait" class="btn btn-outline btn-accent mt-8"> + Add New</button>

                            </div>

                            <div class="divider mt-8 mb-8"></div>

                            <div class="flex flex-col">

                              <div class="font-2 text-3xl">
                                Settings
                              </div>

                              <p class="text-light_grey italic mt-2">
                                Additional properties and NFT settings
                              </p>
                            </div>

                            <div class="form-control mt-8 w-full">
                              <label class="label w-full">
                                <span class="label-text font-2 uppercase">Mint to k: address</span>
                              </label>
                              <input @input="checkMintToAddress" v-model="nft_mint_to_address" type="text" placeholder="Enter the k: Address this NFT will be minted to" class="input italic w-full" />
                            </div>

                            <transition name="bounce">
                              <div class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                                Enable Royaltys?
                              </div>
                            </transition>
                            <transition name="bounce">
                              <div class="flex w-full gap-14">
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_royalty" value="no_royalty" type="radio" name="radio-royalty" class="radio radio-secondary checked:bg-red-500"  />
                                    <span class="text-lg font-2 pl-4">No</span>
                                  </label>
                                </div>
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_royalty" value="royalty" type="radio" name="radio-royalty" class="radio radio-secondary checked:bg-blue-500"  />
                                    <span class="text-lg font-2 pl-4">Yes</span>
                                  </label>
                                </div>
                              </div>
                            </transition>

                            <section v-if="choice_royalty === 'royalty'" >
                              <div class="form-control mt-8 w-full">
                                <input  v-model="nft_royalty_account"  type="text" placeholder="Enter royalty k: account" class="input italic w-full" />
                              </div>

                              <div class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                                Royalty Percentage
                              </div>
                              <div class="form-control w-full  mt-2">
                                <div class="join">
                                  <input v-model="new_royalty_amount" type="number" step="1" min="0" max="10" class="input join-item input-bordered dark:bg-jacarta-700 border-jacarta-100 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-700 dark:placeholder:text-jacarta-300 w-full rounded-lg py-3 px-3 hover:ring-2 dark:text-accent-light"  />
                                  <button class="btn join-item rounded-r-full">%</button>
                                </div>
                                <input v-model="new_royalty_amount" type="range" min="0" max="10"  class="range mt-2 range-primary range-lg" />
                              </div>


                            </section>


                            <button v-if="currently_minting === true" disabled class="btn mt-12 w-full btn-wide">Currently Minting..</button>

                            <a v-if="currently_minting === false" @click="clickMint" class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">
                              <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                              <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                              <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon icon=" fa-light fa-block-question" class="mr-2" /> Mint Now</span>
                            </a>



                          </div>

                        </div>

                        <div class="col-span-1">


                        </div>

                        <div class="col-span-4  ">
                          <div  class="flex mt-2 flex-col justify-center items-center text-center ">
                            <div class="flex justify-center items-center mt-0 flex-col pb-4 ">


                              <div class="dark:bg-foreground rounded-lg">
                                <img v-if="nft_preview_image !== null" class="object-scale-down rounded-lg w-[300px] h-[300px] max-w-[300px] hover:object-contain" :src="nft_preview_image">
                              </div>

                              <div @click="clickReplace" class="mt-8">
                                <button class="btn btn-outline btn-accent">Replace Image</button>
                              </div>


                            </div>
                          </div>

                        </div>




                      </div>

                    </div>
                  </transition>

                  <!--           Mass Mint Area-->
                  <transition name="slide-fade">
                    <div v-if="c_tab === 'mass'" class="relative  w-full overflow-x-auto sm:rounded-lg">

                      <!--           Drag and Drop           Step 1-->
                      <div v-if="nft_preview_image === null" class="relative justify-center bg-light dark:bg-foreground box w-full h-full items-center rounded-box font-bold p-4" >

                        <div class="p-[3px] border-2 border-dashed border-gray-300 dark:border-accent/40 dark:hover:border-secondary/40 h-full w-full flex justify-center rounded-lg">
                          <label v-if="nft_preview_image === null" for="fileInput" class="cursor-pointer group flex flex-col p-20 justify-center h-[320px] md:h-full w-full items-center bg-white dark:bg-dark  rounded-lg outline outline-1 hover:outline-2 outline-gray-300 hover:outline-primary-500 dark:hover:outline-secondary/10 dark:outline-gray-800 shadow-outline hover:shadow-hover">
                            <svg class="w-9 h-9 fill-gray-700 dark:fill-accent group-hover:fill-primary-500" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3.6 13C1.61175 13 0 11.4163 0 9.46429C0 7.92232 1.00425 6.61116 2.405 6.12746C2.40175 6.06116 2.4 5.99487 2.4 5.92857C2.4 3.75804 4.19 2 6.4 2C7.8825 2 9.175 2.79185 9.8675 3.9692C10.2475 3.69665 10.7075 3.57143 11.2 3.57143C12.525 3.57143 13.6 4.60513 13.6 5.92857C13.6 6.22812 13.5425 6.51295 13.44 6.77813C14.9 7.06786 16 8.33728 16 9.85714C16 11.5931 14.5675 13 12.8 13H3.6ZM5.575 7.67187C5.3425 7.90268 5.3425 8.27589 5.575 8.4846C5.81 8.73504 6.19 8.73504 6.4025 8.4846L7.4 7.54665V10.8393C7.4 11.1658 7.6675 11.4286 8 11.4286C8.3325 11.4286 8.6 11.1658 8.6 10.8393V7.54665L9.575 8.4846C9.81 8.73504 10.19 8.73504 10.4025 8.4846C10.6575 8.27589 10.6575 7.90268 10.4025 7.67187L8.4025 5.70759C8.19 5.47924 7.81 5.47924 7.575 5.70759L5.575 7.67187Z"></path>
                            </svg>
                            <p class="text-gray-900 dark:text-accent/50">Drag &amp; drop folder containing NFT image and JSON files</p>
                            <div class="flex flex-col justify-center items-center my-2">
                              <small class="text-gray-700 dark:text-accent/70 text-center"> PNG, JPG, JPEG, GIF, JSON</small>
                              <small class="text-gray-700 dark:text-accent/70 text-center"> Make sure to follow correct NFT format </small>
                            </div>
                            <small class="text-gray-700 dark:text-accent/50 text-center my-1">or Choose Folder </small>
                            <button @click="$refs.nft_image2.click()" class="w-1/ btn btn-wide flex text-center items-center dark:text-light justify-center ring ring-primary/30 border-primary/30  bg-gradient-to-r text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium mt-4">Browse Folder</button>

                          </label>
                          <input ref="nft_image2" v-on:change="onFileChange_image($event)" type="file" name="image" class="hidden" id="fileInput">

                        </div>

                      </div>

                      <!--           NFTs Info           Step 2-->
                      <div v-if="nft_preview_image !== null" class="grid grid-cols-12">

                        <div class="col-span-6">

                          <div class="bg-light dark:bg-foreground rounded-lg px-6 py-4 pt-8">

                            <div class="font-2 text-3xl">
                              NFT Settings
                            </div>

                            <p class="text-light_grey italic mt-2">
                              Lets fill out some details about your NFTs
                            </p>

                            <transition name="bounce">
                              <div class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                                NFT(s) part of a collection?
                              </div>
                            </transition>
                            <transition name="bounce">
                              <div class="flex w-full gap-14">
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_collection" value="no_collection" type="radio" name="radio-collection-2" class="radio radio-secondary checked:bg-red-500"  />
                                    <span class="text-lg font-2 pl-4">No</span>
                                  </label>
                                </div>
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_collection" value="collection" type="radio" name="radio-collection-2" class="radio radio-secondary checked:bg-blue-500"  />
                                    <span class="text-lg font-2 pl-4">Yes</span>
                                  </label>
                                </div>
                              </div>
                            </transition>

                            <div class="mb-7 mt-4 relative w-full bg-white dark:bg-dark group rounded-md z-20">
                              <Multiselect
                                  v-model="collection"
                                  ref="collectionSelector"
                                  @change="collectionChange_mng($event)"
                                  placeholder="Select Collection"
                                  :classes="{container: 'relative mx-auto border-2 border-transparent w-full flex items-center justify-end cursor-pointer items-center rounded-md border-0 text-light_foreground dark:bg-dark px-0 py-1 transition-all  hover:shadow-none'
                                            , option: 'flex items-center dark:bg-dark justify-start box-border text-left cursor-pointer text-accent leading-snug py-2 px-3'
                                            , optionPointed: 'text-gray-800 dark:text-gray-300 bg-accent/30 dark:bg-foreground/90',
                                            optionSelected: 'dark:text-white bg-accent/30 dark:bg-foreground',
                                            dropdown: 'max-h-60 absolute -left-px -right-px bottom-0 transform translate-y-full border-2 dark:border-neutral/30 rounded-lg -mt-px overflow-y-scroll z-50 bg-light_foreground dark:bg-dark flex flex-col rounded-b',
                              dropdownTop: '-translate-y-full top-px bottom-auto rounded-b-none rounded-t',
                              dropdownHidden: 'hidden',
                                            placeholder: 'flex items-center h-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug pl-3.5 text-light_grey italic rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5',
                                            optionDisabled: 'text-gray-300 cursor-not-allowed',
                                            optionSelectedPointed: 'dark:text-white bg-accent/30 opacity-90',
                                            containerActive: 'ring-2 border-2 border-neutral/30 ring-neutral ring-offset-2 dark:ring-offset-foreground ring-opacity-30',
                                            optionSelectedDisabled: 'text-green-100 bg-green-500 bg-opacity-50 cursor-not-allowed'}"
                                  label="name"
                                  :options="user_collections_final_mv2"
                              >
                                <template v-slot:singlelabel="{ value }">
                                  <div class="multiselect-single-label">
                                                <span class="m-4">
                                            {{ value.name }}
                                          </span>
                                  </div>
                                </template>

                                <template v-slot:option="{ option }">
                                              <span class="m-4">
                                            {{ option.name }}
                                          </span>
                                </template>
                              </Multiselect>
                            </div>

                            <transition name="bounce">
                              <div class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                                Enable Royaltys?
                              </div>
                            </transition>
                            <transition name="bounce">
                              <div class="flex w-full gap-14">
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_royalty" value="no_royalty" type="radio" name="radio-royalty-2" class="radio radio-secondary checked:bg-red-500"  />
                                    <span class="text-lg font-2 pl-4">No</span>
                                  </label>
                                </div>
                                <div class="form-control">
                                  <label class="label cursor-pointer">
                                    <input v-model="choice_royalty" value="royalty" type="radio" name="radio-royalty-2" class="radio radio-secondary checked:bg-blue-500"  />
                                    <span class="text-lg font-2 pl-4">Yes</span>
                                  </label>
                                </div>
                              </div>
                            </transition>

                            <div v-if="choice_royalty === 'royalty'" class="form-control mt-8 w-full">
                              <input type="text" placeholder="Enter royalty k: account" class="input italic w-full" />
                            </div>

                            <div v-if="choice_royalty === 'royalty'" class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
                              Royalty Percentage
                            </div>
                            <div v-if="choice_royalty === 'royalty'" class="form-control w-full  mt-2">
                              <div class="join">
                                <input v-model="new_royalty_amount" type="number" step="1" min="0" max="10" class="input join-item input-bordered dark:bg-jacarta-700 border-jacarta-100 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-700 dark:placeholder:text-jacarta-300 w-full rounded-lg py-3 px-3 hover:ring-2 dark:text-accent-light"  />
                                <button class="btn join-item rounded-r-full">%</button>
                              </div>
                              <input v-model="new_royalty_amount" type="range" min="0" max="10"  class="range mt-2 range-primary range-lg" />
                            </div>

                            <div class="form-control mt-8 w-full">
                              <label class="label w-full">
                                <span class="label-text font-2 uppercase">Mint to k: address</span>
                              </label>
                              <input type="text" placeholder="Enter the k: Address this NFT will be minted to" class="input italic w-full" />
                            </div>

                            <a class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">
                              <span class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
                              <span class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
                              <span class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
                              <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon icon=" fa-light fa-block-question" class="mr-2" /> Mint Now</span>
                            </a>

                          </div>

                        </div>

                        <div class="col-span-1">


                        </div>

                        <div class="col-span-5  ">
                          <div  class="flex mt-2  justify-center items-center text-center ">
                            <ul class="w-full max-h-[200px]">
                              <li v-for="(nft, idx) in t_parsed_nfts" :key="idx" class="w-full cursor-pointer mb-2  text-gray-600 dark:text-gray-400 ">

                                <div class="flex w-full border-2  border-transparent rounded-lg hover:border-accent hover:bg-white dark:bg-foreground py-4 px-4  ">

                                  <div class="flex w-full gap-2">
                                    <img v-if="nft.image !== null" class="h-12 w-12 object-cover rounded-lg"
                                         :src="nft.image || '/images/kadenai_black.svg'"
                                         @error="$event.target.src = '/images/kadenai_black.svg'">
                                    <div class="flex justify-start items-start flex-col">
                                      <span :class="name === null ? 'skeleton px-4' : ''"
                                            class="font-2 text-xs text-black dark:text-white md:text-lg">{{ nft.name === null ? "&nbsp;" : nft.name }}</span>
                                      <span class="font-2 text-xs md:text-sm">{{ nft.id }}</span>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            </ul>
                          </div>

                        </div>




                      </div>

                    </div>
                  </transition>

                  <!--           Tutorials Area-->
                  <transition name="slide-fade">
                    <div v-if="c_tab === 'tutorials'" class="relative  w-full overflow-x-auto sm:rounded-lg">

                      <div  class="flex mt-2  justify-center items-center text-center ">
                        <ul class="w-full">
                          <li class="w-full cursor-pointer mb-4  text-gray-600 dark:text-gray-400 ">

                            <div @click="clickComingSoon" class="flex w-full border-2 justify-between group border-transparent rounded-lg hover:border-accent hover:bg-white dark:bg-foreground dark:hover:bg-dark py-4 px-4  ">

                              <div class="flex w-full gap-8">
                                <div class="text-5xl text-accent">
                                  <font-awesome-icon icon="fa-light fa-film" />
                                </div>

                                <div class="flex justify-start items-start flex-col">
                                      <span class="font-2 text-xs text-black dark:text-white md:text-lg">Video | Youtube</span>
                                  <span class="font-2 text-xs md:text-sm">Check out this video</span>
                                </div>
                              </div>

                              <button @click="clickComingSoon" class="btn btn-outline group-hover:bg-primary group-hover:text-white border-none btn-primary">Watch Video</button>
                            </div>
                          </li>

                          <li class="w-full cursor-pointer mb-2  text-gray-600 dark:text-gray-400 ">

                            <div @click="clickComingSoon" class="flex group w-full border-2 justify-between  border-transparent rounded-lg hover:border-accent hover:bg-white dark:bg-foreground dark:hover:bg-dark py-4 px-4  ">

                              <div class="flex w-full gap-8">
                                <div class="text-5xl text-accent">
                                  <font-awesome-icon icon="fa-light fa-file-pdf" />
                                </div>

                                <div class="flex justify-start items-start flex-col">
                                  <span class="font-2 text-xs text-black dark:text-white md:text-lg">Video | Youtube</span>
                                  <span class="font-2 text-xs md:text-sm">Check out this video</span>
                                </div>
                              </div>

                              <button @click="clickComingSoon" class="btn btn-outline group-hover:bg-primary group-hover:text-white border-none btn-primary">Watch Video</button>
                            </div>
                          </li>

                          <li class="w-full cursor-pointer mb-2  text-gray-600 dark:text-gray-400 ">

                            <div @click="clickComingSoon" class="flex group w-full border-2 justify-between  border-transparent rounded-lg hover:border-accent hover:bg-white dark:bg-foreground dark:hover:bg-dark py-4 px-4  ">

                              <div class="flex w-full gap-8">
                                <div class="text-5xl text-accent">
                                  <font-awesome-icon icon="fa-light fa-file-zip" />
                                </div>

                                <div class="flex justify-start items-start flex-col">
                                  <span class="font-2 text-xs text-black dark:text-white md:text-lg">Video | Youtube</span>
                                  <span class="font-2 text-xs md:text-sm">Check out this video</span>
                                </div>
                              </div>

                              <button @click="clickComingSoon" class="btn btn-outline group-hover:bg-primary group-hover:text-white border-none btn-primary">Watch Video</button>
                            </div>
                          </li>
                        </ul>
                      </div>

                    </div>
                  </transition>


                </div>

              </div>



            </div>


          </div>


        </section>


      </div>


    </div>

  </section>

</template>
<style lang="scss" scoped>

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
    content: "";
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
    height: 88vh;
    z-index: 101;
    content: "";
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
