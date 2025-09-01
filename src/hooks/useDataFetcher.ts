import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { tickInfoAtom } from "@/store/tickInfo";
import { qearnStatsAtom } from "@/store/qearnStat";
import { latestStatsAtom } from "@/store/latestStats";
import { balancesAtom } from "@/store/balances";
import { closeTimeAtom } from "@/store/closeTime";
import { userLockInfoAtom } from "@/store/userLockInfo";
import { loadingAtom } from "@/store/loading";
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
  const [, setLoading] = useAtom(loadingAtom);
  const { wallet } = useQubicConnect();
  const hasInitialLoad = useRef(false);

  // Fetch tick info every 2 seconds
  useEffect(() => {
    const fetchTickData = async () => {
      setLoading(prev => ({ ...prev, isTickInfoLoading: true }));
      try {
        const { data } = await refetchTickInfo();
        if (data && data?.tick) {
          setTickInfo(data);
          epoch.current = data.epoch;
        }
      } catch (error) {
        console.error('Error fetching tick info:', error);
        setLoading(prev => ({ 
          ...prev, 
          fetchErrors: [...prev.fetchErrors, {
            message: 'Failed to fetch tick info',
            timestamp: Date.now(),
            context: 'tickInfo'
          }] 
        }));
      } finally {
        setLoading(prev => ({ ...prev, isTickInfoLoading: false }));
      }
    };

    // Initial fetch
    fetchTickData();

    intervalRef.current = setInterval(fetchTickData, 4000);

    return () => clearInterval(intervalRef.current!);
  }, [refetchTickInfo, setTickInfo, setLoading]);

  // Fetch latest stats once on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await fetchLatestStats();
        setLatestStats(stats);
      } catch (error) {
        console.error('Error fetching latest stats:', error);
        setLoading(prev => ({ 
          ...prev, 
          fetchErrors: [...prev.fetchErrors, {
            message: 'Failed to fetch latest stats',
            timestamp: Date.now(),
            context: 'latestStats'
          }] 
        }));
      }
    };
    fetchStats();
  }, [setLatestStats, setLoading]);

  // Update close time every second
  useEffect(() => {
    setTimeout(() => {
      setCloseTime(getTimeToNewEpoch());
    }, 1000);
  }, [setCloseTime]);

  // Fetch epoch lock data with reduced frequency and better batching
  useEffect(() => {
    const fetchEpochData = async () => {
      setLoading(prev => ({ 
        ...prev, 
        isEpochDataLoading: true,
        isInitialLoading: !hasInitialLoad.current,
        isDataFetching: true
      }));
      
      try {
        console.log('[DataFetcher] Starting epoch data fetch');
        const {balance: totalLockAmount} = await fetchBalance(QEARN_SC_ADDRESS);
        
        // Reduce the number of epochs to fetch (from 53 to 20) to reduce load
        const epochsToFetch = Math.min(53, epoch.current - QEARN_START_EPOCH + 1);
        const startEpoch = Math.max(QEARN_START_EPOCH, epoch.current - epochsToFetch + 1);
        
        console.log(`[DataFetcher] Fetching ${epochsToFetch} epochs from ${startEpoch} to ${epoch.current}`);
        
        setLoading(prev => ({ 
          ...prev, 
          loadingProgress: {
            current: 0,
            total: epochsToFetch * 2,
            message: "Fetching epoch data...",
            failed: 0,
            succeeded: 0
          }
        }));
        
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
        let processedCount = 0;
        let failedCount = 0;
        let succeededCount = 0;
        
        for (let i = 0; i < lockInfoPromises.length; i += batchSize) {
          const lockBatch = lockInfoPromises.slice(i, i + batchSize);
          const burnedBatch = burnedAndBoostedStatsPromises.slice(i, i + batchSize);
          
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(lockInfoPromises.length / batchSize);
          
          console.log(`[DataFetcher] Processing batch ${batchNumber}/${totalBatches}`);
          
          setLoading(prev => ({ 
            ...prev, 
            loadingProgress: {
              ...prev.loadingProgress,
              current: processedCount,
              message: `Processing batch ${batchNumber}/${totalBatches}...`,
              failed: failedCount,
              succeeded: succeededCount
            }
          }));
          
          try {
            const [lockBatchResults, burnedBatchResults] = await Promise.all([
              Promise.allSettled(lockBatch),
              Promise.allSettled(burnedBatch)
            ]);
            
            // Process lock info results
            lockBatchResults.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                lockInfoResults.push(result.value);
                succeededCount++;
              } else {
                lockInfoResults.push(null);
                failedCount++;
                console.error(`Failed to fetch lock info for epoch ${epoch.current - i - index}:`, result.reason);
                setLoading(prev => ({ 
                  ...prev, 
                  fetchErrors: [...prev.fetchErrors, {
                    message: `Failed to fetch lock info for epoch ${epoch.current - i - index}`,
                    timestamp: Date.now(),
                    context: 'lockInfo'
                  }]
                }));
              }
            });
            
            // Process burned and boosted results
            burnedBatchResults.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                burnedAndBoostedStatsResults.push(result.value);
                succeededCount++;
              } else {
                burnedAndBoostedStatsResults.push(null);
                failedCount++;
                console.error(`Failed to fetch burned/boosted stats for epoch ${epoch.current - i - index}:`, result.reason);
                setLoading(prev => ({ 
                  ...prev, 
                  fetchErrors: [...prev.fetchErrors, {
                    message: `Failed to fetch burned/boosted stats for epoch ${epoch.current - i - index}`,
                    timestamp: Date.now(),
                    context: 'burnedBoosted'
                  }]
                }));
              }
            });
            
          } catch (error) {
            console.error(`Batch ${batchNumber} failed completely:`, error);
            failedCount += lockBatch.length * 2;
            setLoading(prev => ({ 
              ...prev, 
              fetchErrors: [...prev.fetchErrors, {
                message: `Batch ${batchNumber} failed completely`,
                timestamp: Date.now(),
                context: 'batch'
              }]
            }));
          }
          
          processedCount += lockBatch.length * 2;
          
          // Add a small delay between batches
          if (i + batchSize < lockInfoPromises.length) {
            console.log('[DataFetcher] Waiting 200ms before next batch');
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        setLoading(prev => ({ 
          ...prev, 
          loadingProgress: {
            ...prev.loadingProgress,
            current: processedCount,
            message: failedCount > 0 
              ? "Processing results with some connection issues..." 
              : "Processing results...",
            failed: failedCount,
            succeeded: succeededCount
          }
        }));

        console.log(`[DataFetcher] Processing epoch data results - ${succeededCount} succeeded, ${failedCount} failed`);
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
            if (epochLockInfo && burnedAndBoostedStatsResults[index]) {
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
        hasInitialLoad.current = true;
        
        // Show error notification if there were failures but still successful data
        if (failedCount > 0 && succeededCount > 0) {
          console.warn(`[DataFetcher] Completed with partial failures: ${succeededCount} succeeded, ${failedCount} failed`);
          setLoading(prev => ({ 
            ...prev, 
            shouldShowErrors: true
          }));
        } else if (failedCount > 0) {
          console.error(`[DataFetcher] All requests failed: ${failedCount} failed`);
        } else {
          console.log('[DataFetcher] Epoch data fetch completed successfully');
        }
        
      } catch (error) {
        console.error('Error in fetchEpochData:', error);
        setLoading(prev => ({ 
          ...prev, 
          fetchErrors: [...prev.fetchErrors, {
            message: 'Critical error in data fetching process',
            timestamp: Date.now(),
            context: 'fetchEpochData'
          }],
          shouldShowErrors: true
        }));
      } finally {
        // Only close loading if we have either succeeded completely or failed completely
        // Keep loading open if we have partial data to show progress
        setLoading(prev => ({ 
          ...prev, 
          isEpochDataLoading: false,
          isInitialLoading: false,
          isDataFetching: false,
          loadingProgress: {
            current: prev.loadingProgress.total,
            total: prev.loadingProgress.total,
            message: prev.loadingProgress.failed > 0 
              ? "Completed with some connection issues"
              : "Loading completed successfully",
            failed: prev.loadingProgress.failed,
            succeeded: prev.loadingProgress.succeeded
          }
        }));
        
        // Clear the loading progress after a brief delay to show final status
        setTimeout(() => {
          setLoading(prev => ({ 
            ...prev, 
            loadingProgress: {
              current: 0,
              total: 0,
              message: "",
              failed: 0,
              succeeded: 0
            }
          }));
        }, 2000);
      }
    };

    // Only fetch epoch data when epoch changes, not on every tick
    if (epoch.current) {
      fetchEpochData();
    }
  }, [epoch.current, setQearnStats, setLoading]);

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
      setLoading(prev => ({ ...prev, isUserDataLoading: true }));
      
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
        setLoading(prev => ({ 
          ...prev, 
          fetchErrors: [...prev.fetchErrors, {
            message: 'Failed to fetch user lock data',
            timestamp: Date.now(),
            context: 'userLockData'
          }] 
        }));
      } finally {
        setLoading(prev => ({ ...prev, isUserDataLoading: false }));
      }
    };
    
    // Only fetch user lock data every 30 seconds instead of on every balance/epoch change
    const timeoutId = setTimeout(fetchUserLockData, 30000);
    return () => clearTimeout(timeoutId);
  }, [balances, epoch.current, setUserLockInfo, setLoading]);
};

export default useDataFetcher;
