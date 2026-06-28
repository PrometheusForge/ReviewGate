import { z } from "zod";

export type PermissionTier = "READ_ONLY" | "DRAFT" | "EXECUTE";

export interface Tool<Input, Output> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  permission: PermissionTier;
  handler: (input: Input) => Promise<Output>;
}

export function defineTool<Input, Output>(tool: Tool<Input, Output>) {
  return tool;
}