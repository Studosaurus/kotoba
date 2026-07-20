import Link from "next/link";
import { getRegisteredModules } from "@/domains/modules/registry";

export default function ModulesPage() {
  const modules = getRegisteredModules();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-medium text-matcha-700">Modules</p>
        <h1 className="text-2xl font-semibold text-ink-950">First-party learning modules</h1>
      </div>
      <div className="grid gap-3">
        {modules.map((module) => (
          <article key={module.id} className="rounded-lg border border-paper-100 bg-white p-4">
            <h2 className="font-semibold text-ink-950">{module.name}</h2>
            <p className="mt-1 text-sm text-ink-600">{module.description}</p>
            {module.routes[0] ? (
              <Link
                href={module.routes[0].href}
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-paper-50 px-3 text-sm font-semibold text-matcha-700 outline-none ring-1 ring-paper-100 focus:ring-4 focus:ring-matcha-500/15"
              >
                Open {module.name}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
