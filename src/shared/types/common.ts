export type EntityId = string;
export type ISODateTime = string;

export type Confidence = {
  score: number;
  label?: "low" | "medium" | "high";
};

export type Provenance = {
  source: "user" | "ai" | "connector" | "system";
  sourceId?: string;
  connectorId?: string;
  confidence?: Confidence;
  capturedAt: ISODateTime;
};

