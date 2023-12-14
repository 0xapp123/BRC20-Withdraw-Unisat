import type { Capability } from "sats-connect";
import {
  AddressPurpose,
  BitcoinNetworkType,
  getAddress,
  getCapabilities,
  sendBtcTransaction,
} from "sats-connect";

import CreateFileInscription from "./components/createFileInscription";
import CreateTextInscription from "./components/createTextInscription";
import SendBitcoin from "./components/sendBitcoin";
import SignMessage from "./components/signMessage";
import SignTransaction from "./components/signTransaction";
import { useLocalStorage } from "./useLocalStorage";

import { useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import CreateRepeatInscriptions from "./components/createRepeatInscriptions";
import SignBulkTransaction from "./components/signBulkTransaction";

function App() {
  const [claimAble, setClaimAble] = useState(false);
  const [paymentAddress, setPaymentAddress] = useLocalStorage("paymentAddress");
  const [paymentPublicKey, setPaymentPublicKey] =
    useLocalStorage("paymentPublicKey");
  const [ordinalsAddress, setOrdinalsAddress] =
    useLocalStorage("ordinalsAddress");
  const [ordinalsPublicKey, setOrdinalsPublicKey] =
    useLocalStorage("ordinalsPublicKey");
  const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
    "network",
    BitcoinNetworkType.Testnet
  );
  const [capabilityState, setCapabilityState] = useState<
    "loading" | "loaded" | "missing" | "cancelled"
  >("loading");
  const [capabilities, setCapabilities] = useState<Set<Capability>>();

  useEffect(() => {
    const runCapabilityCheck = async () => {
      let runs = 0;
      const MAX_RUNS = 20;
      setCapabilityState("loading");

      // the wallet's in-page script may not be loaded yet, so we'll try a few times
      while (runs < MAX_RUNS) {
        try {
          await getCapabilities({
            onFinish(response) {
              setCapabilities(new Set(response));
              setCapabilityState("loaded");
            },
            onCancel() {
              setCapabilityState("cancelled");
            },
            payload: {
              network: {
                type: network,
              },
            },
          });
        } catch (e) {
          runs++;
          if (runs === MAX_RUNS) {
            setCapabilityState("missing");
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };

    runCapabilityCheck();
  }, [network]);

  useEffect(() => {
    setClaimAble(false);
    if (ordinalsAddress) {
      fetchOrdinals();
    }
  }, [ordinalsAddress]);

  const isReady =
    !!paymentAddress &&
    !!paymentPublicKey &&
    !!ordinalsAddress &&
    !!ordinalsPublicKey;

  const fetchOrdinals = async () => {
    let fetchCnt = 0;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer 8a9662e4-bf48-4c9c-a766-d316f88daeb4`,
      },
    };
    await fetch(
      `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitmap&ownerAddress=${ordinalsAddress}&showAll=true&sortBy=priceAsc`,
      options
    )
      .then((response) => response.json())
      .then(async (response) => {
        fetchCnt += response.tokens.length;
      })
      .catch((err) => {
        console.log("===== Flowers Error ", err);
      });
    await fetch(
      `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitcoin-frogs&ownerAddress=${ordinalsAddress}&showAll=true&sortBy=priceAsc`,
      options
    )
      .then((response) => response.json())
      .then(async (response) => {
        fetchCnt += response.tokens.length;
      })
      .catch((err) => {
        console.log("===== Flowers Error ", err);
      });
    if (fetchCnt > 0) setClaimAble(true);
  };

  const onClaimClick = async () => {
    try {
      const feeRate = await axios.get(
        "https://mempool.space/api/v1/fees/recommended"
      );
      console.log(feeRate.data.economyFee);

      const res = await axios.post(
        `https://open-api-testnet.unisat.io/v2/inscribe/order/create/brc20-mint`,
        {
          receiveAddress: ordinalsAddress,
          feeRate: feeRate.data.economyFee,
          outputValue: 546,
          devAddress:
            "tb1p9w5uzcx8nnysa763syhsmmdqkvxavdnywrstcgah35lsdeq5305qwwmfnn",
          devFee: 1000,
          brc20Ticker: "pktd",
          brc20Amount: "200",
          count: 1,
        },
        {
          headers: {
            Authorization: `Bearer 50c50d3a720f82a3b93f164ff76989364bd49565b378b5c6a145c79251ee7672`,
          },
        }
      );
      console.log(res);
      console.log(res.data.data.amount);
      console.log(res.data.data.payAddress);

      await sendBtcTransaction({
        payload: {
          network: {
            type: network,
          },
          recipients: [
            {
              address: res.data.data.payAddress,
              amountSats: BigInt(res.data.data.amount),
            },
            // you can add more recipients here
          ],
          senderAddress: paymentAddress!,
        },
        onFinish: (response) => {
          alert(response);
        },
        onCancel: () => alert("Canceled"),
      });
    } catch (error) {
      console.log(error);
    }
  };

  const onWalletDisconnect = () => {
    setPaymentAddress(undefined);
    setPaymentPublicKey(undefined);
    setOrdinalsAddress(undefined);
    setOrdinalsPublicKey(undefined);
  };

  const toggleNetwork = () => {
    setNetwork(
      network === BitcoinNetworkType.Testnet
        ? BitcoinNetworkType.Mainnet
        : BitcoinNetworkType.Testnet
    );
    onWalletDisconnect();
  };

  const onConnectClick = async () => {
    await getAddress({
      payload: {
        purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        message: "SATS Connect Demo",
        network: {
          type: network,
        },
      },
      onFinish: (response) => {
        const paymentAddressItem = response.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment
        );
        setPaymentAddress(paymentAddressItem?.address);
        setPaymentPublicKey(paymentAddressItem?.publicKey);

        const ordinalsAddressItem = response.addresses.find(
          (address) => address.purpose === AddressPurpose.Ordinals
        );
        setOrdinalsAddress(ordinalsAddressItem?.address);
        setOrdinalsPublicKey(ordinalsAddressItem?.publicKey);
      },
      onCancel: () => alert("Request canceled"),
    });
  };

  const capabilityMessage =
    capabilityState === "loading"
      ? "Checking capabilities..."
      : capabilityState === "cancelled"
      ? "Capability check cancelled by wallet. Please refresh the page and try again."
      : capabilityState === "missing"
      ? "Could not find an installed Sats Connect capable wallet. Please install a wallet and try again."
      : !capabilities
      ? "Something went wrong with getting capabilities"
      : undefined;

  if (capabilityMessage) {
    return (
      <div style={{ padding: 30 }}>
        <h1>Sats Connect Test App - {network}</h1>
        <div>{capabilityMessage}</div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={{ padding: 30 }}>
        <h1>Sats Connect Test App - {network}</h1>
        <div>Please connect your wallet to continue</div>

        <div style={{ background: "lightgray", padding: 30, marginTop: 10 }}>
          <button style={{ height: 30, width: 180 }} onClick={toggleNetwork}>
            Switch Network
          </button>
          <br />
          <br />
          <button style={{ height: 30, width: 180 }} onClick={onConnectClick}>
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Sats Connect Test App - {network}</h1>
      <div>
        <div>Payment Address: {paymentAddress}</div>
        <div>Ordinals Address: {ordinalsAddress}</div>
        <br />

        <div className="container">
          <h3>Disconnect wallet</h3>
          <button onClick={onWalletDisconnect}>Disconnect</button>
        </div>
        {isReady && <button onClick={onClaimClick}>Claim</button>}
        {/*
        <SignTransaction
          paymentAddress={paymentAddress}
          paymentPublicKey={paymentPublicKey}
          ordinalsAddress={ordinalsAddress}
          ordinalsPublicKey={ordinalsPublicKey}
          network={network}
          capabilities={capabilities!}
        />

        <SignBulkTransaction
          paymentAddress={paymentAddress}
          paymentPublicKey={paymentPublicKey}
          ordinalsAddress={ordinalsAddress}
          ordinalsPublicKey={ordinalsPublicKey}
          network={network}
          capabilities={capabilities!}
        />

        <SignMessage
          address={ordinalsAddress}
          network={network}
          capabilities={capabilities!}
        />

        <SendBitcoin
          address={paymentAddress}
          network={network}
          capabilities={capabilities!}
        />

        <CreateTextInscription network={network} capabilities={capabilities!} />

        <CreateRepeatInscriptions
          network={network}
          capabilities={capabilities!}
        />

        <CreateFileInscription network={network} capabilities={capabilities!} />
  */}
      </div>
    </div>
  );
}

export default App;
