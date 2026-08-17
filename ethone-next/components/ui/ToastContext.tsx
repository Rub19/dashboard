// Re-export from the canonical context location for backwards compatibility.
// New code should prefer `@/context/ToastContext`.
export {
  useToast,
  ToastProvider,
  type ToastInput,
  type ToastType,
} from "@/context/ToastContext";
