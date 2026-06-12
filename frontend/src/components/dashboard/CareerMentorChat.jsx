import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, BrainCircuit, Sparkles } from 'lucide-react';

export default function CareerMentorChat() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I am your AI Career Mentor. Ask me anything about your career path, resume, or interview prep.' }
  ]);

  const chips = [
    "What should I learn next?",
    "Am I ready to apply?",
    "How to improve my resume?",
    "Which projects to build?"
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: "That's a great question! Based on your current profile, I recommend focusing on building a full-stack project to demonstrate your end-to-end skills." }]);
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="glass-card flex flex-col h-[400px] overflow-hidden"
    >
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">AI Career Mentor</h3>
          <p className="text-[10px] text-accent-cyan flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" /> Online
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-primary-500 text-white rounded-tr-sm' 
                : 'bg-white/10 text-slate-200 rounded-tl-sm border border-white/5'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 rounded-tl-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 bg-dark-900/50">
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {chips.map((chip, i) => (
            <button 
              key={i}
              onClick={() => handleSend(chip)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI career mentor anything..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-primary-500/50 placeholder-slate-500"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary-400 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
