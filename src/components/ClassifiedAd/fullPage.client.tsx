import { useCallback } from "react";

import classes from "./fullPage.module.css";

type Props = {
  label: string;
  className?: string;
  fallbackUrl?: string;
};

const FullPageClient = ({ label, className, fallbackUrl }: Props) => {
  const handleBack = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    if (fallbackUrl) {
      window.location.href = fallbackUrl;
      return;
    }

    if (typeof document !== "undefined" && document.referrer) {
      window.location.href = document.referrer;
    }
  }, [fallbackUrl]);

  return (
    <button
      type="button"
      onClick={handleBack}
      className={[classes.backButton, className].filter(Boolean).join(" ")}
    >
      {label}
    </button>
  );
};

export default FullPageClient;
