import { toast } from "sonner";

type SuccessOpts = { description?: string; duration?: number };

export const notify = {
  success(message: string, opts: SuccessOpts = {}): void {
    toast.success(message, opts);
  },
};
