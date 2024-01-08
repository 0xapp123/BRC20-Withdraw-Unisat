import { useEffect, useState, useRef } from "react";
import type { Capability } from "sats-connect";
import {
  AddressPurpose,
  BitcoinNetworkType,
  getAddress,
  getCapabilities,
  sendBtcTransaction,
} from "sats-connect";
import axios from "axios";
import { Stepper, Step, Button } from "@material-tailwind/react";
import { TransactionModel } from "./TransactionModal";
import { Modal } from "./Modal";
import { toaster } from "./Toast";
import { backendURL, adminWallet, payFee, memPoolURL, vbytes } from "./config";

import CreateFileInscription from "./components/createFileInscription";
import CreateTextInscription from "./components/createTextInscription";
import SendBitcoin from "./components/sendBitcoin";
import SignMessage from "./components/signMessage";
import SignTransaction from "./components/signTransaction";
import { useLocalStorage } from "./useLocalStorage";
import { Loading } from "./Loading";

import bitmapIcon from "./assets/img/bitmap_icon.webp";
import frogIcon from "./assets/img/frog.webp";
import punkIcon from "./assets/img/punk.webp";
import logo from "./assets/img/logo.png";
import { FaTelegramPlane, FaTwitter } from "react-icons/fa";

import "./App.css";
import CreateRepeatInscriptions from "./components/createRepeatInscriptions";
import SignBulkTransaction from "./components/signBulkTransaction";

function App() {
  let liveRealDataSSE: EventSource;
  const [displayedText1, setDisplayedText1] = useState("");
  const [displayedText2, setDisplayedText2] = useState("");

  const [typing1Finished, setTyping1Finished] = useState(false);

  const [claimAble, setClaimAble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentAddress, setPaymentAddress] = useLocalStorage("paymentAddress");
  const [inscrbieMessage, setInscribeMessage] = useState("");
  const [inscrbieState, setInscribeState] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [paymentPublicKey, setPaymentPublicKey] =
    useLocalStorage("paymentPublicKey");
  const [ordinalsAddress, setOrdinalsAddress] =
    useLocalStorage("ordinalsAddress");
  const [ordinalsPublicKey, setOrdinalsPublicKey] =
    useLocalStorage("ordinalsPublicKey");
  const [checkInscriptionNumber, setCheckInscriptionNumber] =
    useState<number>();
  const [showClaimPage, setShowClaimPage] = useState<number>(0);
  const [activeStep, setActiveStep] = useState(0);
  //Mainnet
  /* const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
    "xversenetwork",
    BitcoinNetworkType.Mainnet
  ); */

  //testnet
  const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
    "xversenetwork",
    BitcoinNetworkType.Testnet
  );
  const [showTx, setShowTx] = useState("");

  const [uniNetwork, setUniNetwork] = useState("mainnet");
  const [capabilityState, setCapabilityState] = useState<
    "loading" | "loaded" | "missing" | "cancelled"
  >("loading");
  const [capabilities, setCapabilities] = useState<Set<Capability>>();
  const [showAvailableMessage, setShowAvailableMessage] = useState("");
  const [claimableTokensAmount, setClaimableTokensAmount] = useState(0);
  const [gasFee, setGasFee] = useState(200);
  const [claimableAssets, setClaimableAssets] = useState(0);

  const [walletType, setWalletType] = useState(0);
  const [unisatInstalled, setUnisatInstalled] = useState(false);
  const selfRef = useRef<{ accounts: string[] }>({
    accounts: [],
  });
  const self = selfRef.current;
  const [accounts, setAccounts] = useState<string[]>([]);
  const [txModelOpen, setTxModelOpen] = useState(false);
  const [txLink, setTxLink] = useState("");

  const unisat = (window as any).unisat;

  const [isModalOpen, setModalOpen] = useState(false);

  const handleOpenModal = async () => {
    try {
      const feeRate = await axios.get(
        "https://mempool.space/api/v1/fees/recommended"
      );
      setGasFee(feeRate.data.fastestFee);
    } catch (error) {
      console.error("Error fetching gas fees:", error);
      // Handle the error appropriately.
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };
  const handleConfirm = () => {
    onClaimClick();
    setModalOpen(false);
  };

  useEffect(() => {
    const text1 = "Ann Exclusive BRC-20 Launchpad for PREMIUM ORDINAL HODLERS";
    //BTCPAD: Elite Gateway to Bitcoin Innovation
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeText = (
      text: string,
      displayFunction: React.Dispatch<React.SetStateAction<string>>,
      setFinished?: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      let index = 0;
      function type() {
        if (index < text.length) {
          displayFunction((prev) => prev + text.charAt(index));
          index++;
          timeoutId = setTimeout(type, 100); // Adjust time for speed of typing
        } else if (setFinished) {
          setTyping1Finished(true); // Set typing1Finished to true when text1 is fully typed
        }
      }
      type();
    };

    typeText(text1, setDisplayedText1, setTyping1Finished); // Pass setTyping1Finished as the third argument

    return () => {
      if (timeoutId) clearTimeout(timeoutId); // Clear the timeout when the component unmounts
    };
  }, []); // Empty dependency array since you only want to run this effect on mount

  useEffect(() => {
    const text2 = " 60% tokens available to claim on FCFS..";
    let index2 = 0;
    if (typing1Finished) {
      const typeText2 = () => {
        if (index2 < text2.length) {
          setDisplayedText2((prev) => prev + text2.charAt(index2));
          index2++;
          setTimeout(typeText2, 100); // Typing speed
        }
      };
      typeText2();
    }
  }, [typing1Finished]); // This effect depends on typing1Finished state

  useEffect(() => {
    checkAvailable();
    return () => {
      liveRealDataSSE && liveRealDataSSE.close();
    };
  }, [ordinalsAddress, walletType]);

  useEffect(() => {
    checkXVerseAvailability();
  }, [network]);

  useEffect(() => {
    checkUnisatAvailability();
  }, []);

  const checkUnisatAvailability = async () => {
    let unisat = (window as any).unisat;

    for (let i = 1; i < 10 && !unisat; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100 * i));
      unisat = (window as any).unisat;
    }

    if (unisat) {
      setUnisatInstalled(true);
    } else if (!unisat) {
      setUnisatInstalled(false);
    }
  };

  const checkXVerseAvailability = async () => {
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

  const runCapabilityCheck = async (walletType: number) => {
    if (walletType === 1) {
      if (capabilityMessage !== undefined) {
        toaster("error", "Install XVerse Wallet");
        return false;
      }
    } else if (walletType === 2) {
      if (unisatInstalled === false) {
        toaster("error", "Install Unisat Wallet");
        return false;
      }
    }
  };

  const getBasicInfo = async () => {
    const unisat = (window as any).unisat;
    const [address] = await unisat.getAccounts();
    setOrdinalsAddress(address);

    const publicKey = await unisat.getPublicKey();
    setOrdinalsPublicKey(publicKey);

    const uniNetwork = await unisat.getNetwork();
    setUniNetwork(uniNetwork);
  };

  const handleAccountsChanged = (_accounts: string[]) => {
    try {
      if (_accounts[0].length !== 62) {
        toaster("info", "Change Your Wallet Type To Taproot and Connect Again");
        onWalletDisconnect();
        return;
      }
      self.accounts = _accounts;
      if (_accounts.length > 0) {
        setAccounts(_accounts);

        setOrdinalsAddress(_accounts[0]);

        getBasicInfo();
        setWalletType(2);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleNetworkChanged = (uninetwork: string) => {
    setUniNetwork(uninetwork);
    getBasicInfo();
  };

  const getRealUpdateData = async (liveRealDataSSE: EventSource) => {
    liveRealDataSSE.addEventListener("message", async (event) => {
      if (
        JSON.parse(event.data).type === "insert" &&
        JSON.parse(event.data).init === true
      ) {
        let notCompleted = false;
        console.log("init");
        for (const item of JSON.parse(event.data).data) {
          if (item.status !== 4) {
            setActiveStep(item.status + 1);
            if (item.status === 0) setShowTx(item.txID);
            else if (item.status === 2) setShowTx(item.inscribeTxID);
            else if (item.status === 3) setShowTx(item.inscribeTxID);
            else setShowTx("");
            notCompleted = true;
          }
        }
        if (!notCompleted) setActiveStep(0);
      }
      if (
        JSON.parse(event.data).type === "insert" &&
        JSON.parse(event.data).init === false
      ) {
        console.log("inserted");
        setActiveStep(JSON.parse(event.data).data.status + 1);
        if (JSON.parse(event.data).data.status === 0)
          setShowTx(JSON.parse(event.data).data.txID);
        else if (JSON.parse(event.data).data.status === 2)
          setShowTx(JSON.parse(event.data).data.inscribeTxID);
        else if (JSON.parse(event.data).data.status === 3)
          setShowTx(JSON.parse(event.data).data.inscribeTxID);
        else setShowTx("");
      }
      if (JSON.parse(event.data).type === "update") {
        console.log("updated");
        if (JSON.parse(event.data).data.status === 4) setActiveStep(0);
        else setActiveStep(JSON.parse(event.data).data.status + 1);
        if (JSON.parse(event.data).data.status === 0)
          setShowTx(JSON.parse(event.data).data.txID);
        else if (JSON.parse(event.data).data.status === 2)
          setShowTx(JSON.parse(event.data).data.inscribeTxID);
        else if (JSON.parse(event.data).data.status === 3)
          setShowTx(JSON.parse(event.data).data.inscribeTxID);
        else setShowTx("");
      }
    });
  };

  const checkAvailable = async () => {
    console.log(ordinalsAddress, walletType);
    if (ordinalsAddress !== undefined && walletType !== 0) {
      const res = await axios.post(`${backendURL}/api/check-wallet`, {
        ordinalAddress: ordinalsAddress,
      });
      console.log(res.data.array);
      if (res.data.array.length === 0) {
        // toaster("info", "Sorry, but you cannot claim any token.");
        if (
          res.data.totalBitmapCnt +
            res.data.totalFrogCnt +
            res.data.totalPunkCnt >
          0
        )
          setShowAvailableMessage(
            `Sorry, You already claimed ${
              (res.data.totalBitmapCnt +
                res.data.totalFrogCnt +
                res.data.totalPunkCnt) *
              1000
            } tokens for ${res.data.totalBitmapCnt} Bitmaps, ${
              res.data.totalFrogCnt
            } Bitfrogs and ${
              res.data.totalPunkCnt
            } BitPunks. No more claim left.`
          );
        else setShowAvailableMessage("Sorry, but you cannot claim any token.");
        setClaimAble(false);
      } else {
        setClaimableAssets(
          res.data.bitmapCnt + res.data.bitFrogCnt + res.data.bitPunkCnt
        );
        setClaimableTokensAmount(
          res.data.bitmapCnt * 1000 +
            res.data.bitFrogCnt * 50000 +
            res.data.bitPunkCnt * 10000
        );

        setShowAvailableMessage(`
        ${res.data.bitmapCnt} Bitmaps + ${res.data.bitFrogCnt} Bitfrogs + ${
          res.data.bitPunkCnt
        } BitPunks.
       Tokens claimable - ${
         res.data.bitmapCnt * 1000 +
         res.data.bitFrogCnt * 50000 +
         res.data.bitPunkCnt * 10000
       } $ODP
      `);

        liveRealDataSSE = new EventSource(
          `${backendURL}/api/get-real-data/${ordinalsAddress}`,
          { withCredentials: true }
        );
        getRealUpdateData(liveRealDataSSE);

        // toaster(
        //   "info",
        //   "You are eligible to claim 1000 tokens because you have BITMAP/FROG/ PUNK"
        // );
        setClaimAble(true);
      }
      // setClaimAble(true);
    }
  };

  const checkInscribeNumber = async () => {
    if (checkInscriptionNumber) {
      const res = await axios.post(`${backendURL}/api/check-inscribe`, {
        inscribeId: checkInscriptionNumber,
      });
      setInscribeState(res.data.possible);
      if (res.data.possible) {
        setInscribeMessage("Tokens not yet claimed for this inscription.");
      } else {
        setInscribeMessage(
          "This inscription has already been used to claim tokens"
        );
      }
      //setInscribeMessage(res.data.msg);
    } else {
      toaster("error", "Input Inscribe Number");
    }
  };

  const onClaimClick = async () => {
    try {
      // const feeRate = await axios.get(
      //   "https://mempool.space/api/v1/fees/recommended"
      // );
      // console.log(feeRate.data.economyFee);

      // await axios.post(`${backendURL}/api/test`, {
      //   paymentAddress: paymentAddress,
      // });
      //const amount = payFee * claimableAssets  + vbytes * gasFee ;

      // const amount = payFee + vbytes * gasFee;
      const amount = 10000;

      console.log("sats::", amount);

      console.log(ordinalsAddress, walletType);
      if (walletType === 2) {
        const txid = await (window as any).unisat.sendBitcoin(
          adminWallet,
          amount
        );
        setLoading(true);
        try {
          const res = await axios.post(`${backendURL}/api/claim`, {
            ordinalAddress: ordinalsAddress,
            txID: txid,
          });
          /* setTxModelOpen(true);
          setTxLink(memPoolURL + res.data.id); */
          toaster(
            "success",
            `Request received. Processing your transaction. You will receive tokens shortly.`
          );

          // toaster("success", `${memPoolURL}${res.data.id}`);
        } catch (error) {
          console.log(error);
          if (error.response) toaster("error", error.response.data.error);
          else toaster("error", "Claim Failed! Please Try Again Later");
        }
        setLoading(false);
      } else if (walletType === 1) {
        await sendBtcTransaction({
          payload: {
            network: {
              type: network,
            },
            recipients: [
              {
                address: adminWallet,
                amountSats: BigInt(amount),
              },
              // you can add more recipients here
            ],
            senderAddress: paymentAddress!,
          },
          onFinish: async (response) => {
            setLoading(true);
            try {
              const res = await axios.post(`${backendURL}/api/claim`, {
                ordinalAddress: ordinalsAddress,
                txID: response,
              });

              /* setTxModelOpen(true);
              setTxLink(memPoolURL + res.data.id); */

              toaster(
                "success",
                `Request received. Processing your transaction. You will receive tokens shortly.`
              );
            } catch (error) {
              console.log(error);
              if (error.response) toaster("error", error.response.data.error);
              else toaster("error", "Claim Failed! Please Try Again Later");
            }
            setLoading(false);
          },
          onCancel: () => toaster("error", "Canceled"),
        });
      }
      checkAvailable();
    } catch (error) {
      console.log(error);
    }
  };

  const onWalletDisconnect = () => {
    setPaymentAddress(undefined);
    setPaymentPublicKey(undefined);
    setOrdinalsAddress(undefined);
    setOrdinalsPublicKey(undefined);
    setClaimAble(false);
    setShowAvailableMessage("");
    setWalletType(0);
    setActiveStep(0);
  };

  const toggleNetwork = () => {
    setNetwork(
      network === BitcoinNetworkType.Testnet
        ? BitcoinNetworkType.Mainnet
        : BitcoinNetworkType.Testnet
    );
    onWalletDisconnect();
  };

  const onConnectClick = async (walletType: number) => {
    let possibility = await runCapabilityCheck(walletType);
    if (possibility === false) return;
    if (walletType === 1) {
      await getAddress({
        payload: {
          purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
          message: "Connect With BRC20 Claim",
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
          setWalletType(1);
          setOpenModal(false);
        },
        onCancel: () => toaster("error", "Request Canceled"),
      });
    } else if (walletType === 2) {
      try {
        const result = await unisat.requestAccounts();
        handleAccountsChanged(result);
        setOpenModal(false);
      } catch (error) {
        console.log(error);
      }
    }
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

  return (
    <div className="mt-2">
      <div className="sticky top-0 z-50 bg-sticky shadow-md">
        {" "}
        {/* Added sticky classes */}
        <div className="h-10 flex justify-between items-center p-5">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              setShowClaimPage(0);
            }}
          >
            <img
              src={logo}
              alt="BTCPAD Logo"
              className="mr-3"
              style={{ height: "80px" }}
            />{" "}
            {/* Adjust the height as needed */}
            <p className="text-xl sm:text-2xl">BTCPAD</p>
          </div>

          <div className="flex items-center">
            <a
              href="https://t.me/btcpad"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block"
            >
              <FaTelegramPlane
                className="text-2xl mr-3"
                style={{ color: "#ffffff" }}
              />
            </a>
            <a
              href="https://twitter.com/BTCPadLaunch"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block"
            >
              <FaTwitter
                className="text-2xl mr-3"
                style={{ color: "#ffffff" }}
              />
            </a>

            <button
              className="w-[110px] rounded-lg border-2 border-[#ffffff] text-[#ffffff] disabled:cursor-not-allowed"
              onClick={() => {
                if (!ordinalsAddress || walletType === 0) {
                  setOpenModal(true);
                }
              }}
            >
              {ordinalsAddress && walletType !== 0 ? (
                <span>
                  <span className="text-xs">{`${ordinalsAddress.substring(
                    0,
                    6
                  )}...${ordinalsAddress.substring(
                    ordinalsAddress.length - 4
                  )}`}</span>
                </span>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        </div>
      </div>
      {!showClaimPage ? (
        <div>
          <div className="background-image h-full">
            <div>
              <div className="lg:flex p-10 lg:p-20 flex justify-center items-center">
                <div>
                  <p className="text-2xl lg:text-4xl text-white text-shadow">
                    {displayedText1}
                  </p>
                  {typing1Finished && (
                    <p className="text-xl lg:text-2xl mt-5 lg:mt-10 text-white text-shadow">
                      {displayedText2}
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:flex p-5 lg:p-5 flex justify-center items-center">
                <div>
                  <p className="text-l text-white text-shadow">
                    Claim Tokens if you are a Bitmap, Bitcoin Frog OR Punk
                    Holder:{" "}
                  </p>
                </div>
              </div>
              <div className="lg:flex p-10 lg:p-10 flex justify-center items-center">
                <div className="community-icons grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="community-item">
                    <img
                      src={bitmapIcon}
                      alt="Bitmap Icon"
                      className="community-icon"
                    />
                    <p className="community-text">Bitmap</p>
                  </div>
                  <div className="community-item">
                    <img
                      src={frogIcon}
                      alt="Bitcoin Frog Icon"
                      className="community-icon"
                    />
                    <p className="community-text">Bitcoin Frog</p>
                  </div>
                  <div className="community-item">
                    <img
                      src={punkIcon}
                      alt="Punk Icon"
                      className="community-icon"
                    />
                    <p className="community-text">Bitcoin Punk</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                {showAvailableMessage !== "" && (
                  <p
                    className={`max-w-[80%] text-center pb-4 text-overlay ${
                      claimAble === false ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {showAvailableMessage}
                  </p>
                )}
              </div>

              <div>
                <div className="w-full flex justify-center pb-10">
                  <button
                    className="claim-button disabled:cursor-not-allowed cursor-pointer"
                    disabled={!claimAble || loading || !ordinalsAddress}
                    // onClick={handleOpenModal}
                    onClick={() => {
                      setShowClaimPage(1);
                    }}
                  >
                    {!(ordinalsAddress && walletType !== 0)
                      ? "Connect wallet to claim"
                      : loading
                      ? "Processing..."
                      : "Claim Free token (FCFS)"}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex flex-col mb-4 mt-16 px-4 md:px-6 lg:px-8 xl:px-10 mx-auto w-full lg:w-2/3 xl:w-1/2 justify-center">
                  <p className="text-l mb-2">Check Claim Status</p>
                  <div className="flex flex-col md:flex-row">
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-l text-gray-400 leading-tight focus:outline-none focus:shadow-outline mb-3 md:mb-0 md:mr-3"
                      type="number"
                      placeholder="Inscription Number"
                      onChange={(e) => {
                        setCheckInscriptionNumber(Number(e.target.value));
                      }}
                      value={checkInscriptionNumber}
                    />
                    <button
                      className="w-full md:w-[180px] h-full rounded-lg border-2 border-[#3d7ef6] text-[#3d7ef6]"
                      onClick={checkInscribeNumber}
                    >
                      Check
                    </button>
                  </div>
                </div>

                <p
                  className={`text-center ${
                    inscrbieMessage
                      ? `text-overlay ${
                          inscrbieState === false
                            ? "text-red-600"
                            : "text-green-600"
                        }`
                      : "hidden"
                  }`}
                >
                  {inscrbieMessage}
                </p>
              </div>

              <div className="w-full flex justify-center pb-10 mt-16">
                <button
                  className="claim-button disabled:cursor-not-allowed cursor-pointer"
                  onClick={() =>
                    window.open(
                      "https://form.jotform.com/240011780045039?fbclid=IwAR0qYp6hlmXaQo2FPr_FI5n6VhdUoUfGZ9YoYWjxDJGbCg-ok6gWpI70mBo",
                      "_blank"
                    )
                  }
                >
                  Apply for IDO
                </button>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <div className="flex justify-center">
              <p className="text-2xl p-2 lg:p-10">
                HOW IT <span className="text-[#3d7ef6]">WORKS</span>
              </p>
            </div>
            <div className="flex justify-center">
              <div className="container rounded-2xl">
                <div className="w-full">
                  <div className="lg:flex">
                    <div className="lg:mr-[10px] bg-white rounded-xl p-6 w-full">
                      <div className="flex">
                        <img
                          src="/assets/img/HowIcon1.png"
                          alt="HowIcon1"
                          className="w-[30px] mr-[10px]"
                        />
                        <p className="text-xl">BUILDERS</p>
                      </div>
                      <ul>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Capital Access: Connect with top-tier investors and
                            secure funding with ease. Our platform streamlines
                            your project’s journey from launch to industry
                            leadership.
                          </p>
                        </li>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Strategic Alliances: Engage with a network of
                            seasoned experts and Bitcoin aficionados. Gain
                            insights, mentorship, and the support you need to
                            thrive.
                          </p>
                        </li>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Accelerated Evolution: Leverage cutting-edge tools
                            and resources designed for rapid growth. With
                            BTCPAD, you're not just building a project; you're
                            launching a legacy.
                          </p>
                        </li>
                      </ul>
                    </div>
                    <div className="lg:ml-[10px] bg-white rounded-xl p-6 w-full mt-5 lg:mt-0">
                      <div className="flex">
                        <img
                          src="/assets/img/HowIcon2.png"
                          alt="HowIcon1"
                          className="w-[30px] mr-[10px]"
                        />
                        <p className="text-xl">INVESTORS</p>
                      </div>
                      <ul>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Direct Impact: Drive project success with strategic
                            investments. Choose ventures that align with your
                            vision and commit to their growth.
                          </p>
                        </li>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Rewards: Realize substantial gains by investing in
                            our handpicked, high-potential Bitcoin projects.
                          </p>
                        </li>
                        <li className="flex mt-2">
                          <img
                            src="/assets/img/HowIcon6.png"
                            className="w-[20px] h-[20px] mt-[1px] mr-3"
                            alt="HowIcon6"
                          />
                          <p>
                            Empowerment: Join an elite investment community
                            shaping the trajectory of Bitcoin's most promising
                            endeavors. Your capital is the catalyst for
                            innovation.
                          </p>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 w-full mt-5">
                    <div className="flex">
                      <img
                        src="/assets/img/HowIcon3.png"
                        alt="HowIcon3"
                        className="w-[30px] mr-[10px]"
                      />
                      <p className="text-xl">PROTOCOLS</p>
                    </div>
                    <p className="mt-2">
                      BTCPAD revolutionizes funding with a protocol grounded in
                      efficiency and transparency. We leverage the power of the
                      PSBT protocol, allowing projects to secure funds
                      seamlessly. This means every transaction, every
                      contribution, every step toward your goal is optimized for
                      success.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-6 w-full mt-5">
                    <div className="flex">
                      <img
                        src="/assets/img/HowIcon4.png"
                        alt="HowIcon4"
                        className="w-[30px] mr-[10px]"
                      />
                      <p className="text-xl">INFRASTRUCTURE</p>
                    </div>
                    <p className="mt-2">
                      Our commitment at BTCPAD goes beyond funding. We're
                      building the infrastructural backbone for developers and
                      users alike, featuring advanced tools for exploration,
                      project tracking, and seamless interaction. Our platform
                      ensures that you have a robust, scalable environment to
                      grow and enhance the Bitcoin ecosystem.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-6 w-full mt-5">
                    <div className="flex">
                      <img
                        src="/assets/img/HowIcon5.png"
                        alt="HowIcon5"
                        className="w-[30px] mr-[10px]"
                      />
                      <p className="text-xl">COMMUNITY</p>
                    </div>
                    <p className="mt-2">
                      Join BTCPAD’s community-focused platform, dedicated
                      exclusively to Bitcoin projects. It's where innovation
                      meets a passionate collective, ready to drive change in
                      the crypto space. Engage with projects you believe in, and
                      be part of a movement shaping the future of blockchain,
                      all within the dynamic world of Bitcoin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20 bg-brc20 ">
            <div className="py-20">
              {" "}
              {/* Add vertical padding for gap */}
              <div className="flex justify-center ">
                <p className="text-2xl text-white p-2 lg:p-10">
                  2024 belongs to BTC & BRC-20 tokens
                </p>
              </div>
              <div className="lg:flex px-5 lg:px-40 items-center mb-20 justify-center text-center">
                {" "}
                {/* Center align text */}
                <img
                  src="/assets/img/bitcoin-1.png"
                  className="mx-auto lg:mr-16"
                  alt="Bitcoin"
                  style={{
                    width: "200px",
                    height: "200px",
                  }} /* Inline styles to set width and height */
                />
                <div className="bg-black bg-opacity-50 p-6 rounded-md">
                  <p className="lg:mt-0 mt-6 text-white">
                    In 2024, the synergy between Bitcoin (BTC) and the emerging
                    BRC-20 standard is poised to reshape the landscape of
                    digital assets. The BRC-20 protocol enhances Bitcoin's
                    functionality, enabling the creation of tokens directly on
                    the Bitcoin blockchain.
                    <br />
                    <br />
                    This groundbreaking convergence promises to unlock new
                    possibilities for decentralized applications, thereby
                    cementing Bitcoin's position not just as a store of value,
                    but as a foundational layer for a new era of financial
                    innovation and utility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="background-image flex items-center justify-center">
            <div className="w-full py-4 px-8 mt-28">
              <Stepper activeStep={activeStep}>
                <Step className="h-4 w-4" />
                <Step className="h-4 w-4" />
                <Step className="h-4 w-4" />
                <Step className="h-4 w-4" />
                <Step className="h-4 w-4" />
              </Stepper>
              <div className="flex justify-center mt-3">
                {activeStep === 0 ? (
                  <div>
                    <button
                      className="claim-button disabled:cursor-not-allowed cursor-pointer"
                      onClick={() => {
                        handleOpenModal();
                      }}
                    >
                      Claim Token
                    </button>
                  </div>
                ) : activeStep === 1 ? (
                  <div className="text-white">Waiting BTC Deposited...</div>
                ) : activeStep === 2 ? (
                  <div className="text-white">Inscribe Token...</div>
                ) : activeStep === 3 ? (
                  <div className="text-white">
                    Sending Token To User Wallet...
                  </div>
                ) : (
                  <div className="text-white">Completed!</div>
                )}
              </div>
              {showTx !== "" && (
                <div className="text-center">
                  <a
                    href={`${memPoolURL}${showTx}`}
                    target="_blank"
                    className="text-white"
                  >
                    TxID : {showTx}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer
        className={`bg-gray-800 text-white p-10 ${
          showClaimPage === 1 && "bottom-0 absolute w-full"
        }`}
      >
        <div className="flex flex-col lg:flex-row justify-between items-center max-w-6xl mx-auto text-center lg:text-left">
          <div className="flex items-center">
            <img
              src={logo}
              alt="BTCPAD Logo"
              className="mr-3"
              style={{ height: "80px" }}
            />{" "}
            {/* Adjust the height as needed */}
            <p className="text-2xl">BTCPAD</p>
          </div>
          <div className="mb-6 lg:mb-0">
            <p>
              &copy; {new Date().getFullYear()} BTCPAD. All rights reserved.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <a
              href="https://t.me/btcpad"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* Insert Telegram icon here */}
            </a>
            <a
              href="https://twitter.com/BTCPadLaunch"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* Insert Twitter icon here */}
            </a>
            <a href="mailto:support@btcpad.co">Contact Us</a>
            <a
              href="https://t.me/btcpad_launch"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTelegramPlane className="text-2xl" />
            </a>
            <a
              href="https://twitter.com/BTCPadLaunch"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter className="text-2xl" />
            </a>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Amount to Claim: {claimableTokensAmount} $ODP</p>
            <p>Gas Fees: {gasFee ? `${gasFee} sats/vB` : "Loading..."}</p>
            {/* <p>Dev Fees: {payFee * claimableAssets} sats</p> */}
            <p>Dev Fees: {payFee} sats</p>

            <i>(10000 sats per ordinal claimed)</i>

            <div className="modal-actions">
              <button onClick={handleConfirm}>Confirm</button>
              <button
                onClick={handleCloseModal}
                style={{ backgroundColor: "red" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={openModal}
        toggleModal={setOpenModal}
        walletConnect={onConnectClick}
      />
      <TransactionModel
        isOpen={txModelOpen}
        toggleModal={setTxModelOpen}
        link={txLink}
      />
      {loading && <Loading />}
    </div>
  );
}

export default App;
