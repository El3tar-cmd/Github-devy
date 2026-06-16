import { ChatMessage, ToolInvocation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, ChevronRight, CheckCircle2, CircleDashed, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatMessageUI({ msg }: { msg: ChatMessage }) {
  const isAgent = msg.role === 'assistant';
  const isUser = msg.role === 'user';
  const isTool = msg.role === 'tool';
  const isSystem = msg.role === 'system';

  if (isTool) {
    return null; // Tools don't render standalone visually
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-3 md:gap-4 p-4 md:p-5 rounded-2xl mb-4 text-sm leading-relaxed overflow-hidden max-w-full', 
         isUser ? 'bg-[#2a2a32] text-slate-100 ml-auto w-fit max-w-[85%] border border-[#34343d] items-center': 
         isSystem ? 'bg-rose-900/30 text-rose-300 border border-rose-500/30 font-mono w-full':
         'bg-transparent text-slate-300 w-full')}
    >
      {!isUser && !isSystem && (
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0 mt-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <Bot className="w-5 h-5 text-emerald-400" />
        </div>
      )}

      <div className="flex-1 overflow-x-hidden min-w-0 w-full max-w-full">
         {msg.costUsd !== undefined && (msg.inputTokens !== undefined || msg.outputTokens !== undefined) && (
            <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-slate-500 bg-white/[0.02] border border-white/5 w-fit px-2 py-0.5 rounded-full select-none">
              <span>Cost: <span className="text-emerald-400">${msg.costUsd.toFixed(6)}</span></span>
              <span className="text-slate-600">|</span>
              <span>Tokens: {msg.inputTokens || 0} in / {msg.outputTokens || 0} out</span>
            </div>
         )}
         {msg.content && (
            <div className={clsx("break-words overflow-hidden w-full max-w-full", !isUser && "prose prose-invert prose-emerald max-w-none prose-pre:bg-[#151519] prose-pre:border prose-pre:border-white/10 prose-headings:text-emerald-50 prose-a:text-emerald-400 prose-p:text-slate-300")}>
               {isUser ? msg.content : (
                  <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
               )}
            </div>
         )}
         
         {msg.toolInvocations && msg.toolInvocations.length > 0 && (
            <div className="mt-4 space-y-3">
               <AnimatePresence>
                  {msg.toolInvocations.map((inv, idx) => (
                     <ToolInvocationCard key={idx} inv={inv} />
                  ))}
               </AnimatePresence>
            </div>
         )}
      </div>
    </motion.div>
  );
}

function ToolInvocationCard({ inv }: { inv: ToolInvocation }) {
  const [expanded, setExpanded] = useState(() => {
    return inv.name === 'browser_screenshot' && inv.status === 'success';
  });

  useEffect(() => {
    if (inv.name === 'browser_screenshot' && inv.status === 'success') {
      setExpanded(true);
    }
  }, [inv.status, inv.name]);

  const renderScreenshotResult = () => {
    if (!inv.result) return null;

    try {
      const resObj = JSON.parse(inv.result);
      if (typeof resObj.screenshot === 'string' && resObj.screenshot.startsWith('data:image/png;base64,')) {
        return (
          <div className="p-2 bg-[#1a1a21] rounded-xl border border-white/5 max-w-full overflow-hidden">
            <img
              src={resObj.screenshot}
              alt="Browser Sandbox Screenshot"
              className="rounded-lg max-w-full h-auto border border-white/10 shadow-lg object-contain mx-auto"
              style={{ maxHeight: '450px' }}
            />
            <p className="text-[10px] text-slate-500 mt-2 font-mono text-center">{resObj.message}</p>
          </div>
        );
      }

      return (
        <pre className="text-[11px] font-mono text-slate-300 m-0 leading-relaxed whitespace-pre-wrap break-words bg-[#1a1a21] p-3 rounded-lg border border-white/5">
          {JSON.stringify(resObj, null, 2)}
        </pre>
      );
    } catch (e) {
      return (
        <pre className="text-[11px] font-mono text-slate-300 m-0 leading-relaxed whitespace-pre-wrap break-words bg-[#1a1a21] p-3 rounded-lg border border-white/5">
          {inv.result}
        </pre>
      );
    }
  };

  const renderSubAgentResult = () => {
    if (!inv.result) return null;
    
    try {
      const res = JSON.parse(inv.result);
      
      // Check if it is a running progress state
      if (res.agentId && res.status && !res.result && !res.agents) {
        return (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl font-mono text-[11px] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Sub-Agent [{res.agentId.substring(0, 6)}...]: {res.status}</span>
          </div>
        );
      }
      
      // Parallel sub-agents results
      if (Array.isArray(res.agents)) {
        return (
          <div className="space-y-3 w-full">
            {res.agents.map((agent: any, idx: number) => (
              <div key={idx} className="bg-[#121217] border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1 text-xs">
                  <span className="font-bold text-emerald-400">🤖 {agent.agentType} Agent</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                    agent.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'
                  }`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>
                {agent.result && (
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300 font-sans leading-relaxed select-text mt-2 text-left">
                    <Markdown remarkPlugins={[remarkGfm]}>{agent.result}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      
      // Single sub-agent completed result
      if (res.agentId && res.result) {
        return (
          <div className="space-y-3 bg-[#121217] border border-white/5 rounded-xl p-4 w-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
              <span className="font-bold text-emerald-400">🤖 {res.agentType.toUpperCase()} Agent</span>
              <span className="text-slate-500 font-mono text-[10px]">
                Iterations: {res.iterationsUsed} | ID: {res.agentId.substring(0, 6)}
              </span>
            </div>
            <div className="prose prose-invert prose-xs max-w-none text-slate-300 font-sans leading-relaxed select-text mt-2 text-left">
              <Markdown remarkPlugins={[remarkGfm]}>{res.result}</Markdown>
            </div>
          </div>
        );
      }
    } catch (e) {
      // Fallback
    }
    
    return null;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-white/5 bg-[#1e1e24] overflow-hidden"
    >
       <div 
         onClick={() => setExpanded(!expanded)}
         className="px-3 md:px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors gap-3"
       >
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 overflow-hidden">
             {inv.status === 'running' && <CircleDashed className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
             {inv.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
             {inv.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
             
             <span className="font-mono text-[11px] md:text-xs text-slate-300 font-semibold shadow-sm shrink-0">
                {inv.name}
             </span>
             <span className="font-mono text-[11px] md:text-xs text-slate-500 truncate min-w-0 flex-1 ml-1 md:ml-2">
                {JSON.stringify(inv.args)}
             </span>
          </div>
          <button className="text-slate-500 shrink-0 ml-1">
             {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
       </div>
       
       <AnimatePresence>
          {expanded && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="border-t border-white/5 bg-[#151519] overflow-hidden text-xs"
             >
                <div className="p-4 space-y-4">
                   <div>
                      <div className="text-slate-500 font-mono mb-1 text-[10px] uppercase tracking-wider">Arguments</div>
                      <pre className="text-[11px] font-mono text-emerald-400/80 m-0 leading-relaxed whitespace-pre-wrap break-words bg-[#1a1a21] p-3 rounded-lg border border-white/5">
                        {JSON.stringify(inv.args, null, 2)}
                      </pre>
                   </div>
                   
                   {inv.result ? (
                      <div className="space-y-2">
                         <div className="text-slate-500 font-mono mb-1 text-[10px] uppercase tracking-wider">Result</div>
                         
                         {inv.name === 'browser_screenshot' && renderScreenshotResult()}
                         {(inv.name === 'invoke_subagent' || inv.name === 'invoke_parallel_subagents') && renderSubAgentResult()}

                         {inv.name !== 'browser_screenshot' && inv.name !== 'invoke_subagent' && inv.name !== 'invoke_parallel_subagents' && (
                           <pre className="text-[11px] font-mono text-slate-300 m-0 leading-relaxed whitespace-pre-wrap break-words bg-[#1a1a21] p-3 rounded-lg border border-white/5">
                             {inv.result.length > 5000 ? '...[truncated]\n' + inv.result.substring(inv.result.length - 5000) : inv.result}
                           </pre>
                         )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px] italic">Waiting for result...</div>
                    )}
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </motion.div>
  );
}
