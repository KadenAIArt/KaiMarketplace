import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios';
import './assets/scss/global.scss'
import './index.css'

router.$store = store;

import { VueQueryPlugin } from "@tanstack/vue-query";

import 'vue3-carousel/dist/carousel.css'
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

import { MotionPlugin } from '@vueuse/motion'

import Multiselect from '@vueform/multiselect'
import '@vueform/multiselect/themes/default.css'

import Vue3Toasity from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

import VueCountdown from '@chenfengyuan/vue-countdown';

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

import { createHead } from '@unhead/vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faSunBright,
    faWallet,
    faArrowRightLong,
    faGrid,
    faLayerGroup,
    faMicrochipAi,
    faBlockQuestion,
    faCartShopping,
    faList,
    faGrid2,
    faCardsBlank,
    faScaleUnbalanced,
    faUsers,
    faCoin,
    faXmark,
    faDoorOpen,
    faUserGear,
    faGlobe,
    faFilterList,
    faCalendar,
    faCheck,
    faEllipsis,
    faLock,
    faTag,
    faShare,
    faHeart,
    faMinus,
    faPlus,
    faFilm,
    faFilePdf,
    faShop,
    faAlarmClock,
    faArrowDownToBracket,
    faArrowUpFromBracket,
    faFileZip,
    faMagnifyingGlass,
    faMoneyFromBracket,
    faHexagonVerticalNftSlanted,
    faCoinVertical,
    faArrowsRotate,
    faTelescope,
    faFloppyDisk, faFolderArrowDown, faSquareTerminal, faFileArrowUp
} from "@fortawesome/pro-light-svg-icons";

import {faDiscord, faTelegram} from '@fortawesome/free-brands-svg-icons';
import { inject } from '@vercel/analytics';

library.add(faMagnifyingGlass, faSunBright, faWallet, faArrowRightLong, faGrid, faLayerGroup, faMicrochipAi,
    faBlockQuestion, faCartShopping, faList, faGrid2, faCardsBlank, faScaleUnbalanced, faUsers, faCoin, faXmark,
    faDoorOpen, faUserGear, faDiscord, faTelegram, faGlobe, faFilterList, faCalendar, faCheck, faEllipsis, faLock,
    faTag, faShare, faHeart, faMinus, faPlus, faArrowDownToBracket, faArrowUpFromBracket, faAlarmClock, faMoneyFromBracket,
    faFilm, faFilePdf, faFileZip, faShop, faHexagonVerticalNftSlanted, faCoinVertical, faArrowsRotate, faTelescope
,faFloppyDisk, faFolderArrowDown, faSquareTerminal, faFileArrowUp)

const head = createHead();

createApp(App)
    .component('Multiselect', Multiselect)
    .component('VueDatePicker', VueDatePicker)
    .component('VueCountdown', VueCountdown)
    .component("Carousel",Carousel)
    .component("Slide",Slide)
    .component("Pagination",Pagination)
    .component("Navigation",Navigation)
    .component('font-awesome-icon', FontAwesomeIcon)
    .use(head)
    .use(MotionPlugin)
    .use(inject)
    .use(VueQueryPlugin)
    .use(store)
    .use(router)
    .use(Vue3Toasity)
    .mount('#app')
