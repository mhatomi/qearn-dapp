import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { loadingAtom } from "@/store/loading";
import { qearnStatsAtom } from "@/store/qearnStat";
import TVL from "./charts/TVL";
import BonusAmountAnalyzer from "./charts/BonusAmountAnalyzer";
import Richlist from "./charts/Richlist";
import TotalQearnStats from "./charts/TotalQearnStats";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const Dashboard: React.FC = () => {
  const [loading] = useAtom(loadingAtom);
  const [qearnStats] = useAtom(qearnStatsAtom);

  const hasData = qearnStats && Object.keys(qearnStats).length > 0;
  const isLoading = loading.isEpochDataLoading || loading.isInitialLoading;

  if (isLoading && !hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <SkeletonLoader variant="card" className="w-full md:w-80 h-64" />
          <SkeletonLoader variant="card" className="w-full md:w-80 h-64" />
          <SkeletonLoader variant="card" className="w-full md:w-80 h-64" />
        </div>
        <div className="w-full">
          <SkeletonLoader variant="table" lines={10} className="bg-white dark:bg-gray-800 rounded-lg p-6" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-wrap justify-center gap-4"
      >
        <TVL />
        <BonusAmountAnalyzer />
        <Richlist />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="w-full"
      >
        <TotalQearnStats />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
