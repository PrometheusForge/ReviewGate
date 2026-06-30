import { z } from "zod";
import * as fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OrderSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  orderStatus: z.enum(["awaiting_shipment", "shipped", "cancelled"]),
  customer: z.object({
    email: z.string(),
    company: z.string().nullable()
  }),
  items: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    quantity: z.number()
  }))
});

export async function draftSampleKitOrder(email: string, company: string, sku: string) {
  const draft = {
    action: "create_order",
    customer: { email, company },
    items: [{ sku, quantity: 1 }],
    status: "ready_for_approval"
  };
  
  return draft;
}
