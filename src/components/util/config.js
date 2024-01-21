
// Replace with your own nodes.
const config = {
    testnet: {
      apiUrl: "https://api.testnet.chainweb.com",
      chainId: "1",
      networkId: "testnet04",
      name: "Testnet",
      walletChain: "kadena:testnet04",
    },
    mainnet: {
      apiUrl: "https://api.chainweb.com",
      chainId: "8",
      networkId: "mainnet01",
      name: "Mainnet",
      walletChain: "kadena:mainnet01",
    }
  };
  
  const currentEnv = import.meta.env.VITE_APP_ENV=== 'mainnet' ? 'mainnet' : 'testnet';
  export default config[currentEnv];
