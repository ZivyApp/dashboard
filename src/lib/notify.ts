import { toast } from "sonner";

type SuccessOpts = { description?: string; duration?: number };
type ErrorOpts = { description?: string; retry?: () => void };

export const notify = {
  success(message: string, opts: SuccessOpts = {}): void {
    toast.success(message, opts);
  },
  error(message: string, opts: ErrorOpts = {}): void {
    const { retry, ...rest } = opts;
    const payload: Record<string, unknown> = { ...rest };
    if (retry) {
      payload.action = { label: "Tentar novamente", onClick: retry };
    }
    toast.error(message, payload);
  },
};
