import { SectionCard } from "@/components/section-card";

const quickActions = [
  "Объяснить тему простыми словами",
  "Разобрать фото задания",
  "Надиктовать вопрос голосом"
];

export function ChatShell() {
  return (
    <SectionCard title="Чат">
      <div className="stack">
        <p className="page-copy">
          Guest-first chat shell for MVP. No product logic yet, only repository
          scaffold and structure.
        </p>
        <div className="stack">
          <div className="filter-row">
            {quickActions.map((action) => (
              <span className="filter-pill" key={action}>
                {action}
              </span>
            ))}
          </div>
          <div className="message-list">
            <div className="message message-user">Как объяснить дроби ребенку?</div>
            <div className="message message-assistant">
              Покажем простое объяснение, пошаговый разбор, parent-help mode и
              точный math rendering в следующих milestones.
            </div>
          </div>
          <div className="composer">
            <div className="composer-tools">
              <span className="filter-pill">Text</span>
              <span className="filter-pill">Image</span>
              <span className="filter-pill">Voice</span>
            </div>
            <div className="composer-box">
              Поле ввода и capture CTA будут реализованы поверх этого каркаса.
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
