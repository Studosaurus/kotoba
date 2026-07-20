import type { ConnectorDefinition } from "@/domains/connectors/types";

export const spotifyConnector: ConnectorDefinition = {
  id: "spotify",
  kind: "media",
  name: "Spotify",
  description: "First implementation of the generic Media connector contract.",
  status: "available",
};
