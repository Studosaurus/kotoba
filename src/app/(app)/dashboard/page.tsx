import { getRegisteredConnectors } from "@/domains/connectors/registry";
import { getRegisteredModules } from "@/domains/modules/registry";

export default function DashboardPage() {
  const modules = getRegisteredModules();
  const connectors = getRegisteredConnectors();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-matcha-700">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Kotoba</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-600">
          The platform shell is ready. Domain boundaries, registries, and service abstractions are
          in place; feature behavior will be added in future slices.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-paper-100 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-ink-950">Modules</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {modules.map((module) => (
              <li key={module.id}>{module.name}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-paper-100 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-ink-950">Connectors</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {connectors.map((connector) => (
              <li key={connector.id}>{connector.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

