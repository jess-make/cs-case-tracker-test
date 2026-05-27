import Image from "next/image";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/grevia-logo.png";

interface BrandLogoProps {
  /** 圖示高度：sm 32px、md 36px、lg 40px */
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const sizeClass = {
  sm: "h-8",
  md: "h-9",
  lg: "h-10",
} as const;

/** Grevia 品牌 Logo，保留原比例 */
export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Grevia"
      width={160}
      height={48}
      priority={priority}
      className={cn("w-auto shrink-0 object-contain object-left", sizeClass[size], className)}
    />
  );
}

interface BrandHeaderProps {
  /** 是否顯示副標（手機 Header 可隱藏以節省空間） */
  showSubtitle?: boolean;
  logoSize?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

/** Sidebar / Header 品牌區塊：Logo + 系統名稱 */
export function BrandHeader({
  showSubtitle = true,
  logoSize = "md",
  className,
  priority = false,
}: BrandHeaderProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandLogo size={logoSize} priority={priority} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-slate-900">
          {APP_NAME}
        </p>
        {showSubtitle && (
          <p className="truncate text-xs text-slate-500">{APP_SUBTITLE}</p>
        )}
      </div>
    </div>
  );
}
