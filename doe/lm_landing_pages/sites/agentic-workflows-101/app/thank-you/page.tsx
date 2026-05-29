import { site } from "@/lib/config";

type SearchParams = Promise<{ to?: string }>;

function safeDriveUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(decodeURIComponent(raw));
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith("drive.google.com") && !url.hostname.endsWith("docs.google.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function ThankYouPage({ searchParams }: { searchParams: SearchParams }) {
  const { to } = await searchParams;
  const driveUrl = safeDriveUrl(to);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20">
      {driveUrl ? (
        <meta httpEquiv="refresh" content={`2;url=${driveUrl}`} />
      ) : null}

      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          You&apos;re all set.
        </h1>
        <p className="opacity-80">
          We&apos;ve also sent the download link to your inbox so you have it forever.
        </p>
        {driveUrl ? (
          <p className="opacity-80">
            Your download is starting in a moment.{" "}
            <a href={driveUrl} className="underline font-medium">
              Click here if it doesn&apos;t open.
            </a>
          </p>
        ) : (
          <p className="opacity-80">Check your email for the download link.</p>
        )}
        <p className="text-xs opacity-50 pt-8" data-signature={site.signature}>
          {site.signature}
        </p>
      </div>
    </main>
  );
}
