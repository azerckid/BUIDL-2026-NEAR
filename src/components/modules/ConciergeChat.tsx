"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { chatWithConcierge } from "@/actions/chatWithConcierge";
import type { RiskProfile } from "@/lib/db/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConciergeChatProps {
  riskProfile: RiskProfile;
}

export function ConciergeChat({ riskProfile }: ConciergeChatProps) {
  const t = useTranslations("pitch.concierge");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInput("");
    scrollToBottom();

    startTransition(async () => {
      const result = await chatWithConcierge({
        message: trimmed,
        history: messages,
        riskProfile: riskProfile as Record<string, { level: string; flags: string[] }>,
      });

      if ("error" in result) {
        toast.error(result.error);
        setMessages(messages);
        return;
      }

      setMessages([...nextHistory, { role: "assistant", content: result.reply }]);
      scrollToBottom();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/20">
          <Bot size={14} className="text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{t("title")}</span>
          <span className="text-xs text-muted-foreground">{t("subtitle")}</span>
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="flex flex-col gap-3 px-4 py-4 min-h-[180px] max-h-[340px] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">
            {t("emptyState")}
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={["flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row"].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary/15 border border-primary/25"
                    : "bg-muted border border-border/60",
                ].join(" ")}
              >
                {msg.role === "user" ? (
                  <User size={12} className="text-primary" />
                ) : (
                  <Bot size={12} className="text-muted-foreground" />
                )}
              </div>
              <div
                className={[
                  "rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[80%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground border border-border/40",
                ].join(" ")}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border border-border/60 shrink-0 mt-0.5">
              <Bot size={12} className="text-muted-foreground" />
            </div>
            <div className="rounded-xl px-3 py-2 bg-muted/60 border border-border/40">
              <span className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-border/60 bg-muted/20">
        <textarea
          className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 min-h-[40px] max-h-[100px]"
          placeholder={t("placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          rows={1}
        />
        <Button
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isPending}
        >
          <Send size={14} />
        </Button>
      </div>
      <p className="px-4 pb-2 text-[10px] text-muted-foreground/60 text-center">
        {t("disclaimer")}
      </p>
    </div>
  );
}
