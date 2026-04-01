import { describe, expect, it } from "vitest";

import { groupChats } from "../server/services/history-service";

describe("history-service", () => {
  it("groups chats by class, subject, and topic", () => {
    const groups = groupChats([
      {
        id: "chat-1",
        title: "Fractions basics",
        grade: 4,
        subject: "math",
        topic: "fractions",
        updatedAt: new Date("2026-04-01T10:00:00.000Z")
      },
      {
        id: "chat-2",
        title: "Common denominators",
        grade: 4,
        subject: "math",
        topic: "fractions",
        updatedAt: new Date("2026-04-01T11:00:00.000Z")
      },
      {
        id: "chat-3",
        title: "Nouns",
        grade: 4,
        subject: "russian",
        topic: "parts-of-speech",
        updatedAt: new Date("2026-04-02T10:00:00.000Z")
      }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.grade).toBe(4);
    expect(groups[0]?.subjects).toHaveLength(2);
    expect(groups[0]?.subjects[0]?.topics[0]?.chats).toHaveLength(2);
  });
});
