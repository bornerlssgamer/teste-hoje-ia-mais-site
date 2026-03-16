import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Play, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const MOCK_HISTORY = [
  { id: 1, title: "Como ganhar seguidores em 2026", platform: "Instagram", date: "Hoje", type: "Educacional" },
  { id: 2, title: "3 hacks de produtividade", platform: "TikTok", date: "Ontem", type: "Lista" },
  { id: 3, title: "Storytelling que vende", platform: "YouTube", date: "12 Mar", type: "Storytelling" },
  { id: 4, title: "Tendências de marketing digital", platform: "Instagram", date: "10 Mar", type: "Tutorial" },
  { id: 5, title: "Como criar um funil de vendas", platform: "TikTok", date: "8 Mar", type: "Educacional" },
  { id: 6, title: "Roteiro para Reels que viralizam", platform: "Instagram", date: "5 Mar", type: "Lista" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-10 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Seus vídeos analisados</p>
          </div>
          <Link to="/tool">
            <Button variant="hero">Novo vídeo</Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_HISTORY.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-5 hover:border-primary/30 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {item.platform}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {item.date}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Play className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm leading-tight">
                  {item.title}
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.type}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
