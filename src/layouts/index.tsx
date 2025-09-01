import { Outlet } from "react-router-dom";
import Header from "@/layouts/Header";
import Footer from "@/layouts/Footer";
import logo from "@/assets/qearn.svg";
import InfoBanner from "@/components/InfoBanner";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import ErrorNotification from "@/components/ui/ErrorNotification";
import useDataFetcher from "@/hooks/useDataFetcher";
import useTxMonitor from "@/hooks/useTxMonitor";
import { useEffect, useContext } from "react";
import { useAtom } from "jotai";
import { loadingAtom } from "@/store/loading";
import { MetaMaskContext } from "@/components/connect/MetamaskContext";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";

const Layout: React.FC = () => {
  const [state] = useContext(MetaMaskContext);
  const { mmSnapConnect, connect } = useQubicConnect();
  const [loading] = useAtom(loadingAtom);
  useDataFetcher();
  useTxMonitor();

  useEffect(() => {
    const storedWallet = localStorage.getItem("wallet");
    if (storedWallet) {
      connect(JSON.parse(storedWallet));
    } else if (state.installedSnap) {
      mmSnapConnect();
    }
  }, [state]);

  const shouldShowLoading = loading.isInitialLoading || (loading.isDataFetching && loading.loadingProgress.total > 0);

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-background text-foreground">
      <Header logo={logo} />
      <div className="flex flex-1 flex-col pt-[80px]">
        <div className="flex flex-1 flex-col p-4">
          <Outlet />
        </div>
      </div>
      <div>
        <InfoBanner />
        <Footer />
      </div>
      
      <LoadingOverlay
        isVisible={shouldShowLoading}
        progress={loading.loadingProgress.total > 0 ? loading.loadingProgress : undefined}
        title="loading.Loading Qearn Data"
        description="loading.Fetching the latest blockchain data and statistics..."
      />
      
      <ErrorNotification />
    </div>
  );
};

export default Layout;
