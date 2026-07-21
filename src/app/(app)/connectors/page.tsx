import { getRegisteredConnectors } from "@/domains/connectors/registry";
import { SpotifyConnectorCard } from "@/components/connectors/spotify-connector-card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ConnectorsPageProps {
  searchParams?: Promise<{
    from?: string;
  }>;
}

export default async function ConnectorsPage({ searchParams }: ConnectorsPageProps) {
  const connectors = getRegisteredConnectors();
  const params = await searchParams;
  const backHref = params?.from?.startsWith("/") ? params.from : "/modules/vocabulary-capture";

  return (
    <section className="kotoba-screen-enter fixed inset-0 z-50 overflow-y-auto bg-[#202124] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#f8f9fb]">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-semibold text-[#dfe2ea]">Connectors</h1>
          <div className="h-12 w-12" />
        </header>
        <div className="grid gap-3">
          {connectors.map((connector) =>
            connector.id === "spotify" ? (
              <SpotifyConnectorCard
                key={connector.id}
                name={connector.name}
                description={connector.description}
              />
            ) : (
              <article key={connector.id} className="rounded-[1.5rem] bg-[#17191d] p-4">
                <h2 className="font-semibold text-[#f8f9fb]">{connector.name}</h2>
                <p className="mt-1 text-sm text-[#bdc1c6]">{connector.description}</p>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
