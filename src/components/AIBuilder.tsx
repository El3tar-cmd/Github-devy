import { useState, useEffect, useRef } from "react";
import { Sparkles, Code, Play, Save, Loader2, ArrowRightLeft, FileCode, Check, RefreshCw, Download } from "lucide-react";

interface AIBuilderProps {
  workspaceId: string;
  onRefreshWorkspace?: () => void;
}

const PRESETS = [
  { name: "Glass Login", prompt: "A gorgeous dark-mode glassmorphic login page with glowing borders, clean input fields, a forgot password link, social login buttons, and subtle hover animations." },
  { name: "SaaS Pricing", prompt: "A sleek pricing plan page with three tiers (Basic, Pro, Enterprise). Highlight the Pro tier with a premium purple gradient, checkmark icons for features, and smooth scale-up animations on hover." },
  { name: "Portfolio", prompt: "A modern developer portfolio hero section. Include a glowing circular profile placeholder, rich typography showing a title like 'Senior Fullstack Developer', clean tech stack badges (React, Node, Tailwind), and call-to-action buttons." },
  { name: "Dashboard", prompt: "A professional statistics dashboard panel. Include side navigation, a main header showing user profile, a grid of 4 stat cards with trend indicators (+12%, -3%), and a modern transaction table." },
];

export function AIBuilder({ workspaceId, onRefreshWorkspace }: AIBuilderProps) {
  const [prompt, setPrompt] = useState<string>(PRESETS[0].prompt);
  const [generating, setGenerating] = useState<boolean>(false);
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code" | "split">("preview");
  const [savePath, setSavePath] = useState<string>("generated-ui.html");
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generateUI = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setGenerating(true);
    setSaveSuccess(false);
    
    // Construct system instructions to return only HTML/CSS with Tailwind and Lucide
    const systemPrompt = `You are a world-class UI designer and frontend developer.
Generate a single, complete, beautiful HTML page based on the user's description.
Requirements:
1. Include Tailwind CSS CDN via: <script src="https://cdn.tailwindcss.com"></script>
2. Include FontAwesome or Lucide Icons via script or link if needed.
3. Apply rich modern styles: dark mode vibes, glassmorphism, glowing gradients, rich rounded cards, and smooth hover animations.
4. Output ONLY the raw HTML code. Do NOT wrap the output in markdown code blocks (\`\`\`html or \`\`\`). Do NOT include any intro or outro text. Just start with <!DOCTYPE html> and end with </html>.`;

    try {
      const settingsString = localStorage.getItem("agent_settings");
      const settings = settingsString ? JSON.parse(settingsString) : {};
      
      let text = "";
      if (settings.apiProvider === "ollama") {
        if (!settings.ollamaUrl) {
          throw new Error("Ollama URL is not configured. Go to settings and set it.");
        }
        if (!settings.ollamaModel) {
          throw new Error("Ollama Model is not selected. Go to settings and select one.");
        }
        const baseUrl = settings.ollamaUrl.replace(/\/+$/, "");
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: settings.ollamaModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: activePrompt }
            ],
            stream: false,
          }),
        });

        if (!res.ok) {
          throw new Error(`Ollama Error: ${(await res.text()).substring(0, 500)}`);
        }

        const data = await res.json();
        text = data.message?.content || "";
      } else {
        const geminiModel = settings.geminiModel || "gemini-2.5-flash";
        const clientApiKey = settings.geminiApiKey || "";

        const payload = {
          systemInstruction: {
            role: "user",
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            role: "user",
            parts: [{ text: activePrompt }]
          }]
        };

        const res = await fetch("/api/gemini/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: geminiModel,
            payload,
            clientApiKey
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate UI code");
        }

        const data = await res.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      
      // Clean up markdown wrapper in case model ignored instruction
      text = text.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
      
      setHtmlCode(text);
      if (viewMode === "code") {
        setViewMode("split");
      }
    } catch (e: any) {
      alert("Error generating UI: " + e.message + ". Check your provider settings.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!htmlCode || !savePath.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          path: savePath,
          content: htmlCode,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        if (onRefreshWorkspace) onRefreshWorkspace();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert("Failed to save: " + data.error);
      }
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = savePath || "generated-ui.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e11] text-slate-300">
      {/* Top panel */}
      <div className="p-4 border-b border-white/5 bg-[#141419] flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            AI UI Designer & Live Builder
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#1e1e24] p-1 rounded-lg">
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              viewMode === "preview" ? "bg-[#34343d] text-white" : "text-slate-400"
            }`}
          >
            Live Preview
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              viewMode === "code" ? "bg-[#34343d] text-white" : "text-slate-400"
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1 rounded text-xs transition-colors hidden md:block ${
              viewMode === "split" ? "bg-[#34343d] text-white" : "text-slate-400"
            }`}
          >
            Split View
          </button>
        </div>
      </div>

      {/* Preset bar & prompts */}
      <div className="p-4 bg-[#111116] border-b border-white/5 flex flex-col gap-3 shrink-0">
        <div className="flex gap-2 items-center overflow-x-auto pb-1 shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-1">
            Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setPrompt(preset.prompt);
                generateUI(preset.prompt);
              }}
              className="text-[10px] bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 rounded-lg px-2.5 py-1.5 transition-colors shrink-0 text-slate-400 font-medium"
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the UI dashboard, login card, pricing page, navbar, form..."
            className="flex-1 h-14 bg-[#18181f] border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
          />
          <button
            onClick={() => generateUI()}
            disabled={generating || !prompt.trim()}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 self-end h-14"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-current" />
            )}
            Build UI
          </button>
        </div>
      </div>

      {/* Interactive area */}
      <div className="flex-1 flex overflow-hidden bg-[#09090b]">
        {/* Split Left: Code Editor */}
        {(viewMode === "code" || viewMode === "split") && (
          <div className="flex-1 flex flex-col border-r border-white/5 h-full overflow-hidden">
            <div className="p-2.5 border-b border-white/5 bg-[#0b0b0e] flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-emerald-500" /> index.html
              </span>
              {htmlCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(htmlCode);
                    alert("Code copied to clipboard!");
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded text-[10px]"
                >
                  Copy Code
                </button>
              )}
            </div>
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              className="flex-1 bg-[#09090b] text-slate-300 text-xs font-mono p-4 resize-none outline-none leading-relaxed overflow-y-auto w-full border-none select-text"
              placeholder="Code will appear here after building..."
            />
          </div>
        )}

        {/* Split Right: Live Iframe Rendering */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="flex-1 flex flex-col h-full bg-[#0c0c0f]">
            <div className="p-2.5 border-b border-white/5 bg-[#0b0b0e] flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Live Iframe Preview</span>
              {htmlCode && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={savePath}
                    onChange={(e) => setSavePath(e.target.value)}
                    placeholder="e.g. index.html"
                    className="bg-[#18181f] text-[10px] text-white border border-white/10 rounded px-2 py-1 focus:outline-none w-36 font-mono"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    {saveSuccess ? "Saved!" : "Save File"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-2.5 py-1 bg-[#1e1e24] hover:bg-[#2a2a32] border border-white/10 text-slate-300 hover:text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="تحميل الملف مباشرة إلى جهازك"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 bg-white relative">
              {generating ? (
                <div className="absolute inset-0 bg-[#0e0e11]/90 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono z-10">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                  <span className="text-xs">Generating layout & design assets...</span>
                </div>
              ) : htmlCode ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlCode}
                  title="AI Generated UI Preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="absolute inset-0 bg-[#0e0e11] flex flex-col items-center justify-center text-slate-500 space-y-2 text-center p-6">
                  <Sparkles className="w-12 h-12 text-slate-700/50 animate-pulse" />
                  <p className="text-xs max-w-xs leading-normal">
                    Enter a prompt above and click "Build UI" to generate a stunning previewable frontend template using Tailwind CSS!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
