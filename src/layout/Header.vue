<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from "vue-router";
import HeaderSearch from '../components/HeaderSearch.vue'
import BaseCard from "@/components/Base/BaseCard.vue";
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import config from '../components/util/config.js';
import GridBlock from "@/components/GridBlock.vue";
import GridPattern from "@/components/GridPattern.vue";
import axios from "axios";
import apiConfig from "@/components/util/apiConfig";
import {io} from "socket.io-client";

let store = useStore();
let router = useRouter();
const accountConfirmedNavBar = ref(false);
const accountNameToVerify = ref('');
const showConnectKModal = ref(false);
const showTransactionPendingModal = ref(false);
const showTrnasactionPendingButton = ref(false);
const canClickConnect = ref(null);
const user_kda_chain8 = ref(0);
const account = ref(null);

onMounted(async () => {

  await checkConnected();

});


const decodeToken = (token) => {
  if (!token) {
    return null;
  }
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(window.atob(base64));
}

const isTokenValid = () => {
  const token = localStorage.getItem('kai_userToken');
  const decoded = decodeToken(token);
  if (!decoded) {
    return false;
  }
  const currentTime = Date.now() / 1000;
  return decoded.exp > currentTime;
}

const clickShowTXPendingModal = () => {
  showTransactionPendingModal.value = true;
}
const clickCloseTXPendingModal = async () => {
  if (store.getters['accounts/getTransactionFailed'] === false || store.getters['accounts/getTransactionFailed'] === true) {
    showTrnasactionPendingButton.value = false;
  }
  showTransactionPendingModal.value = false;
}

//Show connect k:account modal
const clickShowKModal = () => {
  accountNameToVerify.value = '';
  showConnectWalletModal.value = false;
  showConnectKModal.value = true;
}
//Close connect k:account modal
const clickCloseModal = async () => {
  showConnectKModal.value = false;
  accountNameToVerify.value = 'null';
  showConnectKNModal.value = false;
  await clickCancel();
}

let showConnectKNModal = ref(false);

//Show connect k:account modal
const clickShowKNModal = () => {
  accountNameToVerify.value = '';
  showConnectKNModal.value = true;
}

//Click confirm K:account from login modal
const clickConfirmKAccount = async () => {
  await store.dispatch("accounts/confirmAccountExists", accountNameToVerify.value);

  //Set up local storage variables to help us detect if the user ever comes back to our game after they leave
  localStorage.setItem("kai_isUsingXwallet", 'false');
  localStorage.setItem("kai_accountName", accountNameToVerify.value);
  localStorage.setItem("kai_isConnected", 'true');

  accountConfirmedNavBar.value = true;
  showConnectKModal.value = false;
}

//Click confirm K:account from login modal
const clickConfirmKNAccount = async () => {

  const response = await fetch(`https://www.kadenanames.com/api/v1/address/${accountNameToVerify.value}`);
  const { address } = await response.json();
  console.log(address);
  await store.dispatch("accounts/confirmAccountExists", address);

  //Set up local storage variables to help us detect if the user ever comes back to our game after they leave
  localStorage.setItem("kai_isUsingXwallet", 'false');
  localStorage.setItem("kai_accountName", address);
  localStorage.setItem("kai_isConnected", 'true');

  accountConfirmedNavBar.value = true;
  showConnectKNModal.value = false;
}

//Click connect xwallet
const connectxwallet = async () => {
  let kadena = window.kadena;

  if (window.kadena.isKadena === true) {
    let networkResult = await kadena.request({
      method: "kda_getNetwork"
    });

    if (networkResult.name === config.name && networkResult.networkId === config.networkId) {
      //Show Confirm xwallet final modal
      //this.showXWalletFinalModal = true;
      await store.dispatch("accounts/connectXwallet");
      showConnectWalletModal.value = false;
    } else {
      alert(`Kadenai Marketplace is currently testing on Kadena ${config.name}`)
    }
  }
}

//Click connect zelcore
let zelcoreAccount = ref(null);
const connectzelcore = async () => {

  //Open the zelcore wallet and ask for account info
  try {
    window.open('zel:', '_self');
    const accounts = await fetch("http://127.0.0.1:9467/v1/accounts", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ asset: "kadena" }),
    });

    const accountsJson = await accounts.json();

    zelcoreAccount.value = accountsJson.data[0];

    //Zelcore returns a 'U' if the user canceled
    if (zelcoreAccount.value !== 'U') {

      //Verify the account
      await store.dispatch("accounts/getAccountVerification", zelcoreAccount.value);
      //Confirm it
      await store.dispatch("accounts/confirmAccountExists", zelcoreAccount.value);

      //Set up local storage variables to help us detect if the user ever comes back to our game after they leave
      localStorage.setItem("kai_isUsingXwallet", 'false');
      localStorage.setItem("kai_accountName", zelcoreAccount.value);
      localStorage.setItem("kai_isConnected", 'true');

      accountConfirmedNavBar.value = true;
    }
    showConnectKModal.value = false;
    showConnectWalletModal.value = false;
  }
  catch (e) {
    console.log(e);
  }
}

//Click connect xwallet
const connectxwalletconnect = async () => {
  showConnectWalletModal.value = false;
  await store.dispatch("accounts/connectWalletConnect");

}

//Reset everything if someone clicks cancel when connecting
const clickCancel = async () => {


  //Clear account input field
  await store.dispatch("accounts/resetAccountExists");
  accountNameToVerify.value = "";
  accountConfirmedNavBar.value = false;
  localStorage.setItem("kai_accountName", "");
  localStorage.setItem("kai_isConnected", 'false');
  localStorage.setItem("kai_isUsingXwallet", 'false');
  localStorage.setItem("kai_isUsingWalletConnect", 'false');

  await router.push({ path: `/` });
}

const clickProfile = async () => {
  let account2 = localStorage.getItem("kai_accountName");
  if(account2 === undefined || account2 === null || account2 === 'null' || account2 === '' || account2 === ' ' || !account2){
    account2 = await store.getters["accounts/getAccountName"];
  }
  if(account2 === undefined || account2 === null || account2 === 'null' || account2 === '' || account2 === ' ' || !account2){
    account2 = account.value;
  }
  await router.push({ path: `/profile/${account2}` });
}

const clickSettings = async () => {
  await router.push({ path: `/settings` });
}

const clickCreate = async () => {
  await router.push({ path: `/mint` });
}



//Verify account exists
const autoVerify = async () => {
  if (accountNameToVerify.value !== null) {
    await store.dispatch("accounts/getAccountVerification", accountNameToVerify.value);
  }
};

//Verify kadenanames account
const autoVerifyKN = async () => {
  if (accountNameToVerify.value !== null) {
    const response = await fetch(`https://www.kadenanames.com/api/v1/address/${accountNameToVerify.value}`);
    const { address } = await response.json();
    await store.dispatch("accounts/getAccountVerification", address);
  }
};

//Check if we are connected when this page loads so we can refresh state
const checkConnected = async () => {

  // let pairing_topic = localStorage.getItem("kai_wcPairing");
  //
  // if(pairing_topic !== undefined && pairing_topic !== null && pairing_topic !== '' && pairing_topic !== 'false'){
  //
  //   let pairing_payload = {
  //     pairing_topic: pairing_topic
  //   }
  //
  //   //await store.dispatch("accounts/connectWalletConnect", pairing_payload);
  //
  //   clickCancel()
  // }

  //Lets get the accountName from local storage
  accountNameToVerify.value = localStorage.getItem("kai_accountName");
  if(accountNameToVerify.value !== "null" && accountNameToVerify.value !== '' && accountNameToVerify.value !== null){
    account.value = accountNameToVerify.value;
  }


  // if (accountNameToVerify.value === 'null' || accountNameToVerify.value === '') {
  //   accountNameToVerify.value = 'CONNECT WALLET';
  //   await clickCancel();
  // }



  if (accountNameToVerify.value !== 'CONNECT WALLET') {
    //Lets veryify the account from local storage with the vue store and store its data in the store
    await store.dispatch("accounts/getAccountVerification", accountNameToVerify.value);
    await store.dispatch("accounts/confirmAccountExists", accountNameToVerify.value);

    await fetchUserCredits();
    setupWebSocket();
  }


  //get account
  const user_account = localStorage.getItem("kai_accountName");
  const user_account_store = store.getters["accounts/getAccountData"]
  account.value = user_account;

  // console.log("user_account");
  // console.log(user_account);
  // console.log("user_account_store");
  // console.log(user_account_store);

  if (user_account !== undefined && user_account !== '' && user_account !== 'null' && user_account !== null) {

    if (user_account_store === undefined || user_account_store === null) {

        //Verify the account
        await store.dispatch("accounts/getAccountVerification", user_account).then(async () => {

        //Confirm it
        await store.dispatch("accounts/confirmAccountExists", user_account);

      });

    }
  }


  //Check if xwallet is connected
  if (window.kadena && window.kadena.isKadena === true) {
    if (localStorage.getItem("kai_isUsingXwallet") === "true") {

      let test_connection = await window.kadena.request({
        method: 'kda_checkStatus',
        networkId: config.networkId,
      });

      if (test_connection.status !== 'fail') {
        await store.dispatch("accounts/setXWalletIsConnected");
      } else {
        await clickCancel()
      }

    }
    accountConfirmedNavBar.value = true;
  }

  //Check if wallet connect is connected and needs to reconnect to refresh state
  if (localStorage.getItem("kai_isUsingWalletConnect") === 'true') {
    const t_session = await store.getters["accounts/getWalletConnectSession"];
    // console.log("WC SESSION GOTTEN")
    // console.log(t_session)
    const t_session2 = localStorage.getItem("kai_wcSession");
    // console.log(t_session2)
    if (t_session !== null) {
      await store.dispatch("accounts/setWalletConnectIsConnected", true);
      accountConfirmedNavBar.value = true;
    }else if(t_session2 !== undefined && t_session2 !== null && t_session2 !== '' && t_session2 !== 'false' && t_session2 !== 'null'){
      await store.dispatch("accounts/reconnectWalletConnect");
      accountConfirmedNavBar.value = true;
    }
  }


}

//If User has account name check if we are connected
// if (localStorage.getItem("kai_accountName")) {
//   console.log("RUNNING LOCALSTORAGE CHECK")
//   checkConnected();
// }

// if (localStorage.getItem("kai_userToken")) {
//   console.log("user token found");
//   let valid_token = isTokenValid();
//   console.log("valid_token ->", valid_token);
//   if (valid_token === false) {
//     clickCancel();
//   }
// }

//Watch if xwallet connected
store.watch((state, getters) => getters["accounts/getXWalletConnected"], (val) => {
  accountConfirmedNavBar.value = val;
})

//Watch if account connected
store.watch((state, getters) => getters["accounts/getAccountConfirmed"], async (val) => {

  // console.log("RUNNING GET ACCOUNT CONFIRMED WATCHER")

  accountConfirmedNavBar.value = val;

  accountNameToVerify.value = store.getters["accounts/getAccountName"]

  if(val === true){
    await fetchUserCredits();
    setupWebSocket();
  }

  const balance_payload = {
    tokenA: 'coin',
    name: accountNameToVerify.value,
    chain: '8'
  }

  let t_kda = await store.dispatch("accounts/getBalance_chain", balance_payload).then((res) => {
    console.log(res);
    user_kda_chain8.value = res.toString().slice(0, 8);
  })
})

//Watches if account exists changes
store.watch((state, getters) => getters["accounts/getAccountExists"], (val) => {
  canClickConnect.value = val;
})

//Shows transaction button if a transaction is polling
store.watch((state) => state.transactionPolling, (val) => {
  showTrnasactionPendingButton.value = true;
})

//Watches for new polling transactions and shows modal
store.watch((state, getters) => getters["accounts/getTransactionPolling"], (val) => {

  const t_transactions = store.getters['accounts/getTransactions'];
  const t_transactions_array = Array.from(t_transactions, x => x);
  const hash = store.getters["accounts/getTransactionHash"];
  let matched = false;

  try {
    for (let i = 0; i < t_transactions_array.length; i++) {
      if (t_transactions_array[i].txhash === hash || t_transactions_array[i].txhash === "newtx") {
        t_transactions_array[i].txhash = hash;
        current_clicked_transaction.value = t_transactions_array[i];
        matched = true;
      }
    }
  } catch (e) {
    console.log(e);
  }

  if (matched === true) {
    showTransactionNewModal.value = false;
    showTransactionPendingModal.value = false;
    showUpdateMarketListingModal.value = false;
    showMarketListingModal.value = false;
    showClickedTransactionModal.value = true;
  } else {
    if (val === true) {
      showTrnasactionPendingButton.value = true;
      showTransactionPendingModal.value = true;
      showTransactionNewModal.value = false;
    }

    if (val === false) {
      showTransactionPendingModal.value = true;
      showTrnasactionPendingButton.value = false;

    }
  }


})


//Watches for new transactions and shows new transaction modal if user is starting a new tx
store.watch((state, getters) => getters["accounts/getNewTransaction"], () => {

  const t_transactions = store.getters['accounts/getTransactions'];
  const t_transactions_array = Array.from(t_transactions, x => x);
  const hash = store.getters["accounts/getTransactionHash"];
  let matched = false;

  try {
    for (let i = 0; i < t_transactions_array.length; i++) {
      if (t_transactions_array[i].txhash === "newtx") {
        current_clicked_transaction.value = t_transactions_array[i];
        matched = true;
      }
    }
  } catch (e) {
    console.log(e);
  }

  if (matched === true) {

    showTransactionNewModal.value = false;
    showTransactionPendingModal.value = false;
    showUpdateMarketListingModal.value = false;
    showMarketListingModal.value = false;
    showClickedTransactionModal.value = true;

  } else {
    // showTransactionNewModal.value = true;
    showClickedTransactionModal.value = true;
  }

})

//Displays account name on login area
let displayFixedAccountName = computed(() => {
  if (accountNameToVerify.value !== null) {
    if (store.getters["accounts/getXWalletConnected"] === false) {
      if (accountNameToVerify.value.length > 12 && accountNameToVerify.value !== 'null' && accountNameToVerify.value !== 'CONNECT WALLET') {
        return accountNameToVerify.value.slice(0, 12) + "...";
      } else {
        return accountNameToVerify.value;
      }
    } else if (store.getters["accounts/getXWalletConnected"] === true && accountNameToVerify.value !== 'null' && accountNameToVerify.value !== 'CONNECT WALLET') {
      if (store.getters["accounts/getAccountName"].length > 12) {
        return store.getters["accounts/getAccountName"].slice(0, 12) + "...";
      } else {
        return store.getters["accounts/getAccountName"];
      }
    } else {
      return accountNameToVerify.value;
    }
  } else return 'CONNECT WALLET';

})

const getName = computed(() => {
  let account2 = localStorage.getItem("kai_accountName");
  if(account2 === undefined || account2 === null || account2 === 'null' || account2 === '' || account2 === ' ' || !account2){
    account2 =  store.getters["accounts/getAccountName"];
  }
  if(account2 === undefined || account2 === null || account2 === 'null' || account2 === '' || account2 === ' ' || !account2){
    account2 = account.value;
  }
  return account2;
});



// Enforce Dark mode upon load
let isDarkMode = ref(false);
const html = document.querySelector('html');
const ele = document.body;
// html.classList.add('dark');

const local_darkmode = ref(localStorage.getItem("kai_darkmode"))

if (local_darkmode.value === 'true') {
  isDarkMode.value = true;
  html.classList.add('dark');
  store.dispatch("accounts/setDarkmodeOn");
} else if (local_darkmode.value === 'false') {
  isDarkMode.value = false;
  html.classList.remove('dark');
  store.dispatch("accounts/setDarkmodeOff");
} else {
  isDarkMode.value = true;
  html.classList.add('dark');
  store.dispatch("accounts/setDarkmodeOn");

}


let bgtimeout = setTimeout(async () => {
  if (local_darkmode.value === 'true') {
    isDarkMode.value = true;
    html.classList.add('dark');
    await store.dispatch("accounts/setDarkmodeOn");
  } else if (local_darkmode.value === 'false') {
    isDarkMode.value = false;
    html.classList.remove('dark');
    await store.dispatch("accounts/setDarkmodeOff");

  }else{
    isDarkMode.value = false;
    html.classList.remove('dark');
    await store.dispatch("accounts/setDarkmodeOff");
    await colorModeSwitch();
  }
}, 100);

//switch from light/dark mode
let colorModeSwitch = async () => {
  if (isDarkMode.value === false) {
    html.classList.add('dark')
    ele.classList.add('dark');
    isDarkMode.value = true
    localStorage.setItem("kai_darkmode", 'true');
    await store.dispatch("accounts/setDarkmodeOn");
  } else {
    html.classList.remove('dark');
    ele.classList.remove('dark');
    isDarkMode.value = false
    localStorage.setItem("kai_darkmode", 'false');
    await store.dispatch("accounts/setDarkmodeOff");
  }
}


////////////////////////////////////////////////////////////////////////////////////////////////
//New transaction stuff

let showTransactionNewModal = ref(false);

//opens new tx modal
const clickShowTXNewModal = () => {
  showTransactionNewModal.value = true;
}

//closes new tx modal
const clickCloseTXNewModal = () => {
  showTransactionNewModal.value = false;
}

////////////////////////////////////////////////////////////////////////////////////////////////
//Cross chain modal stuff

let showCrosschainPendingModal = ref(false);
let showCrosschainPendingButton = ref(false);

//opens crosschain tx modal
const clickShowCrosschainModal = () => {
  showCrosschainPendingModal.value = true;
}

//closes crosschain tx modal
const clickCloseCrosschainModal = () => {
  showCrosschainPendingModal.value = false;
}

//Watches for pending crosschain tx and shows modal if one is pending
store.watch((state, getters) => getters["accounts/getcrosschainPolling"], (val) => {
  if (val === true) {
    showCrosschainPendingButton.value = true;
    showTransactionNewModal.value = false;
    showTransactionPendingModal.value = false;
    showCrosschainPendingModal.value = true;
  }

  if (val === false) {
    showTransactionNewModal.value = false;
    showCrosschainPendingButton.value = false;
    showTransactionPendingModal.value = false;
    showCrosschainPendingModal.value = true;
  }
})




const showConnectWalletModal = ref(false);

const clickShowConnectAWalletModal = () => {
  showConnectWalletModal.value = !showConnectWalletModal.value;
}

const clickCloseonnectAWalletModal = () => {
  showConnectWalletModal.value = false;
}

//Redirects user to home page
const clickHome = async () => {
  await router.push({ path: `/` });
};

const clickMint = async() =>{
  await router.push({ path: `/mint` });
}

const clickExplore = async() =>{
  await router.push({ path: `/explore` });
}


//Market Listing Modal Stuff
const showBidModal = ref(false);
const nft_to_market = ref(null);
const nft_to_buy = ref(null);
const nft_to_update = ref(null);
const fixed_end_date = ref(null);
const auction_start_date = ref(null);
const auction_end_date = ref(null);
const choice_duration = ref(null);
const choice_listing = ref(null);
const sale_price = ref(null);
const reserve_price = ref(null);
const isAuctionSale = computed(() => {
  // Check if nft_to_update is not null before accessing its properties
  return nft_to_update.value && nft_to_update.value.salesData && nft_to_update.value.salesData.saleType === 'auction';
});


//Sale stuff / modal
const sale_type = ref(null);
const nft_to_sell = ref(null);
const setSaleType = (value) => {
  sale_type.value = value;
}

const showMarketListingModal = ref(false);
const showUpdateMarketListingModal = ref(false);
//Sale watcher / shows sale modal when user clicks sell on a nft card
store.watch((state, getters) => getters["accounts/getSaleClicked"], () => {
  // console.log("! MARKET LISTING ! click detected on header");
  nft_to_market.value = store.getters['accounts/getClickedNFT_sale'];
  showMarketListingModal.value = !showMarketListingModal.value;
})


//Buy Now Modal Stuff
const showBuyNowModal = ref(false);

const closeBuyNowModal = () => {
  showBuyNowModal.value = false;
}

//runs when a user clicks withdraws
const clickWithdraw = async() =>{

  const withdraw_payload = {
    pactid: nft_to_update.value.pactid,
    nftid: nft_to_update.value.id,
    seller: nft_to_update.value.seller,
    image: nft_to_update.value.image,
    name: nft_to_update.value.name,
    id: nft_to_update.value.id
  }

  let t_do_pay = await store.dispatch("accounts/withdrawNFT", withdraw_payload);

  showUpdateMarketListingModal.value = false;

}

//Runs when user clicks buy now and buys nft
const clickBuy = async() =>{

  //Lets get escrow account to pay for this NFT
  const e_payload ={
    id: nft_to_buy.value.pactid
  }

  let t_escrow_account = await store.dispatch("accounts/getEscrowAccount_chain", e_payload).then(async(res)=>{
    // console.log("ESCROW ACCOUNT RES");
    // console.log(res);

    const buy_payload = {
      pactid: nft_to_buy.value.pactid,
      escrow: res.account,
      price: nft_to_buy.value.price,
      nftid: nft_to_buy.value.id,
      seller: nft_to_buy.value.seller,
      image: nft_to_buy.value.image,
      name: nft_to_buy.value.name,
      id: nft_to_buy.value.id
    }

    let t_do_pay = await store.dispatch("accounts/buyNowNFT", buy_payload);

    showBuyNowModal.value = false;

  })

}

//Buy Now Clicked watcher / shows buy now modal when user clicks buy now on a nft card
store.watch((state, getters) => getters["accounts/getBuyClicked"], () => {
  nft_to_buy.value = store.getters['accounts/getClickedNFT_buy'];
  showBuyNowModal.value = !showBuyNowModal.value;
})


//Transactions stuff
const current_transactions_to_show_now = ref(null);

const showClickedTransactionModal = ref(false);

const closeClickedTransactionModal = () => {
  showClickedTransactionModal.value = false;
}

//New Transaction watcher / updates list of current transactions to show now in the dropdown menu
store.watch((state, getters) => getters["accounts/getTransactionsChanged"], async () => {
  // console.log("! NEW TRANSACTION DETECTED !");
  // console.log("store transcations:");
  let t_transactions = await store.getters['accounts/getTransactions'];
  const t_transactions_array = Array.from(t_transactions, x => x);
  // console.log(t_transactions);
  current_transactions_to_show_now.value = t_transactions_array;
  // console.log("current_transactions_to_show_now");
  // console.log(current_transactions_to_show_now.value);
})

const current_clicked_transaction = ref({
  txhash: "abcDEFGhijKLMNopQRsTuVWXYz",
  type: "listing",
  title: "Marketplace Listing",
  image: '/images/kadenai_black.svg',
  name: "my new nft",
  completed: false,
  failed: false,
});

const clickTransaction = (transaction) => {
  const t_transaction = transaction;
  current_clicked_transaction.value = t_transaction;
  showClickedTransactionModal.value = true;
}

//close market listing modal
const clickClosMarketListingModal = () => {
  showMarketListingModal.value = false;
}

//close update market listing modal
const clickCloseUpdateMarketListingModal = () => {
  showUpdateMarketListingModal.value = false;
}

const show_mobile_search_bar = ref(false);

const toggleSearchBar = () => {
  show_mobile_search_bar.value = !show_mobile_search_bar.value;
}

const createMarketListing = async () => {
  //The user has clicked the "Add to marketplace" button

  //Payload we send to createV2Sale function in accounts.js
  let creation_payload = {
    sale_type: choice_listing.value,
    sale_duration_type: choice_duration.value,
    sale_price: sale_price.value,
    reserve_price: reserve_price.value,
    fixed_end_date: fixed_end_date.value,
    auction_start_date: auction_start_date.value,
    auction_end_date: auction_end_date.value,
    nft: nft_to_market.value,
    image: nft_to_market.value.image,
    name: nft_to_market.value.name
  }

  //Call to accounts.js createV2Sale() function
  let t_create = await store.dispatch("accounts/createV2Sale", creation_payload);

}

//Watches if user clicks on update a market listing and shows the correct modal
store.watch((state, getters) => getters["accounts/getUpdateListingClicked"], () => {
  nft_to_update.value = store.getters['accounts/getClickedNFT_updatelisting'];
  showUpdateMarketListingModal.value = !showUpdateMarketListingModal.value;
})


//CREDITS STUFF
const userCredits = ref(0);
const credit_amount = ref(1);
const password = ref(0);
const showBuyCreditsModal = ref(false);
const current_tab = ref(1);

const clickPurchaseCredits = async() =>{

  if(password.value === 1){
    const t_purchase_payload = {
      chain: "8",
      quantity: credit_amount.value
    }
    let t_make_purchase = await store.dispatch("accounts/purchaseCredits", t_purchase_payload);
  }else{
    alert("Password incorrect");
  }


}

const gridBlocks = [
  [2, 5],
  [3, 1],
  [4, 3],
];

const closeCreditModal = () =>{
  showBuyCreditsModal.value = false;
}

const clickShowCreditModal = () =>{
  showBuyCreditsModal.value = true;
}

const switchTab = (tab) =>{
  credit_amount.value = tab;
  current_tab.value = tab;
}

const getCreditPrice = computed(() =>{

  if(credit_amount.value > 0 && credit_amount.value <= 1){
    return 1.00;
  }else if(credit_amount.value > 1 && credit_amount.value <= 20){
    return .95;
  }else if(credit_amount.value > 20 && credit_amount.value <= 50){
    return .90;
  }else if(credit_amount.value > 50){
    return .85;
  }else return 1.00;

    }
);

const fetchUserCredits = async () => {
  try {
    const response = await axios.get(`${apiConfig.apiHost}/api/0/credit/check-credits`, {
      withCredentials: true
    });
    userCredits.value = response.data.credits;
    await store.dispatch("accounts/bindUserCredits", {credits: userCredits.value});
  } catch (error) {
    console.error('Error fetching user credits:', error);
  }
};

const setupWebSocket = () => {
  const userWalletAddress = localStorage.getItem("kai_accountName");

  const socket = io(config.apiHost);


  socket.on(`updatedCredits:${userWalletAddress}`, async(data) => {
    userCredits.value = data.credits;
    await store.dispatch("accounts/bindUserCredits", {credits: data.credits});
  });

  socket.on('connect', () => {
    console.log('Connected');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected');
  });

  // Handle any errors
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    socket.close();
  });
};

const clickEarn = () =>{
  alert("Coming soon!");
}


</script>

<template>
  <!--     connect a wallet modal section-->
  <div :class="showConnectWalletModal === true ? 'modal-open show' : 'modal'" class="modal">
    <div class="modal-box rounded flex flex-col dark:bg-dark items-center justify-center p-6 md:p-6"
      :style="isDarkMode === true ? '' : ''">
      <div :class="isDarkMode === true ? '' : ''" class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full"
          :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                Connect Wallet
              </h3>
              <button @click="clickCloseonnectAWalletModal"
                class="btn dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <div class="text-left mt-2 text-neutral">
              <p>Connect to Kadenai with your favorite Kadena Ecosystem Wallets</p>
            </div>
          </div>

        </div>
        <div class="mt-4"></div>
        <fieldset class="space-y-2 w-full">
          <legend class="sr-only">Select a Wallet</legend>

          <div :class="isDarkMode === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
            <input @click="connectxwalletconnect" type="radio" name="wallet" value="wc" id="wc" class="peer hidden" />

            <label for="wc"
              class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light  dark:border-foreground dark:bg-foreground p-6 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">
              <div>
                <img src="/images/walletconnect.svg">
              </div>

              <div class="flex flex-col">
                <p class="dark:text-light font-2 text-xl">Wallet Connect</p>

                <p class="text-neutral">Linx, Ecko, Koala</p>
              </div>

            </label>
          </div>

          <div :class="isDarkMode === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
            <input @click="connectxwallet" type="radio" name="wallet" value="ecko" id="ecko" class="peer hidden" />

            <label for="ecko"
              class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light dark:border-foreground dark:bg-foreground p-6 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">
              <div>
                <img src="/images/ecko.png">
              </div>

              <div class="flex flex-col">
                <p class="dark:text-light font-2 text-xl">Ecko Wallet</p>

                <p class="text-neutral">Browser Extension</p>
              </div>

            </label>
          </div>

          <div :class="isDarkMode === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
            <input @click="connectzelcore" type="radio" name="wallet" value="zelcore" id="zelcore" class="peer hidden" />

            <label for="zelcore"
              class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light dark:border-foreground dark:bg-foreground p-6 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">
              <div>
                <img src="/images/zelcore.png">
              </div>

              <div class="flex flex-col">
                <p class="dark:text-light font-2 text-xl">Zelcore</p>

                <p class="text-neutral">Desktop Wallet</p>
              </div>

            </label>
          </div>

          <div :class="isDarkMode === true ? 'custom-box-shadow4_dark' : 'custom-box-shadow4'" class="rounded-lg">
            <input @click="clickShowKModal" type="radio" name="wallet" value="chainweaver" id="chainweaver"
              class="peer hidden" />

            <label for="chainweaver"
              class="flex gap-4 cursor-pointer items-center justify-start rounded-lg border bg-light border-light dark:border-foreground dark:bg-foreground p-6 text-sm font-medium shadow-sm hover:border-primary peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary">
              <div>
                <img src="/images/chainweaver.png">
              </div>

              <div class="flex flex-col">
                <p class="dark:text-light font-2 text-xl">Chainweaver</p>

                <p class="text-neutral">Desktop Wallet</p>
              </div>

            </label>
          </div>
        </fieldset>



      </div>

    </div>
  </div>

  <!--     connect K modal section-->
  <div :class="showConnectKModal === true ? 'modal-open show' : 'modal'" class="modal glasscard">
    <div class="modal-box rounded flex flex-col dark:bg-dark items-center justify-center p-6 md:p-6"
      :style="isDarkMode === true ? '' : ''">
      <div :class="isDarkMode === true ? '' : ''" class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-2 justify-between gap-0 text-center rounded-full"
          :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-3xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                Connect Chainweaver
              </h3>
              <button @click="clickCloseModal"
                class="btn bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>

          </div>

        </div>
        <div class="mt-4"></div>

        <div class="form-control w-full mt-2">
          <label class="label">
            <span class="label-text font1 text-jacarta-400">Enter your Chainweaver <span
                class="text-accent">k:Account</span></span>
          </label>
          <input v-model="accountNameToVerify" @change="autoVerify()" @input="autoVerify()" type="text"
            placeholder="k:account"
            class="input input-bordered dark:bg-jacarta-700 border-jacarta-100 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-600 dark:placeholder:text-jacarta-300 w-full rounded-lg py-3 px-3 hover:ring-2 dark:text-white" />
          <label v-if="canClickConnect === true" class="label text-xs">
            <div class="flex gap-2 items-center text-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="#36d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Account found
            </div>
          </label>
          <label v-if="canClickConnect === false" class="label text-xs">
            <div class="flex gap-2 items-center text-error">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Account not found
            </div>
          </label>
        </div>

        <div class="modal-action w-full">
          <div class="button w-full flex items-center gap-4 justify-center text-center">
            <button :disabled="!canClickConnect === true" @click="clickConfirmKAccount" for="my-modal-5"
              class="btn w-full 6 btn-primary text-white">Connect</button>
          </div>

        </div>



      </div>

    </div>
  </div>

  <!--     buy credits modal section -->
  <div :class="showBuyCreditsModal === true ? 'modal-open max-h-[100vh] overflow-scroll show' : 'modal'" class="modal ">
    <div class=" rounded flex flex-col mt-20 bg-white dark:bg-dark items-center justify-center p-6 md:p-6"
         :style="isDarkMode === true ? '' : ''">
      <div class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full "
             :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                Kadenai Credits
              </h3>
              <button @click="closeCreditModal"
                      class="btn bg-light_foreground dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <!--            <div class="text-left text-lg mt-2 text-neutral">-->
            <!--              <p>Purchase credits to use Kadenai.</p>-->
            <!--            </div>-->
          </div>

        </div>
        <div class="mt-4"></div>

        <section class="bg-gray-200 dark:bg-foreground rounded-t-box">

          <div class="hero bg-gradient-to-r rounded-t-box from-primary/60 to-secondary/20">
            <GridPattern
                :size="20"
                :offset-x="0"
                :offset-y="0"
                class="relative box4 rounded-t-box  w-full stroke-white/20 stroke-[2] [mask-image:linear-gradient(-85deg,black,transparent)]">
              <GridBlock
                  v-for="([row, column], index) in gridBlocks"
                  :key="index"
                  :row="row"
                  :column="column"
                  class="fill-white/2.5 transition duration-500 hover:fill-white/5"/>
            </GridPattern>
            <div class="absolute">
              <div class="flex gap-4">
                <div class="text-6xl text-yellow-400">
                  <font-awesome-icon icon=" fa-light fa-coin-vertical" />
                </div>
                <div class="flex-col">
                  <div class="text-6xl text-white">
                    {{ userCredits }}
                  </div>
                  <div class="text-xs text-white mt-1">
                    Credit Balance
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="px-8 py-4 mx-auto md:px-12 lg:px-32 max-w-7xl">
            <div class="mx-auto text-center max-w-3l">
              <!--              <span class="text-xs font-bold tracking-wide text-purple-500 uppercase">Pricing</span>-->
              <p class="mt-6 text-4xl font-semibold tracking-tight text-purple-500 lg:text-5xl">
                Empower your
                <span class="md:block md:text-gray-500">
                    <div @click="clickHome"
                                                                        class=" cursor-pointer flex items-center text-black dark:text-white text-2xl font-bold justify-center">
            <img class="h-16 w-16 md:ml-3 mr-1 pr-2" src="/images/kadenai_main_gradient.svg" alt="logo" srcset="" />
            <span class="text-5xl text-gray-500">KADENAI</span> <span class="text-5xl text-gray-500">&nbsp; experience</span>
          </div>
                </span>
              </p>
              <p class="max-w-xl mx-auto mt-4 text-base text-gray-500">
                Get more Credits to use Kadenai features
              </p>
            </div>
            <div class="grid grid-cols-1 gap-4 p-8 mt-12 bg-white dark:bg-dark shadow-sm md:grid-cols-2 lkg:mt-24 lg:p-12 rounded-box">
              <div class="flex flex-col justify-between h-full">
                <div class="grid items-center justify-center w-full grid-cols-1 p-8 pt-0 rounded-t-3xl">
                  <div class="flex-shrink-0 block mt-8 md:mt-0">
                    <div class="flex items-center">
                      <div>
                        <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g clip-path="url(#clip0_234_854)">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M44 0H0V150C0 177.614 22.3858 200 50 200H94V50C94 22.3858 71.6142 0 44 0ZM156 0C128.386 0 106 22.3858 106 50V200H150C177.614 200 200 177.614 200 150V0H156Z" fill="url(#paint0_linear_234_854)"></path>
                          </g>
                          <defs>
                            <linearGradient id="paint0_linear_234_854" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
                              <stop stop-color="#f3f4f6"></stop>
                              <stop offset="1" stop-color="#333"></stop>
                            </linearGradient>
                            <clipPath id="clip0_234_854">
                              <rect width="200" height="200" fill="white"></rect>
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p class="text-base font-semibold text-purple-900 lg:text-2xl">
                          Earn Credits
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="mt-6">
                    <p class="text-sm text-gray-500 lg:text-base">
                      Earn Kadenai Credits by performing various tasks and helping out the Kadenai Ecosystem- Powered by Zealy.io
                    </p>
                    <p class="mt-8 text-4xl font-bold tracking-tight text-purple-900 jetbrains lg:text-5xl">
                      <span>Free</span>
                    </p>
                  </div>
                </div>
                <div class="p-8 overflow-hidden bg-gray-200 dark:bg-gray-100 shadow-sm rounded-3xl">
                  <ul class="flex flex-col order-last text-base text-gray-500 gap-y-3" role="list">
                    <li class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Earn credits by performing tasks</span>
                    </li>
                    <li class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Powered by Zealy.io</span>
                    </li>
                  </ul>
                  <div class="w-full mt-8">
                    <a @click="clickEarn" class="flex items-center justify-center h-10 px-4 py-2 text-sm font-semibold text-purple-600 transition-all bg-white border border-gray-300 rounded-lg hover:text-purple-500" href="#">Earn Credits</a>
                  </div>
                </div>
              </div>
              <div class="order-first lg:order-none">
                <div class="grid items-center justify-center w-full grid-cols-1 p-8 pt-0 rounded-t-3xl">
                  <div class="flex-shrink-0 block">
                    <div class="flex items-center">
                      <div>
                        <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g clip-path="url(#clip0_104_171)">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M50 100C77.6142 100 100 77.6142 100 50C100 77.6142 122.386 100 150 100C122.386 100 100 122.386 100 150C100 122.386 77.6142 100 50 100ZM50 100C22.3858 100 0 122.386 0 150C0 177.614 22.3858 200 50 200C77.6142 200 100 177.614 100 150C100 177.614 122.386 200 150 200C177.614 200 200 177.614 200 150C200 122.386 177.614 100 150 100C177.614 100 200 77.6142 200 50C200 22.3858 177.614 0 150 0C122.386 0 100 22.3858 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100Z" fill="url(#paint0_linear_104_171)"></path>
                          </g>
                          <defs>
                            <linearGradient id="paint0_linear_104_171" x1="14" y1="26" x2="179" y2="179.5" gradientUnits="userSpaceOnUse">
                              <stop stop-color="#9095fb"></stop>
                              <stop offset="1" stop-color="#260d69"></stop>
                            </linearGradient>
                            <clipPath id="clip0_104_171">
                              <rect width="200" height="200" fill="white"></rect>
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p class="text-base font-semibold text-purple-900 lg:text-2xl">
                          Purchase Credits
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="mt-6">
                    <p class="text-sm text-gray-500 lg:text-base">
                      Credits power the Kadenai ecosystem. Purchase as many credits as you need to continue your journey.
                    </p>
                    <p class="mt-8 text-4xl font-bold tracking-tight text-purple-900 jetbrains lg:text-5xl">
                      <span>${{(getCreditPrice).toFixed(2)}}</span>
                      <span class="text-2xl font-normal tracking-normal text-gray-500">
                              /Credit
                            </span>
                    </p>
                  </div>
                </div>
                <div role="tablist" class="tabs hidden md:flex tabs-lifted">
                  <a role="tab" @click="switchTab(1)" class="tab" :class="credit_amount > 0 && credit_amount <= 1 ? 'bg-purple-600 text-white' : ''">1 Credit</a>
                  <a role="tab" @click="switchTab(20)" class="tab " :class="credit_amount > 1 && credit_amount <= 20 ? 'bg-purple-600 text-white' : ''">20 Credits</a>
                  <a role="tab" @click="switchTab(50)" class="tab" :class="credit_amount > 20 && credit_amount <= 50 ? 'bg-purple-600 text-white' : ''">50 Credits</a>
                  <a role="tab" @click="switchTab(100)" class="tab" :class="credit_amount > 50 ? 'bg-purple-600 text-white' : ''">100 Credits</a>
                </div>
                <div class="p-8 shadow-sm bg-gradient-to-t from-purple-800 via-purple-700 to-purple-500 rounded-b-box">
                  <ul class="flex flex-col order-last text-base text-white gap-y-3" role="list">
                    <li v-if="credit_amount > 0 && credit_amount <= 1" class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Discounts for buying in bulk!</span>
                    </li>
                    <li v-if="credit_amount > 1 && credit_amount <= 20" class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Discount: 5%</span>
                    </li>
                    <li v-if="credit_amount > 20 && credit_amount <= 50" class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Discount: 10%</span>
                    </li>
                    <li v-if="credit_amount > 50" class="flex flex-row items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 icon icon-tabler icon-tabler-circle-check-filled" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path></svg><span>Discount: 15%</span>
                    </li>
                    <li class="flex flex-row items-center gap-2">
                      <div class="text-5xl">
                        ${{(getCreditPrice * credit_amount).toFixed(2)}}
                      </div>
                    </li>
                    <label class="form-control mt-6 w-full">
                      <div class="label">
                        <span class="text-sm uppercase font-2">How many credits</span>
                      </div>
                      <div class="join group">
                        <input v-model="credit_amount" type="number" min="1" step="1" placeholder="Type here.." class="input text-dark dark:text-white group w-full join-item"
                               :style="isDarkMode === true ? 'background-color: #1C1C24; border-bottom-right-radius: unset; border-top-right-radius: unset;' : 'background-color: #F4F4F4'" />
                        <button role="button"
                                class="pt-1 pl-4 pr-4 group:ring-1 rounded-r-lg text-neutral bg-light_foreground dark:bg-foreground focus:outline-none"
                                type="submit">
                          Credits
                        </button>
                      </div>
                    </label>
                    <label class="form-control mt-6 w-full">
                      <div class="label">
                        <span class="text-sm uppercase font-2">Password</span>
                      </div>
                      <div class="join group">
                        <input v-model="password" type="number" min="1" step="1" placeholder="Type here.." class="input text-dark dark:text-white group w-full join-item"
                               :style="isDarkMode === true ? 'background-color: #1C1C24; border-bottom-right-radius: unset; border-top-right-radius: unset;' : 'background-color: #F4F4F4'" />
                      </div>
                    </label>
                  </ul>
                  <div class="w-full mt-8">
                    <a @click="clickPurchaseCredits" class="text-sm flex font-semibold items-center justify-center px-4 py-2 rounded-lg transition-all h-10 text-white bg-gradient-to-b from-white/[.105] hover:to-white/[.25] ring-1 ring-inset ring-white/20 to-white/[.15]" href="#">Purchase {{credit_amount}} <span v-if="credit_amount <= 1">&nbsp;Credit</span> <span v-if="credit_amount > 1">&nbsp;Credits</span></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        <button @click="closeCreditModal"
                class="btn w-full mt-4 tracking-wide text-md dark:bg-foreground">CANCEL</button>


      </div>

    </div>
  </div>


  <!--   OLD  pending tx modal section-->
  <div :class="showTransactionPendingModal === true ? 'modal-open show' : 'modal'" class="modal glasscard">
    <div class="modal-box rounded  flex flex-col dark:bg-dark items-center justify-center p-6 md:p-6"
      :class="isDarkMode === true ? 'box2' : 'box2_light'" style="border-radius: 0;">

      <div v-if="store.getters['accounts/getTransactionFailed'] === null"
        class="dark:bg-foreground bg-transparent p-2 pl-4 pr-4 w-full flex mt-2 justify-between gap-0 text-center rounded-full"
        :class="isDarkMode === false ? '' : ''">
        <h3 class="font-bold text-3xl font1 mt-2 pb-2">Awaiting Pending Transaction</h3>
      </div>


      <div v-if="store.getters['accounts/getTransactionFailed'] === true"
        class="dark:bg-foreground bg-transparent p-2 pl-4 pr-4 w-full flex mt-2 text-danger justify-center gap-0 text-center rounded-full"
        :class="isDarkMode === false ? '' : ''">
        <h3 class="font-bold text-4xl font1 mt-2 pb-2">Transaction Failed!</h3>
      </div>

      <div v-if="store.getters['accounts/getTransactionFailed'] === false"
        class="dark:bg-foreground bg-transparent p-2 pl-4 pr-4 w-full flex mt-2 justify-center gap-0 text-center rounded-full"
        :class="isDarkMode === false ? '' : ''">
        <h3 class="font-bold text-4xl font1 mt-2 pb-2">Transaction Success!</h3>
      </div>

      <div class="divider"></div>
      <div v-if="store.getters['accounts/getTransactionFailed'] === null"
        class="form-control w-full max-w-lg alert dark:bg-foreground text-accent custom-box-shadow7 dark:border-0 mt-4 mb-2">
        <div class="px-4 pt-1 pt-2 text-xs sm:px-6 sm:flex sm:flex-row-reverse">
          <div class="w-full p-4 my-3 text-center border-2 border-neutral border-dashed rounded select-all">
            <span class="text-secondary">{{ store.getters["accounts/getTransactionHash"] }}</span>
          </div>
        </div>
      </div>


      <div v-if="store.getters['accounts/getTransactionFailed'] === true"
        class="form-control w-full alert dark:bg-foreground text-success dark:border-0 custom-box-shadow7 mt-2 mb-2">
        <div class="px-4 pt-1 pt-2 text-xs sm:px-6 sm:flex sm:flex-row-reverse">
          <div class="w-full p-4 my-3 text-center border-2 border-neutral border-dashed rounded select-all">
            <span class="text-error">{{ store.getters["accounts/getTransactionHash"] }}</span>
          </div>
        </div>
        <div class="flex text-error text-center">
          <span>Transaction Failed!</span>
        </div>
      </div>

      <div v-if="store.getters['accounts/getTransactionFailed'] === false"
        class="form-control w-full alert dark:bg-foreground text-success dark:border-0 custom-box-shadow7 mt-2 mb-2">
        <div class="px-4 pt-1 pt-2 text-xs sm:px-6 sm:flex sm:flex-row-reverse">
          <div class="w-full p-4 my-3 text-center border-2 border-neutral border-dashed rounded select-all">
            <span class="text-secondary">{{ store.getters["accounts/getTransactionHash"] }}</span>
          </div>
        </div>
        <div class="flex text-center">
          <span>Transaction completed</span>
        </div>
      </div>

      <div class="modal-action">
        <button @click="clickCloseTXPendingModal" for="my-modal-5" class="btn btn-outline btn-secondary">Close</button>
      </div>
    </div>
  </div>

  <!--  CLICKED pending transaction modal -->
  <div :class="showClickedTransactionModal === true ? 'modal-open show' : 'modal'" class="modal">
    <div class="modal-box rounded flex flex-col dark:bg-dark items-center justify-center p-6 md:p-6"
      :style="isDarkMode === true ? '' : ''">
      <div :class="isDarkMode === true ? '' : ''" class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full"
          :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                {{ current_clicked_transaction.title }}
              </h3>
              <button @click="closeClickedTransactionModal"
                class="btn dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <div v-if="current_clicked_transaction.txhash !== 'newtx'" class="text-left text-lg mt-2 text-neutral">
              <p class="hover:text-secondary cursor-pointer"><a href="https://https://explorer.chainweb.com/mainnet/txdetail/${current_clicked_transaction.txhash}" target="_blank">{{ current_clicked_transaction.txhash }}</a></p>
            </div>
          </div>

        </div>

        <div class="divider"></div>

        <div class="bg-light_foreground dark:bg-neutral/30 p-2 rounded-lg w-full flex">
          <div v-if="current_clicked_transaction.image !== null" class="flex gap-2">
            <div v-if="current_clicked_transaction.image === null" class="skeleton rounded-lg h-10 w-10"></div>
            <img v-if="current_clicked_transaction.image !== null" class="h-20 w-20 object-scale-down rounded-lg"
              :src="current_clicked_transaction.image || '/images/kadenai_black.svg'"
              @error="$event.target.src = '/images/kadenai_black.svg'">
            <div class="flex p-1 break-all flex-col">
              <span :class="current_clicked_transaction.name === null ? 'skeleton px-4' : ''" class="font-2 text-xs dark:text-white md:text-lg">{{
                current_clicked_transaction.name === null ? "&nbsp;" : current_clicked_transaction.name }}</span>
            </div>
          </div>
        </div>

        <div class="mt-12 flex justify-center w-full flex-col p-0 m-0">

          <div class="flex justify-center px-4 gap-4 w-full">

            <div class="flex  justify-center items-center text-center">
              <div
                class="rounded-full w-10 h-10 justify-center flex text-secondary text-center items-center dark:bg-foreground">
                <font-awesome-icon v-if="current_clicked_transaction.txhash !== 'newtx'" icon="fa-light fa-check" />
                <span v-if="current_clicked_transaction.txhash === 'newtx'"
                  class="loading loading-spinner text-secondary"></span>
              </div>
            </div>

            <div class="flex w-full flex-col">

              <span class="text-sm text-neutral uppercase">
                Step 1
              </span>
              <span class="text-lg">
                Sign transaction in wallet
              </span>

            </div>

          </div>

          <div v-if="current_clicked_transaction.txhash !== 'newtx'" class="divider"></div>

          <div v-if="current_clicked_transaction.txhash !== 'newtx'" class="flex justify-center px-4 gap-4 w-full">

            <div class="flex  justify-center items-center text-center">
              <div
                class="rounded-full w-10 h-10 justify-center flex text-secondary text-center items-center dark:bg-foreground">
                <font-awesome-icon v-if="current_clicked_transaction.completed === true" icon="fa-light fa-check" />
                <span v-if="current_clicked_transaction.completed === false"
                  class="loading loading-spinner text-secondary"></span>
              </div>

            </div>

            <div class="flex w-full flex-col">

              <span class="text-sm text-neutral uppercase">
                Step 2
              </span>
              <span class="text-lg">
                Validating Transaction
              </span>

            </div>

          </div>

          <div v-if="current_clicked_transaction.completed === true" class="divider"></div>

          <div v-if="current_clicked_transaction.completed === true" class="flex justify-center px-4 gap-4 w-full">

            <div class="flex  justify-center items-center text-center">
              <div
                class="rounded-full w-10 h-10 justify-center flex text-secondary text-center items-center dark:bg-foreground">
                <font-awesome-icon
                  v-if="current_clicked_transaction.completed === true && current_clicked_transaction.failed === false"
                  icon="fa-light fa-check" />
                <font-awesome-icon
                  v-if="current_clicked_transaction.completed === true && current_clicked_transaction.failed === true"
                  icon="fa-light fa-xmark" />
                <span v-if="current_clicked_transaction.completed === false"
                  class="loading loading-spinner text-secondary"></span>
              </div>
            </div>

            <div class="flex w-full flex-col">

              <span class="text-sm text-neutral uppercase">
                Step 3
              </span>
              <span class="text-lg">
                <span
                  v-if="current_clicked_transaction.completed === true && current_clicked_transaction.failed === false">Transaction
                  Completed</span>
                <span
                  v-if="current_clicked_transaction.completed === true && current_clicked_transaction.failed === true">Transaction
                  Failed</span>
              </span>

            </div>

          </div>

        </div>


        <button @click="closeClickedTransactionModal"
          class="btn w-full mt-12 tracking-wide text-md dark:bg-foreground">Close</button>


      </div>

    </div>
  </div>


  <!--     new tx modal section-->
  <div :class="showTransactionNewModal === true ? 'modal-open show' : 'modal'" class="modal glasscard">
    <div class="modal-box  flex flex-col items-center justify-center p-6 md:p-6 box2" style="border-radius: 0;">
      <div class="bg-jacarta-700 p-2 pl-4 pr-4 w-full text-center custom-box-shadow7 rounded-full">
        <h3 class="font-bold text-lg font1 mt-2 pb-2 neotext text-jacarta-100">New Transaction</h3>
      </div>
      <div class="mt-4"></div>
      <div v-if="canClickConnect === null"
        class="form-control w-full  bg-jacarta-700 custom-box-shadow7 text-primary rounded  mt-2 mb-2">
        <div class="p-2 shadow-2">
          <div class="small-square shadow-2-inset p-4">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                class="stroke-current flex-shrink-0 w-6 mb-4 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-jacarta-200">We just sent a new transaction for you to review in your wallet.</span>
            </div>
          </div>
        </div>
      </div>

      <div
        class="form-control w-full max-w-lg alert bg-jacarta-700 dark:border-0 text-secondary custom-box-shadow7 mt-4 mb-2">
        <div> <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            class="stroke-current flex-shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg></div>
        <div class="break-all">
          <span class="text-secondary text-xs">asdasd{{ store.getters["accounts/getCurrentSignRequest"] }}</span>
        </div>
      </div>

      <div class="modal-action">
        <button @click="clickCloseTXNewModal" for="my-modal-5" class="btn btn-outline btn-secondary">OK</button>
      </div>
    </div>
  </div>


  <!--     market listing modal section -->
  <div :class="showMarketListingModal === true ? 'modal-open show' : 'modal'" class="modal">
    <div class="modal-box rounded flex flex-col dark:bg-dark items-center justify-center p-6 md:p-6"
      :style="isDarkMode === true ? '' : ''">
      <div :class="isDarkMode === true ? '' : ''" class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full"
          :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                Marketplace Listing
              </h3>
              <button @click="clickClosMarketListingModal"
                class="btn dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <div class="text-left text-lg mt-2 text-neutral">
              <p>Please choose the type of sale.</p>
            </div>
          </div>

        </div>
        <div class="mt-4"></div>

        <div class="flex w-full gap-14">
          <div class="form-control">
            <label class="label cursor-pointer">
              <input v-model="choice_listing" value="sale" type="radio" name="radio-9"
                class="radio radio-secondary checked:bg-red-500" />
              <span class="text-lg font-2 pl-4">Sale</span>
            </label>
          </div>
          <div class="form-control">
            <label class="label cursor-pointer">
              <input v-model="choice_listing" value="auction" :disabled="true" type="radio" name="radio-9"
                class="radio radio-secondary checked:bg-blue-500" />
              <span class="text-lg font-2 pl-4">Auction</span>
            </label>
          </div>
        </div>

        <div class="divider"></div>

        <div class="bg-light_foreground dark:bg-neutral/30 p-2 rounded-lg w-full flex">
          <div v-if="nft_to_market !== null" class="flex gap-2">
            <div v-if="nft_to_market.image === null" class="skeleton rounded-lg h-10 w-10"></div>
            <img v-if="nft_to_market.image !== null" class="h-20 w-20 object-scale-down rounded-lg"
              :src="nft_to_market.image || '/images/kadenai_black.svg'"
              @error="$event.target.src = '/images/kadenai_black.svg'">
            <div class="flex p-1 flex-col">
              <span :class="name === null ? 'skeleton px-4' : ''" class="font-2 text-xs dark:text-white md:text-lg">{{
                nft_to_market.name === null ? "&nbsp;" : nft_to_market.name.slice(0, 20) }} {{ nft_to_market.name === null
    ? "&nbsp;" : nft_to_market.name.length > 19 ? '...' : '' }}</span>
              <span class="font-2 text-xs mt-1 break-all md:text-sm">{{ nft_to_market.id }}</span>
            </div>
          </div>
        </div>

        <transition name="bounce">
          <div v-if="choice_listing === 'sale'"
            class="text-sm justify-start flex items-start text-start w-full mt-12 font-2 uppercase">
            Choose listing duration
          </div>
        </transition>
        <transition name="bounce">
          <div v-if="choice_listing === 'sale'" class="flex w-full gap-14">
            <div class="form-control">
              <label class="label cursor-pointer">
                <input v-model="choice_duration" value="unlimited" type="radio" name="radio-10"
                  class="radio radio-secondary checked:bg-red-500" />
                <span class="text-lg font-2 pl-4">Unlimited</span>
              </label>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer">
                <input v-model="choice_duration" value="fixed" :disabled="true" type="radio" name="radio-10"
                  class="radio radio-secondary checked:bg-blue-500" />
                <span class="text-lg font-2 pl-4">Fixed Time</span>
              </label>
            </div>
          </div>
        </transition>

        <label v-if="choice_listing === 'sale'" class="form-control mt-6 w-full">
          <div class="label">
            <span class="text-sm uppercase font-2">Enter sale price in KDA</span>
          </div>
          <div class="join group">
            <input v-model="sale_price" type="number" placeholder="Type here.." class="input group w-full join-item"
              :style="isDarkMode === true ? 'background-color: #1C1C24; border-bottom-right-radius: unset; border-top-right-radius: unset;' : 'background-color: #F4F4F4'" />
            <button @click="$refs.topsearch.click()" role="button"
              class="pt-1 pl-4 pr-4 group:ring-1 rounded-r-lg text-neutral bg-light_foreground dark:bg-foreground focus:outline-none"
              type="submit">
              KDA
            </button>
          </div>
        </label>

        <label v-if="choice_listing === 'auction'" class="form-control mt-6 w-full">
          <div class="label">
            <span class="text-sm uppercase font-2">Choose Min Reserve Price</span>
          </div>
          <div class="join group">
            <input v-model="reserve_price" type="number" placeholder="Type here.." class="input group w-full join-item"
              :style="isDarkMode === true ? 'background-color: #1C1C24; border-bottom-right-radius: unset; border-top-right-radius: unset;' : 'background-color: #F4F4F4'" />
            <button role="button"
              class="pt-1 pl-4 pr-4 group:ring-1 rounded-r-lg text-neutral bg-light_foreground dark:bg-foreground focus:outline-none"
              type="submit">
              KDA
            </button>
          </div>
        </label>

        <transition name="bounce">
          <div v-if="choice_listing === 'auction'" class="w-full gap-4 flex mt-8">
            <div>
              <VueDatePicker dark="true" placeholder="Start Date" :class="isDarkMode === true ? 'darkdate' : ''"
                v-model="auction_start_date"></VueDatePicker>
            </div>
            <div>
              <VueDatePicker dark="true" placeholder="End Date" :class="isDarkMode === true ? 'darkdate' : ''"
                v-model="auction_end_date"></VueDatePicker>
            </div>
          </div>
        </transition>

        <transition name="bounce">
          <div v-if="choice_duration === 'fixed'" class="w-full mt-8">
            <VueDatePicker dark="true" placeholder="Pick an end date from calandar"
              :class="isDarkMode === true ? 'darkdate' : ''" v-model="fixed_end_date"></VueDatePicker>
          </div>
        </transition>


        <div class="w-full">
          <a @click="createMarketListing"
            class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">
            <span
              class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
            <span
              class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
            <span
              class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
            <span
              class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
            <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon
                icon=" fa-light fa-arrow-down-to-bracket" class="mr-2" /> Add To Marketplace</span>
          </a>
        </div>

        <button class="btn w-full mt-4 tracking-wide text-md dark:bg-foreground">CANCEL</button>


      </div>

    </div>
  </div>

  <!--     update market listing modal section -->
  <div :class="showUpdateMarketListingModal === true ? 'modal-open show' : 'modal'" class="modal ">
    <div class="modal-box rounded flex flex-col  dark:bg-dark items-center justify-center p-6 md:p-6"
      :style="isDarkMode === true ? '' : ''">
      <div class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full"
          :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                NFT
              </h3>
              <button @click="clickCloseUpdateMarketListingModal"
                class="btn dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <div class="text-left text-lg mt-2 text-neutral">
              <p>This NFT is currently For Sale on the Kadenai Marketplace.</p>
            </div>
          </div>

        </div>
        <div class="mt-4"></div>


        <div class="bg-light_foreground dark:bg-neutral/30 p-2 rounded-lg w-full flex">
          <div v-if="nft_to_update !== null" class="flex gap-2">
            <div v-if="nft_to_update.image === null" class="skeleton rounded-lg h-10 w-10"></div>
            <img v-if="nft_to_update.image !== null" class="h-20 w-20 object-scale-down rounded-lg"
              :src="nft_to_update.image || '/images/kadenai_black.svg'"
              @error="$event.target.src = '/images/kadenai_black.svg'">
            <div class="flex p-1 flex-col">
              <span :class="name === null ? 'skeleton px-4' : ''" class="font-2 text-xs dark:text-white md:text-lg">{{
                nft_to_update.name === null ? "&nbsp;" : nft_to_update.name.slice(0, 20) }} {{ nft_to_update.name === null
    ? "&nbsp;" : nft_to_update.name.length > 19 ? '...' : '' }}</span>
              <span class="font-2 text-xs mt-1 break-all md:text-sm">{{ nft_to_update.id }}</span>
            </div>
          </div>
        </div>

        <div class="flex mt-8 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            Type
          </div>
          <div class="font-2">
            Sale
          </div>
        </div>

        <div class="flex mt-2 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            Listing Duration
          </div>
          <div class="font-2">
            Unlimited
          </div>
        </div>

        <!-- <div class="flex mt-2 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            Sale Price
          </div>
          <div class="font-2">
            5 KDA
          </div>
        </div> -->

        <div class="flex mt-2 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            Sale Price
          </div>
          <div class="font-2" v-if="!isAuctionSale">
            {{ nft_to_update?.price || 'N/A' }} KDA
          </div>
          <div class="font-2" v-if="isAuctionSale">
            {{ nft_to_update?.price || 'N/A' }} KDA
          </div>
        </div>


<!--        <div class="flex mt-2 w-full justify-between">-->
<!--          <div class="uppercase text-neutral font-2">-->
<!--            Start Date-->
<!--          </div>-->
<!--          <div class="font-2">-->
<!--            Nov 20th, 2023-->
<!--          </div>-->
<!--        </div>-->

<!--        <div class="flex mt-2 w-full justify-between">-->
<!--          <div class="uppercase text-neutral font-2">-->
<!--            End Date-->
<!--          </div>-->
<!--          <div class="font-2">-->
<!--            Dec 20th, 2023-->
<!--          </div>-->
<!--        </div>-->

<!--        <div class="flex mt-2 w-full justify-between">-->
<!--          <div class="uppercase text-neutral font-2">-->
<!--            Min Reserve Price-->
<!--          </div>-->
<!--          <div class="font-2">-->
<!--            15 KDA-->
<!--          </div>-->
<!--        </div>-->

        <!-- <transition name="bounce">
          <div class="w-full gap-4 flex mt-8">
            <div>
              <VueDatePicker :dark="isDarkMode" placeholder="Start Date" :class="isDarkMode === true ? 'darkdate' : ''"  v-model="auction_start_date"></VueDatePicker>
            </div>
            <div>
              <VueDatePicker :dark="isDarkMode" placeholder="End Date" :class="isDarkMode === true ? 'darkdate' : ''" v-model="auction_end_date"></VueDatePicker>
            </div>
          </div>
        </transition> -->
        <!-- Conditional rendering for auction start and end dates -->
<!--        <transition v-if="isAuctionSale" name="bounce">-->
<!--          <div class="w-full gap-4 flex mt-8">-->
<!--            <div>-->
<!--              <VueDatePicker :dark="isDarkMode" placeholder="Start Date" :class="isDarkMode === true ? 'darkdate' : ''"-->
<!--                v-model="nft_to_update.salesData.auctionStartDate"></VueDatePicker>-->
<!--            </div>-->
<!--            <div>-->
<!--              <VueDatePicker :dark="isDarkMode" placeholder="End Date" :class="isDarkMode === true ? 'darkdate' : ''"-->
<!--                v-model="nft_to_update.salesData.auctionEndDate"></VueDatePicker>-->
<!--            </div>-->
<!--          </div>-->
<!--        </transition>-->

<!--        <label class="form-control mt-6 w-full">-->
<!--          <div class="label">-->
<!--            <span class="text-sm uppercase font-2">Choose New Price</span>-->
<!--          </div>-->
<!--          <div class="join group">-->
<!--            <input v-model="reserve_price" type="number" placeholder="Type here.." class="input group w-full join-item"-->
<!--              :style="isDarkMode === true ? 'background-color: #1C1C24; border-bottom-right-radius: unset; border-top-right-radius: unset;' : 'background-color: #F4F4F4'" />-->
<!--            <button role="button"-->
<!--              class="pt-1 pl-4 pr-4 group:ring-1 rounded-r-lg text-neutral bg-light_foreground dark:bg-foreground focus:outline-none"-->
<!--              type="submit">-->
<!--              KDA-->
<!--            </button>-->
<!--          </div>-->
<!--        </label>-->

        <div class="w-full">
          <a
              @click="clickWithdraw"
            class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">
            <span
              class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
            <span
              class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
            <span
              class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
            <span
              class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
            <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon
                icon=" fa-light fa-arrow-up-from-bracket" class="mr-2" /> Withdraw From Marketplace</span>
          </a>
        </div>

<!--        <div class="w-full">-->
<!--          <a-->
<!--            class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">-->
<!--            <span-->
<!--              class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>-->
<!--            <span-->
<!--              class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>-->
<!--            <span-->
<!--              class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>-->
<!--            <span-->
<!--              class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>-->
<!--            <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon-->
<!--                icon=" fa-light fa-arrow-up-from-bracket" class="mr-2" /> Update</span>-->
<!--          </a>-->
<!--        </div>-->

        <button @click="clickCloseUpdateMarketListingModal"
          class="btn w-full mt-4 tracking-wide text-md dark:bg-foreground">CANCEL</button>


      </div>

    </div>
  </div>

  <!--    buy now modal section -->
  <div :class="showBuyNowModal === true ? 'modal-open show' : 'modal'" class="modal ">
    <div class="modal-box rounded flex flex-col  dark:bg-dark items-center justify-center p-6 md:p-6"
         :style="isDarkMode === true ? '' : ''">
      <div class=" w-full flex flex-col justify-center items-center">
        <div class="w-full flex mt-0 justify-between gap-0 text-center rounded-full"
             :class="isDarkMode === false ? '' : ''">
          <div class="flex-col w-full">
            <div class="flex justify-between">
              <h3 class="bg-gradient-to-r text-4xl font-bold pt-1 dark:text-[hsl(218,81%,95%)]">
                Buy Now
              </h3>
              <button @click="closeBuyNowModal"
                      class="btn dark:bg-foreground hover:bg-foreground/50 border-0 h-12 w-12 rounded-full text-xl text-accent">
                <font-awesome-icon icon=" fa-light fa-xmark" /></button>
            </div>
            <div class="text-left text-lg mt-2 text-neutral">
              <p>You are about to purchase.</p>
            </div>
          </div>

        </div>
        <div class="mt-4"></div>

        <div v-if="nft_to_buy !== null && nft_to_buy.image !== undefined" class="bg-light_foreground dark:bg-neutral/30 p-2 rounded-lg w-full flex">
          <div v-if="nft_to_buy !== null" class="flex gap-2">
            <div v-if="nft_to_buy.image === null" class="skeleton rounded-lg h-10 w-10"></div>
            <img v-if="nft_to_buy.image !== null" class="h-20 w-20 object-scale-down rounded-lg"
                 :src="nft_to_buy.image || '/images/kadenai_black.svg'"
                 @error="$event.target.src = '/images/kadenai_black.svg'">
            <div class="flex p-1 flex-col">
              <span :class="name === null ? 'skeleton px-4' : ''" class="font-2 text-xs dark:text-white md:text-lg">{{
                  nft_to_buy.name === null ? "&nbsp;" : nft_to_buy.name.slice(0, 20) }} {{ nft_to_buy.name === null
                    ? "&nbsp;" : nft_to_buy.name.length > 19 ? '...' : '' }}</span>
              <span class="font-2 text-xs mt-1 break-all md:text-sm">{{ nft_to_buy.id }}</span>
            </div>
          </div>
        </div>

        <div v-if="nft_to_buy !== null" class="flex mt-8 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            NFT PRICE
          </div>
          <div class="font-2">
            {{nft_to_buy.price}} {{nft_to_buy.coin_name}}
          </div>
        </div>

<!--        <div class="flex mt-2 w-full justify-between">-->
<!--          <div class="uppercase text-neutral font-2">-->
<!--            FEE-->
<!--          </div>-->
<!--          <div class="font-2">-->
<!--            1 Credit-->
<!--          </div>-->
<!--        </div>-->

        <div class="divider"></div>

        <div v-if="nft_to_buy !== null" class="flex mt-2 w-full justify-between">
          <div class="uppercase text-neutral font-2">
            TOTAL
          </div>
          <div v-if="nft_to_buy !== null" class="font-2">
            {{nft_to_buy.price}} {{nft_to_buy.coin_name}}
          </div>
        </div>


        <div class="w-full">
          <a
              @click="clickBuy"
              class="px-6 py-2.5 w-full mt-12 h-12 flex text-center cursor-pointer justify-center items-center relative rounded-lg group  text-white  ">
            <span
                class="absolute top-0 left-0 w-full h-full rounded-lg opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
            <span
                class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-lg opacity-50 from-primary to-secondary"></span>
            <span
                class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-lg bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
            <span
                class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-lg bg-gradient-to-r to-secondary from-primary"></span>
            <span class="relative font-2 tracking-wide text-md md:px-4"><font-awesome-icon
                icon=" fa-light fa-wallet" class="mr-2" /> Buy Now</span>
          </a>
        </div>

        <button @click="closeBuyNowModal"
                class="btn w-full mt-4 tracking-wide text-md dark:bg-foreground">CANCEL</button>


      </div>

    </div>
  </div>



  <div class=" w-full">

    <div class="header-wrapper flex bg-transparent ">
      <div class="flex justify-center container mx-4 md:mx-auto  w-full items-center ">
        <div v-motion-slide-top class="logo flex justify-center border-foreground md:mr-6 pr-4 md:border-r-2">
          <div @click="clickHome"
            class="logo md:pr-12 cursor-pointer flex items-center text-black dark:text-white text-2xl font-bold justify-center">
            <img class="h-16 w-16 md:ml-3 mr-1 pr-2" src="/images/kadenai_main_gradient.svg" alt="logo" srcset="" />
            <span class="hidden md:flex">KADENAI</span>
          </div>

        </div>

        <div class="flex w-full items-center justify-center  gap-4">

          <div class="hidden md:flex  items-center justify-center mx-10 gap-10">
            <div @click="clickHome" v-motion-slide-top class="text-black alink font-2 text-[16px] dark:text-white">
              Marketplace
            </div>

            <details v-motion-slide-top
                v-if="displayFixedAccountName !== null && displayFixedAccountName !== 'null' && displayFixedAccountName !== '' && displayFixedAccountName !== 'U' && show_mobile_search_bar === false"
                class="dropdown w-full min-w-fit md:w-fit dropdown-hover  group">
              <summary role="button" tabIndex="0" class="w-full  btn bg-transparent text-black border-0 rounded-md  font-2 text-[16px] dark:text-white">Tools</summary>
              <ul tabindex="0" class="dropdown-content  p-2 bg-accent/30 glass rounded-box mt-4 ">
                <li class="bg-light  flex gap-2 flex-row items-center justify-start p-1 text-xl rounded-box  dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                  <div class="flex">

                    <div class="flex w-full flex-col bg-light px-10 flex gap-2 flex-row items-center justify-start p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                      <div @click="clickExplore()" class=" pt-4 pb-4 flex justify-between w-full"
                         :class="isDarkMode === true ? 'text-light text-5xl hover:text-white' : 'text-black text-5xl hover:text-dark'">
                        <font-awesome-icon icon=" fa-light fa-telescope" />
                      </div>
                      <span class="text-xs">Explore</span>
                    </div>

                    <div class="flex w-full flex-col bg-light px-10 flex gap-2 flex-row items-center justify-start p-1 text-xl  dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                      <div @click="clickMint()" class=" pt-4 pb-4 flex justify-between w-full"
                         :class="isDarkMode === true ? 'text-light text-5xl hover:text-white' : 'text-black text-5xl hover:text-dark'">
                        <font-awesome-icon icon=" fa-light fa-hexagon-vertical-nft-slanted" />
                      </div>
                      <span class="text-xs">Create</span>
                    </div>



                  </div>

                </li>
              </ul>

            </details>



          </div>

          <HeaderSearch class="flex-grow   hidden md:flex" />

          <HeaderSearch v-if="show_mobile_search_bar === true" class="flex-grow  md:hidden" />

          <button v-motion-slide-top id="searchBarToggle" @click="toggleSearchBar"
            class="btn md:hidden bg-light_foreground dark:bg-foreground dark:hover:bg-primary/70 hover:bg-primary/30 mx-0 border-0  flex items-center justify-center "
            :style="show_mobile_search_bar === true ? 'background-color: #DE00EC !important' : ''">

            <font-awesome-icon class="w-[16px] h-[16px]" icon=" fa-light fa-magnifying-glass" />

          </button>

          <button v-motion-slide-top v-if="show_mobile_search_bar === false" id="lightOrDarkMode" @click="colorModeSwitch"
            class="btn bg-light_foreground dark:bg-foreground dark:hover:bg-primary/70 hover:bg-primary/30 mx-0 border-0  flex items-center justify-center ">

            <font-awesome-icon class="hidden dark:block w-[16px] h-[16px]" icon=" fa-light fa-sun-bright" />
            <img class="block dark:hidden w-[12px] h-[12px] fill-secondary dark:fill-primary-100"
              src="/images/Dark-mode.svg" />

          </button>


          <details v-motion-slide-top
               v-if="current_transactions_to_show_now !== null"
            class="dropdown w-full min-w-fit md:w-fit dropdown-hover dropdown-end group">
            <summary
                role="button" tabIndex="0"
              class="btn bg-light_foreground dark:bg-foreground dark:hover:bg-primary/70 hover:bg-primary/30 mx-0 border-0  flex items-center justify-center">

              <summary v-if="current_transactions_to_show_now !== null" role="button" tabIndex="0" class="badge border-none py-3 bg-gradient-to-r from-primary to-accent">
                {{ current_transactions_to_show_now.length }}</summary>
            </summary>
            <ul tabindex="0" class="dropdown-content ddown p-2 bg-accent/30 glass rounded-box mt-4 w-72">
              <li @click="clickTransaction(tx)" v-for="(tx, idx) in current_transactions_to_show_now" :key="idx"
                class="profilelist bg-light px-2 flex gap-2  items-center  p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
               <div class="flex w-[50px]">
                 <div class="bg-purple-600 w-10 h-10 flex items-center justify-center rounded-full ">
                   <span v-if="tx.completed === false" class="loading loading-infinity loading-md -mt-0.5"></span>
                   <font-awesome-icon v-if="tx.completed === true && tx.failed === false" icon=" fa-light fa-check" />
                   <font-awesome-icon v-if="tx.completed === true && tx.failed === true" icon=" fa-light fa-xmark" />

                 </div>
               </div>
                <div class="flex flex-col">
                  <div class="flex gap-4 w-full">
                    <span class="font-2 text-xs text-secondary md:text-sm">{{ tx.txhash.slice(0, 20) }} ..</span>
                  </div>
                  <div class="flex mt-2 w-full ">
                    <div class="flex justify-between gap-2">

                      <div class="flex break-all  flex-col w-full">
                      <span :class="tx.name === null ? 'skeleton px-4' : ''"
                            class="font-2 text-xs text-black dark:text-white md:text-lg">{{ tx.name === null ? "&nbsp;" :
                          tx.name }} </span>
                        <span class="text-xs">{{ tx.type }}</span>
                      </div>
                      <div class="flex">
                        <img v-if="tx.image !== null" class="h-12 w-12 object-scale-down rounded-lg"
                             :src="tx.image || '/images/kadenai_black.svg'"
                             @error="$event.target.src = '/images/kadenai_black.svg'">
                      </div>

                    </div>
                  </div>
                </div>


              </li>
            </ul>

          </details>


          <!--          Connect Wallet Section-->
          <details
              v-motion-slide-top
            v-if="displayFixedAccountName === null && show_mobile_search_bar === false || displayFixedAccountName === 'null' && show_mobile_search_bar === false || displayFixedAccountName === '' && show_mobile_search_bar === false || displayFixedAccountName === 'U' && show_mobile_search_bar === false"
            class="dropdown w-full flex-1 min-w-fit dropdown-end group">
            <summary @click="clickShowConnectAWalletModal" class="w-full px-6"
                 role="button" tabIndex="0"
              :class="isDarkMode === false ? 'btn bg-gradient-to-l text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium' : 'btn bg-gradient-to-r text-white border-0 rounded-md from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl'">

              <span
                class="absolute top-0 left-0 w-full h-full rounded-md opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
              <span
                class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-md opacity-50 from-primary to-secondary"></span>
              <span
                class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-md bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
              <span
                class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-md bg-gradient-to-r to-secondary from-primary"></span>
              <span class="relative normal-case font-1 text-center justify-center rounded-md items-center flex gap-2">
                <font-awesome-icon class="w-[16px] h-[16px]" icon=" fa-light fa-wallet" /> Connect Wallet</span>

            </summary>
          </details>

          <details
              v-motion-slide-top
            v-if="displayFixedAccountName !== null && displayFixedAccountName !== 'null' && displayFixedAccountName !== '' && displayFixedAccountName !== 'U' && show_mobile_search_bar === false"
            class="dropdown w-full min-w-fit md:w-fit dropdown-hover dropdown-end group">
            <summary v-if="displayFixedAccountName !== 'CONNECT WALLET'" class="w-full" role="button" tabIndex="0"
              :class="isDarkMode === false ? 'btn bg-gradient-to-l text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium' : 'btn bg-gradient-to-r text-white border-0 rounded-md from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl'">{{
                displayFixedAccountName }}</summary>
            <summary v-if="displayFixedAccountName === 'CONNECT WALLET'" @click="clickShowConnectAWalletModal"
              class="w-full px-6" role="button" tabIndex="0"
              :class="isDarkMode === false ? 'btn bg-gradient-to-l text-white border-0 from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl hover:font-medium' : 'btn bg-gradient-to-r text-white border-0 rounded-md from-primary to-secondary hover:bg-accent-light/10 hover:bg-gradient-to-bl'">

              <span
                class="absolute top-0 left-0 w-full h-full rounded-md opacity-50 filter blur-sm bg-gradient-to-r from-primary to-secondary"></span>
              <span
                class="h-full w-full inset-0 absolute bg-gradient-to-r filter group-active:opacity-0 rounded-md opacity-50 from-primary to-secondary"></span>
              <span
                class="absolute inset-0 w-full h-full transition-all duration-200 ease-out rounded-md bg-gradient-to-r filter group-active:opacity-0 group-hover:blur-sm from-primary to-secondary"></span>
              <span
                class="absolute inset-0 w-full h-full transition duration-200 ease-out rounded-md bg-gradient-to-r to-secondary from-primary"></span>
              <span class="relative normal-case font-1 text-center justify-center rounded-md items-center flex gap-2">
                <font-awesome-icon class="w-[16px] h-[16px]" icon=" fa-light fa-wallet" /> Connect Wallet</span>

            </summary>
            <ul v-if="displayFixedAccountName !== 'CONNECT WALLET'" tabindex="0" class="dropdown-content ddown p-2 bg-accent/30 glass rounded-box mt-4 w-72">
              <li v-if="displayFixedAccountName !== 'CONNECT WALLET'" @click="clickProfile"
                class="bg-light flex gap-4 flex-row items-center justify-center pb-4 pt-4 p-2 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border rounded-t-box hover:bg-accent/40">
                <div v-if="displayFixedAccountName !== 'CONNECT WALLET'" class="m-0 p-0 font-2"
                  :class="isDarkMode === true ? 'text-light' : 'text-black'">
                  {{ displayFixedAccountName }}
                </div>
              </li>
              <li v-if="displayFixedAccountName !== 'CONNECT WALLET' && userCredits > 0"
                  class="bg-light px-10 flex gap-2 flex-row items-center justify-center p-0 text-sm dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                <a @click="clickShowCreditModal()" class=" pt-1 pb-1 flex justify-center w-full"
                   :class="isDarkMode === true ? 'text-light hover:text-white' : 'text-black'">
                  {{userCredits}} Credits</a>
              </li>
              <li v-if="displayFixedAccountName !== 'CONNECT WALLET'" @click="clickProfile"
                class="bg-light px-10 flex gap-2 flex-row items-center justify-center p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                <div class=" pt-4 pb-4 flex justify-between w-full"
                  :class="isDarkMode === true ? 'text-light hover:text-white' : 'text-black'">
                  <font-awesome-icon icon=" fa-light fa-user-gear" />
                  Profile</div>
              </li>
              <li v-if="displayFixedAccountName !== 'CONNECT WALLET'"
                  class="bg-light px-10 flex gap-2 flex-row items-center justify-center p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                <a @click="clickShowCreditModal()" class=" pt-4 pb-4 flex justify-between w-full"
                   :class="isDarkMode === true ? 'text-light hover:text-white' : 'text-black'">
                  <font-awesome-icon icon=" fa-light fa-coin-vertical" />
                  Credits</a>
              </li>
              <li v-if="displayFixedAccountName !== 'CONNECT WALLET'"
                class="bg-light px-10 flex gap-2 flex-row items-center justify-center p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border rounded-b-box hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                <a @click="clickCancel()" class=" pt-4 pb-4 flex justify-between w-full"
                  :class="isDarkMode === true ? 'text-light hover:text-white' : 'text-black'">
                  <font-awesome-icon icon=" fa-light fa-door-open" />
                  Disconnect</a>
              </li>
              <li v-if="displayFixedAccountName === 'CONNECT WALLET'"
                class="bg-light px-10 flex gap-2 flex-row items-center justify-center p-1 text-xl dark:text-white dark:bg-foreground border-transparent dark:border-transparent border rounded-box hover:bg-white/60 cursor-pointer hover:dark:bg-dark/50">
                <a @click="clickCancel()" class=" pt-4 pb-4 flex justify-between w-full"
                  :class="isDarkMode === true ? 'text-light hover:text-white' : 'text-black'">
                  <font-awesome-icon icon=" fa-light fa-door-open" />
                  Connect</a>
              </li>
            </ul>

          </details>


        </div>





      </div>

    </div>

  </div>
</template>

<style lang="scss" scoped>
.alink {
  text-decoration: none;
}

.alink {
  @apply cursor-pointer;
  background:
    linear-gradient(to right,
      transparent,
      transparent),
    linear-gradient(to right,
      #4800F9,
      #9500F3,
      #DE00EC);
  background-size: 100% 3px, 0 3px;
  background-position: 100% 100%, 0 100%;
  background-repeat: no-repeat;
  transition: background-size 400ms;
}

.alink:hover {
  background-size: 0 3px, 100% 3px;
}

.profilelist:first-child {
  @apply rounded-t-lg;
}

.profilelist:last-child {
  @apply rounded-b-lg;
}

.dp__theme_dark {
  --dp-background-color: #212121;
  --dp-text-color: #fff;
  --dp-hover-color: #484848;
  --dp-hover-text-color: #fff;
  --dp-hover-icon-color: #959595;
  --dp-primary-color: #005cb2;
  --dp-primary-disabled-color: #61a8ea;
  --dp-primary-text-color: #fff;
  --dp-secondary-color: #a9a9a9;
  --dp-border-color: #2d2d2d;
  --dp-menu-border-color: #2d2d2d;
  --dp-border-color-hover: #1C1C24;
  --dp-disabled-color: #737373;
  --dp-disabled-color-text: #d0d0d0;
  --dp-scroll-bar-background: #212121;
  --dp-scroll-bar-color: #484848;
  --dp-success-color: #00701a;
  --dp-success-color-disabled: #428f59;
  --dp-icon-color: #959595;
  --dp-danger-color: #e53935;
  --dp-marker-color: #e53935;
  --dp-tooltip-color: #3e3e3e;
  --dp-highlight-color: rgb(0 92 178 / 20%);
  --dp-range-between-dates-background-color: var(--dp-hover-color, #484848);
  --dp-range-between-dates-text-color: var(--dp-hover-text-color, #fff);
  --dp-range-between-border-color: var(--dp-hover-color, #fff);
}

:deep(.dp__input) {
  height: 50px !important;
  @apply rounded-lg bg-light_foreground border-0;
}

.darkdate {
  :deep(.dp__input) {
    @apply bg-foreground;
  }
}



.ddown:before {
  border: 1px solid rgba(226, 232, 255, .1);
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
  box-shadow: 0 -28px 84px -24px rgba(39, 19, 40, 0.12) inset;
  background: radial-gradient(103.78% 100% at 50% 0%, rgba(118, 146, 255, 0) 80.55%, rgba(84, 46, 98, 0.04) 100%), radial-gradient(120.05% 100% at 50% 0%, rgba(240, 226, 255, 0) 33.78%, rgba(52, 10, 62, 0.08) 100%), rgba(226, 232, 255, .01);
}

.header-wrapper {
  position: fixed;
  top: 0;
  width: 100%;
  height: 80px;
  z-index: 100;
  backdrop-filter: blur(10px)
}

.mega-menu {
  width: 1200px;
}

ul.links {
  column-count: 2;

  li {
    margin-bottom: 8px;
  }
}</style>
