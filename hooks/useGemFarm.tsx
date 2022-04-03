import { programs } from '@metaplex/js';
import { useWalletNfts } from '@nfteyez/sol-rayz-react';
import {
  useConnectedWallet,
  useConnection,
  WalletAdapter
} from '@saberhq/use-solana';
import { PublicKey } from '@solana/web3.js';
import { GemBank, initGemBank } from 'gem-bank';
import { GemFarm, initGemFarm } from 'gem-farm';
import {
  addSingleGem,
  fetchFarm,
  fetchFarmer,
  getGemStakedInFarm,
  onDepositGems,
  onWithdrawGems
} from 'helpers/gemFarm';
import { convertArrayToObject } from 'helpers/utils';
import useFetchNFTByUser from './useNFTV2';
import { useRouter } from 'next/router';
import { newFarmCollections } from 'constants/new-farms';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const useGemFarm = () => {
  const wallet = useConnectedWallet();
  const [AllNFTs, isLoading, updateNFTsInUserWallet] =
    useFetchNFTByUser(wallet);
  const connection = useConnection();

  const [isFetching, setIsFetching] = useState(true);

  const [stakedNFTsInFarm, setStakedNFTsInFarm] = useState<{
    [tokenId: string]: NFT;
  }>({});
  const [walletNFTsInFarm, setWalletNFTsInFarm] = useState<{
    [tokenId: string]: NFT;
  }>({});
  const [selectedWalletNFTs, setSelectedWalletNFTs] = useState<NFT[]>([]);
  const [selectedVaultNFTs, setSelectedVaultNFTs] = useState<NFT[]>([]);

  // Get farm and bank addresses from router
  const router = useRouter();
  const collectionName = router.query.name;
  const collection = newFarmCollections.find(
    collection => collection.name === collectionName
  );
  const farmAddress = collection?.farmAddress || '';
  const bankAddress = collection?.bankAddress || '';

  // Gem farm states
  const [isStartingGemFarm, setIsStartingGemFarm] = useState(true);
  const [gf, setGf] = useState<GemFarm>();
  const [gb, setGb] = useState<GemBank>();
  const [farmAcc, setFarmAcc] = useState<any>();
  const [vaultAcc, setVaultAcc] = useState<any>();

  const [farmerIdentity, setFarmerIdentity] = useState<string>();
  const [farmerAcc, setFarmerAcc] = useState<any>();
  const [farmerState, setFarmerState] = useState<string>('');

  const [availableA, setAvailableA] = useState<string>();
  const [availableB, setAvailableB] = useState<string>();

  // fetch farmer details from gem farm
  const fetchFarmerDetails = useCallback(
    async (gf, gb) => {
      if (!gf || !wallet?.publicKey) return;
      try {
        const farmer = await fetchFarmer(
          gf,
          gb,
          farmAddress,
          wallet?.publicKey
        );
        setFarmerAcc(farmer.farmerAcc);
        setVaultAcc(farmer.vaultAcc);
        setAvailableA(farmer.rewards.availableA);
        setAvailableB(farmer.rewards.availableB);
        setFarmerIdentity(farmer.farmerIdentity);
        setFarmerState(farmer.farmerState);
      } catch (error) {
        console.log('Farmer account not found');
      }
    },
    [wallet, farmAddress]
  );

  // Get wallet and vault NFts
  const setNFTs = useCallback(async () => {
    try {
      setIsFetching(true);

      //getting farm nfts in wallet
      const walletNFTsInFarm = AllNFTs.filter(
        nft => nft.updateAuthority === collection?.updateAuthority
      );
      setWalletNFTsInFarm(convertArrayToObject(walletNFTsInFarm, 'tokenId'));

      if (!gb) return;

      if (!farmerAcc?.vault) {
        setIsFetching(false);
        setStakedNFTsInFarm({});
        return;
      }

      //getting farm vault nfts
      const stakedNFTs =
        (await getGemStakedInFarm(gb, farmerAcc?.vault, connection)) || [];
      setStakedNFTsInFarm(convertArrayToObject(stakedNFTs, 'tokenId'));
      setIsFetching(false);
    } catch (error) {
      console.log(error);
    }
  }, [AllNFTs, collection, connection, gb, farmerAcc?.vault]);

  /**
   * @params
   * @description
   * @returns
   **/
  //Gem farm data fetches
  const freshStart = useCallback(async () => {
    if (!wallet) return;
    console.log('Starting fresh');
    setIsStartingGemFarm(true);
    try {
      //initialize gem
      const gemFarm = await initGemFarm(connection, wallet);
      const gemBank = await initGemBank(connection, wallet);
      setGf(gemFarm);
      setGb(gemBank);
      setFarmerIdentity(new PublicKey(wallet.publicKey).toBase58());

      //reset stuff
      setFarmAcc(undefined);
      setFarmerAcc(undefined);
      setFarmerState('');
      setAvailableA(undefined);
      setAvailableB(undefined);

      //fetch farm and farmer details
      const farmAccResult = await fetchFarm(gemFarm, farmAddress);
      setFarmAcc(farmAccResult);
      await fetchFarmerDetails(gemFarm, gemBank);
    } catch (e) {
      console.log(e);
      console.log(`farm with PK ${farmAddress} not found :(`);
    }
    setIsStartingGemFarm(false);
  }, [connection, farmAddress, fetchFarmerDetails, wallet]);

  useEffect(() => {
    freshStart();
  }, [freshStart]);

  useEffect(() => {
    if (!isStartingGemFarm) {
      setNFTs();
    }
  }, [isStartingGemFarm, setNFTs]);

  const onRefreshNFTs = async () => {
    if (!gb) return;
    const results = await Promise.all([
      updateNFTsInUserWallet({}),
      getGemStakedInFarm(gb, farmerAcc.vault, connection)
    ]);

    // No need to setWalletNFTsInFarm cause updateNFTsInUserWallet sets AllNFTs and that triggers
    setStakedNFTsInFarm(convertArrayToObject(results[1], 'tokenId'));
    setSelectedVaultNFTs([]);
    setSelectedWalletNFTs([]);
  };

  const refreshWithLoadingIcon = async () => {
    setIsFetching(true);
    try {
      // wait 3 seconds before refreshing to give the blockchain some time
      await setTimeout(async () => {
        await onRefreshNFTs();
        setIsFetching(false);
      }, 3000);
    } catch (error) {
      console.log(error);
    }
  };

  // on nfts select and unselect fns
  const onWalletNFTSelect = (NFT: NFT) => {
    if (selectedWalletNFTs.length >= 5) return;
    setSelectedWalletNFTs([...selectedWalletNFTs, NFT]);
  };

  const onWalletNFTUnselect = (NFT: NFT) => {
    const newSelected = selectedWalletNFTs.filter(
      nft => !(nft.tokenId.toString() === NFT.tokenId.toString())
    );
    setSelectedWalletNFTs(newSelected);
  };

  const onStakedNFTSelect = (NFT: NFT) => {
    if (selectedVaultNFTs.length >= 5) return;
    setSelectedVaultNFTs([...selectedVaultNFTs, NFT]);
  };

  const onStakedNFTUnselect = (unselectedNFT: NFT) => {
    const newSelected = selectedVaultNFTs.filter(
      nft => !(nft.tokenId.toString() === unselectedNFT.tokenId.toString())
    );
    setSelectedVaultNFTs(newSelected);
  };

  //initialize farmer's account for new farmers
  const initializeFarmerAcc = async () => {
    if (!gb || !gf || !wallet?.publicKey) return;
    try {
      await gf.initFarmerWallet(new PublicKey(farmAddress!));
      await fetchFarmerDetails(gf, gb);
      toast('Farmer account initialized');
    } catch (error) {
      console.log(error);
      toast('Account initialization failed!');
    }
  };

  // Deposit selected Gems
  const depositSelectedGems = async () => {
    if (!gf || !gb || !wallet) return;
    for (let i = 0; i < selectedWalletNFTs.length; i++) {
      try {
        await onDepositGems(
          gf,
          gb,
          wallet?.publicKey,
          new PublicKey(farmerAcc?.vault),
          new PublicKey(bankAddress),
          new PublicKey(selectedWalletNFTs[i].mint),
          new PublicKey(selectedWalletNFTs[i].creators[0].address)
        );
        toast(`Deposited ${i + 1} NFTs `);
      } catch (error) {
        console.log(error);
        toast('Depositing NFT failed');
      }
    }
    await refreshWithLoadingIcon();
    setSelectedWalletNFTs([]);
  };

  // withdraw selected gems
  const withdrawSelectedGems = async () => {
    if (!gb) return;
    for (let i = 0; i < selectedVaultNFTs.length; i++) {
      try {
        await onWithdrawGems(
          gb,
          bankAddress,
          farmerAcc?.vault,
          new PublicKey(selectedVaultNFTs[i].mint)
        );
        toast(`Withdrawn ${i + 1} NFTs `);
      } catch (error) {
        console.log(error);
        toast('Withdrawing NFT failed');
      }
    }
    await refreshWithLoadingIcon();
    setSelectedVaultNFTs([]);
  };

  //start staking
  const startStaking = async () => {
    if (!gf) return;
    setSelectedVaultNFTs([]);
    setSelectedWalletNFTs([]);
    try {
      await gf.stakeWallet(new PublicKey(farmAddress!));
      await fetchFarmerDetails(gf, gb);
      toast('Vault Locked');
    } catch (error) {
      console.log(error);
      toast('Failed to lock vault');
    }
  };

  const endStaking = async () => {
    if (!gf) return;
    setSelectedVaultNFTs([]);
    setSelectedWalletNFTs([]);
    try {
      await gf.unstakeWallet(new PublicKey(farmAddress!));
      await fetchFarmerDetails(gf, gb);
      toast('Vault unlocked');
    } catch (error) {
      console.log(error);
      toast('Failed to unlock vault');
    }
  };

  // claim all rewards
  const claimRewards = async () => {
    if (!gf) return;
    try {
      await gf.claimWallet(
        new PublicKey(farmAddress!),
        new PublicKey(farmAcc.rewardA.rewardMint!),
        new PublicKey(farmAcc.rewardB.rewardMint!)
      );
      toast('Rewards claimed!');
    } catch (error) {
      console.log(error);
      toast('Failed to claim rewards');
    }
    await fetchFarmerDetails(gf, gb);
  };

  // Deposit more selected Gems to a locked vault
  const depositMoreSelectedGems = async () => {
    if (!gf || !gb || !wallet) return;
    for (let i = 0; i < selectedWalletNFTs.length; i++) {
      try {
        await addSingleGem(
          gf,
          new PublicKey(selectedWalletNFTs[i].mint),
          new PublicKey(selectedWalletNFTs[i].creators[0].address),
          new PublicKey(farmAddress),
          wallet?.publicKey
        );
        toast(`Deposited ${i + 1} more NFTs to locked vault`);
      } catch (error) {
        console.log(error);
        toast('Failed to deposit more NFTs');
      }
    }
    await setTimeout(async () => {
      await refreshWithLoadingIcon();
      setSelectedWalletNFTs([]);
    }, 2000);
  };

  return {
    depositMoreSelectedGems,
    claimRewards,
    endStaking,
    startStaking,
    withdrawSelectedGems,
    depositSelectedGems,
    initializeFarmerAcc,
    refreshWithLoadingIcon,
    onWalletNFTSelect,
    onWalletNFTUnselect,
    onStakedNFTSelect,
    onStakedNFTUnselect,
    isFetching,
    stakedNFTsInFarm,
    walletNFTsInFarm,
    farmerAcc,
    farmerState,
    selectedVaultNFTs,
    selectedWalletNFTs,
    farmerVaultLocked: vaultAcc?.locked
  };
};

export default useGemFarm;
