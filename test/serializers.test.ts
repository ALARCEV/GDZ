import { describe, expect, it } from "vitest";

import {
  serializeConversationDetail,
  serializeConversationSummary
} from "../server/http/serializers";

describe("http serializers", () => {
  it("serializes conversation summary with stable API field names", () => {
    const updatedAt = new Date("2026-04-01T10:00:00.000Z");

    expect(
      serializeConversationSummary({
        id: "chat_1",
        title: "Fractions",
        grade: 4,
        subject: "math",
        topic: "fractions",
        updatedAt,
        archivedAt: null
      })
    ).toEqual({
      id: "chat_1",
      title: "Fractions",
      grade: 4,
      subject: "math",
      topic: "fractions",
      updated_at: updatedAt.toISOString(),
      archived_at: null
    });
  });

  it("serializes nested messages and attachments", () => {
    const createdAt = new Date("2026-04-01T10:00:00.000Z");

    expect(
      serializeConversationDetail({
        id: "chat_1",
        title: "Fractions",
        grade: 4,
        subject: "math",
        topic: "fractions",
        updatedAt: createdAt,
        messages: [
          {
            id: "msg_1",
            role: "ASSISTANT",
            messageType: "text",
            contentText: "reply",
            createdAt,
            attachments: [
              {
                id: "att_1",
                kind: "IMAGE",
                fileUrl: "/uploads/1",
                mimeType: "image/jpeg"
              }
            ]
          }
        ]
      })
    ).toMatchObject({
      id: "chat_1",
      updated_at: createdAt.toISOString(),
      messages: [
        {
          id: "msg_1",
          role: "assistant",
          message_type: "text",
          content_text: "reply",
          created_at: createdAt.toISOString(),
          attachments: [
            {
              id: "att_1",
              kind: "image",
              file_url: "/uploads/1",
              mime_type: "image/jpeg"
            }
          ]
        }
      ]
    });
  });
});
