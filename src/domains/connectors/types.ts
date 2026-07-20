export type ConnectorId = "spotify";
export type ConnectorKind = "media" | "study" | "reading" | "grammar";

export interface ConnectorDefinition {
  id: ConnectorId;
  kind: ConnectorKind;
  name: string;
  description: string;
  status: "planned" | "available" | "disabled";
}

export interface ExternalReference {
  connectorId: ConnectorId;
  externalId: string;
  externalUrl?: string;
}

