export type ToastVariant = "success" | "error" | "info";
export type ToastMessage = {
  id: number;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

let seq = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

export function showToast(payload: Omit<ToastMessage, "id">) {
  seq = (seq + 1) % Number.MAX_SAFE_INTEGER;
  const msg: ToastMessage = { id: seq, ...payload };
  for (const listener of Array.from(listeners)) {
    try {
      listener(msg);
    } catch {
      // no-op
    }
  }
}

export function subscribeToast(
  listener: (msg: ToastMessage) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 互換用のシンプルなトーストヘルパー
export const toast = {
  success(description: string, title?: string) {
    showToast({ variant: "success", description, title });
  },
  error(description: string, title?: string) {
    showToast({ variant: "error", description, title });
  },
  info(description: string, title?: string) {
    showToast({ variant: "info", description, title });
  },
};
