import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { ethoneUpdateCheck, ethoneUpdateInstall } from "./api";
import { firstNote } from "./home";
import { errorText, t, tr } from "./i18n";
import { Button } from "./ui";

const CHECK_EVERY = 3_600_000;

export default function UpdateBanner() {
  const [update, setUpdate] = useState<{ version: string; notes: string | null } | null>(null);
  const [later, setLater] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = () => void ethoneUpdateCheck().then((next) => { if (next) setUpdate(next); }, () => undefined);
    check();
    const timer = setInterval(check, CHECK_EVERY);
    return () => clearInterval(timer);
  }, []);

  if (!update || later === update.version) return null;

  const install = () => {
    setError(null);
    setProgress(0);
    ethoneUpdateInstall(setProgress).catch((reason) => {
      setProgress(null);
      setError(errorText(reason));
    });
  };
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div className="update-banner" role="status">
      <span className="update-icon"><Download size={15} /></span>
      <span className="update-text">
        <b>{t("updateEthone", { version: update.version })}</b>
        <small className={error ? "update-error" : undefined} title={update.notes ?? undefined}>{error ?? (firstNote(update.notes) || t("updateEthoneText"))}</small>
      </span>
      {progress === null ? (
        <>
          <Button variant="primary" onClick={install}>{error ? t("retry") : t("action.update")}</Button>
          <button type="button" className="update-later" aria-label={tr("Plus tard", "Later")} title={tr("Plus tard", "Later")} onClick={() => setLater(update.version)}><X size={15} /></button>
        </>
      ) : (
        <span className="update-progress">
          <small>{percent >= 100 ? tr("Installation…", "Installing…") : t("progress.downloading", { percent: `${percent} %` })}</small>
          <i><em style={{ transform: `scaleX(${progress})` }} /></i>
        </span>
      )}
    </div>
  );
}
