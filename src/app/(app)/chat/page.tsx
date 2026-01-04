"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Custom components for ReactMarkdown to make links clickable
const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      }}
    >
      {children}
    </a>
  ),
};

interface Message {
  role: "user" | "assistant";
  content: string;
  newsSources?: string[];
}

const suggestedQuestions = [
  "Analyze my portfolio",
  "Best CEDEARs to buy?",
  "How is the Merval doing?",
  "Should I buy crypto?",
  "Opinion on ARG bonds",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentNewsSources, setCurrentNewsSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setCurrentNewsSources([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let newsSources: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setMessages([...newMessages, { role: "assistant", content: fullContent, newsSources }]);
                setStreamingContent("");
                setCurrentNewsSources([]);
              } else {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.newsSources) {
                    newsSources = parsed.newsSources;
                    setCurrentNewsSources(parsed.newsSources);
                  }
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setStreamingContent(fullContent);
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send");
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <header className="flex items-center justify-between pb-6 animate-fade-up">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            AI Advisor
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ask anything
          </h1>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat} className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </Button>
        )}
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 border border-border overflow-hidden animate-fade-up stagger-1">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !streamingContent ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-16 h-16 mx-auto bg-secondary rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium mb-2">Investment insights at your fingertips</p>
                  <p className="text-sm text-muted-foreground">
                    Portfolio analysis, market trends, and personalized recommendations
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(question)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm border border-border rounded-full hover:border-foreground hover:bg-secondary transition-all disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold",
                    message.role === "user" 
                      ? "bg-foreground text-background" 
                      : "bg-secondary text-foreground"
                  )}>
                    {message.role === "user" ? "U" : "AI"}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] space-y-2",
                      message.role === "user" ? "text-right" : ""
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="inline-block bg-foreground text-background px-4 py-3 text-sm rounded-2xl rounded-tr-sm">
                        {message.content}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {message.newsSources && message.newsSources.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                            <span>Sources: {message.newsSources.join(", ")}</span>
                          </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-3 prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-headings:font-semibold">
                          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {streamingContent && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 flex-shrink-0 bg-secondary rounded-lg flex items-center justify-center text-xs font-bold">
                    AI
                  </div>
                  <div className="max-w-[85%] space-y-3">
                    {currentNewsSources.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <span>Sources: {currentNewsSources.join(", ")}</span>
                      </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-3 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown components={markdownComponents}>{streamingContent}</ReactMarkdown>
                      <span className="inline-block w-2 h-4 ml-0.5 bg-foreground rounded-sm animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
              
              {isLoading && !streamingContent && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 flex-shrink-0 bg-secondary rounded-lg flex items-center justify-center text-xs font-bold">
                    AI
                  </div>
                  <div className="flex items-center gap-1 py-3">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.15s]" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about investments..."
              disabled={isLoading}
              className="flex-1 h-12"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              size="lg"
              className="h-12 w-12 p-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            For informational purposes only. Consult a certified advisor.
          </p>
        </div>
      </div>
    </div>
  );
}
