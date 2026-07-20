import type { ConnectorDefinition } from "./types";
import { spotifyConnector } from "@/connectors/spotify/manifest";

// Connectors adapt vendor APIs into internal contracts; modules consume only normalized records.
const registeredConnectors: ConnectorDefinition[] = [spotifyConnector];

export function getRegisteredConnectors() {
  return registeredConnectors;
}

export function getConnectorById(connectorId: ConnectorDefinition["id"]) {
  return registeredConnectors.find((connector) => connector.id === connectorId) ?? null;
}

