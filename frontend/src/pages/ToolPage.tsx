import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import {
  LinkIcon, Loader2, Copy, CheckCheck, Send,
  Sparkles, MessageSquare, AlignLeft, Megaphone, Download
} from "lucide-react";
import { toast } from "sonner";

type AnalysisResult = {
  transcription: string;
  summary: string;
  hook: string;
  structure: string;
  contentType: string;
  cta: string;
  script_filename?: string;
  summary_filename?: string;
  safe_title?: string;
  short_id?: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: Sparkles, label: "Adaptar roteiro para meu produto" },
  { icon: AlignLeft, label: "Gerar legenda para Instagram" },
  { icon: Megaphone, label: "Transformar em script de anúncio" },
];

const ToolPage = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Cole um link de vídeo para analisar");
      return;
    }

    setLoading(true);
    setResult(null);
    setChatMessages([]);
    setProgress(0);
    setProgressMsg("Iniciando...");

    try {
      const formData = new FormData();
      formData.append("url", url);
      formData.append("summary_language", "pt");

      const res = await fetch(`/api/process-video`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro ao iniciar processamento");

      const { task_id } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(`/api/task-stream/${task_id}`);

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "heartbeat") return;

          if (data.progress !== undefined) setProgress(data.progress);
          if (data.message) setProgressMsg(data.message);

          if (data.status === "completed") {
            eventSource.close();

            const script = data.script || "";
            const summary = data.summary || "";
            const safeTitle = data.safe_title || "";
            const shortId = data.short_id || "";

            setResult({
              transcription: script,
              summary: summary,
              hook: extrairHook(script),
              structure: summary,
              contentType: "Vídeo",
              cta: extrairCTA(script),
              script_filename: `transcript_${safeTitle}_${shortId}.md`,
              summary_filename: `summary_${safeTitle}_${shortId}.md`,
              safe_title: safeTitle,
              short_id: shortId,
            });

            resolve();
          }

          if (data.status === "error") {
            eventSource.close();
            reject(new Error(data.error || "Erro no processamento"));
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error("Conexão com o servidor perdida"));
        };
      });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao analisar o vídeo");
    }

    setLoading(false);
  };

  const extrairHook = (script: string): string => {
    if (!script) return "Hook não identificado";
    const linhas = script.split("\n").filter(l => l.trim());
    return linhas.slice(1, 3).join(" ") || linhas[0] || "Hook não identificado";
  };

  const extrairCTA = (script: string): string => {
    if (!script) return "CTA não detectado";
    const linhas = script.split("\n").filter(l => l.trim());
    return linhas.slice(-2).join(" ") || "CTA não detectado";
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (filename: string) => {
    try {
      const res = await fetch(`/api/download/${filename}`);
      if (!res.ok) throw new Error("Arquivo não encontrado");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleChat = async (msg?: string) => {
    const text = msg || chatInput.trim();
    if (!text) return;

    setChatInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Você é um especialista em marketing de conteúdo e criação de roteiros virais.

Transcrição do vídeo analisado:
${result?.transcription || ""}

Resumo:
${result?.summary || ""}

Pergunta do usuário: ${text}`,
            }
          ]
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Não consegui gerar resposta.";
      setChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Erro ao gerar resposta da IA." }
      ]);
    }

    setChatLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-10 container mx-auto px-4">

        {/* Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">
            Analisar vídeo
          </h1>

          <div className="relative group">
            <div className="absolute -inset-1 gradient-bg rounded-2xl opacity-20 blur-lg group-focus-within:opacity-40 transition-opacity" />
            <div className="relative flex items-center bg-card rounded-xl border border-border/50 p-2">
              <LinkIcon className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Cole o link do vídeo aqui..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-foreground placeholder:text-muted-foreground"
              />
              <Button variant="hero" onClick={handleAnalyze} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analisar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 max-w-sm mx-auto"
            >
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{progressMsg}</p>
              <div className="w-full bg-border rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultado */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 max-w-3xl mx-auto"
            >
              {/* Hook */}
              <div className="glass-card p-5 rounded-xl">
                <h3 className="font-bold mb-2">Hook detectado</h3>
                <p className="text-sm text-muted-foreground">{result.hook}</p>
              </div>

              {/* Resumo */}
              <div className="glass-card p-5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Resumo / Estrutura</h3>
                  {result.summary_filename && (
                    <button
                      onClick={() => handleDownload(result.summary_filename!)}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                    >
                      <Download className="h-3.5 w-3.5" /> .md
                    </button>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{result.structure}</pre>
              </div>

              {/* Transcrição */}
              <div className="glass-card p-5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Transcrição completa</h3>
                  <div className="flex items-center gap-3">
                    {result.script_filename && (
                      <button
                        onClick={() => handleDownload(result.script_filename!)}
                        className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                      >
                        <Download className="h-3.5 w-3.5" /> .md
                      </button>
                    )}
                    <button onClick={() => handleCopy(result.transcription)}>
                      {copied
                        ? <CheckCheck className="h-4 w-4 text-green-500" />
                        : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{result.transcription}</p>
              </div>

              {/* Chat */}
              <div className="glass-card p-5 rounded-xl">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Pergunte sobre este vídeo
                </h3>

                {chatMessages.length === 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SUGGESTIONS.map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        onClick={() => handleChat(label)}
                        className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {chatMessages.length > 0 && (
                  <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`text-sm p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="bg-muted mr-8 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pergunte algo sobre o vídeo..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    className="flex-1 bg-muted border-none outline-none px-3 py-2 rounded-lg text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleChat()}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToolPage;
