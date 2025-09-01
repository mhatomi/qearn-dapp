import { atom } from "jotai";

export interface LoadingState {
  isInitialLoading: boolean;
  isDataFetching: boolean;
  isEpochDataLoading: boolean;
  isUserDataLoading: boolean;
  isTickInfoLoading: boolean;
  loadingProgress: {
    current: number;
    total: number;
    message: string;
    failed: number;
    succeeded: number;
  };
  fetchErrors: Array<{
    message: string;
    timestamp: number;
    context?: string;
  }>;
  shouldShowErrors: boolean;
}

export const loadingAtom = atom<LoadingState>({
  isInitialLoading: true,
  isDataFetching: false,
  isEpochDataLoading: false,
  isUserDataLoading: false,
  isTickInfoLoading: false,
  loadingProgress: {
    current: 0,
    total: 0,
    message: "",
    failed: 0,
    succeeded: 0,
  },
  fetchErrors: [],
  shouldShowErrors: false,
});
