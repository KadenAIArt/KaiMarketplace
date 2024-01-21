import { createClient } from '@kadena/client';
// Replace with your own node.
const kadenaClient = createClient('https://api.chainweb.com/chainweb/0.0/mainnet01/chain/8/pact');

export default kadenaClient;
