import Pact from "pact-lang-api";
import SignClient from "@walletconnect/sign-client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import axios from "axios";
import Decimal from "decimal.js";
import {Pact as JSPact, createClient, createWalletConnectQuicksign} from "@kadena/client";
import kadenaClient from "../components/util/jsInit.js";
import config from "../components/util/config.js";
import apiConfig from "../components/util/apiConfig.js";


//Helper function to create caps for wallet connect
const createCap = (role, description, name, args) => {
    return {
        role: role,
        description: description,
        cap: {
            name: name,
            args: args,
        },
    };
};

//Helper function for wallet connect quick signing
const wc = {
    name: 'wc',
    quickSign: async function(data, client, session) {
        // console.log("WC STARTED");
        // console.log("data", data);
        // console.log("client", client);
        // console.log("sessions", session);
        if (client && session) {
            const chainId = `kadena:mainnet01`;

            const quicksignWithWalletConnect = createWalletConnectQuicksign(client, session, chainId);
            console.log("quicksignWithWalletConnect");
            console.log(quicksignWithWalletConnect);
            try {
                // Use the quicksign function with the provided data
                const result = await quicksignWithWalletConnect(data);
                return result;
            } catch (error) {
                console.error("Error during quick signing:", error);
                throw error;
            }
        } else {
            throw new Error("WalletConnect client is not initialized or session is not connected");
        }
    },
};

//References node host
const host = (chainId) => `${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact`;
//References node host for some situations- local calls only
const host_local = (chainId) => `${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact/api/v1/local`;
//References node host for some situations
const host_local2 = (chain) => `https://api.chainweb.com/chainweb/0.0/mainnet01/chain/${chain}/pact`;


//STATE VARIABLES FOR ENTIRE APP
const state = {
    darkmode: true,
    minting_tokenid: null,
    minting_hash: null,
    userSqlData: null,
    newTransaction: false,
    newCrosschain: false,
    accountExists: null,
    currentSignRequest: null,
    accountData: null,
    receiverAccountData: null,
    accountName: null,
    accountConfirmed: false,
    accountKeys: [],
    accountPredicate: null,
    userStakeBalance: 0,
    userNFTs: [],
    setMarketplace: [],
    userCredits: null,
    transactions: [],
    transactions_changed: false,
    creatingCollection: false,
    creatingCollection_created: false,
    transactionPolling: false,
    transactionConfirmed: false,
    transactionFailed: null,
    transactionHash: null,
    transactionConfirmedResult: null,
    chainId: config.chainId,
    network: `${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact`,
    networkid: config.networkId,
    gasPrice: 0.000001,
    xwalletconnected: false,
    wallet_connect_connected: false,
    wallet_connect_client: null,
    wallet_connect_session: null,
    bid_clicked: false,
    clicked_nft: null,
    sale_clicked: false,
    buy_clicked: false,
    update_listing_clicked: false,
    clicked_nft_sale: null,
    clicked_nft_buy: null,
    clicked_nft_update_listing: null,
    KDA_NAMESPACE: "kadena",
    KDA_CHAINS: ["kadena:mainnet01", "kadena:testnet04"],
    KDA_METHODS: {
        KDA_SIGN: "kadena_sign_v1",
        KDA_QUICK_SIGN: "kadena_quicksign_v1",
    }
};

//STORE GETTERS FOR STATE VARIABLES
const getters = {
    getTransactions(state) {
        return state.transactions;
    },
    getBidClicked(state) {
        return state.bid_clicked;
    },
    getClickedNFT(state) {
        return state.clicked_nft;
    },
    getTransactionsChanged(state) {
        return state.transactions_changed;
    },
    getSaleClicked(state) {
        return state.sale_clicked;
    },
    getUserCredits(state) {
        return state.userCredits;
    },
    getBuyClicked(state) {
        return state.buy_clicked;
    },
    getUpdateListingClicked(state) {
        return state.update_listing_clicked;
    },
    getClickedNFT_sale(state) {
        return state.clicked_nft_sale;
    },
    getClickedNFT_buy(state) {
        return state.clicked_nft_buy;
    },
    getClickedNFT_updatelisting(state) {
        return state.clicked_nft_update_listing;
    },
    getDarkmode(state) {
        return state.darkmode;
    },
    getCurrentSignRequest(state) {
        return state.currentSignRequest;
    },
    getNewTransaction(state) {
        return state.newTransaction;
    },
    getUserNFTs(state) {
        return state.userNFTs;
    },
    getAccountExists(state) {
        return state.accountExists;
    },
    getAccountKeys(state) {
        return state.accountKeys;
    },
    getAccountPredicate(state) {
        return state.accountPredicate;
    },
    getAccountData(state) {
        return state.accountData;
    },
    getAccountName(state) {
        return state.accountName;
    },
    getAccountConfirmed(state) {
        return state.accountConfirmed;
    },
    getTransactionPolling(state) {
        return state.transactionPolling;
    },
    getTransactionConfirmed(state) {
        return state.transactionConfirmed;
    },
    getTransactionFailed(state) {
        return state.transactionFailed;
    },
    getTransactionHash(state) {
        return state.transactionHash;
    },
    getTransactionConfirmedResult(state) {
        return state.transactionConfirmedResult;
    },
    getXWalletConnected(state) {
        return state.xwalletconnected;
    },
    getWalletConnectConnected(state) {
        return state.wallet_connect_connected;
    },
    getWalletConnectClient(state) {
        return state.wallet_connect_client;
    },
    getWalletConnectSession(state) {
        return state.wallet_connect_session;
    },
};


//ACTIONS
const actions = {

    //connects xwallet
    async connectXwallet({commit}) {

        const kadena = window.kadena;
        const networkId = state.networkid;

        //First lets check if xwallet is present in the users DOM window
        if (window.kadena.isKadena === true) {

            let accountResult = await kadena.request({
                method: "kda_requestAccount",
                networkId: networkId,
                domain: window.location.hostname
            });

            let myinterval = null;

            // console.log("ACCOUNT RESULT ->", accountResult);

            if (accountResult.status === "success") {
                //User has xwallet lets send a request to connect to our site

                await kadena.request({method: "kda_connect", networkId: networkId}).then(() => {
                    kadena.request({method: "kda_connect", networkId: networkId});
                });

                //Update local storage variables
                localStorage.setItem("kai_accountName", accountResult.wallet.account);
                localStorage.setItem("kai_isConnected", "true");
                localStorage.setItem("kai_isUsingXwallet", "true");

                //Now that we have the account, lets verify it and check it
                await this.dispatch("accounts/getAccountVerification", accountResult.wallet.account);
                //Lets also make sure we confirm this account exists with Kadenai, if not we register it
                await this.dispatch("accounts/confirmAccountExists", accountResult.wallet.account);

                console.log("LOGGED IN WITH XWALLET ACCOUNT ->", accountResult.wallet.account);

                //Double check the user logged in with xwallet, if not log them out
                try{

                    if(accountResult.wallet.account !== undefined && accountResult.wallet.account !== null){

                        localStorage.setItem("kai_accountName", accountResult.wallet.account);
                        localStorage.setItem("kai_isConnected", "true");
                        localStorage.setItem("kai_isUsingXwallet", "true");

                    }else{

                        await this.dispatch("accounts/resetAccountExists");
                        localStorage.setItem("kai_accountName", "");
                        localStorage.setItem("kai_isConnected", 'false');
                        localStorage.setItem("kai_isUsingXwallet", 'false');
                        localStorage.setItem("kai_isUsingWalletConnect", 'false');

                    }

                }catch(e){
                    console.log(e);
                }

                //Update state
                commit("setWalletConnectConnected", false);
                commit("setXwalletConnected", true);

                //For situations where xwallet is having problems, lets clear any intervals set
                if (myinterval !== null) {
                    clearInterval(myinterval);
                }


            } else {

                //We did not get the account from eckowallet, lets pulse requests for 1 minute at the user incase they click or disable something blocking them

                console.log("Please connect Eckowallet");

                //First lets reset state that we are not connected
                localStorage.setItem("kai_accountName", null);
                localStorage.setItem("kai_isConnected", "false");
                localStorage.setItem("kai_isUsingXwallet", "false");
                state.xwalletconnected = false;
                commit("setWalletConnectConnected", false);
                commit("setXwalletConnected", false);

                let count = 1;

                //Next lets make a request for the account

                try{

                    let accountResult2 = await kadena.request({
                        method: "kda_requestAccount",
                        networkId: networkId,
                        domain: window.location.hostname
                    });

                    if (accountResult2.status === "success") {
                        await this.dispatch("accounts/connectXwallet");
                    }

                }catch(e){
                    console.log(e);
                }

                //Lets send requests at the user for the next minute
                myinterval = setInterval(async () => {

                    count++;

                    //Send requests at the user for the next minute
                    let accountResult2 = await kadena.request({
                        method: "kda_requestAccount",
                        networkId: networkId,
                        domain: window.location.hostname
                    });
                    if (accountResult2.status === "success") {
                        clearInterval(myinterval);
                        await this.dispatch("accounts/connectXwallet");
                    }

                    if (count === 60) {
                        clearInterval(myinterval);
                    }

                }, 1000);

            }
        }


        //Request to connect to wallet
        try{
            await kadena.request({method: "kda_connect", networkId: networkId}).then(() => {
                kadena.request({method: "kda_connect", networkId: networkId});
            });
        }catch(e){
            console.log(e);
        }


    },

    //connects walletconnect
    async connectWalletConnect({commit}) {

        //Lets connect wallet connect, we will use their example from react and make our way through this

        //Lets leave pairing as undefined since this is a NEW wallet connect connection
        let pairing = undefined;

        //Initiate a new client
        const client = await SignClient.init({
            projectId: import.meta.env.VITE_PROJECT_ID,
            metadata: {
                name: "Kadenai",
                description: "Kadenai Marketplace",
                url: "https://kadenai.com",
                icons: ["https://market.kadenai.com/images/kadenai_v.png"],
            },
        });

        //Now lets connect to the client
        try {
            const {uri, approval} = await client.connect({

                // Optionally: pass a known prior pairing (e.g. from `client.pairing.values`) to skip the `uri` step.
                pairingTopic: pairing?.topic,

                // Provide the namespaces and chains (e.g. `eip155` for EVM-based chains) we want to use in this session.
                requiredNamespaces: {
                    kadena: {
                        "methods": [
                            "kadena_getAccounts_v1",
                            "kadena_sign_v1",
                            "kadena_quicksign_v1"
                        ],
                        // Provide the chains that you wish to use in the session (Example, `eip155` is used for EVM-based chains)
                        chains: ['kadena:mainnet01'],
                        // Provide the session events that you wish to listen
                        events: [],
                    },
                },
            });

            // Open QRCode modal if a URI was returned (i.e. we're not connecting an existing pairing).
            if (uri) {
                QRCodeModal.open(uri, () => {
                    console.log("EVENT", "QR Code Modal closed");
                });
            }

            //Await session approval from the wallet.
            const session = await approval();

            //Lets save this pairings stuff incase we need it in the future
            let pairings = client.pairing.getAll({ active: true });
            //Lets pick out the very last pairing, since thats the latest, we will try reconnecting to this
            let last_pairing = pairings[pairings.length-1].topic;

            //Parse out account info from session
            const accounts = session.namespaces.kadena.accounts.map((item) => {
                let normalAccountName = item;
                state.KDA_CHAINS.forEach((chain) => {
                    normalAccountName = normalAccountName.replace("**", ":").replace(`${chain}:`, "");
                });
                return normalAccountName;
            });

            //Lets add 'k:' if it isnt there, this needs a better solution
            if(accounts[0].includes('k:') === false){
                accounts[0] = 'k:'+accounts[0];
            }

            //Finally update our state and local storage with everything we need
            commit("setXwalletConnected", false);
            commit("setWalletConnectConnected", true);
            commit("setWalletConnectClient", client);
            commit("setWalletConnectSession", session);
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_isUsingWalletConnect", "true");
            localStorage.setItem("kai_wcPairing", last_pairing);
            localStorage.setItem("kai_wcSession", JSON.stringify(session));
            localStorage.setItem("kai_accountName", accounts[0]);
            localStorage.setItem("kai_isConnected", "true");
            //Send off account and verify it exists on chain and with kadenai
            await this.dispatch("accounts/getAccountVerification", accounts[0]);
            await this.dispatch("accounts/confirmAccountExists", accounts[0]);
            //Update state twice, this will trigger the watcher in our header to update itself that the user has logged in
            await commit("setAccountConfirmed", false);
            await commit("setAccountConfirmed", true);

            QRCodeModal.close();

        } catch (e) {
            //We have errors lets reset everything
            console.error(e);
            commit("setWalletConnectConnected", false);
            commit("setAccountExists", null);
            commit("setAccountConfirmed", false);
            commit("setXWalletConnected", false);
            commit("setWalletConnectConnected", false);
            commit("setWalletConnectClient", null);
            commit("setWalletConnectSession", null);
            commit("setUserNFTs", null);
            localStorage.setItem("kai_wcPairing", "false");
            localStorage.setItem("kai_wcSession", "false");
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_accountName", "");
            localStorage.setItem("kai_isUsingWalletConnect", "false");
            localStorage.setItem("kai_isUsingWalletConnect", "false");
        } finally {
            // Close the QRCode modal in case it was open.
            QRCodeModal.close();
        }


    },

    //reconnects walletconnect with a pairing
    async reconnectWalletConnect({commit}) {

        //lets RECONNECT to wallet connect
        //this function is for when a user comes back to the app after they have lost state and
        //attempts to reconnect to wallet connect using the previous info

        //Grab stored session
        const storedSessionString = localStorage.getItem("kai_wcSession");
        let storedSession = storedSessionString ? JSON.parse(storedSessionString) : null;

        let pairing = undefined;

        //Create a new client
        const client = await SignClient.init({
            projectId: process.env.VITE_PROJECT_ID,
            metadata: {
                name: "Kadenai",
                description: "Kadenai Marketplace",
                url: "https://kadenai.com",
                icons: ["https://market.kadenai.com/images/kadenai_v.png"],
            },
        });

        if (storedSession && client.session.get(storedSession.topic)) {
            // Session is valid, restore it
            console.log("Restoring WC Session:", storedSession);

            //Get pairings from client
            let pairings = client.pairing.getAll({ active: true });

            //Get the last pairing
            let last_pairing = pairings[pairings.length-1].topic;

            //Parse out accounts
            const accounts = storedSession.namespaces.kadena.accounts.map((item) => {
                let normalAccountName = item;
                state.KDA_CHAINS.forEach((chain) => {
                    normalAccountName = normalAccountName.replace("**", ":").replace(`${chain}:`, "");
                });
                return normalAccountName;
            });

            //Add 'k:' if its not there
            if(accounts[0].includes('k:') === false){
                accounts[0] = 'k:'+accounts[0];
            }

            //Update state the user has connected
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_isUsingWalletConnect", "true");
            localStorage.setItem("kai_wcPairing", last_pairing);
            localStorage.setItem("kai_wcSession", JSON.stringify(storedSession));
            commit("setXwalletConnected", false);
            commit("setWalletConnectConnected", true);
            commit("setWalletConnectClient", client);
            commit("setWalletConnectSession", storedSession);
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_isUsingWalletConnect", "true");
            localStorage.setItem("kai_wcPairing", last_pairing);
            localStorage.setItem("kai_wcSession", JSON.stringify(storedSession));
            localStorage.setItem("kai_accountName", accounts[0]);
            localStorage.setItem("kai_isConnected", "true");
            //Verify the users account
            await this.dispatch("accounts/getAccountVerification", accounts[0]);
            await this.dispatch("accounts/confirmAccountExists", accounts[0]);
            //Update state
            await commit("setAccountConfirmed", false);
            await commit("setAccountConfirmed", true);
            QRCodeModal.close();

        }else{
            //We had problems lets reset everything
            commit("setWalletConnectConnected", false);
            commit("setAccountExists", null);
            commit("setAccountConfirmed", false);
            commit("setXWalletConnected", false);
            commit("setWalletConnectConnected", false);
            commit("setWalletConnectClient", null);
            commit("setWalletConnectSession", null);
            commit("setUserNFTs", null);
            localStorage.setItem("kai_wcPairing", "false");
            localStorage.setItem("kai_wcSession", "false");
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_accountName", "");
            localStorage.setItem("kai_isUsingWalletConnect", "false");
            localStorage.setItem("kai_isUsingWalletConnect", "false");
        }

    },

    //Local call to verify if a coin account exists, used during account login to verify account exists
    async getAccountVerification({commit}, accountName) {

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(coin.details ${JSON.stringify(accountName)})`,
                meta: Pact.lang.mkMeta("", "1", state.gasPrice, 150000, t_creationTime, 600)
            }, host_local2("1"));


            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;

                let data8 = await Pact.fetch.local({
                    pactCode: `(coin.details ${JSON.stringify(accountName)})`,
                    meta: Pact.lang.mkMeta("", "8", state.gasPrice, 150000, t_creationTime, 600)
                }, host_local2("8"));

                // if (data8.result.status !== "success") {
                //     alert("Kadenai didn't detect any KDA on chain 8 for this account- Some features may not work such as buying/selling Marmalade V2 NFTs without KDA.")
                // }

            } else {

                data = await Pact.fetch.local({
                    pactCode: `(coin.details ${JSON.stringify(accountName)})`,
                    meta: Pact.lang.mkMeta("", "8", state.gasPrice, 150000, t_creationTime, 600)
                }, host_local2("8"));

                if (data.result.status === "success") {

                    dataResult = [{...data.result}];
                    exists = true;
                } else {
                    exists = false;
                }
            }

        } catch (error) {
            console.log(error);
        }

        // console.log("getAccountVerification exists ->", exists);
        // console.log("dataResult");
        // console.log(dataResult);

        commit("setAccountExists", exists);
        if (exists === true) {
            commit("setAccountData", dataResult);
            commit("setAccountKeys", dataResult[0]["data"]["guard"]["keys"]);
            commit("setAccountPredicate", dataResult[0]["data"]["guard"]["pred"]);
            localStorage.setItem("kai_accountPredicate", dataResult[0]["data"]["guard"]["pred"]);
            localStorage.setItem("kai_accountPublicKey", dataResult[0]["data"]["guard"]["keys"][0]);

        }
    },

    //Resets all login data, used when disconnecting/canceling the login screen
    async resetAccountExists({commit}) {
        const reset = null;
        this.accountExists = null;

        if (window.kadena && window.kadena.isKadena === true) {
            let result = await window.kadena.request({
                method: "kda_disconnect",
                networkId: state.networkid,
                domain: window.location.hostname
            });
            console.log(result);
        }

        try{
            if (state.wallet_connect_connected) {
                if (state.wallet_connect_client) {
                    if(state.wallet_connect_session.topic){
                        state.wallet_connect_client.disconnect({
                            topic: state.wallet_connect_session.topic,
                            reason: {
                                message: "User disconnected.",
                                code: 6000,
                            },
                        });
                    }
                }
            }
        }catch(e){
            console.log(e);
            commit("setAccountExists", reset);
            commit("setAccountConfirmed", false);
            commit("setXWalletConnected", false);
            commit("setWalletConnectConnected", false);
            commit("setWalletConnectClient", null);
            commit("setWalletConnectSession", null);
            commit("setUserNFTs", null);
            localStorage.setItem("kai_wcPairing", "false");
            localStorage.setItem("kai_wcSession", "false");
            localStorage.setItem("kai_isUsingXwallet", "false");
            localStorage.setItem("kai_accountName", "");
            localStorage.setItem("kai_isUsingWalletConnect", "false");
        }

        commit("setAccountExists", reset);
        commit("setAccountConfirmed", false);
        commit("setXWalletConnected", false);
        commit("setWalletConnectConnected", false);
        commit("setWalletConnectClient", null);
        commit("setWalletConnectSession", null);
        commit("setUserNFTs", null);
        localStorage.setItem("kai_wcPairing", "false");
        localStorage.setItem("kai_wcSession", "false");
        localStorage.setItem("kai_isUsingXwallet", "false");
        localStorage.setItem("kai_accountName", "");
        localStorage.setItem("kai_isUsingWalletConnect", "false");


    },

    //For setting a users credits
    async bindUserCredits({commit}, payload) {
        commit("setUserCredits",  payload.credits);
    },

    //Updates state for when users click 'bid' buttons on nft cards
    async clickBidButton({commit}, payload) {
        const showbid = state.bid_clicked;
        commit("setClickedNFT", payload.nft);
        commit("setBidClicked", !showbid);
    },

    //Updates state for when users click on 'market' buttons on nft cards
    async clickSellButton({commit}, payload) {
        const showmodal = state.sale_clicked;
        commit("setClickedNFT_sale", payload.nft);
        commit("setSaleClicked", !showmodal);
    },

    //Updates state for click on 'buy' buttons on nft cards
    async clickBuyButton({commit}, payload) {
        const showmodal = state.buy_clicked;
        commit("setClickedNFT_buy", payload.nft);
        commit("setBuyClicked", !showmodal);
    },

    //Updates state for clikcing on update market listing button on nft cards
    async clickUpdateListingButton({commit}, payload) {
        const showmodal = state.update_listing_clicked;
        commit("setClickedNFT_updatelisting", payload.nft);
        commit("setUpdateListingClicked", !showmodal);
    },

    //Confirms login information with KAI and sets it in vue store
    async confirmAccountExists({commit}, acctname) {

        commit("setAccountName", acctname);
        commit("setAccountExists", true);

        const t_payload = {
            name: acctname
        };
        await this.dispatch("accounts/getCurrentBindings", t_payload);

    },

    //Registers new user into kadenai if they dont exist
    async registerNewUser({context}, payload) {
        const name = payload.name;
        try {
            // Try to get a new nonce for the existing user
            let response = await fetch(`${apiConfig.apiHost}/api/0/auth/getvalue?kadenaWallet=${name}`);
            // console.log("res");
            // console.log(response);
            if(response !== undefined && response !== null){
                const data = await response.json();
                // console.log("NONCE ->", data.nonce);
                return data.nonce;
            }
        } catch (error) {
            console.error("Error in getOrCreateNonce:", error);
        }
    },

    //Here we handle authenticating into Kadenai
    async getCurrentBindings({commit}, payload) {

        //Lets check if the user is already authenticated, if not, we will authenticate them
        let authenticated = false;

        try {

            // Check authentication status first
            let statusResponse = await axios.get(`${apiConfig.apiHost}/api/0/auth/status`, {
                withCredentials: true
            }).catch((e)=>{
                console.log(e);
            });


            // console.log("AUTH STATUS:", statusResponse);

            // If the user is already authenticated, no need to authenticate again
            if (statusResponse !== undefined && statusResponse.data !== undefined && statusResponse.data.authenticated !== undefined) {
                authenticated = true;
            } else {
                authenticated = false;
            }
        } catch (e) {
            console.log("Error checking authentication status:", e);
        }

        if(authenticated === false){

            // console.log("getCurrentBindings payload ->", payload);

            const name = payload.name;

            const t_payload = {
                name: name
            };

            try {

                let nonce = await this.dispatch("accounts/registerNewUser", t_payload).then(async (res) => {

                    // console.log("registerNewUser res", res);

                    const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
                    const accountName2 = name;
                    const user_guard = state.accountData[0]["data"]["guard"];
                    const GAS_PRICE = 0.000001;
                    const chainId = state.chainId;
                    const NETWORKID = state.networkid;

                    // console.log("publickey", publickey);
                    // console.log("user_guard", user_guard);
                    // console.log("networkid", NETWORKID);

                    const XWalletRequest = {
                        networkId: NETWORKID,
                        signingCmd: {
                            pactCode: res,
                            caps: [],
                            sender: accountName2,
                            gasPrice: 0.000001,
                            gasLimit: 15000,
                            chainId: state.chainId,
                            ttl: 600,
                            envData: {
                                "keyset": {
                                    keys: [user_guard]
                                },
                            },
                            signingPubKey: publickey,
                            networkId: NETWORKID,
                        }

                    };

                    let isUsingWC = localStorage.getItem("kai_isUsingWalletConnect");
                    let isUsingEcko = localStorage.getItem("kai_isUsingXwallet")

                    let cmd = null;

                    // console.log("IS USING WC ->", isUsingWC);
                    // console.log("IS USING ECKO ->", isUsingEcko);
                    // console.log("state.ecko", state.xwalletconnected)
                    // console.log("state.wc", state.wallet_connect_connected)

                    if(isUsingEcko === 'true' || state.xwalletconnected === true){

                        console.log("Please sign ECKO authentification request.")
                        try{
                            cmd = await window.kadena.request({
                                method: "kda_requestSign",
                                networkId: NETWORKID,
                                data: XWalletRequest
                            });
                        }catch(e){
                            console.log(e);
                        }

                    }else if(isUsingWC === 'true' || state.wallet_connect_connected === true){

                        console.log("Please sign WALLET CONNECT authentification request.")
                        try{
                            cmd = await state.wallet_connect_client.request({
                                topic: state.wallet_connect_session.topic,
                                chainId: `kadena:mainnet01`,
                                request: {
                                    method: state.KDA_METHODS.KDA_SIGN,
                                    params: XWalletRequest.signingCmd,
                                },
                            });
                        }catch(e){
                            console.log(e);
                        }

                    }else{
                        console.log("Please sign authentification request.")
                        try{
                            cmd = await Pact.wallet.sign(XWalletRequest.signingCmd);
                        }catch(e){
                            console.log(e);
                        }
                    }

                    // console.log("SIGNED CMD");
                    // console.log(cmd);

                    if(cmd.signedCmd !== undefined){
                        if(cmd.signedCmd.hash !== undefined){
                            console.log(cmd.signedCmd.hash);
                        }
                    }else{

                        alert("Please sign for the Authentication ID in your Wallet to log in to Kadenai Marketplace");

                        await this.dispatch('accounts/getCurrentBindings', payload);

                    }

                    const a_payload = {kadenaWallet: name, signedNonce: cmd.signedCmd};

                    let response = await axios.post(`${apiConfig.apiHost}/api/0/auth/authenticate`, a_payload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        withCredentials: true,
                    });

                    // console.log("AUTHENTICATION RESPONSE");
                    // console.log(response);

                    if (response.status === 200) {
                        // Handle successful authentication
                        console.log("User authenticated successfully");
                    } else {
                        // Handle authentication errors
                        const jsonResponse = await response.json();
                        console.error("Authentication error:", jsonResponse);
                    }

                });


            } catch (e) {
                console.log(e);
            }

        }else{

            commit("setAccountConfirmed", true);
        }

    },

    //Transaction polling mechanism - polls pending transactions every 20 seconds
    async pollTransactionHash({commit}, hash) {

        let dataResult = null;
        try {

            let pollRes = await Pact.fetch.poll({
                requestKeys: [hash]
            }, state.network);


            if (pollRes[hash] === undefined) {
                console.log("Transaction is still confirming.. Checking again in 20 seconds..");
            } else {
                console.log(pollRes[hash]);
            }

            if (pollRes[hash] !== undefined) {

                if (pollRes[hash].result.status === "success") {

                    dataResult = [{...pollRes[hash].result}];
                    commit("setTransactionHash", hash);
                    commit("setTransactionFailed", false);
                    commit("setTransactionConfirmedResult", dataResult);

                    let t_transcations = [];
                    t_transcations = state.transactions;
                    try {
                        for (let i = 0; i < t_transcations.length; i++) {
                            if (t_transcations[i].txhash === hash) {
                                t_transcations[i].completed = true;
                            }
                        }
                        commit("setTransactions", t_transcations);
                    } catch (e) {
                        console.log(e);
                    }

                    const name = localStorage.getItem("kai_accountName");

                    if (name === null || name === "") {
                        console.log("No account found! Please log back in.");
                    } else {
                        const t_payload = {
                            name: name
                        };

                        //WE can do something here everytime a transaction is confirmed if we want
                        //await this.dispatch("accounts/getCurrentBindings", t_payload);

                    }

                    commit("setTransactionPolling", false);
                    commit("setCreatingCollection", false);
                    commit("setCreatingCollection_Created", true);


                } else {
                    commit("setTransactionHash", hash);
                    let t_transcations = [];
                    t_transcations = state.transactions;
                    try {
                        for (let i = 0; i < t_transcations.length; i++) {
                            if (t_transcations[i].txhash === hash) {
                                t_transcations[i].completed = true;
                                t_transcations[i].failed = true;
                            }
                        }
                        commit("setTransactions", t_transcations);
                    } catch (e) {
                        console.log(e);
                    }
                    commit("setTransactionFailed", true);
                    commit("setTransactionConfirmedResult", dataResult);
                    commit("setTransactionPolling", false);
                    commit("setCreatingCollection", false);
                    commit("setCreatingCollection_Created", false);
                }

            } else {

                setTimeout(async () => {
                    this.dispatch("accounts/pollTransactionHash", hash);
                }, 20000);

            }


        } catch (error) {

            console.log(error);
            console.log(error.json());

        }

    },

    //Transaction polling mechanism - polls pending transactions every 20 seconds, takes chain as an input
    async pollTransactionHash_chain({commit}, payload) {

        const hash = payload.hash;
        const chain = payload.chain;

        let dataResult = null;
        try {

            let pollRes = await Pact.fetch.poll({
                requestKeys: [hash]
            }, host(chain));


            if (pollRes[hash] === undefined) {
                console.log("Transaction is still confirming.. Checking again in 20 seconds..");
            } else {
                console.log(pollRes[hash]);
            }

            if (pollRes[hash] !== undefined) {

                if (pollRes[hash].result.status === "success") {

                    dataResult = [{...pollRes[hash].result}];
                    commit("setTransactionFailed", false);
                    commit("setTransactionConfirmedResult", dataResult);


                    const name = localStorage.getItem("kai_accountName");

                    if (name === null || name === "") {
                        console.log("No account found! Please log back in.");
                    } else {
                        const t_payload = {
                            name: name
                        };

                        //WE can do something here everytime a transaction is confirmed if we want
                        //await this.dispatch("accounts/getCurrentBindings", t_payload);

                    }

                    let t_transcations = [];
                    t_transcations = state.transactions;

                    try {
                        for (let i = 0; i < t_transcations.length; i++) {
                            if (t_transcations[i].txhash === hash) {
                                t_transcations[i].completed = true;
                            }
                        }
                        commit("setTransactions", t_transcations);
                    } catch (e) {
                        console.log(e);
                    }

                    commit("setTransactionPolling", false);

                } else {
                    let t_transcations = [];
                    t_transcations = state.transactions;
                    try {
                        for (let i = 0; i < t_transcations.length; i++) {
                            if (t_transcations[i].txhash === hash) {
                                t_transcations[i].completed = true;
                                t_transcations[i].failed = true;
                            }
                        }
                        commit("setTransactions", t_transcations);
                    } catch (e) {
                        console.log(e);
                    }

                    commit("setTransactionFailed", true);
                    commit("setTransactionConfirmedResult", dataResult);
                    commit("setTransactionPolling", false);

                }

            } else {

                let poll_payload = {
                    hash: hash,
                    chain: chain
                };

                setTimeout(async () => {
                    this.dispatch("accounts/pollTransactionHash_chain", poll_payload);
                }, 20000);

            }


        } catch (error) {

            console.log(error);
            console.log(error.json());

        }

    },

    //Resets our store of any pending transaction polling action it was performing
    async clearTransactionPoll({commit}) {
        await commit("setTransactionHash", null);
        await commit("setTransactionPolling", false);
        await commit("setTransactionConfirmed", false);
        await commit("setTransactionFailed", null);
        await commit("setTransactionConfirmedResult", null);
    },

    //Commits xwallet is connected to store
    async setXWalletIsConnected({commit}) {
        await commit("setXWalletConnected", true);
    },

    //Commits WC is connected to store
    async setWalletConnectIsConnected({commit}) {
        await commit("setWalletConnectConnected", true);
    },

    //Commits dark mode on to store
    async setDarkmodeOn({commit}) {
        await commit("setDarkmode", true);
    },

    //Commits dark mode off to store
    async setDarkmodeOff({commit}) {
        await commit("setDarkmode", false);
    },

    ///////////////////////
    //USEFUL FUNCTIONS
    ////////////////////////

    //Local call to get a tokens precision by chain
    async getTokenPrecision_chain(context, payload) {

        const tokenA = payload.tokenA;
        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(${tokenA}.precision)`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }

        } catch (error) {
            console.log(error);
        }

        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }

    },

    //Local call to get a specific users balance for a specific token by chain
    async getBalance_chain(context, payload) {

        const tokenA = payload.tokenA;
        const name = payload.name;
        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(${tokenA}.get-balance ${JSON.stringify(name)})`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to check if a account exists for a specific token
    async getUserAccount_chain(context, payload) {

        const tokenA = payload.tokenA;
        const name = payload.name;
        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(${tokenA}.details ${JSON.stringify(name)})`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to get current sale tier for a NFT sale
    async getActiveSaleTier_chain(context, payload) {

        const name = payload.name;
        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-create-v2.get-current-tier-for-collection ${JSON.stringify(name)})`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to get a the splitter account for nft sales
    async getSplitterAccount_chain(context, payload) {

        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-create-v2.get-SPLITTER-account)`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to get a usd quote for price from oracle
    async getUSDQuoteOracle_chain(context, payload) {

        const chain = payload.chain;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kai-oracle.get-kda-usd-price)`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to get an escrow account for a buy now nft fixed sale
    async getEscrowAccount_chain(context, payload) {

        const id = payload.id;
        const chain = config.chainId;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(use marmalade-v2.policy-manager)
      (get-escrow-account "${id}")`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call to get an escrow account for a buy now nft auction sale
    async getEscrowAccountAuction_chain(context, payload) {

        const id = payload.name;
        const chain = config.chainId;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(marmalade-sale.conventional-auction.escrow-account "${id}")`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Local call unrevealedNFTs
    async getUnrevealedNFTs_chain(context, payload) {

        const chain = payload.chain;
        const name = payload.name;

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-create-v2.get-owned ${JSON.stringify(name)})`,
                meta: Pact.lang.mkMeta("", chain, state.gasPrice, 150000, t_creationTime, 600)
            }, host(chain));

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },


    ////////////////////////////////////////////////////////////////
    ///// KAI SPECIFIC
    ////////////////////////////////////////////////////////////////

    //Get a users data (profile and ect)
    async getUserSqlData({commit}, payload) {
        let exists = false;
        let dataResult = null;


        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/0/auth/retrieve-profile`, {
                withCredentials: true
            });
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            await commit("setUserSqlData", dataResult[0]);
            return (dataResult[0]);
        } else {
            return (0);
        }
    },

    //Set a users data (profile and ect)
    async setUserSqlData({commit}, payload) {
        const name = payload.name;
        const description = payload.description;
        const twitter = payload.twitter;
        const discord = payload.discord;
        const account = payload.account;

        const data = {
            name: name,
            description: description,
            twitter: twitter,
            discord: discord,
        };

        axios.put(`${apiConfig.apiHost}/api/0/auth/update-profile`, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true
        })
            .then((response) => {
                console.log(response.data);
            })
            .catch((error) => {
                console.error(error);
            });
    },


    ////////////////////////////////////////////////////////////////
    ///// KAI M_v2 STUFF
    ////////////////////////////////////////////////////////////////

    //Used with MV2 to hash/create a collection ID before minting a NFT token
    async createCollectionID(context, payload) {

        const name = payload.name;
        const user_guard = state.accountData[0]["data"]["guard"];

        let exists = false;
        let dataResult = null;
        try {
            const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
            let data = await Pact.fetch.local({
                pactCode: `(marmalade-v2.collection-policy-v1.create-collection-id ${JSON.stringify(name)} (read-keyset 'ks))`,
                envData: {
                    "ks": {
                        "keys": [
                            state.accountData[0]["data"]["guard"]["keys"][0]
                        ]
                    }
                },
                meta: Pact.lang.mkMeta("", "8", state.gasPrice, 150000, t_creationTime, 600)
            }, state.network);

            if (data.result.status === "success") {
                dataResult = [{...data.result}];
                exists = true;
            } else {
                console.log("Creating your collection ID failed:");
                console.log(data);
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0].data);
        } else {
            return (0);
        }
    },

    //Creates a new MV2 collection
    async createNewCollection({commit}, payload) {
        const name = payload.name;
        const id = payload.id;
        const size = payload.size;
        const guard = payload.guard;


        try {
            //User information
            const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
            const accountName2 = localStorage.getItem("kai_accountName");
            const user_guard = state.accountData[0]["data"]["guard"];


            const GAS_PRICE = 0.000001;
            const chainId = state.chainId;
            const NETWORKID = state.networkid;

            const pactCode = `(marmalade-v2.collection-policy-v1.create-collection ${JSON.stringify(name)} ${size} (read-keyset 'ks) ${JSON.stringify(accountName2)})`;
            const signCmd = {
                pactCode: pactCode,
                caps: [],
                sender: accountName2,
                gasLimit: 15000,
                gasPrice: GAS_PRICE,
                chainId: chainId,
                ttl: 600,
                envData: {
                    "ks": user_guard,
                    "collection-id": id
                },
                signingPubKey: publickey,
                networkId: NETWORKID
            }; //alert to sign tx

            await commit("setCurrentSignRequest", pactCode);

            let cmd = null;

            if (state.xwalletconnected === true) {

                const xwalletcode = `(marmalade-v2.collection-policy-v1.create-collection ${JSON.stringify(name)} ${size} (read-keyset 'ks ) ${JSON.stringify(accountName2)})`;
                const XWalletRequest = {

                    networkId: NETWORKID,
                    signingCmd: {
                        sender: accountName2,
                        chainId: state.chainId,
                        gasPrice: 0.000001,
                        gasLimit: 15000,
                        ttl: 600,
                        envData: {
                            "ks": user_guard,
                            "collection-id": id
                        },
                        caps: [],
                        pactCode: xwalletcode,
                        networkId: NETWORKID,
                        signingPubKey: publickey,

                    } //alert to sign tx

                };

                await commit("setCurrentSignRequest", xwalletcode);

                cmd = await window.kadena.request({
                    method: "kda_requestSign",
                    networkId: NETWORKID,
                    data: XWalletRequest
                });

            } else if (state.wallet_connect_connected) {


                try{
                    cmd = await state.wallet_connect_client.request({
                        topic: state.wallet_connect_session.topic,
                        chainId: config.walletChain,
                        request: {
                            method: state.KDA_METHODS.KDA_SIGN,
                            params: signCmd,
                        },
                    });
                }catch(e){
                    console.log(e);
                }


            } else {

                cmd = await Pact.wallet.sign(signCmd);
            }

            try {

                let res = null;

                if (state.xwalletconnected === true) {
                    const response = await axios.post(host_local(state.chainId), cmd.signedCmd);

                    console.log(response);

                    if (cmd.status === "success" && response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd.signedCmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                } else if (state.wallet_connect_connected === true) {
                    const response = await axios.post(host_local(state.chainId), cmd.signedCmd);

                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd.signedCmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                } else {
                    const response = await axios.post(host_local(state.chainId), cmd);

                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                }

                if (res !== undefined && res !== null) {

                    if (state.xwalletconnected !== true) {
                        if (res.requestKeys[0]) {

                            let t_transactions = state.transactions;

                            let t_transaction = {
                                txhash: res.requestKeys[0],
                                type: "collection",
                                title: "Create Collection..",
                                image: '/images/kadenai_black.svg',
                                name: name,
                                completed: false,
                                failed: false,
                            };

                            t_transactions.push(t_transaction);

                            await commit("setTransactions", t_transactions);
                            await commit("setTransactionsChanged", !state.transactions_changed);
                            await commit("setNewTransaction", !state.newTransaction);
                            await commit("setTransactionHash", res.requestKeys[0]);
                            await commit("setTransactionPolling", true);
                            await commit("setTransactionConfirmed", false);
                            await commit("setTransactionFailed", null);
                            await commit("setTransactionConfirmedResult", null);
                            await commit("setCreatingCollection", true);
                            await this.dispatch("accounts/pollTransactionHash", res.requestKeys[0]);

                        }
                    } else {

                        let t_transactions = state.transactions;

                        let t_transaction = {
                            txhash: res.requestKeys[0],
                            type: "collection",
                            title: "Create Collection..",
                            image: '/images/kadenai_black.svg',
                            name: name,
                            completed: false,
                            failed: false,
                        };

                        t_transactions.push(t_transaction);

                        await commit("setTransactions", t_transactions);
                        await commit("setTransactionsChanged", !state.transactions_changed);
                        await commit("setNewTransaction", !state.newTransaction);
                        await commit("setTransactionHash", cmd.signedCmd.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await commit("setCreatingCollection", true);
                        await this.dispatch("accounts/pollTransactionHash", cmd.signedCmd.hash);
                    }

                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }

    },

    //Get a users V2 nfts from KAI API, for profile page
    async getUserNFTs({context}, payload) {
        const name = payload.name;
        let exists = false;
        let dataResult = null;
        const page = payload.page;
        const limit = payload.limit;
        const includesales= payload.sales;
        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2nfts/getbyaccount/${name}?limit=${limit}&page=${page}&includeSales=${includesales}`);
            exists = true;
            if (data.status === 200) {
                dataResult = data.data;
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Gets all of a users MV2 collections, for displaying collections on Mint Page
    async getUserCollectionData({context}, payload) {
        const name = payload.name;
        let exists = false;
        let dataResult = null;
        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2collections/getcollectionbyname/${name}`);
            exists = true;
            if (data.status === 200) {
                dataResult = data.data;
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Get paginated collections
    async getCollections({context}, payload) {

        let exists = false;
        let dataResult = null;
        const page = payload.page;
        const limit = payload.limit;
        const isApproved = payload.isApproved;
        const isTop = payload.isTop;
        let stats = payload.stats;

        if(payload.stats){
            stats = payload.stats;
        }

        try {
            let post = `${apiConfig.apiHost}/api/v2collections?page=${page}&limit=${limit}&isApproved=${isApproved}&isTop=${isTop}`;
            if(stats === true){
                post = `${apiConfig.apiHost}/api/v2collections?page=${page}&limit=${limit}&isApproved=${isApproved}&isTop=${isTop}&includeStats=${stats}`;
            }

            let data = await axios.get(post);

            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Get MV2 collection by ID
    async getCollection({context}, payload) {
        const id = payload.id;
        const page = payload.page;
        let exists = false;
        let dataResult = null;
        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2collections/getbyid/uri/${id}`, {
                params: {
                    page: page,
                    limit: 15
                }
            });
            exists = true;
            if (data.status === 200) {

                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0]);
        } else {
            return (0);
        }
    },

    //Get Top NFTS for homepage
    async getTopNFTs({context}, payload) {
        let exists = false;
        let dataResult = null;
        const page = payload.page;
        const limit = payload.limit;
        const isApproved = payload.isApproved;
        const isTop = payload.isTop;

        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2nfts/getnft?page=${page}&limit=${limit}`);
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Get activity for homepage
    async getActivity({context}, payload) {
        let exists = false;
        let dataResult = null;
        const page = payload.page;
        const limit = payload.limit;
        const include_sales = payload.sales;
        const include_mint = payload.mint;

        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2nfts/activity?page=${page}&limit=${limit}&includeMintData=${include_mint}&includeSalesData=${include_sales}`);
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Get currently minting collections for homepage
    async getCurrentlyMinting({context}, payload) {
        let exists = false;
        let dataResult = null;
        const page = payload.page;
        const limit = payload.limit;

        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2collections/mintdata?page=${page}&limit=${limit}&isApproved=true`);
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },

    //Search through NFTs in a collection
    async searchCollectionNFTs({context}, payload) {
        let exists = false;
        let dataResult = null;
        const query = payload.query;
        const collection = payload.collection;
        const attributes_filter = payload.filter;
        const forsale = payload.forsale;
        let page = payload.page;
        if (page === 0) {
            page = 1;
        }
        const limit = 15;
        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2nfts/search-collection?collectionId=${encodeURIComponent(collection)}&metadataQuery=${encodeURIComponent(query)}&page=${page}&limit=${limit}&onSale=${forsale}&includeSales=${forsale}&attributesFilter=${JSON.stringify(attributes_filter)}`);
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult);
        } else {
            return (0);
        }
    },


    //Get a nft by id
    async getNFT({context}, payload) {
        const name = payload.name;
        let exists = false;
        let dataResult = null;

        let include_sales = true;

        if (payload.includesales !== undefined) {
            include_sales = payload.includesales;
        }

        try {
            let data = await axios.get(`${apiConfig.apiHost}/api/v2nfts/getnft/${name}?includeSales=${include_sales}`);
            exists = true;
            if (data.status === 200) {
                dataResult = [{...data.data}];
                exists = true;
            } else {
                exists = false;
            }
        } catch (error) {
            console.log(error);
        }
        if (exists === true) {
            return (dataResult[0]);
        } else {
            return (0);
        }
    },

    //Send to kadenai to mint
    async backendMint({context}, payload) {

        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        const accountName2 = localStorage.getItem("kai_accountName");
        const user_guard = state.accountData[0]["data"]["guard"];
        const traits = payload.traits;
        const image = payload.image;
        const policy = payload.policy;
        const account = accountName2;
        const name = payload.name;
        const description = payload.description;

        const metadata = {
            name: name,
            description: description,
            attributes: traits,
        };

        let formData = new FormData();
        formData.append("imageBuffer", image);
        formData.append("metadata", JSON.stringify(metadata));
        formData.append("policy", policy);
        formData.append("account", account);

        const requestOptions = {
            withCredentials: true
        };

        const response = await axios.post(
            `${apiConfig.apiHost}/api/v2minter/standard`,
            formData,
            requestOptions
        );

        const tokenId = response.data.tokenId;
        const metadataHash = response.data.metadataHash; //uri

        return {tokenId, metadataHash};
    },

    //Gets a price quote for purchasing credits
    async fetchPriceQuote({context}, payload) {
        const accountName2 = localStorage.getItem("kai_accountName");
        const amount = payload.amount;

        const unsignedTransaction = JSPact.builder
            .execution(`(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-credits.get-price-quote ${amount})`)
            .setMeta({
                chainId: config.chainId,
                senderAccount: accountName2,
            })
            .setNetworkId(config.networkId)
            .createTransaction();

        try {
            const result = await kadenaClient.dirtyRead(unsignedTransaction);

            // Check if data exists
            if (result && result.result && result.result.data) {
                console.log(result.result.data);
                return result.result.data;
            } else {
                // Handle case where data is not present
                console.error("No data received from fetchPriceQuote");
                return null;
            }
        } catch (error) {
            console.error("Error with dirtyRead in fetchPriceQuote:", error);
            // Handle the error appropriately
            return null;
        }
    },

    //Gets bank for purchasing credits
    async fetchBank({context}) {
        const accountName2 = localStorage.getItem("kai_accountName");

        const unsignedTransaction = JSPact.builder
            .execution("(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-credits.get-bank)")
            .setMeta({
                chainId: config.chainId,
                senderAccount: accountName2,
            })
            .setNetworkId(config.networkId)
            .createTransaction();

        try {
            const result = await kadenaClient.dirtyRead(unsignedTransaction);

            // Check if data exists
            if (result && result.result && result.result.data) {
                console.log(result.result.data);
                return result.result.data;
            } else {
                // Handle case where data is not present
                console.error("No data received from fetchBank");
                return null;
            }
        } catch (error) {
            console.error("Error with fetchBank:", error);
            return null;
        }
    },

    //Purchase Credits
    async purchaseCredits({commit}, payload) {
        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const quantity = payload.quantity;
        const chainId = payload.chain;

        // console.log("PURCHASE CREDIT PAYLOAD");
        // console.log(payload);
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        let accountName2 = localStorage.getItem("kai_accountName");
        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const NETWORKID = state.networkid;


        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            keyset: user_guard, // Default keyset from user's guard
        };

        const cost_payload = {
            amount: quantity
        };

        // We need to pre-populate the expected cost from our contract with a local call.
        const cost = await this.dispatch("accounts/fetchPriceQuote", cost_payload);
        const bank = await this.dispatch("accounts/fetchBank");
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact code goes here
        const pactCode = `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-credits.create-payment ${JSON.stringify(accountName2)} (read-keyset 'keyset) ${quantity})`;
        /////////////////////////////////////////////////////////////
        //Pact Caps go here
        let pactCaps = [
            Pact.lang.mkCap(
                "Pay Transaction Gas Fee",
                "Agreement to Pay Gas Fee",
                "coin.GAS",
                []
            ),
            Pact.lang.mkCap("TRANSFER", "Transfer Funds", "coin.TRANSFER", [accountName2, bank, cost]),
            Pact.lang.mkCap("Enforce Guard", "Enforces sender created TX", "n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-credits.ENFORCE-PAYER", [])
        ];

        /////////////////////////////////////////////////////////////////////
        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet
        await commit("setCurrentSignRequest", pactCode);
        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "purchase_credits",
            title: "Purchasing Credits..",
            image: "/images/kadenai_black.svg",
            name: "Purchasing " + quantity.toString() + " Credits",
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        console.log("adding new transaction to tx queue");
        console.log("t_transaction");
        console.log(t_transaction1);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);


        //////////////////////////////////////////////////////////////////////
        //ZELCORE / CHAINWEAVER
        //Lets ready our ZELCORE / CHAINWEAVER transaction, even if we arnt going to send it
        //We will send this request if the user is not using xwallet or wallet connect


        try {
            const signCmd = {
                pactCode: pactCode,
                caps: pactCaps,
                sender: accountName2,
                gasLimit: 15000,
                gasPrice: GAS_PRICE,
                chainId: chainId,
                ttl: 600,
                envData: pactEnvData,
                signingPubKey: publickey,
                networkId: NETWORKID,
            };


            /////////////////////////////////////////////////////////////

            let cmd = null;

            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to Xwallet

            if (state.xwalletconnected === true) {
                const XWalletRequest = {
                    networkId: NETWORKID,
                    signingCmd: signCmd,
                };

                //Send request to sign the transaction
                cmd = await window.kadena.request({
                    method: "kda_requestSign",
                    networkId: NETWORKID,
                    data: XWalletRequest,
                });

                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it
            } else if (state.wallet_connect_connected) {
                cmd = await state.wallet_connect_client.request({
                    topic: state.wallet_connect_session.topic,
                    chainId: config.walletChain,
                    request: {
                        method: state.KDA_METHODS.KDA_SIGN,
                        params: signCmd,
                    },
                });
            } else {
                //Ask the user to sign the wallet connect
                cmd = await Pact.wallet.sign(signCmd);
            }

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {
                let res = null;

                //XWALLET LOCAL SEND
                if (state.xwalletconnected === true) {
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (
                        cmd.status === "success" &&
                        response.data.result.status === "success"
                    ) {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else if (state.wallet_connect_connected === true) {
                    //WALLET CONNECT LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else {
                    //ZELCORE / CHAINWEAVER LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd, state.network);
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                }

                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = res.requestKeys[0];
                        }
                    }

                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (state.xwalletconnected !== true) {
                        if (res.requestKeys[0]) {
                            await commit(
                                "setTransactionHash",
                                res.requestKeys[0]
                            );
                            await commit("setTransactionPolling", true);
                            await commit("setTransactionConfirmed", false);
                            await commit("setTransactionFailed", null);
                            await commit("setTransactionConfirmedResult", null);
                            await commit("setCreatingCollection", true);
                            let poll_payload = {
                                hash: res.requestKeys[0],
                                chain: chainId
                            };
                            await this.dispatch(
                                "accounts/pollTransactionHash_chain",
                                poll_payload
                            );
                        }
                    } else {
                        //HANDLE EVERYTHING ELSE BESIDES XWALLET
                        await commit("setTransactionHash", cmd.signedCmd.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await commit("setCreatingCollection", true);
                        let poll_payload = {
                            hash: cmd.signedCmd.hash,
                            chain: chainId
                        };
                        await this.dispatch(
                            "accounts/pollTransactionHash_chain",
                            poll_payload
                        );
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    },

    //Mint a NFT to Marmalade v2
    async mintNFT({commit}, payload) {
        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const policy = payload.policy;
        const uriBase = payload.uri;
        const tokenId = payload.tokenid;
        const royaltys = Number(payload.royalty) * 0.01;
        const collectionid = payload.collectionid;
        const mint_to_account = payload.mint_to_account;
        const preview_image = payload.nft_preview_image;
        const nft_name = payload.nft_name;
        const mint_to_guard = payload.mint_to_guard;

        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        let accountName2 = localStorage.getItem("kai_accountName");

        //If mint_to_account dont match the users account, that means they entered someone elses account, so lets use that account
        const mintAccount = mint_to_account || accountName2;


        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const chainId = state.chainId;
        const NETWORKID = state.networkid;
        const policies = "(create-policies " + policy + ")";

        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            keyset: user_guard, // Default keyset from user's guard
        };

        // Define the keyset reference variable
        let keysetRef = "keyset"; // Default keyset

        // Modify keysetRef if minting to a different account
        if (mint_to_account && mint_to_account !== accountName2) {
            keysetRef = "mintto";
            // Update pactEnvData with 'mintto' keyset
            pactEnvData["mintto"] = {
                keys: [mint_to_account.slice(2)],
                pred: "keys-all",
            };
        }

        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact code goes here
        const pactCode = `(use marmalade-v2.ledger) (use marmalade-v2.util-v1) (create-token ${JSON.stringify(tokenId)} 0 ${JSON.stringify(uriBase)} ${policies} (read-keyset 'keyset)) (mint ${JSON.stringify(tokenId)} 
            ${JSON.stringify(mintAccount)} (read-keyset '${keysetRef}) 1.0)`;
        /////////////////////////////////////////////////////////////
        //Pact Caps go here
        let pactCaps = [
            Pact.lang.mkCap(
                "Pay Transaction Gas Fee",
                "Agreement to Pay Gas Fee",
                "coin.GAS",
                []
            ),
            Pact.lang.mkCap("MINT", "Mint NFT", "marmalade-v2.ledger.MINT", [
                tokenId,
                mintAccount,
                1.0,
            ]),
            Pact.lang.mkCap(
                "CREATETOKEN",
                "Create Token",
                "marmalade-v2.ledger.CREATE-TOKEN",
                [tokenId, user_guard]
            ),
        ];

        //MODIFY ENV-DATA IF AUCTION
        if (policy === "DEFAULT_COLLECTION") {
            pactEnvData = {...pactEnvData, collection_id: collectionid};
            const newcap = Pact.lang.mkCap(
                "Collection Guard",
                "Prove Owner",
                "marmalade-v2.collection-policy-v1.TOKEN-COLLECTION",
                [collectionid, tokenId]
            );
            pactCaps.push(newcap);
        } else if (policy === "DEFAULT_ROYALTY") {
            pactEnvData = {
                ...pactEnvData,
                royalty_spec: {
                    fungible: {
                        refSpec: [{namespace: null, name: "fungible-v2"}],
                        refName: {namespace: null, name: "coin"},
                    },
                    creator: accountName2,
                    "creator-guard": user_guard,
                    "royalty-rate": royaltys,
                },
            };
        } else if (policy === "DEFAULT_COLLECTION_ROYALTY") {
            pactEnvData = {
                ...pactEnvData,
                collection_id: collectionid,
                royalty_spec: {
                    fungible: {
                        refSpec: [{namespace: null, name: "fungible-v2"}],
                        refName: {namespace: null, name: "coin"},
                    },
                    creator: accountName2,
                    "creator-guard": user_guard,
                    "royalty-rate": royaltys,
                },
            };
            const newcap = Pact.lang.mkCap(
                "Collection Guard",
                "Prove Owner",
                "marmalade-v2.collection-policy-v1.TOKEN-COLLECTION",
                [collectionid, tokenId]
            );
            pactCaps.push(newcap);
        }
        /////////////////////////////////////////////////////////////////////

        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet
        await commit("setCurrentSignRequest", pactCode);
        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "mint",
            title: "Minting NFT..",
            image: preview_image,
            name: nft_name,
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        await commit("setNewTransaction", !state.newTransaction);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);


        //////////////////////////////////////////////////////////////////////
        //ZELCORE / CHAINWEAVER
        //Lets ready our ZELCORE / CHAINWEAVER transaction, even if we arnt going to send it
        //We will send this request if the user is not using xwallet or wallet connect

        try {
            const signCmd = {
                pactCode: pactCode,
                caps: pactCaps,
                sender: accountName2,
                gasLimit: 15000,
                gasPrice: GAS_PRICE,
                chainId: chainId,
                ttl: 600,
                envData: pactEnvData,
                signingPubKey: publickey,
                networkId: NETWORKID,
            };

            /////////////////////////////////////////////////////////////

            let cmd = null;

            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to Xwallet

            if (state.xwalletconnected === true) {
                const XWalletRequest = {
                    networkId: NETWORKID,
                    signingCmd: signCmd,
                };

                //Send request to sign the transaction
                cmd = await window.kadena.request({
                    method: "kda_requestSign",
                    networkId: NETWORKID,
                    data: XWalletRequest,
                });

                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it
            } else if (state.wallet_connect_connected) {
                cmd = await state.wallet_connect_client.request({
                    topic: state.wallet_connect_session.topic,
                    chainId: config.walletChain,
                    request: {
                        method: state.KDA_METHODS.KDA_SIGN,
                        params: signCmd,
                    },
                });
            } else {
                //Ask the user to sign the wallet connect
                cmd = await Pact.wallet.sign(signCmd);
            }

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {
                let res = null;

                //XWALLET LOCAL SEND
                if (state.xwalletconnected === true) {
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (
                        cmd.status === "success" &&
                        response.data.result.status === "success"
                    ) {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else if (state.wallet_connect_connected === true) {
                    //WALLET CONNECT LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else {
                    //ZELCORE / CHAINWEAVER LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd, state.network);
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                }

                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = res.requestKeys[0];
                        }
                    }

                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (state.xwalletconnected !== true) {
                        if (res.requestKeys[0]) {
                            await commit(
                                "setTransactionHash",
                                res.requestKeys[0]
                            );
                            await commit("setTransactionPolling", true);
                            await commit("setTransactionConfirmed", false);
                            await commit("setTransactionFailed", null);
                            await commit("setTransactionConfirmedResult", null);
                            await commit("setCreatingCollection", true);
                            await this.dispatch(
                                "accounts/pollTransactionHash",
                                res.requestKeys[0]
                            );
                        }
                    } else {
                        //HANDLE EVERYTHING ELSE BESIDES XWALLET
                        await commit("setTransactionHash", cmd.signedCmd.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await commit("setCreatingCollection", true);
                        await this.dispatch(
                            "accounts/pollTransactionHash",
                            cmd.signedCmd.hash
                        );
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    },


    //Creates a MV2 sale
    async createV2Sale({commit}, payload) {

        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const sale_type = payload.sale_type; //"sale" or "auction"
        const sale_duration_type = payload.sale_duration_type; //"unlimited" or "fixed"
        const sale_price = payload.sale_price;
        const reserve_price = payload.reserve_price;
        const fixed_end_date = payload.fixed_end_date;
        const auction_start_date = payload.auction_start_date;
        const auction_end_date = payload.auction_end_date;
        const nft_id = payload.nft.id;
        const nft = payload.nft;
        const fp = new Decimal(sale_price).toFixed(12);
        const nft_image = payload.image;
        const nft_name = payload.name;

        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        const accountName2 = localStorage.getItem("kai_accountName");
        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const chainId = state.chainId;
        const NETWORKID = state.networkid;
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact code goes here
        const pactCode = `(use marmalade-v2.ledger)
        (sale "${nft_id}" "${accountName2}" 1.0 0)`;
        /////////////////////////////////////////////////////////////
        //Pact Caps go here
        let pactCaps = [Pact.lang.mkCap("Pay Transaction Gas Fee", "Agreement to Pay Gas Fee", "coin.GAS", []),
            Pact.lang.mkCap("Offer", "Verify Offer Capability", "marmalade-v2.ledger.OFFER", [nft_id, accountName2, 1.0, {"int": 0}])];
        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            quote: {
                fungible: {
                    refSpec: [{namespace: null, name: "fungible-v2"}],
                    refName: {namespace: null, name: "coin"},
                },
                "sale-price": {decimal: fp},
                "seller-fungible-account": {
                    "account": accountName2,
                    guard: {
                        keys: [publickey],
                        pred: "keys-all"
                    }
                },
                "sale-type": ""  // default to empty for standard sale
            }
        };
        //MODIFY ENV-DATA IF AUCTION
        if (sale_type === "auction") {
            pactEnvData.quote["sale-type"] = "marmalade-sale.conventional-auction";
        }
        /////////////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////////////

        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet
        await commit("setCurrentSignRequest", pactCode);
        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "market listing",
            title: "Market listing..",
            image: nft_image,
            name: nft_name,
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        await commit("setNewTransaction", !state.newTransaction);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);

        //////////////////////////////////////////////////////////////////////
        //ZELCORE / CHAINWEAVER
        //Lets ready our ZELCORE / CHAINWEAVER transaction, even if we arnt going to send it
        //We will send this request if the user is not using xwallet or wallet connect

        try {
            const signCmd = {
                pactCode: pactCode,
                caps: pactCaps,
                sender: accountName2,
                gasLimit: 15000,
                gasPrice: GAS_PRICE,
                chainId: chainId,
                ttl: 600,
                envData: pactEnvData,
                signingPubKey: publickey,
                networkId: NETWORKID
            };

            /////////////////////////////////////////////////////////////

            let cmd = null;

            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to Xwallet

            if (state.xwalletconnected === true) {

                const XWalletRequest = {
                    networkId: NETWORKID,
                    signingCmd: signCmd
                };

                //Send request to sign the transaction
                cmd = await window.kadena.request({
                    method: "kda_requestSign",
                    networkId: NETWORKID,
                    data: XWalletRequest
                });

                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it

            } else if (state.wallet_connect_connected) {

                cmd = await state.wallet_connect_client.request({
                    topic: state.wallet_connect_session.topic,
                    chainId: config.walletChain,
                    request: {
                        method: state.KDA_METHODS.KDA_SIGN,
                        params: signCmd,
                    },
                });

            } else {

                //Ask the user to sign the wallet connect
                cmd = await Pact.wallet.sign(signCmd);
            }

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {

                let res = null;

                //XWALLET LOCAL SEND
                if (state.xwalletconnected === true) {
                    const response = await axios.post(host_local(state.chainId), cmd.signedCmd);
                    if (cmd.status === "success" && response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd.signedCmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                } else if (state.wallet_connect_connected === true) {
                    //WALLET CONNECT LOCAL SEND
                    const response = await axios.post(host_local(state.chainId), cmd.signedCmd);
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd.signedCmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                } else {
                    //ZELCORE / CHAINWEAVER LOCAL SEND
                    const response = await axios.post(host_local(state.chainId), cmd);
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd, state.network);
                    } else {
                        alert("There was an error attempting to create your transaction. Please try again after correcting the following problem: " + response.data.result.error.message);
                    }
                }

                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = res.requestKeys[0];
                        }
                    }

                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (state.xwalletconnected !== true) {
                        if (res.requestKeys[0]) {
                            await commit(
                                "setTransactionHash",
                                res.requestKeys[0]
                            );
                            await commit("setTransactionPolling", true);
                            await commit("setTransactionConfirmed", false);
                            await commit("setTransactionFailed", null);
                            await commit("setTransactionConfirmedResult", null);
                            await commit("setCreatingCollection", true);
                            await this.dispatch(
                                "accounts/pollTransactionHash",
                                res.requestKeys[0]
                            );
                        }
                    } else {
                        //HANDLE EVERYTHING ELSE BESIDES XWALLET
                        await commit("setTransactionHash", cmd.signedCmd.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await commit("setCreatingCollection", true);
                        await this.dispatch(
                            "accounts/pollTransactionHash",
                            cmd.signedCmd.hash
                        );
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }

    },

    //Mint a NFT to Marmalade v2 from the collection/mint page (unrevealed)
    async mintUnrevealedNFT({commit}, payload) {
        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const collection_name = payload.collection_name;
        const quantity = payload.quantity;
        const splitter_account = payload.splitter_account;
        const amount = payload.amount;
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        let accountName2 = localStorage.getItem("kai_accountName");

        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const chainId = state.chainId;
        const NETWORKID = state.networkid;

        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            keyset: user_guard, // Default keyset from user's guard
        };

        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact code goes here
        const pactCode = `(n_a2fceb4ebd41f3bb808da95d1ca0af9b15cb068c.kadenai-create-v2.reserve-mint ${JSON.stringify(collection_name)} ${JSON.stringify(accountName2)} ${quantity})`;
        /////////////////////////////////////////////////////////////
        //Pact Caps go here
        let pactCaps = [
            Pact.lang.mkCap(
                "Pay Transaction Gas Fee",
                "Agreement to Pay Gas Fee",
                "coin.GAS",
                []
            ),
            Pact.lang.mkCap("TRANSFER", "Transfer Fee", "coin.TRANSFER", [
                accountName2,
                splitter_account,
                Number(amount),
            ])
        ];

        /////////////////////////////////////////////////////////////////////

        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet
        await commit("setCurrentSignRequest", pactCode);
        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "mint",
            title: "Minting NFT..",
            image: "/images/kadenai_main_gradient.svg",
            name: "Unrevealed NFT - Unrevealed NFTs will reveal themselves at a later time, once the NFTs have sold out.",
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        await commit("setNewTransaction", !state.newTransaction);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);


        //////////////////////////////////////////////////////////////////////
        //ZELCORE / CHAINWEAVER
        //Lets ready our ZELCORE / CHAINWEAVER transaction, even if we arnt going to send it
        //We will send this request if the user is not using xwallet or wallet connect

        try {
            const signCmd = {
                pactCode: pactCode,
                caps: pactCaps,
                sender: accountName2,
                gasLimit: 15000,
                gasPrice: GAS_PRICE,
                chainId: chainId,
                ttl: 600,
                envData: pactEnvData,
                signingPubKey: publickey,
                networkId: NETWORKID,
            };

            /////////////////////////////////////////////////////////////

            let cmd = null;

            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to Xwallet

            if (state.xwalletconnected === true) {
                const XWalletRequest = {
                    networkId: NETWORKID,
                    signingCmd: signCmd,
                };

                //Send request to sign the transaction
                cmd = await window.kadena.request({
                    method: "kda_requestSign",
                    networkId: NETWORKID,
                    data: XWalletRequest,
                });

                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it
            } else if (state.wallet_connect_connected) {
                cmd = await state.wallet_connect_client.request({
                    topic: state.wallet_connect_session.topic,
                    chainId: config.walletChain,
                    request: {
                        method: state.KDA_METHODS.KDA_SIGN,
                        params: signCmd,
                    },
                });
            } else {
                //Ask the user to sign the wallet connect
                cmd = await Pact.wallet.sign(signCmd);
            }

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {
                let res = null;

                //XWALLET LOCAL SEND
                if (state.xwalletconnected === true) {
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (
                        cmd.status === "success" &&
                        response.data.result.status === "success"
                    ) {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else if (state.wallet_connect_connected === true) {
                    //WALLET CONNECT LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd.signedCmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(
                            cmd.signedCmd,
                            state.network
                        );
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                } else {
                    //ZELCORE / CHAINWEAVER LOCAL SEND
                    const response = await axios.post(
                        host_local(state.chainId),
                        cmd
                    );
                    if (response.data.result.status === "success") {
                        res = await Pact.wallet.sendSigned(cmd, state.network);
                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            response.data.result.error.message
                        );
                    }
                }

                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = res.requestKeys[0];
                        }
                    }
                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (state.xwalletconnected !== true) {
                        if (res.requestKeys[0]) {
                            await commit(
                                "setTransactionHash",
                                res.requestKeys[0]
                            );
                            await commit("setTransactionPolling", true);
                            await commit("setTransactionConfirmed", false);
                            await commit("setTransactionFailed", null);
                            await commit("setTransactionConfirmedResult", null);
                            await commit("setCreatingCollection", true);
                            await this.dispatch(
                                "accounts/pollTransactionHash",
                                res.requestKeys[0]
                            );
                        }
                    } else {
                        //HANDLE EVERYTHING ELSE BESIDES XWALLET
                        await commit("setTransactionHash", cmd.signedCmd.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await commit("setCreatingCollection", true);
                        await this.dispatch(
                            "accounts/pollTransactionHash",
                            cmd.signedCmd.hash
                        );
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    },

    //Buy Now Nft
    async buyNowNFT({commit}, payload) {
        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const pactId = payload.pactid;
        const escrow = payload.escrow;
        const price = payload.price;
        const nftId = payload.nftid;
        const sellerAccount = payload.seller;
        const nft_image = payload.image;
        const nft_name = payload.name;
        const nft_id = payload.id;
        // const client = payload.client;
        // const session = payload.session;

        console.log("PAYLOAD");
        console.log(payload);
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        let accountName2 = localStorage.getItem("kai_accountName");
        const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const chainId = state.chainId;
        const NETWORKID = state.networkid;

        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            buyer: accountName2,
            "buyer-guard": user_guard,
            buyer_fungible_account: accountName2,
            "token-id": nftId
        };
        console.log("pactEnvData");
        console.log(pactEnvData);
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact caps
        /////////////////////////////////////////////////////////////
        const pactCaps = [
            createCap("Gas", "Allows paying for gas", "coin.GAS", []),
            createCap("TRANSFER", "Prove Buyer", "coin.TRANSFER", [
                accountName2,
                escrow,
                Number(price),
            ]),
            createCap("Buy", "Prove Buyer", "marmalade-v2.ledger.BUY", [
                nftId,
                sellerAccount,
                accountName2,
                1.0,
                pactId
            ])
        ];

        console.log("pactCaps");
        console.log(pactCaps);

        //Dress caps into a object for sending off
        const keyPairs = [
            {
                clist: pactCaps.map((cap) => ({
                    name: cap.cap.name,
                    args: cap.cap.args || [],
                })),
                pubKey: publickey,
            },
        ];

        console.log("keyPairs");
        console.log(keyPairs);

        //Create command object to send
        const c = {
            signers: keyPairs,
            payload: {
                cont: {
                    pactId: pactId,
                    data: pactEnvData,
                    proof: null,
                    rollback: false,
                    step: 1,
                },
            },
            meta: Pact.lang.mkMeta(
                accountName2,
                chainId,
                GAS_PRICE,
                10000,
                t_creationTime,
                7200
            ),
            nonce: Date.now().toString(),
            networkId: NETWORKID,
        };

        console.log("c");
        console.log(c);

        /////////////////////////////////////////////////////////////////////
        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet

        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "Buy Now",
            title: "Buy Now..",
            image: nft_image,
            name: nft_name,
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        await commit("setNewTransaction", !state.newTransaction);
        console.log(t_transaction1);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);

        //////////////////////////////////////////////////////////////////////
        //Sign command

        let signed_cmd = null;

        let is_using_wc = localStorage.getItem("kai_isUsingWalletConnect");

        try {
            /////////////////////////////////////////////////////////////
            //Lets sign the command and caps and stuff above
            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to sign in Xwallet
            if (state.xwalletconnected === true) {
                const XWalletRequest = {
                    networkId: NETWORKID,
                    commandSigDatas: [
                        {
                            sigs: [{
                                pubKey: publickey,
                                sig: undefined
                            }],
                            cmd: JSON.stringify(c)
                        }
                    ],
                };

                //Send request to sign the transaction
                signed_cmd = await window.kadena.request({
                    method: "kda_requestQuickSign",
                    data: XWalletRequest,
                });

                console.log("signed_cmd");
                console.log(signed_cmd);



                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it
            } else if (is_using_wc === 'true') {

                console.log("DOING WALLET CONNECTION QUICK SIGNING");

                let continuationTransaction = JSPact.builder
                    .continuation({
                        pactId: pactId,
                        data: pactEnvData,
                        proof: null,
                        rollback: false,
                        step: 1,
                    })
                    .setMeta({
                        chainId: chainId,
                        senderAccount: accountName2,
                        gasLimit: 10000,
                        gasPrice: GAS_PRICE,
                        ttl: 7200
                    })
                    .setNetworkId(NETWORKID)
                    .addSigner(publickey, (signFor)=>[signFor("coin.GAS"),
                        signFor("coin.TRANSFER", accountName2, escrow, Number(price)),
                        signFor("marmalade-v2.ledger.BUY", nftId, sellerAccount, accountName2, 1.0, pactId)])
                    .createTransaction();


                console.log("continuationTransaction");
                console.log(continuationTransaction);

                console.log("state.wallet_connect_client");
                console.log(state.wallet_connect_client);

                console.log("state.wallet_connect_session")
                console.log(state.wallet_connect_session);



                let session_wc = localStorage.getItem("kai_wcSession");

                console.log("session_wc");
                console.log(session_wc);

                signed_cmd = await wc.quickSign(continuationTransaction, state.wallet_connect_client, session_wc);


            } else {
                //Ask the user to sign in zelcore/chainweaver wallets
                console.log("oops");
                // cmd = await Pact.wallet.sign(signCmd)
            }


            console.log("SIGNED CMD signed_cmd");
            console.log(signed_cmd);

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {
                let res = null;

                let commandSigData = signed_cmd.responses[0].commandSigData;

                console.log("commandSigData");
                console.log(commandSigData);

                let outcomeHash = signed_cmd.responses[0].outcome.hash;

                console.log("outcomeHash");
                console.log(outcomeHash);

                const { cmd, sigs } = commandSigData;

                const bodyPayload = {
                    cmd,
                    sigs,
                    hash: outcomeHash,
                };

                console.log("bodyPayload");
                console.log(bodyPayload);

                //XWALLET LOCAL SEND

                    console.log("TESTING LOCAL SEND FIRST");

                    const testLocal = await fetch(`${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact/api/v1/local`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(bodyPayload),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                return response.text().then((error) => {
                                    throw new Error(`API returned ${response.status}: ${error}`);
                                });
                            }
                            return response.json();
                        })
                        .then((data) => {
                            return data;
                        })
                        .catch((error) => {
                            console.log("Error:", error);
                        });

                    console.log("TEST LOCAL RES ->");
                    console.log(testLocal);

                    if (testLocal.result.status === "success") {

                        console.log("SENDING IN TX");


                        res = await fetch(`${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact/api/v1/send`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ cmds: [bodyPayload] }),
                        });

                        console.log("TX SENT RES");
                        console.log(res);


                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            testLocal.result.error.message
                        );
                    }


                console.log("WE GOT THIS FAR!");
                console.log("HERE IS RES");
                console.log(res);


                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = bodyPayload.hash;
                        }
                    }
                    console.log("setting tx hash for transaction");
                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (bodyPayload.hash) {
                        await commit("setTransactionHash", bodyPayload.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await this.dispatch("accounts/pollTransactionHash", bodyPayload.hash);
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    },

    //Withdraw fixed listing NFT
    async withdrawNFT({commit}, payload) {
        ////////////////////////////////////////////////////////////
        //Gather out payload variables here
        const pactId = payload.pactid;
        const nftId = payload.nftid;
        const nft_image = payload.image;
        const nft_name = payload.name;

        console.log("PAYLOAD");
        console.log(payload);
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Gather non-payload variables here
        const publickey = state.accountData[0]["data"]["guard"]["keys"][0];
        let accountName2 = localStorage.getItem("kai_accountName");
        const t_creationTime = Math.round(new Date().getTime() / 1000) - 10;
        const user_guard = state.accountData[0]["data"]["guard"];
        const GAS_PRICE = 0.000001;
        const chainId = state.chainId;
        const NETWORKID = state.networkid;

        /////////////////////////////////////////////////////////////
        //Pact ENV data goes here
        let pactEnvData = {
            buyer: accountName2,
        };
        /////////////////////////////////////////////////////////////

        /////////////////////////////////////////////////////////////
        //Pact caps
        /////////////////////////////////////////////////////////////
        const pactCaps = [
            createCap("Gas", "Allows paying for gas", "coin.GAS", []),
            createCap("WITHDRAW", "Prove NFT Ownership", "marmalade-v2.ledger.WITHDRAW", [
                nftId,
                accountName2,
                Number(1.0),
                {"int": 0},
                pactId
            ])
        ];

        //Dress caps into a object for sending off
        const keyPairs = [
            {
                clist: pactCaps.map((cap) => ({
                    name: cap.cap.name,
                    args: cap.cap.args || [],
                })),
                pubKey: publickey,
            },
        ];

        //Create command object to send
        const c = {
            signers: keyPairs,
            payload: {
                cont: {
                    pactId: pactId,
                    data: pactEnvData,
                    proof: null,
                    rollback: true,
                    step: 0,
                },
            },
            meta: Pact.lang.mkMeta(
                accountName2,
                chainId,
                GAS_PRICE,
                10000,
                t_creationTime,
                7200
            ),
            nonce: Date.now().toString(),
            networkId: NETWORKID,
        };

        /////////////////////////////////////////////////////////////////////
        //Add transcation information to transaction queue so the user sees a modal telling them to sign the transcation in their wallet

        let t_transactions1 = state.transactions;
        let t_transaction1 = {
            txhash: "newtx",
            type: "Withdraw",
            title: "Withdraw NFT..",
            image: nft_image,
            name: nft_name,
            completed: false,
            failed: false,
        };
        t_transactions1.push(t_transaction1);
        await commit("setNewTransaction", !state.newTransaction);
        console.log("adding new transaction to tx queue");
        console.log("t_transaction");
        console.log(t_transaction1);
        await commit("setTransactions", t_transactions1);
        await commit("setNewTransaction", !state.newTransaction);

        //////////////////////////////////////////////////////////////////////
        //Sign command

        let signed_cmd = null;

        try {
            /////////////////////////////////////////////////////////////
            //Lets sign the command and caps and stuff above
            /////////////////////////////////////////////////////////////
            //XWALLET
            //If the user is using xwallet, lets go ahead and fire off a request to sign in Xwallet

            if (state.xwalletconnected === true) {
                const XWalletRequest = {
                    networkId: NETWORKID,
                    commandSigDatas: [
                        {
                            sigs: [{
                                pubKey: publickey,
                                sig: undefined
                            }],
                            cmd: JSON.stringify(c)
                        }
                    ],
                };

                //Send request to sign the transaction
                signed_cmd = await window.kadena.request({
                    method: "kda_requestQuickSign",
                    data: XWalletRequest,
                });

                console.log("signed_cmd");
                console.log(signed_cmd);

                ////////////////////////////////////////////////////////////////////////////
                //WALLET CONNECT
                //If the user is using wallet connect, lets fire a sign request at it
            } else if (state.wallet_connect_connected) {

                // const commandSigDatas = [
                //         {
                //             sigs: [{
                //                 pubKey: publickey,
                //                 sig: undefined
                //             }],
                //             cmd: JSON.stringify(c)
                //         }
                //     ];
                //
                // const quickSignRequest = {
                //     commandSigDatas
                // }
                //
                // const transactionRequest = {
                //     id: 1,
                //     jsonrpc: "2.0",
                //     method: "kadena_quicksign_v1",
                //     params: quickSignRequest
                // }

                const request = {
                    topic: state.wallet_connect_session.topic,
                    chainId: `kadena:mainnet01`,
                    request: {
                        method: "kadena_quicksign_v1",
                        params: c,
                    },
                };

                signed_cmd = await state.wallet_connect_client.request(request);

                // signed_cmd = await state.wallet_connect_client.request({
                //         topic: state.wallet_connect_session.topic,
                //         chainId: config.walletChain,
                //         request: transactionRequest
                //     });

                // cmd = await state.wallet_connect_client.request({
                //     topic: state.wallet_connect_session.topic,
                //     chainId: config.walletChain,
                //     request: {
                //         method: state.KDA_METHODS.KDA_SIGN,
                //         params: signCmd,
                //     },
                // })
            } else {
                //Ask the user to sign in zelcore/chainweaver wallets
                console.log("oops");
                // cmd = await Pact.wallet.sign(signCmd)
            }

            console.log("signed_cmd ->");
            console.log(signed_cmd);

            ////////////////////////////////////////////////////////////////////
            //LOCAL CALL SECTION
            //Here we will take what the user has signed, and make a local call with it to test if it will go through
            //If the users transaction will go through, we send it off to the blockchain
            //If the users transactionw ill not go through, we alert the user with an error

            try {
                let res = null;

                let commandSigData = signed_cmd.responses[0].commandSigData;

                console.log("commandSigData");
                console.log(commandSigData);

                let outcomeHash = signed_cmd.responses[0].outcome.hash;

                console.log("outcomeHash");
                console.log(outcomeHash);

                const { cmd, sigs } = commandSigData;

                const bodyPayload = {
                    cmd,
                    sigs,
                    hash: outcomeHash,
                };

                console.log("bodyPayload");
                console.log(bodyPayload);

                //LOCAL SEND

                    console.log("TESTING LOCAL SEND FIRST");

                    const testLocal = await fetch(`${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact/api/v1/local`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(bodyPayload),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                return response.text().then((error) => {
                                    throw new Error(`API returned ${response.status}: ${error}`);
                                });
                            }
                            return response.json();
                        })
                        .then((data) => {
                            return data;
                        })
                        .catch((error) => {
                            console.log("Error:", error);
                        });

                    console.log("TEST LOCAL RES ->");
                    console.log(testLocal);

                    if (testLocal.result.status === "success") {

                        console.log("SENDING IN TX");


                        res = await fetch(`${config.apiUrl}/chainweb/0.0/${config.networkId}/chain/${config.chainId}/pact/api/v1/send`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ cmds: [bodyPayload] }),
                        });

                        console.log("TX SENT RES");
                        console.log(res);


                    } else {
                        alert(
                            "There was an error attempting to create your transaction. Please try again after correcting the following problem: " +
                            testLocal.result.error.message
                        );
                    }


                console.log("HERE IS RES");
                console.log(res);


                /////////////////////////////////////////////////////////////////////////////
                //WRAPPING UP STATE
                //Our transaction has run (or had an error), and now we need to set state variables and let the user know what happened

                if (res !== undefined && res !== null) {
                    //Lets go through our list of queued transcations and update it with our transcation hash now that the user has signed
                    //This will update the modal shown to the user that their transcation has been signed
                    let t_transactions = state.transactions;
                    for (let i = 0; i < t_transactions.length; i++) {
                        if (t_transactions[i].txhash === "newtx") {
                            t_transactions[i].txhash = bodyPayload.hash;
                        }
                    }
                    console.log("setting tx hash for transaction");
                    await commit("setTransactions", t_transactions);
                    await commit(
                        "setTransactionsChanged",
                        !state.transactions_changed
                    );

                    //HANDLE XWALLET STATE UPDATES
                    if (bodyPayload.hash) {
                        await commit("setTransactionHash", bodyPayload.hash);
                        await commit("setTransactionPolling", true);
                        await commit("setTransactionConfirmed", false);
                        await commit("setTransactionFailed", null);
                        await commit("setTransactionConfirmedResult", null);
                        await this.dispatch("accounts/pollTransactionHash", bodyPayload.hash);
                    }
                }
            } catch (error) {
                    console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    },

};

//STORE MUTATIONS FOR SETTING STATE VARIABLES
const mutations = {

    setNewTransaction(state, newtx) {
        state.newTransaction = newtx;
    },
    setTransactionsChanged(state, transactions) {
        state.transactions_changed = transactions;
    },
    setTransactions(state, transactions) {
        state.transactions = transactions;
    },
    setBidClicked(state, clicked) {
        state.bid_clicked = clicked;
    },
    setClickedNFT(state, item) {
        state.clicked_nft = item;
    },
    setSaleClicked(state, clicked) {
        state.sale_clicked = clicked;
    },
    setBuyClicked(state, clicked) {
        state.buy_clicked = clicked;
    },
    setUpdateListingClicked(state, clicked) {
        state.update_listing_clicked = clicked;
    },
    setClickedNFT_sale(state, item) {
        state.clicked_nft_sale = item;
    },
    setClickedNFT_buy(state, item) {
        state.clicked_nft_buy = item;
    },
    setClickedNFT_updatelisting(state, item) {
        state.clicked_nft_update_listing = item;
    },
    setUserSqlData(state, data) {
        state.userSqlData = data;
    },
    setXwalletConnected(state, connected) {
        state.xwalletconnected = connected;
    },
    setWalletConnectConnected(state, connected) {
        state.wallet_connect_connected = connected;
    },
    setWalletConnectClient(state, client) {
        state.wallet_connect_client = client;
    },
    setWalletConnectSession(state, session) {
        state.wallet_connect_session = session;
    },
    setAccountExists(state, exists) {
        state.accountExists = exists;
    },
    setAccountData(state, data) {
        state.accountData = data;
    },
    setAccountKeys(state, keys) {
        state.accountKeys = keys;
    },
    setDarkmode(state, enabled) {
        state.darkmode = enabled;
    },
    setAccountPredicate(state, pred) {
        state.accountPredicate = pred;
    },
    setAccountConfirmed(state, confirmed) {
        state.accountConfirmed = confirmed;
    },
    setAccountName(state, name) {
        state.accountName = name;
    },
    setTransactionPolling(state, polling) {
        state.transactionPolling = polling;
    },
    setTransactionConfirmed(state, confirmed) {
        state.transactionConfirmed = confirmed;
    },
    setTransactionFailed(state, failed) {
        state.transactionFailed = failed;
    },
    setCreatingCollection(state, creating) {
        state.creatingCollection = creating;
    },
    setCreatingCollection_Created(state, creating) {
        state.creatingCollection_created = creating;
    },
    setTransactionHash(state, hash) {
        state.transactionHash = hash;
    },
    setTransactionConfirmedResult(state, result) {
        state.transactionConfirmedResult = result;
    },
    setXWalletConnected(state, isconnected) {
        state.xwalletconnected = isconnected;
    },
    setUserNFTs(state, nfts) {
        state.userNFTs = nfts;
    },
    setUserCredits(state, credits) {
        state.userCredits = credits;
    },
    setCurrentSignRequest(state, req) {
        state.currentSignRequest = req;
    },
    setMintingTokenid(state, data) {
        state.minting_tokenid = data;
    },
    setMintingHash(state, data) {
        state.minting_hash = data;
    },



};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
