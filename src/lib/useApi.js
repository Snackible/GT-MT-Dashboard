import { useEffect, useState } from "react";
import { apiGet } from "./api";

// Fetches once the first time `enabled` becomes true, then keeps the result.
export function useLazyApi(action, enabled) {
  const [state, setState] = useState({ data: null, loading: false, started: false });
  useEffect(() => {
    if (!enabled || state.started) return;
    setState({ data: null, loading: true, started: true });
    apiGet(action)
      .then((data) => setState({ data, loading: false, started: true }))
      .catch((err) => {
        console.error(`${action} load failed:`, err);
        setState({ data: null, loading: false, started: true });
      });
  }, [enabled, action, state.started]);
  return state;
}
