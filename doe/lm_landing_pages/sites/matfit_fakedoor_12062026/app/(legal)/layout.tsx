import RootShell from "@/components/RootShell";
import { rootMetadata } from "@/lib/root-metadata";

/**
 * Root layout for the German-only legal pages (impressum, datenschutz). Their
 * content is kept in German for legal validity, so they render <html lang="de">.
 * The English marketing pages have their own root layout — see
 * app/(marketing)/layout.tsx.
 */
export const metadata = rootMetadata;

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootShell lang="de">{children}</RootShell>;
}
