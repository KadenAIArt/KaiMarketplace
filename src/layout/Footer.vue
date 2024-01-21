<script setup>
import { ref, computed} from 'vue'
import { useStore } from 'vuex'
import {useRouter} from "vue-router";
import MagneticText from "@/components/MagneticText.vue";
import MagneticTextToken from "@/components/MagneticTextToken.vue";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import SpotlightCard2 from "@/components/SpotlightCard2.vue";
let store = useStore();
let router = useRouter();

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

const user_account = localStorage.getItem("kai_accountName");

const text2 = "Kadena's favorite NFT marketplace.";

const marketplace = "Marketplace";
const gc = "Generate Collections";
const aig = "AI Generate";
const nm = "NFT Minter";
const explore = "Explore";
const profile = "Profile";
const credits = "Credits";
const telegram = "Telegram";
const discord = "Discord";
const twitter = "Twitter"
const medium = "Medium"

const clickHome = async () => {
  await router.push({path: `/`});
};

const clickExplore = async () => {
  await router.push({path: `/explore`});
};

const clickTwitter = async () => {
  await router.push({path: `/`});
};

const clickTelegram = async () => {
  await router.push({path: `/`});
};

const clickCollection = async (collection) => {
  await router.push({path: `/collection/${collection}}`});
};

const clickCollectionMint = async (collection) => {
  await router.push({path: `/collection/mint/${collection}}`});
};

const clickNFT = async (nft) => {
  await router.push({path: `/nft/${nft}}`});
};

const clickMinter = async () => {
  await router.push({path: `/mint`});
};

const clickProfile = async () => {
  await router.push({path: `/profile/${user_account}`});
};


const clickTest = async (nft) => {
  await router.push({path: `/test`});
};

</script>

<template>
  <SpotlightCard2
      from="rgba(72,0,249,0.10)"
      via="rgba(149,0,243,0.10)"
      :size="200"
      class="w-full  rounded-lg bg-white/10 p-0 ">
    <div class="absolute inset-px rounded-lg bg-light/60 dark:bg-foreground/80"></div>


    <div class="relative h-full  p-6 pb-8 rounded-lg z-20 overflow-hidden">
      <div
          class="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none -z-10 w-1/2 aspect-square"
          aria-hidden="true">
        <div class="absolute inset-0 translate-z-0   rounded-full blur-[80px]"></div>
      </div>
      <div class="relative container mx-auto mt-16">
        <div class="pt-0 ">
          <div class="grid gap-16 row-gap-10 mb-8 lg:grid-cols-4">
            <div class="md:max-w-md md:col-span-1">
              <div @click="clickHome" aria-label="Go home" title="Company" class="inline-flex items-start">
                <div v-motion-pop-visible class="logo flex justify-start border-foreground pr-4">
                  <div class="logo -ml-2 md:pr-12 flex items-center text-black dark:text-white text-2xl font-bold justify-start">
                    <img
                        class="h-16 w-16 mr-1 md:ml-3 cursor-pointer p-2"
                        src="/images/kadenai_main_gradient.svg"
                        alt="logo"
                        srcset=""
                    />
                    KADENAI
                  </div>

                </div>
              </div>
              <div v-motion-slide-visible-once-left class="mt-4 lg:max-w-sm">
                <p class="text-left font-display font-light  dark:text-light_grey">
                  <MagneticText
                      v-slot="{ tokens }"
                      as="p"
                      class="w-full text-[15px]  text-left font-var"
                      :body="text2">
                    <MagneticTextToken
                        v-for="(token, index) in tokens"
                        v-slot="{ value }"
                        :key="index"
                        :threshold="40"
                        class="inline-block cursor-default whitespace-pre">
                      <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                    </MagneticTextToken>
                  </MagneticText>
                  <span class="text-white/50"></span>
                </p>
                <p class="mt-4 text-sm dark:text-light_grey">
                  Buy, Sell, Trade, Auction, and Create NFTs
                </p>
              </div>
            </div>
            <div v-motion-slide-visible-once-bottom class="grid grid-cols-1 md:grid-cols-3 gap-5 row-gap-12 md:col-span-3">
              <div>

                <p class="font-2 tracking-wider dark:text-light">
                  Tools
                </p>
                <ul class="mt-2 space-y-2">

<!--                  <li>-->
<!--                    <p class="text-left font-display font-light cursor-pointer dark:text-light">-->
<!--                      <MagneticText-->
<!--                          v-slot="{ tokens }"-->
<!--                          as="p"-->
<!--                          class="w-full text-[16px] tracking-wide cursor-pointer text-left font-var"-->
<!--                          :body="gc">-->
<!--                        <MagneticTextToken-->
<!--                            v-for="(token, index) in tokens"-->
<!--                            v-slot="{ value }"-->
<!--                            :key="index"-->
<!--                            :threshold="40"-->
<!--                            class="inline-block cursor-default cursor-pointer whitespace-pre">-->
<!--                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>-->
<!--                        </MagneticTextToken>-->
<!--                      </MagneticText>-->
<!--                      <span class="text-white/50"></span>-->
<!--                    </p>-->
<!--                  </li>-->
<!--                  <li>-->
<!--                    <p class="text-left font-display font-light group cursor-pointer dark:text-light">-->
<!--                      <MagneticText-->
<!--                          v-slot="{ tokens }"-->
<!--                          as="p"-->
<!--                          class="w-full text-[16px] tracking-wide cursor-pointer text-left font-var"-->
<!--                          :body="aig">-->
<!--                        <MagneticTextToken-->
<!--                            v-for="(token, index) in tokens"-->
<!--                            v-slot="{ value }"-->
<!--                            :key="index"-->
<!--                            :threshold="40"-->
<!--                            class="inline-block cursor-pointer  border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral whitespace-pre">-->
<!--                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>-->
<!--                        </MagneticTextToken>-->
<!--                      </MagneticText>-->
<!--                      <span class="text-white/50"></span>-->
<!--                    </p>-->
<!--                  </li>-->
                  <li>
                    <p @click="clickMinter()" class="text-left group font-display font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="nm">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </p>
                  </li>
                </ul>
              </div>
              <div>
                <p class="font-2 tracking-wide dark:text-light text-teal-accent-400">
                  Links
                </p>
                <ul class="mt-2 space-y-2">
                  <li @click="clickHome">
                    <p class="text-left font-display group font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer text-left font-var"
                          :body="marketplace">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </p>
                  </li>
                  <li @click="clickExplore">
                    <p class="text-left font-display group font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer text-left font-var"
                          :body="explore">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </p>
                  </li>
                </ul>
              </div>
              <div>
                <p class="font-2 tracking-wide dark:text-light text-teal-accent-400">
                  Connect
                </p>
                <ul class="mt-2 space-y-2">
                  <li>
                    <a href="https://discord.com/invite/Wub6qW43hb" target="_blank" class="text-left group font-display font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="discord">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </a>
                  </li>
                  <li>
                    <a href="https://t.me/kadenai" target="_blank" class="text-left group font-display font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="telegram">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </a>
                  </li>
                  <li>
                    <a href="https://twitter.com/KadenaiArt" target="_blank" class="text-left group font-display font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="twitter">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </a>
                  </li>
                  <li>
                    <a href="https://medium.com/@kadenaiart" target="_blank" class="text-left group font-display font-light cursor-pointer dark:text-light">
                      <MagneticText
                          v-slot="{ tokens }"
                          as="p"
                          class="w-full text-[16px] tracking-wide cursor-pointer  text-left font-var"
                          :body="medium">
                        <MagneticTextToken
                            v-for="(token, index) in tokens"
                            v-slot="{ value }"
                            :key="index"
                            :threshold="40"
                            class="inline-block border-b-2 border-b-transparent group-hover:border-b-2 group-hover:border-b-neutral cursor-pointer whitespace-pre">
                          <span :style="{ fontWeight: value+200 }">{{ token }}</span>
                        </MagneticTextToken>
                      </MagneticText>
                      <span class="text-white/50"></span>
                    </a>
                  </li>
                </ul>
              </div>
              <div>
              </div>
            </div>
          </div>
          <div class="flex flex-col justify-between pt-5 pb-10 border-t border-neutral sm:flex-row">
            <p class="text-xs dark:text-neutral">
              © Kadenai LLC.
            </p>
            <div class="flex items-center text-xs mt-4 space-x-4 sm:mt-0">
              <a href="https://storage.googleapis.com/kaipub/policies/WebsiteTermsofUse.pdf" target="_blank" class="dark:text-neutral">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SpotlightCard2>

</template>
