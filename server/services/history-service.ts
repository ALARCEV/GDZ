import { UserRole } from "@prisma/client";

import { db } from "@/server/db/client";

export type HistoryFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  month?: string;
  subject?: string;
  topic?: string;
  grade?: number;
  role?: string;
};

export function groupChats(
  chats: Array<{
    id: string;
    title: string | null;
    grade: number | null;
    subject: string | null;
    topic: string | null;
    updatedAt: Date;
  }>
) {
  const grouped = new Map<
    string,
    {
      grade: number | null;
      subjects: Map<
        string,
        {
          subject: string | null;
          topics: Map<
            string,
            {
              topic: string | null;
              chats: Array<{
                id: string;
                title: string | null;
                updatedAt: string;
              }>;
            }
          >;
        }
      >;
    }
  >();

  for (const chat of chats) {
    const gradeKey = String(chat.grade ?? "unknown");
    const subjectKey = chat.subject ?? "unspecified";
    const topicKey = chat.topic ?? "unspecified";

    if (!grouped.has(gradeKey)) {
      grouped.set(gradeKey, {
        grade: chat.grade,
        subjects: new Map()
      });
    }

    const gradeGroup = grouped.get(gradeKey)!;

    if (!gradeGroup.subjects.has(subjectKey)) {
      gradeGroup.subjects.set(subjectKey, {
        subject: chat.subject,
        topics: new Map()
      });
    }

    const subjectGroup = gradeGroup.subjects.get(subjectKey)!;

    if (!subjectGroup.topics.has(topicKey)) {
      subjectGroup.topics.set(topicKey, {
        topic: chat.topic,
        chats: []
      });
    }

    subjectGroup.topics.get(topicKey)!.chats.push({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt.toISOString()
    });
  }

  return Array.from(grouped.values()).map((gradeGroup) => ({
    grade: gradeGroup.grade,
    subjects: Array.from(gradeGroup.subjects.values()).map((subjectGroup) => ({
      subject: subjectGroup.subject,
      topics: Array.from(subjectGroup.topics.values())
    }))
  }));
}

export class HistoryService {
  async listChats(userId: string, filters: HistoryFilters) {
    const monthRange =
      filters.month != null
        ? (() => {
            const start = new Date(`${filters.month}-01T00:00:00.000Z`);
            const end = new Date(start);

            end.setUTCMonth(end.getUTCMonth() + 1);

            return {
              gte: start,
              lt: end
            };
          })()
        : undefined;
    const updatedAt =
      filters.dateFrom || filters.dateTo || monthRange
        ? {
            ...(monthRange ?? {}),
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {})
          }
        : undefined;

    if (filters.role && filters.role !== "parent" && filters.role !== "student") {
      return {
        items: [],
        groups: []
      };
    }

    const chats = await db.chat.findMany({
      where: {
        ownerUserId: userId,
        ...(updatedAt ? { updatedAt } : {}),
        ...(filters.grade != null ? { grade: filters.grade } : {}),
        ...(filters.subject ? { subject: filters.subject } : {}),
        ...(filters.topic ? { topic: filters.topic } : {})
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return {
      items: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        grade: chat.grade,
        subject: chat.subject,
        topic: chat.topic,
        updated_at: chat.updatedAt.toISOString()
      })),
      groups: groupChats(chats)
    };
  }

  async getFilterFacets(userId: string, role?: UserRole) {
    const chats = await db.chat.findMany({
      where: {
        ownerUserId: userId
      },
      select: {
        grade: true,
        subject: true,
        topic: true,
        updatedAt: true
      }
    });

    const months = new Set<string>();

    for (const chat of chats) {
      months.add(chat.updatedAt.toISOString().slice(0, 7));
    }

    return {
      grades: [...new Set(chats.map((chat) => chat.grade).filter((value): value is number => value != null))].sort(
        (left, right) => left - right
      ),
      subjects: [...new Set(chats.map((chat) => chat.subject).filter((value): value is string => Boolean(value)))].sort(),
      topics: [...new Set(chats.map((chat) => chat.topic).filter((value): value is string => Boolean(value)))].sort(),
      months: [...months].sort().reverse(),
      roles: [role?.toLowerCase() ?? "parent"]
    };
  }
}

export const historyService = new HistoryService();
