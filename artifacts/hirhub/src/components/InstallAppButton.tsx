import React from "react";
import { Download, Share, Plus } from "lucide-react";
import { usePwaInstall, isIOS, isStandalone } from "../lib/pwa-install";

const NAV_INACTIVE_TEXT = "var(--color-brand-muted)";
const NAV_HOVER_BG = "rgba(245,240,227,0.06)";
const HINT_BG = "rgba(245,240,227,0.08)";
const HINT_TEXT = "#F5F0E3";

const IosHint = () => (
  <div
    className="flex items-start gap-2 text-[12px] leading-snug rounded-lg p-3 mt-1"
    style={{ backgroundColor: HINT_BG, color: HINT_TEXT }}
  >
    <span>
      Tocca{" "}
      <Share className="inline w-[14px] h-[14px] align-text-bottom" /> Condividi
      e poi{" "}
      <Plus className="inline w-[14px] h-[14px] align-text-bottom" /> «Aggiungi a
      Home».
    </span>
  </div>
);

export const InstallAppButton = ({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) => {
  const { canInstall, promptInstall } = usePwaInstall();
  const [showIosHint, setShowIosHint] = React.useState(false);
  const ios = React.useMemo(() => isIOS(), []);
  const [standalone] = React.useState(() => isStandalone());

  if (standalone) return null;
  if (!canInstall && !ios) return null;

  const handleClick = () => {
    if (canInstall) {
      void promptInstall();
    } else if (ios) {
      setShowIosHint((value) => !value);
    }
  };

  if (variant === "mobile") {
    return (
      <div className="relative">
        <button
          onClick={handleClick}
          title="Installa l'app"
          aria-label="Installa l'app"
          className="p-2 rounded-full transition-colors"
          style={{ color: NAV_INACTIVE_TEXT }}
        >
          <Download className="w-5 h-5" />
        </button>
        {showIosHint && ios && !canInstall ? (
          <div className="absolute right-0 top-full mt-1 w-60 z-50">
            <IosHint />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium"
        style={{ backgroundColor: "transparent", color: NAV_INACTIVE_TEXT }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = NAV_HOVER_BG;
          (e.currentTarget as HTMLElement).style.color = "#F5F0E3";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLElement).style.color = NAV_INACTIVE_TEXT;
        }}
      >
        <Download className="w-[18px] h-[18px] shrink-0" />
        <span>Installa l'app</span>
      </button>
      {showIosHint && ios && !canInstall ? <IosHint /> : null}
    </div>
  );
};
