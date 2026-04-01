"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  type ChangeEvent,
  type FormEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  type ChatConversationResponsePayload,
  type ChatMessageResponsePayload,
  type UploadRegistrationPayload
} from "@/lib/api/types";
import {
  createJsonHeaders,
  getErrorMessage,
  readJsonOrThrow
} from "@/lib/client/api";
import {
  createUserAuthHeaders,
  readStoredGuestSessionId,
  readStoredUserId,
  sessionStorageKeys,
  writeSessionValue
} from "@/lib/client/session";

const quickActions = [
  {
    label: "Объяснить задачу простыми словами",
    prompt: "Объясни задачу простыми словами для ребенка 4 класса."
  },
  {
    label: "Разобрать фото из учебника",
    prompt: "Разбери фото из учебника и объясни, с чего начать решение."
  },
  {
    label: "Объяснить как помочь ребенку самому",
    prompt: "Подскажи родителю, как помочь ребенку самому решить задачу без готового ответа."
  }
] as const;

const responseModes = [
  { value: "simple_explanation", label: "Просто и понятно" },
  { value: "step_by_step_solution", label: "По шагам" },
  { value: "answer_with_reasoning", label: "С логикой" },
  { value: "multiple_solution_paths", label: "Несколько путей" },
  { value: "parent_help_mode", label: "Для родителя" }
] as const;

const subjects = ["Математика", "Русский язык", "Окружающий мир", "Английский язык"] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  type: string;
  content: string;
  meta?: string;
  attachment?: {
    kind: "image" | "voice";
    name: string;
    previewUrl?: string;
  };
};

type CaptureFormState = {
  role: "parent" | "student";
  name: string;
  email: string;
  phone: string;
  childGrade: string;
  studentAge: string;
  personalDataConsent: boolean;
  marketingConsent: boolean;
};

type PendingAttachment = {
  kind: "image" | "voice";
  file: File;
  name: string;
  previewUrl?: string;
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildMessageText(content: string, attachment: PendingAttachment | null) {
  const trimmed = content.trim();

  if (trimmed) {
    return trimmed;
  }

  if (attachment?.kind === "image") {
    return "Помоги разобрать это фото из учебника.";
  }

  if (attachment?.kind === "voice") {
    return "Послушай голосовой вопрос и помоги с заданием.";
  }

  return "";
}

export function ChatExperience() {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceDurationSecondsRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const [requestedConversationId, setRequestedConversationId] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "image" | "voice">("text");
  const [responseMode, setResponseMode] =
    useState<(typeof responseModes)[number]["value"]>("simple_explanation");
  const [subject, setSubject] = useState<string>("Математика");
  const [grade, setGrade] = useState("4");
  const [topic, setTopic] = useState("");
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureCompleted, setCaptureCompleted] = useState(false);
  const [captureReason, setCaptureReason] = useState("Чтобы сохранить прогресс и открыть историю.");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [captureForm, setCaptureForm] = useState<CaptureFormState>({
    role: "parent",
    name: "",
    email: "",
    phone: "",
    childGrade: "4",
    studentAge: "10",
    personalDataConsent: true,
    marketingConsent: false
  });

  const usefulAnswerCount = useMemo(
    () => messages.filter((message) => message.role === "assistant").length,
    [messages]
  );

  const resetPendingAttachment = useCallback(() => {
    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  const bootGuestSession = useCallback(async () => {
    const storedGuestSessionId = readStoredGuestSessionId();

    if (storedGuestSessionId) {
      setGuestSessionId(storedGuestSessionId);
      return storedGuestSessionId;
    }

    const response = await fetch("/api/guest/session", {
      method: "POST",
      headers: createJsonHeaders(),
      body: JSON.stringify({ locale: "ru-RU" })
    });

    const payload = await readJsonOrThrow<{ guest_session_id: string }>(
      response,
      "Не удалось подготовить гостевой чат."
    );
    const nextGuestSessionId = payload.guest_session_id;

    writeSessionValue(sessionStorageKeys.guestSessionId, nextGuestSessionId);
    setGuestSessionId(nextGuestSessionId);

    return nextGuestSessionId;
  }, []);

  const loadConversation = useCallback(async (targetConversationId: string) => {
    const activeUserId = readStoredUserId();
    const activeGuestSessionId = activeUserId ? null : await bootGuestSession();
    const search = new URLSearchParams();

    if (activeGuestSessionId) {
      search.set("guest_session_id", activeGuestSessionId);
    }

    setLoadingConversation(true);
    setBootError(null);

    try {
      const response = await fetch(
        `/api/chat/conversation/${targetConversationId}${search.size ? `?${search.toString()}` : ""}`,
        { headers: createUserAuthHeaders(activeUserId) }
      );
      const payload = await readJsonOrThrow<ChatConversationResponsePayload>(
        response,
        "Не получилось открыть выбранный чат."
      );
      const conversation = payload.conversation;
      const conversationMessages = conversation.messages ?? [];

      setConversationId(conversation.id);
      setMessages(
        conversationMessages.map(
          (message: {
            id: string;
            role: string;
            message_type: string;
            content_text: string;
            attachments?: Array<{
              kind: string;
              file_url: string;
              mime_type: string;
            }>;
          }) => ({
            id: message.id,
            role: message.role === "assistant" ? "assistant" : "user",
            type: message.message_type,
            content: message.content_text,
            attachment: message.attachments?.[0]
              ? {
                  kind: message.attachments[0].kind === "voice" ? "voice" : "image",
                  name:
                    message.attachments[0].kind === "voice"
                      ? "Голосовая заметка"
                      : "Прикрепленное фото",
                  previewUrl: message.attachments[0].file_url
                }
              : undefined
          })
        )
      );
      setSubject(conversation.subject ?? "Математика");
      setTopic(conversation.topic ?? "");
      setGrade(conversation.grade ? String(conversation.grade) : "4");
    } catch (error) {
      setBootError(getErrorMessage(error, "Не получилось открыть выбранный чат."));
    } finally {
      setLoadingConversation(false);
    }
  }, [bootGuestSession]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setRequestedConversationId(params.get("conversation"));
    }

    const storedUserId = readStoredUserId();
    const storedGuestSessionId = readStoredGuestSessionId();

    if (storedUserId) {
      setUserId(storedUserId);
    }

    if (storedGuestSessionId) {
      setGuestSessionId(storedGuestSessionId);
    }

    if (!storedUserId && !storedGuestSessionId) {
      startTransition(() => {
        void bootGuestSession().catch((error) => {
          setBootError(getErrorMessage(error, "Не удалось подготовить гостевой чат."));
        });
      });
    }
  }, [bootGuestSession]);

  useEffect(() => {
    setConversationId(requestedConversationId);
    if (requestedConversationId) {
      startTransition(() => {
        void loadConversation(requestedConversationId);
      });
    }
  }, [loadConversation, requestedConversationId]);

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resetPendingAttachment();
    const previewUrl = URL.createObjectURL(file);
    setInputMode("image");
    setComposerText((current) => current || "Помоги разобрать это фото из учебника.");
    setPendingAttachment({ kind: "image", file, name: file.name, previewUrl });
    event.target.value = "";
  }

  async function startVoiceRecording() {
    if (typeof window === "undefined" || !("MediaRecorder" in window)) {
      setSendError("Запись голоса недоступна в этом браузере.");
      return;
    }

    try {
      voiceDurationSecondsRef.current = null;
      recordingStartedAtRef.current = null;
      resetPendingAttachment();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: blob.type || "audio/webm"
        });
        const durationSeconds = recordingStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
          : 1;
        const previewUrl = URL.createObjectURL(blob);

        setInputMode("voice");
        setComposerText((current) => current || "Послушай голосовой вопрос и помоги с заданием.");
        setPendingAttachment({
          kind: "voice",
          file,
          name: "Голосовая заметка",
          previewUrl
        });
        voiceDurationSecondsRef.current = durationSeconds;
        setIsRecording(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
      setSendError(null);
    } catch {
      setSendError("Не удалось включить микрофон для голосовой заметки.");
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }

  async function registerPendingAttachment(
    activeUserId: string | null,
    activeGuestSessionId: string | null
  ) {
    if (!pendingAttachment) {
      return null;
    }

    const route =
      pendingAttachment.kind === "image" ? "/api/chat/upload-image" : "/api/chat/upload-voice";
    const response = await fetch(route, {
      method: "POST",
      headers: createJsonHeaders(createUserAuthHeaders(activeUserId)),
      body: JSON.stringify({
        conversation_id: conversationId ?? undefined,
        guest_session_id: activeGuestSessionId,
        file_name: pendingAttachment.file.name || pendingAttachment.name,
        mime_type:
          pendingAttachment.file.type ||
          (pendingAttachment.kind === "image" ? "image/jpeg" : "audio/webm"),
        size_bytes: pendingAttachment.file.size || 1,
        ...(pendingAttachment.kind === "voice" && voiceDurationSecondsRef.current != null
          ? { duration_seconds: voiceDurationSecondsRef.current }
          : {})
      })
    });
    const payload = await readJsonOrThrow<UploadRegistrationPayload>(
      response,
      "Не удалось подготовить загрузку вложения."
    );

    setConversationId(payload.conversation_id);

    return payload;
  }

  async function handleSend(
    nextText?: string,
    nextMode?: "text" | "image" | "voice",
    nextResponseMode?: (typeof responseModes)[number]["value"]
  ) {
    const content = buildMessageText(nextText ?? composerText, pendingAttachment);
    const messageType = nextMode ?? inputMode;
    const currentResponseMode = nextResponseMode ?? responseMode;

    if (!content || isRecording) {
      return;
    }

    setSendError(null);
    setSending(true);

    const optimisticUserMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      type: messageType,
      content,
      meta: messageType === "image" ? "Фото из учебника" : messageType === "voice" ? "Голосовая заметка" : undefined,
      attachment: pendingAttachment
        ? {
            kind: pendingAttachment.kind,
            name: pendingAttachment.name,
            previewUrl: pendingAttachment.previewUrl
          }
        : undefined
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setComposerText("");
    setInputMode("text");
    setIsRecording(false);

    try {
      const activeUserId = readStoredUserId();
      const activeGuestSessionId = activeUserId ? null : await bootGuestSession();
      const registeredAttachment = await registerPendingAttachment(
        activeUserId,
        activeGuestSessionId
      );

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: createJsonHeaders(createUserAuthHeaders(activeUserId)),
        body: JSON.stringify({
          conversation_id: registeredAttachment?.conversation_id ?? conversationId,
          guest_session_id: activeGuestSessionId,
          response_mode: currentResponseMode,
          subject,
          grade: Number(grade),
          topic: topic || undefined,
          message: {
            type: messageType,
            content_text: content,
            ...(registeredAttachment
              ? { attachment_id: registeredAttachment.attachment_id }
              : {}),
            ...(messageType === "voice" && voiceDurationSecondsRef.current != null
              ? { duration_seconds: voiceDurationSecondsRef.current }
              : {})
          }
        })
      });

      const payload = await readJsonOrThrow<ChatMessageResponsePayload>(
        response,
        "Не удалось отправить сообщение."
      );

      setConversationId(payload.conversation_id);
      setMessages((current) => [
        ...current,
        {
          id: payload.assistant_message.id,
          role: "assistant",
          type: "text",
          content: payload.assistant_message.content_text
        }
      ]);

      if (payload.capture_prompt?.should_show && !activeUserId) {
        setCaptureReason("Можно сохранить этот разбор и вернуться к нему позже без поиска по переписке.");
        setCaptureOpen(true);
      }

      voiceDurationSecondsRef.current = null;
      recordingStartedAtRef.current = null;
      resetPendingAttachment();
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticUserMessage.id));
      setSendError(getErrorMessage(error, "Не удалось отправить сообщение."));
    } finally {
      setSending(false);
    }
  }

  function handleQuickAction(prompt: string) {
    void handleSend(prompt, "text");
  }

  async function handleCaptureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCaptureError(null);
    setCaptureSubmitting(true);

    if (!captureForm.email.trim() && !captureForm.phone.trim()) {
      setCaptureError("Укажите email или телефон, чтобы сохранить прогресс.");
      setCaptureSubmitting(false);
      return;
    }

    try {
      const activeGuestSessionId = guestSessionId ?? (await bootGuestSession());
      const response = await fetch("/api/capture/register", {
        method: "POST",
        headers: createJsonHeaders(),
        body: JSON.stringify({
          guest_session_id: activeGuestSessionId,
          role: captureForm.role,
          name: captureForm.name,
          email: captureForm.email || null,
          phone: captureForm.phone || null,
          child_grade: captureForm.role === "parent" ? Number(captureForm.childGrade) : null,
          student_age: captureForm.role === "student" ? Number(captureForm.studentAge) : null,
          trigger: "OPEN_HISTORY",
          consents: {
            personal_data_processing: captureForm.personalDataConsent,
            marketing_messages: captureForm.marketingConsent
          }
        })
      });

      const payload = await readJsonOrThrow<{ user: { id: string } }>(
        response,
        "Не удалось сохранить данные."
      );
      const nextUserId = payload.user.id;

      writeSessionValue(sessionStorageKeys.userId, nextUserId);
      setUserId(nextUserId);
      setCaptureCompleted(true);
      setCaptureOpen(false);
    } catch (error) {
      setCaptureError(getErrorMessage(error, "Не удалось сохранить данные."));
    } finally {
      setCaptureSubmitting(false);
    }
  }

  const statusText = sending
    ? "Готовим спокойный и понятный ответ..."
    : usefulAnswerCount === 0
      ? "Можно начать с текста, фото или голосового вопроса."
      : `Уже есть полезных ответов: ${usefulAnswerCount}. Если захотите, их можно аккуратно сохранить.`;
  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy-block">
          <p className="eyebrow">Спокойный помощник для родителя и ученика</p>
          <h1 className="hero-title">Первый полезный ответ без длинного онбординга</h1>
          <p className="hero-copy">
            Задайте вопрос так, как удобно сейчас, и получите понятное объяснение без лишних
            шагов. Когда появится польза, прогресс можно спокойно сохранить и вернуться к нему
            позже.
          </p>
        </div>
        <div className="hero-meta">
          <div className="trial-banner">
            <strong>Сейчас идёт бесплатный тестовый период.</strong>
            <span>Можно спокойно попробовать чат, фото и голос в привычном темпе.</span>
          </div>
          <div className="hero-links">
            <Link className="button-primary" href="/chat">Начать с вопроса</Link>
            <Link className="button-secondary" href="/history">Посмотреть историю</Link>
          </div>
        </div>
      </section>

      <div className="chat-layout">
        <aside className="support-panel">
          <section className="section-card soft-card">
            <h2>Быстрый старт</h2>
            <p className="section-intro">
              Выберите спокойный стартовый сценарий и при желании уточните его в чате.
            </p>
            <div className="quick-actions">
              {quickActions.map((action) => (
                <button className="quick-action" key={action.label} onClick={() => handleQuickAction(action.prompt)} type="button">
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section-card soft-card">
            <h2>Какой ответ нужен сейчас</h2>
            <p className="section-intro">
              Настройки помогут сразу получить объяснение в нужном тоне и уровне подробности.
            </p>
            <div className="segmented-control">
              {responseModes.map((mode) => (
                <button className={mode.value === responseMode ? "segmented-pill active" : "segmented-pill"} key={mode.value} onClick={() => setResponseMode(mode.value)} type="button">
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Предмет</span>
                <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                  {subjects.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Класс</span>
                <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                  {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((item) => (
                    <option key={item} value={item}>{item} класс</option>
                  ))}
                </select>
              </label>
              <label className="field field-full">
                <span>Тема</span>
                <input onChange={(event) => setTopic(event.target.value)} placeholder="Например, дроби или части речи" value={topic} />
              </label>
            </div>
          </section>
        </aside>

        <section className="chat-panel section-card">
          <div className="chat-panel-header">
            <div>
              <p className="eyebrow">Главный сценарий</p>
              <h2>Чат</h2>
            </div>
            <p className="status-note">{statusText}</p>
          </div>

          {bootError ? <div className="state-banner error">{bootError}</div> : null}
          {sendError ? <div className="state-banner error">{sendError}</div> : null}
          {captureCompleted ? <div className="state-banner success">Прогресс сохранён. Теперь история доступна в полном виде.</div> : null}

          <div className="message-stream">
            {loadingConversation ? (
              <div className="empty-state">
                <strong>Открываем прошлый чат</strong>
                <p>Подтягиваем сообщения и контекст, чтобы можно было продолжить без лишнего поиска.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <strong>Можно начать с одного короткого вопроса</strong>
                <p>Например: «Объясни дроби простыми словами» или «Посмотри фото задания и покажи первый шаг».</p>
              </div>
            ) : (
              messages.map((message) => (
                <article className={message.role === "assistant" ? "message-card assistant" : "message-card user"} key={message.id}>
                  <div className="message-label">{message.role === "assistant" ? "Помощник" : "Вы"}</div>
                  {message.meta ? <div className="message-meta">{message.meta}</div> : null}
                  {message.attachment?.kind === "image" && message.attachment.previewUrl ? <Image alt={message.attachment.name} className="message-image-preview" height={320} src={message.attachment.previewUrl} unoptimized width={320} /> : null}
                  {message.attachment?.kind === "voice" && message.attachment.previewUrl ? <audio className="message-audio-preview" controls src={message.attachment.previewUrl} /> : null}
                  <p>{message.content}</p>
                </article>
              ))
            )}
            {sending ? (
              <article className="message-card assistant pending">
                <div className="message-label">Помощник</div>
                <p>Собираем ответ, чтобы он был коротким, спокойным и понятным.</p>
              </article>
            ) : null}
          </div>

          {!userId && usefulAnswerCount > 0 ? (
            <div className="capture-inline">
              <div>
                <strong>Сохранить этот разбор на потом?</strong>
                <p>После короткого сохранения будет проще вернуться к теме и увидеть историю без хаоса.</p>
              </div>
              <button className="button-secondary" onClick={() => setCaptureOpen(true)} type="button">Сохранить разбор</button>
            </div>
          ) : null}

          <div className="composer-panel">
            <input accept="image/*" className="hidden-input" onChange={handleImageSelection} ref={imageInputRef} type="file" />
            <div className="composer-tools">
              <button className={inputMode === "text" && !pendingAttachment ? "tool-pill active" : "tool-pill"} onClick={() => { setInputMode("text"); resetPendingAttachment(); }} type="button">Текст</button>
              <button className={inputMode === "image" ? "tool-pill active" : "tool-pill"} onClick={() => imageInputRef.current?.click()} type="button">Фото</button>
              <button className={inputMode === "voice" || isRecording ? "tool-pill active" : "tool-pill"} onClick={() => { if (isRecording) { stopVoiceRecording(); return; } void startVoiceRecording(); }} type="button">{isRecording ? "Остановить запись" : "Голос"}</button>
            </div>
            {pendingAttachment ? (
              <div className="attachment-preview">
                <div>
                  <strong>{pendingAttachment.kind === "image" ? "Фото добавлено" : "Голосовая заметка готова"}</strong>
                  <p>
                    {pendingAttachment.kind === "image"
                      ? "Проверьте, всё ли видно, и при желании добавьте короткую подпись."
                      : pendingAttachment.name}
                  </p>
                </div>
                {pendingAttachment.kind === "image" && pendingAttachment.previewUrl ? <Image alt={pendingAttachment.name} className="attachment-image-preview" height={320} src={pendingAttachment.previewUrl} unoptimized width={320} /> : null}
                {pendingAttachment.kind === "voice" && pendingAttachment.previewUrl ? <audio controls src={pendingAttachment.previewUrl} /> : null}
                <button className="button-secondary" onClick={resetPendingAttachment} type="button">Убрать</button>
              </div>
            ) : null}
            <form className="composer-form" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
              <textarea
                onChange={(event) => setComposerText(event.target.value)}
                placeholder={inputMode === "text" ? "Опишите задачу своими словами" : inputMode === "image" ? "Коротко подпишите, что видно на фото" : "Добавьте текст к голосовой заметке, если нужно"}
                rows={4}
                value={composerText}
              />
              <div className="composer-footer">
                <span className="composer-hint">
                  {isRecording ? "Идёт запись голосовой заметки" : inputMode === "text" ? "Текстовый вопрос" : inputMode === "image" ? "Фото прикрепляется и показывается в чате" : "Голосовая заметка записывается в браузере и показывается в диалоге"}
                </span>
                <button className="button-primary" disabled={sending || isRecording || !buildMessageText(composerText, pendingAttachment)} type="submit">
                  {sending ? "Отправляем..." : "Получить понятный ответ"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {captureOpen ? (
        <div className="capture-sheet-backdrop" role="presentation">
          <section aria-label="Сохранение прогресса" className="capture-sheet">
            <div className="capture-sheet-header">
              <div>
                <p className="eyebrow">Мягкое сохранение</p>
                <h2>Сохранить прогресс после полезного ответа</h2>
              </div>
              <button className="close-button" onClick={() => setCaptureOpen(false)} type="button">Не сейчас</button>
            </div>
            <p className="page-copy">{captureReason}</p>
            <form className="capture-form" onSubmit={handleCaptureSubmit}>
              <div className="segmented-control">
                {[
                  { value: "parent" as const, label: "Я родитель" },
                  { value: "student" as const, label: "Я ученик" }
                ].map((option) => (
                  <button className={option.value === captureForm.role ? "segmented-pill active" : "segmented-pill"} key={option.value} onClick={() => setCaptureForm((current) => ({ ...current, role: option.value }))} type="button">
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Имя</span>
                  <input onChange={(event) => setCaptureForm((current) => ({ ...current, name: event.target.value }))} required value={captureForm.name} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input onChange={(event) => setCaptureForm((current) => ({ ...current, email: event.target.value }))} type="email" value={captureForm.email} />
                </label>
                <label className="field">
                  <span>Телефон</span>
                  <input onChange={(event) => setCaptureForm((current) => ({ ...current, phone: event.target.value }))} value={captureForm.phone} />
                </label>
                {captureForm.role === "parent" ? (
                  <label className="field">
                    <span>Класс ребёнка</span>
                    <select onChange={(event) => setCaptureForm((current) => ({ ...current, childGrade: event.target.value }))} required value={captureForm.childGrade}>
                      {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((item) => <option key={item} value={item}>{item} класс</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="field">
                    <span>Возраст</span>
                    <select onChange={(event) => setCaptureForm((current) => ({ ...current, studentAge: event.target.value }))} required value={captureForm.studentAge}>
                      {Array.from({ length: 9 }, (_, index) => String(index + 9)).map((item) => <option key={item} value={item}>{item} лет</option>)}
                    </select>
                  </label>
                )}
              </div>
              <p className="capture-helper">Достаточно оставить один контакт: email или телефон.</p>
              <label className="checkbox-row">
                <input checked={captureForm.personalDataConsent} onChange={(event) => setCaptureForm((current) => ({ ...current, personalDataConsent: event.target.checked }))} type="checkbox" />
                <span>Согласен на обработку персональных данных.</span>
              </label>
              <label className="checkbox-row">
                <input checked={captureForm.marketingConsent} onChange={(event) => setCaptureForm((current) => ({ ...current, marketingConsent: event.target.checked }))} type="checkbox" />
                <span>Можно присылать полезные напоминания и новости о бесплатном периоде.</span>
              </label>
              {captureError ? <div className="state-banner error">{captureError}</div> : null}
              <div className="capture-actions">
                <button className="button-primary" disabled={captureSubmitting} type="submit">{captureSubmitting ? "Сохраняем..." : "Сохранить и открыть историю"}</button>
                <Link className="button-secondary" href="/history">Сначала посмотреть историю</Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}






