import { z } from "zod";
import * as fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const MeetingNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.object({ name: z.string(), email: z.string() }),
  summary: z.string(),
  transcript: z.array(z.object({
    speaker: z.object({ source: z.enum(["microphone", "speaker"]) }),
    text: z.string(),
  })),
});
export type MeetingNote = z.infer<typeof MeetingNoteSchema>;

export class MockGranolaProvider {
  async getNote(id: string): Promise<MeetingNote> {
    const filePath = path.join(__dirname, "../fixtures/granola-notes.json");
    
    try {
      const rawData = await fs.readFile(filePath, "utf-8");
      const all = JSON.parse(rawData);
      
      const note = all.notes.find((n: { id: string }) => n.id === id);
      if (!note) throw new Error(`Note with ID ${id} not found.`);
      
      return MeetingNoteSchema.parse(note);
    } catch (error: any) {
      console.error(`[ReviewGate Debug] Failed to read fixture at: ${filePath}`);
      throw new Error(`Failed to load mock data: ${error.message}`);
    }
  }
}