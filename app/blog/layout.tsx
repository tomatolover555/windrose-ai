import type { ReactNode } from "react";
import { SiteFrame } from "@/components/site-frame";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
