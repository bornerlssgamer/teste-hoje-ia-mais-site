import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Copy, Zap, Eye, Clock, LinkIcon } from "lucide-react";
import Navbar from "@/components/Navbar";

const steps = [
  { icon: LinkIcon, title: "Cole o link", desc: "Insira o link do Reels, TikTok ou YouTube Short" },
  { icon: Eye, title: "Analisamos o vídeo", desc: "Nossa IA transcreve e identifica a estrutura viral" },
  { icon: Sparkles, title: "Gere seu roteiro", desc: "Adapte o conteúdo para sua marca com IA" },
];

const benefits = [
  { icon: Eye, title: "Descubra hooks virais", desc: "Identifique os primeiros segundos que prendem a atenção" },
  { icon: Copy, title: "Copie estruturas que performam", desc: "Replique padrões de vídeos com milhões de views" },
  { icon: Sparkles, title: "Gere roteiros com IA", desc: "Adapte qualquer viral para o seu nicho e produto" },
  { icon: Clock, title: "Crie conteúdo mais rápido", desc: "De minutos, não horas — análise instantânea" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(263_70%_66%/0.08),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-1.5 mb-6 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Powered by IA
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Descubra o roteiro de qualquer{" "}
              <span className="gradient-text">vídeo viral</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              Cole um link de Reels ou TikTok e transforme em roteiro para sua marca
            </p>

            {/* Glowing Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="max-w-xl mx-auto"
            >
              <div className="relative group">
                <div className="absolute -inset-1 gradient-bg rounded-2xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity" />
                <div className="relative flex items-center bg-card rounded-xl border border-border/50 p-2">
                  <LinkIcon className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
                  <input
                    type="text"
                    placeholder="Cole o link do vídeo aqui..."
                    className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-foreground placeholder:text-muted-foreground font-body"
                    readOnly
                  />
                  <Link to="/tool">
                    <Button variant="hero" className="shrink-0">
                      Analisar <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            <p className="text-sm text-muted-foreground mt-4">
              Funciona com Instagram, TikTok, YouTube Shorts e mais
            </p>
          </motion.div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Como funciona
            </h2>
            <p className="text-muted-foreground">Três passos para transformar virais em roteiros</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card rounded-2xl p-6 text-center group hover:border-primary/30 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-bg mb-4">
                  <step.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-sm font-semibold text-primary mb-1">Passo {i + 1}</div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Por que usar o <span className="gradient-text">GETVIRAU</span>?
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 flex gap-4 items-start hover:border-primary/30 transition-colors"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 border-t border-border/30">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para criar conteúdo que <span className="gradient-text">viraliza</span>?
            </h2>
            <p className="text-muted-foreground mb-8">Comece agora — é grátis</p>
            <Link to="/tool">
              <Button variant="hero" size="lg" className="text-base px-8">
                <Zap className="h-5 w-5" /> Testar grátis
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 GETVIRAU. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
