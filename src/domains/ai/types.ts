import type { Confidence, Provenance } from "@/shared/types/common";

export interface AIServiceRequest<TInput> {
  input: TInput;
  learnerContext?: unknown;
}

export interface AIServiceResponse<TOutput> {
  output: TOutput;
  confidence?: Confidence;
  provenance: Provenance;
}

export interface AIService {
  analyze<TInput, TOutput>(request: AIServiceRequest<TInput>): Promise<AIServiceResponse<TOutput>>;
}

