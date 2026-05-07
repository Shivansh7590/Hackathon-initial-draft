import { useEffect } from "react";
import { io } from "socket.io-client";
import { getSocketUrl } from "../config/backendUrl";

let socketSingleton = null;

function getSocket() {
  const url = getSocketUrl();
  if (!url) {
    return null;
  }
  if (!socketSingleton) {
    socketSingleton = io(url, { autoConnect: true });
  }
  return socketSingleton;
}

export function useMarketSocket(symbol, onUpdate) {
  useEffect(() => {
    if (!symbol) {
      return undefined;
    }
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }
    const sym = String(symbol).trim().toUpperCase();
    socket.emit("subscribe-symbol", sym);
    const handler = (payload) => {
      if (String(payload?.symbol || "").toUpperCase() === sym) {
        onUpdate(payload);
      }
    };
    socket.on("quote-update", handler);
    return () => {
      socket.emit("unsubscribe-symbol", sym);
      socket.off("quote-update", handler);
    };
  }, [symbol, onUpdate]);
}
