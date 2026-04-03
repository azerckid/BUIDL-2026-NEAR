"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupModal } from "@near-wallet-selector/modal-ui";
import "@near-wallet-selector/modal-ui/styles.css";
import { getWalletSelector } from "@/lib/near/wallet";

interface WalletContextValue {
  accountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// Phase 0: 자체 컨트랙트 미배포 상태이므로 testnet 표준 컨트랙트를 임시 사용
// Phase 2에서 실제 mydna 컨트랙트 배포 후 교체 필요
const CONTRACT_ID = "wrap.testnet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const isLoadingDoneRef = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    getWalletSelector().then(async (sel) => {
      const mod = setupModal(sel, { contractId: CONTRACT_ID });
      setSelector(sel);
      setModal(mod);

      // 1. observable 구독 먼저 — 향후 변화(신규 연결/해제)를 감지
      subscription = sel.store.observable.subscribe((state) => {
        const active = state.accounts.find((a) => a.active);
        setAccountId(active?.accountId ?? null);
        if (!isLoadingDoneRef.current) {
          isLoadingDoneRef.current = true;
          setIsLoading(false);
        }
      });

      // 2. store에서 현재 accountId 동기 읽기
      const storeState = sel.store.getState();
      const storeActive = storeState.accounts.find((a) => a.active);
      if (storeActive?.accountId) {
        setAccountId(storeActive.accountId);
      }

      // 3. selectedWalletId가 있으면 wallet.getAccounts()로 직접 복원
      //    (browser wallet은 store가 비어있어도 지갑 모듈이 localStorage에 계정을 갖고 있음)
      if (storeState.selectedWalletId && !storeActive) {
        try {
          const wallet = await sel.wallet();
          const accounts = await wallet.getAccounts();
          if (accounts.length > 0) {
            setAccountId(accounts[0].accountId);
          }
        } catch {
          // 복원 실패 시 미연결 상태 유지
        }
      }

      isLoadingDoneRef.current = true;
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const connect = useCallback(() => {
    modal?.show();
  }, [modal]);

  const disconnect = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
    setAccountId(null);
  }, [selector]);

  return (
    <WalletContext.Provider
      value={{
        accountId,
        isConnected: accountId !== null,
        isLoading,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
