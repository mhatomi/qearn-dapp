import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { tickInfoAtom } from "@/store/tickInfo";
import { qearnStatsAtom } from "@/store/qearnStat";
import { latestStatsAtom } from "@/store/latestStats";
import { balancesAtom } from "@/store/balances";
import { closeTimeAtom } from "@/store/closeTime";
import { userLockInfoAtom } from "@/store/userLockInfo";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { useFetchTickInfo } from "@/hooks/useFetchTickInfo";
import {
  fetchBalance,
  fetchLatestStats,
} from "@/services/rpc.service";
import {
  getBurnedAndBoostedStatsPerEpoch,
  getLockInfoPerEpoch,
  getUserLockInfo,
  getUserLockStatus,
} from "@/services/qearn.service";
import { getTimeToNewEpoch } from "@/utils";
import { QEARN_SC_ADDRESS, QEARN_START_EPOCH } from "@/data/contants";

const useDataFetcher = () => {
  const { refetch: refetchTickInfo } = useFetchTickInfo();
  const intervalRef = useRef<NodeJS.Timeout>();
  const [tickInfo, setTickInfo] = useAtom(tickInfoAtom);
  const epoch = useRef<number>(tickInfo?.epoch);
  const [, setQearnStats] = useAtom(qearnStatsAtom);
  const [, setLatestStats] = useAtom(latestStatsAtom);
  const [, setCloseTime] = useAtom(closeTimeAtom);
  const [, setUserLockInfo] = useAtom(userLockInfoAtom);
  const [balances, setBalance] = useAtom(balancesAtom);
  const { wallet } = useQubicConnect();

  // Fetch tick info every 2 seconds
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const { data } = await refetchTickInfo();
      if (data && data?.tick) {
        setTickInfo(data);
        epoch.current = data.epoch;
      }
    }, 4000);

    return () => clearInterval(intervalRef.current!);
  }, [refetchTickInfo, setTickInfo]);

  // Fetch latest stats once on mount
  useEffect(() => {
    fetchLatestStats().then(setLatestStats);
  }, [setLatestStats]);

  // Update close time every second
  useEffect(() => {
    setTimeout(() => {
      setCloseTime(getTimeToNewEpoch());
    }, 1000);
  }, [setCloseTime]);

  // Fetch epoch lock data with reduced frequency and better batching
  useEffect(() => {
    const fetchEpochData = async () => {
      try {
        console.log('[DataFetcher] Starting epoch data fetch');
        const {balance: totalLockAmount} = await fetchBalance(QEARN_SC_ADDRESS);
        
        // Reduce the number of epochs to fetch (from 53 to 20) to reduce load
        const epochsToFetch = Math.min(53, epoch.current - QEARN_START_EPOCH + 1);
        const startEpoch = Math.max(QEARN_START_EPOCH, epoch.current - epochsToFetch + 1);
        
        console.log(`[DataFetcher] Fetching ${epochsToFetch} epochs from ${startEpoch} to ${epoch.current}`);
        
        const lockInfoPromises = [];
        const burnedAndBoostedStatsPromises = [];
        
        for (let i = epoch.current; i >= startEpoch; i--) {
          lockInfoPromises.push(getLockInfoPerEpoch(i));
          burnedAndBoostedStatsPromises.push(getBurnedAndBoostedStatsPerEpoch(i));
        }

        // Process in smaller batches to avoid overwhelming the server
        const batchSize = 5;
        const lockInfoResults: any[] = [];
        const burnedAndBoostedStatsResults: any[] = [];
        
        for (let i = 0; i < lockInfoPromises.length; i += batchSize) {
          const lockBatch = lockInfoPromises.slice(i, i + batchSize);
          const burnedBatch = burnedAndBoostedStatsPromises.slice(i, i + batchSize);
          
          console.log(`[DataFetcher] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lockInfoPromises.length / batchSize)}`);
          
          const [lockBatchResults, burnedBatchResults] = await Promise.all([
            Promise.all(lockBatch),
            Promise.all(burnedBatch)
          ]);
          
          lockInfoResults.push(...lockBatchResults);
          burnedAndBoostedStatsResults.push(...burnedBatchResults);
          
          // Add a small delay between batches
          if (i + batchSize < lockInfoPromises.length) {
            console.log('[DataFetcher] Waiting 200ms before next batch');
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        console.log('[DataFetcher] Processing epoch data results');
        const newStats = lockInfoResults.reduce<
          Record<number, any> & {
            totalInitialLockAmount: number;
            totalInitialBonusAmount: number;
            totalLockAmount: number;
            totalBonusAmount: number;
            averageYieldPercentage: number;
          }
        >(
          (acc, epochLockInfo, index) => {
            if (epochLockInfo) {
              const currentEpoch = epoch.current - index;
              acc[currentEpoch] = { ...epochLockInfo, ...burnedAndBoostedStatsResults[index] };
              acc.totalInitialLockAmount += epochLockInfo.lockAmount;
              acc.totalInitialBonusAmount += epochLockInfo.bonusAmount;
              acc.totalBonusAmount += epochLockInfo.currentBonusAmount;
              if (index !== 0)
                acc.averageYieldPercentage =
                  ((acc.averageYieldPercentage || 0) * (index - 1) + epochLockInfo.yieldPercentage) / index;
            }
            return acc;
          },
          {
            totalInitialLockAmount: 0,
            totalInitialBonusAmount: 0,
            totalLockAmount: 0,
            totalBonusAmount: 0,
            averageYieldPercentage: 0,
          },
        );
        newStats.totalLockAmount = Number(totalLockAmount);
        setQearnStats((prev) => ({
          ...prev,
          ...newStats,
        }));
        console.log('[DataFetcher] Epoch data fetch completed successfully');
      } catch (error) {
        console.error('Error fetching epoch data:', error);
      }
    };

    // Only fetch epoch data when epoch changes, not on every tick
    if (epoch.current) {
      fetchEpochData();
    }
  }, [epoch.current, setQearnStats]);

  // Fetch wallet balance when wallet changes
  useEffect(() => {
    const setUserAccount = async () => {
      if (wallet) {
        const balance = await fetchBalance(wallet.publicKey);
        setBalance([balance]);
      }
    };
    setUserAccount();
  }, [wallet, setBalance]);

  // Fetch user lock data with reduced frequency
  useEffect(() => {
    if (!balances.length || !epoch.current) return;
    
    const fetchUserLockData = async () => {
      try {
        const lockEpochs = await getUserLockStatus(balances[0].id, epoch.current);
        
        // Process user lock data in batches
        const batchSize = 3;
        for (let i = 0; i < lockEpochs.length; i += batchSize) {
          const batch = lockEpochs.slice(i, i + batchSize);
          const batchPromises = batch.map(async (epoch) => {
            const lockedAmount = await getUserLockInfo(balances[0].id, epoch);
            return { epoch, lockedAmount };
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          setUserLockInfo((prev) => {
            const newState = { ...prev };
            batchResults.forEach(({ epoch, lockedAmount }) => {
              if (!newState[balances[0].id]) {
                newState[balances[0].id] = {};
              }
              newState[balances[0].id][epoch] = lockedAmount;
            });
            return newState;
          });
          
          // Add delay between batches
          if (i + batchSize < lockEpochs.length) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      } catch (error) {
        console.error('Error fetching user lock data:', error);
      }
    };
    
    // Only fetch user lock data every 30 seconds instead of on every balance/epoch change
    const timeoutId = setTimeout(fetchUserLockData, 30000);
    return () => clearTimeout(timeoutId);
  }, [balances, epoch.current, setUserLockInfo]);
};

export default useDataFetcher;
