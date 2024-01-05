//mainnet
//const testVersion = false;

//testnet
const testVersion = true;

export const backendURL = testVersion
  ? "http://localhost:5000"
  : //  "https://api.btcpad.co"
    //"http://194.28.224.104:5000"
    "https://perfect-brc20-demo.netlify.app";

/*   export const backendURL = testVersion
  ? "http://localhost:5000"
  : "https://perfect-brc20-demo.netlify.app";
 */

export const adminWallet = testVersion
  ? "tb1p9w5uzcx8nnysa763syhsmmdqkvxavdnywrstcgah35lsdeq5305qwwmfnn"
  : "";
export const memPoolURL = testVersion
  ? "https://mempool.space/testnet/tx/"
  : "https://mempool.space/tx/";
export const payFee = testVersion ? 10000 : 10000;
export const vbytes = testVersion ? 300 : 300;
