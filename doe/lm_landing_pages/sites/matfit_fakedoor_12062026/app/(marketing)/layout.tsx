import RootShell from "@/components/RootShell";
import { rootMetadata } from "@/lib/root-metadata";

/**
 * Root layout for the English marketing pages (home, thank-you). Renders
 * <html lang="en">. Legal pages have their own German root layout — see
 * app/(legal)/layout.tsx.
 */
export const metadata = rootMetadata;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootShell lang="en">{children}</RootShell>;
}
