const apiConfig = {
    test: {
      apiHost: "http://localhost:3001",
    },
    prod: {
      apiHost: import.meta.env.VITE_APP_NFT_API,
    }
  };
  
  const currentEnv = import.meta.env.VITE_APP_API_HOST=== 'prod' ? 'prod' : 'test';
  export default apiConfig[currentEnv];