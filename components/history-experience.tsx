"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ConversationsListResponsePayload,
  type HistoryFiltersPayload
} from "@/lib/api/types";
import { getErrorMessage, readJsonOrThrow } from "@/lib/client/api";
import { createUserAuthHeaders, readStoredUserId } from "@/lib/client/session";

type HistoryItem = {
  id: string;
  title: string;
  grade: number;
  subject: string;
  topic: string;
  updated_at: string;
};

type HistoryGroup = {
  grade: number;
  subjects: Array<{
    subject: string;
    topics: Array<{
      topic: string;
      chats: Array<{
        id: string;
        title: string;
        updatedAt: string;
      }>;
    }>;
  }>;
};

const demoItems: HistoryItem[] = [
  {
    id: "demo-1",
    title: "Как объяснить дроби на пицце",
    grade: 4,
    subject: "Математика",
    topic: "Дроби",
    updated_at: "2026-03-30T10:00:00.000Z"
  },
  {
    id: "demo-2",
    title: "Подсказка для родителя по задаче на движение",
    grade: 5,
    subject: "Математика",
    topic: "Задачи на движение",
    updated_at: "2026-03-28T14:00:00.000Z"
  },
  {
    id: "demo-3",
    title: "Части речи простыми словами",
    grade: 4,
    subject: "Русский язык",
    topic: "Части речи",
    updated_at: "2026-03-25T09:30:00.000Z"
  }
];

function groupItems(items: HistoryItem[]): HistoryGroup[] {
  const gradeMap = new Map<number, Map<string, Map<string, HistoryGroup["subjects"][number]["topics"][number]["chats"]>>>();

  for (const item of items) {
    if (!gradeMap.has(item.grade)) {
      gradeMap.set(item.grade, new Map());
    }

    const subjectMap = gradeMap.get(item.grade)!;

    if (!subjectMap.has(item.subject)) {
      subjectMap.set(item.subject, new Map());
    }

    const topicMap = subjectMap.get(item.subject)!;

    if (!topicMap.has(item.topic)) {
      topicMap.set(item.topic, []);
    }

    topicMap.get(item.topic)!.push({
      id: item.id,
      title: item.title,
      updatedAt: item.updated_at
    });
  }

  return [...gradeMap.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([grade, subjectMap]) => ({
      grade,
      subjects: [...subjectMap.entries()].map(([subject, topicMap]) => ({
        subject,
        topics: [...topicMap.entries()].map(([topic, chats]) => ({
          topic,
          chats
        }))
      }))
    }));
}

export function HistoryExperience() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [facets, setFacets] = useState<HistoryFiltersPayload>({
    grades: [],
    subjects: [],
    topics: [],
    months: [],
    roles: []
  });
  const [filters, setFilters] = useState({
    date: "all",
    month: "all",
    subject: "all",
    topic: "all",
    grade: "all",
    role: "all"
  });

  const loadHistory = useCallback(async () => {
    const storedUserId = readStoredUserId();

    setUserId(storedUserId);
    setLoading(true);
    setError(null);

    if (!storedUserId) {
      setItems(demoItems);
      setFacets({
        grades: [...new Set(demoItems.map((item) => item.grade))].sort((left, right) => left - right),
        subjects: [...new Set(demoItems.map((item) => item.subject))].sort(),
        topics: [...new Set(demoItems.map((item) => item.topic))].sort(),
        months: [...new Set(demoItems.map((item) => item.updated_at.slice(0, 7)))].sort().reverse(),
        roles: ["parent"]
      });
      setLoading(false);
      return;
    }

    try {
      const query = new URLSearchParams();

      if (filters.date !== "all") {
        query.set("date_from", `${filters.date}T00:00:00.000Z`);
        query.set("date_to", `${filters.date}T23:59:59.999Z`);
      }

      if (filters.month !== "all") {
        query.set("month", filters.month);
      }

      if (filters.subject !== "all") {
        query.set("subject", filters.subject);
      }

      if (filters.topic !== "all") {
        query.set("topic", filters.topic);
      }

      if (filters.grade !== "all") {
        query.set("grade", filters.grade);
      }

      if (filters.role !== "all") {
        query.set("role", filters.role);
      }

      const headers = createUserAuthHeaders(storedUserId);
      const [response, facetsResponse] = await Promise.all([
        fetch(`/api/conversations${query.size ? `?${query.toString()}` : ""}`, { headers }),
        fetch("/api/history/filters", { headers })
      ]);
      const payload = await readJsonOrThrow<ConversationsListResponsePayload>(response, "Не удалось загрузить историю.");
      const nextFacets = await readJsonOrThrow<HistoryFiltersPayload>(
        facetsResponse,
        "Не удалось загрузить фильтры истории."
      );
      const normalizedItems = payload.items.map((item) => ({
        id: item.id,
        title: item.title ?? "Без названия",
        grade: item.grade ?? 0,
        subject: item.subject ?? "Без предмета",
        topic: item.topic ?? "Без темы",
        updated_at: item.updated_at
      }));

      setItems(normalizedItems);
      setFacets(nextFacets);
    } catch (loadError) {
      setItems([]);
      setError(getErrorMessage(loadError, "Не удалось загрузить историю."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadHistory();
  }, [filters, loadHistory]);

  const days = useMemo(
    () => [...new Set(items.map((item) => item.updated_at.slice(0, 10)))].sort().reverse(),
    [items]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (filters.date !== "all" && !item.updated_at.startsWith(filters.date)) {
          return false;
        }

        if (filters.month !== "all" && !item.updated_at.startsWith(filters.month)) {
          return false;
        }

        if (filters.subject !== "all" && item.subject !== filters.subject) {
          return false;
        }

        if (filters.topic !== "all" && item.topic !== filters.topic) {
          return false;
        }

        if (filters.grade !== "all" && String(item.grade) !== filters.grade) {
          return false;
        }

        if (filters.role !== "all" && filters.role !== "parent") {
          return false;
        }

        return true;
      }),
    [filters, items]
  );

  const groups = useMemo(() => groupItems(filteredItems), [filteredItems]);

  return (
    <div className="history-page">
      <section className="page-header calm-header">
        <div>
          <p className="eyebrow">История</p>
          <h1>Вернуться к теме без хаоса</h1>
          <p className="page-copy">
            Дерево помогает быстро найти нужный разговор по классу, предмету и теме. На телефоне
            всё остаётся компактным, читаемым и спокойным.
          </p>
        </div>
        <div className="history-header-meta">
          <div className="trial-banner compact">
            <strong>{userId ? "История уже доступна." : "После короткого сохранения история станет полной."}</strong>
            <span>{userId ? "Можно продолжать прошлые чаты и быстро находить нужную тему." : "Сейчас показан демо-вид, чтобы заранее было понятно, как выглядит структура."}</span>
          </div>
          <div className="hero-links">
            <Link className="button-primary" href="/chat">
              Задать новый вопрос
            </Link>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading-row">
          <div>
            <h2>Фильтры</h2>
            <p className="section-intro">Оставьте только нужный период, предмет или тему, чтобы быстрее найти разговор.</p>
          </div>
        </div>
        <div className="filter-toolbar">
          <label className="field">
            <span>Дата</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, date: event.target.value }))
              }
              value={filters.date}
            >
              <option value="all">Все</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {new Date(day).toLocaleDateString("ru-RU")}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Месяц</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, month: event.target.value }))
              }
              value={filters.month}
            >
              <option value="all">Все</option>
              {facets.months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Класс</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, grade: event.target.value }))
              }
              value={filters.grade}
            >
              <option value="all">Все</option>
              {facets.grades.map((grade) => (
                <option key={grade} value={String(grade)}>
                  {grade} класс
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Предмет</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, subject: event.target.value }))
              }
              value={filters.subject}
            >
              <option value="all">Все</option>
              {facets.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Тема</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, topic: event.target.value }))
              }
              value={filters.topic}
            >
              <option value="all">Все</option>
              {facets.topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Роль</span>
            <select
              onChange={(event) =>
                setFilters((current) => ({ ...current, role: event.target.value }))
              }
              value={filters.role}
            >
              <option value="all">Все</option>
              {facets.roles.map((role) => (
                <option key={role} value={role}>
                  {role === "parent" ? "Родитель" : role === "student" ? "Ученик" : role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="section-card history-tree-card">
        {loading ? (
          <div className="empty-state">
            <strong>Загружаем историю</strong>
            <p>Собираем темы и недавние разговоры, чтобы их было легче просматривать.</p>
          </div>
        ) : error ? (
          <div className="empty-state error-state">
            <strong>Историю пока не удалось загрузить</strong>
            <p>{error}</p>
            <button className="button-secondary" onClick={() => void loadHistory()} type="button">
              Попробовать ещё раз
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <strong>По таким фильтрам пока ничего не нашлось</strong>
            <p>Попробуйте убрать часть фильтров или вернуться в чат и начать новую тему.</p>
          </div>
        ) : (
          <div className="history-groups">
            {groups.map((group) => (
              <article className="history-grade" key={group.grade}>
                <header>
                  <span className="history-grade-label">{group.grade} класс</span>
                </header>
                <div className="history-subjects">
                  {group.subjects.map((subjectGroup) => (
                    <section className="history-subject" key={`${group.grade}-${subjectGroup.subject}`}>
                      <h2>{subjectGroup.subject}</h2>
                      <div className="history-topics">
                        {subjectGroup.topics.map((topicGroup) => (
                          <div className="history-topic" key={`${subjectGroup.subject}-${topicGroup.topic}`}>
                            <div className="history-topic-label">{topicGroup.topic}</div>
                            <div className="history-chat-list">
                              {topicGroup.chats.map((chat) => (
                                <Link
                                  className="history-chat-link"
                                  href={userId ? `/chat?conversation=${chat.id}` : "/chat"}
                                  key={chat.id}
                                >
                                  <span>{chat.title}</span>
                                  <small>{new Date(chat.updatedAt).toLocaleDateString("ru-RU")}</small>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

