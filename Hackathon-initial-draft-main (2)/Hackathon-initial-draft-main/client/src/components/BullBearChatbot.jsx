import { Loader2, Mic, MicOff, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAiChatStatus, postAiChat } from "../api/api";

const STORAGE_KEY = "sz_deepseek_chat_v1";

function getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speakText(text, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const plain = String(text || "").replace(/\*\*|`|#/g, "").slice(0, 8000);
  const u = new SpeechSynthesisUtterance(plain);
  u.rate = 1;
  u.pitch = 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

function loadStoredMessages() {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const p = JSON.parse(s);
    if (!Array.isArray(p)) return [];
    return p
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        content: String(m.content)
      }));
  } catch {
    return [];
  }
}

function saveMessages(list) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.map(({ id, role, content }) => ({ id, role, content })))
    );
  } catch {
    /* ignore */
  }
}

function mdComponents() {
  return {
    a: ({ children, href }) => (
      <a href={href} className="text-[#00FFB2] underline underline-offset-2 hover:text-[#5fffd4]" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h3>,
    h3: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-bold text-white">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-2 border-[#00FFB2]/50 pl-3 text-[#9CA3AF]">{children}</blockquote>
    ),
    code: ({ className, children, ...props }) =>
      !className ? (
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-[#00FFB2]" {...props}>
          {children}
        </code>
      ) : (
        <pre className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[13px] leading-relaxed">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white">{children}</th>
    ),
    td: ({ children }) => <td className="border border-white/10 px-3 py-2 text-[#D1D5DB]">{children}</td>
  };
}

export default function BullBearChatbot({ symbol }) {
  const [messages, setMessages] = useState(loadStoredMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [aiStatus, setAiStatus] = useState({ ready: null, deepseek: false, openrouter: false });
  const [voiceOut, setVoiceOut] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [errBanner, setErrBanner] = useState("");
  const [useMarketContext, setUseMarketContext] = useState(true);
  const bottomRef = useRef(null);
  const recRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    getAiChatStatus()
      .then((d) =>
        setAiStatus({
          ready: Boolean(d.ready),
          deepseek: Boolean(d.deepseek),
          openrouter: Boolean(d.openrouter)
        })
      )
      .catch(() => setAiStatus({ ready: false, deepseek: false, openrouter: false }));
  }, []);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop?.();
      } catch {
        /* ignore */
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const send = useCallback(
    async (text) => {
      const t = String(text || "").trim();
      if (!t || pending) return;
      setErrBanner("");
      const userMsg = { id: crypto.randomUUID(), role: "user", content: t };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setPending(true);

      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

      try {
        const data = await postAiChat({
          messages: history,
          symbol: useMarketContext ? symbol || "AAPL" : undefined
        });
        const content = data?.message?.content || "";
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content }]);
        if (voiceOut && content) {
          setSpeaking(true);
          speakText(content, () => setSpeaking(false));
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Request failed.";
        setErrBanner(msg);
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `I could not complete that reply.\n\n**${msg}**\n\nAdd **OPENROUTER_API_KEY** to **server/.env** (optionally set **OPENROUTER_CHAT_MODEL=openai/gpt-oss-120b**), save, then restart the API server.`,
            isError: true
          }
        ]);
      } finally {
        setPending(false);
        taRef.current?.focus();
      }
    },
    [messages, pending, symbol, useMarketContext, voiceOut]
  );

  function stopListening() {
    try {
      recRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setErrBanner("Voice input needs Chrome, Edge, or Safari with microphone access.");
      return;
    }
    setErrBanner("");
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setErrBanner("Microphone error—check permissions.");
    };
    rec.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript?.trim() || "";
      setInput((prev) => (prev ? `${prev} ${text}` : text));
      stopListening();
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setErrBanner("Could not start the microphone.");
      setListening(false);
    }
  }

  function newChat() {
    setMessages([]);
    setErrBanner("");
    sessionStorage.removeItem(STORAGE_KEY);
    window.speechSynthesis?.cancel();
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.isError);

  return (
    <div className="flex min-h-[75vh] flex-col px-3 pb-6 pt-4 sm:px-6 lg:mx-auto lg:w-full lg:max-w-4xl">
      <header className="mb-4 shrink-0 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Sentilyze AI</h1>
            <p className="mt-1 max-w-xl text-sm text-[#9CA3AF]">
              Sentilyze chat: ask anything—coding, writing, math, markets, or ideas. Conversation is saved for
              this browser tab until you clear it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={newChat}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121826] px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              New chat
            </button>
            <button
              type="button"
              onClick={() => {
                setVoiceOut((v) => {
                  if (v) window.speechSynthesis?.cancel();
                  return !v;
                });
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                voiceOut ? "border-[#00FFB2]/40 bg-[#00FFB2]/10 text-[#00FFB2]" : "border-white/10 bg-[#121826] text-[#9CA3AF]"
              }`}
            >
              {voiceOut ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Read replies aloud
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-[#9CA3AF]">
            <input
              type="checkbox"
              checked={useMarketContext}
              onChange={(e) => setUseMarketContext(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 text-[#00FFB2] focus:ring-[#00FFB2]"
            />
            Include live snapshot for <span className="font-mono text-[#00FFB2]">{symbol || "AAPL"}</span> (price +
            headline sentiment)
          </label>
          {aiStatus.ready === false ? (
            <span className="max-w-md rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">
              No AI key: set <code className="text-amber-100">OPENROUTER_API_KEY</code> in{" "}
              <code className="text-amber-100">server/.env</code> and restart the API.
            </span>
          ) : aiStatus.ready === true ? (
            <span className="text-[#00FFB2]/80">
              AI ready
              {aiStatus.deepseek ? " (DeepSeek API)" : ""}
              {aiStatus.openrouter && !aiStatus.deepseek ? " (OpenRouter)" : ""}
            </span>
          ) : null}
        </div>
        {errBanner && !messages.some((m) => m.isError) ? (
          <p className="mt-2 text-sm text-[#FCA5A5]">{errBanner}</p>
        ) : null}
      </header>

      <div className="sentilyze-card flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f141f] sm:min-h-[520px]">
        <div className="min-h-0 max-h-[55vh] flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[60vh] sm:px-5">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-[#00FFB2]/20 bg-[#00FFB2]/5 p-5 text-sm text-[#D1D5DB]">
              <p className="font-semibold text-white">How can I help you today?</p>
              <p className="mt-2 text-[#9CA3AF]">
                Try: “Explain async/await in JavaScript”, “Write a polite email declining a meeting”, or “What moves
                oil prices?” — or ask about the active symbol with market context turned on.
              </p>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-[#00FFB2]/15 text-white ring-1 ring-[#00FFB2]/30"
                    : m.isError
                      ? "bg-[#FF3B3B]/10 text-[#FECACA] ring-1 ring-[#FF3B3B]/25"
                      : "bg-[#1a2235] text-[#E5E7EB] ring-1 ring-white/5"
                }`}
              >
                {m.role === "assistant" && !m.isError ? (
                  <div className="markdown-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents()}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                )}
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-[#1a2235] px-4 py-3 text-sm text-[#9CA3AF] ring-1 ring-white/5">
                <Loader2 className="h-4 w-4 animate-spin text-[#00FFB2]" />
                Thinking…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Message Sentilyze AI… (Shift+Enter for new line)"
                rows={3}
                disabled={pending}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0F1A] px-4 py-3 pr-12 text-sm text-white placeholder:text-[#6B7280] focus:border-[#00FFB2]/50 focus:outline-none focus:ring-2 focus:ring-[#00FFB2]/15 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => (listening ? stopListening() : startListening())}
                disabled={pending}
                className={`absolute bottom-3 right-3 rounded-lg p-2 transition ${
                  listening ? "bg-[#FF3B3B]/20 text-[#FCA5A5]" : "bg-white/5 text-[#9CA3AF] hover:text-white"
                }`}
                aria-label={listening ? "Stop microphone" : "Voice input"}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex gap-2 sm:flex-col">
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00FFB2] px-6 py-3 text-sm font-bold text-[#0B0F1A] disabled:opacity-40 sm:flex-none"
              >
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Send
              </button>
              {lastAssistant && voiceOut ? (
                <button
                  type="button"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setSpeaking(true);
                    speakText(lastAssistant.content, () => setSpeaking(false));
                  }}
                  disabled={speaking}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white"
                >
                  Replay last
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <p className="mt-3 shrink-0 text-center text-[11px] text-[#6B7280]">
        AI: OpenRouter — get your key at{" "}
        <a href="https://openrouter.ai/keys" className="text-[#00FFB2] underline" target="_blank" rel="noreferrer">
          openrouter.ai/keys
        </a>
        · Not financial advice
      </p>
    </div>
  );
}
