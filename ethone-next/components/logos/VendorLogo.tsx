import NetflixLogo from "./NetflixLogo";
import AdobeLogo from "./AdobeLogo";
import AppleLogo from "./AppleLogo";
import FigmaLogo from "./FigmaLogo";
import SpotifyLogo from "./SpotifyLogo";
import NotionLogo from "./NotionLogo";

export type Vendor = "netflix" | "adobe" | "apple" | "figma" | "spotify" | "notion" | string;

export default function VendorLogo({
  vendor,
  className = "h-4 w-4",
}: {
  vendor?: Vendor;
  className?: string;
}) {
  switch (vendor?.toLowerCase()) {
    case "netflix":
      return <NetflixLogo className={className} />;
    case "adobe":
      return <AdobeLogo className={className} />;
    case "apple":
      return <AppleLogo className={className} />;
    case "figma":
      return <FigmaLogo className={className} />;
    case "spotify":
      return <SpotifyLogo className={className} />;
    case "notion":
      return <NotionLogo className={className} />;
    default:
      return <span className={className} />;
  }
}
