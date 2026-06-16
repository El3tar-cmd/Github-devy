import { ChatMessage, Settings, ToolInvocation } from "./types";
import { AgentOrchestrator } from "./agent/orchestrator/AgentOrchestrator";
import { TOOLS_SCHEMA } from "./agent/tools/toolsSchema";


export async function fetchOllamaModels(url: string) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/tags`);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return { models: data.models.map((m: any) => m.name), error: null };
  } catch (error: any) {
    return {
      models: [],
      error:
        "Failed to fetch (check CORS or mixed-content if running on HTTPS)",
    };
  }
}

export async function executeToolCall(
  name: string,
  args: any,
  workspaceId: string,
  settings?: Settings,
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
) {
  const proxyBase = ""; // Running on same domain since Vite proxies/serves in dev/prod

  const req = async (path: string, body: any) => {
    const res = await fetch(proxyBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, workspaceId }),
      signal,
    });
    return res.json();
  };

  if (name === "run_command") {
    const res = await fetch(proxyBase + "/api/cmd/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, workspaceId }),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return { output: "No output" };
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      if (onChunk) onChunk(result);
    }
    return { output: result || "Command executed successfully." };
  }

  switch (name) {
    case "read_file": {
      const result = await req("/api/fs/read", args);
      const MAX_CHARS = 32000; // ~8000 tokens
      if (result && typeof result.content === "string" && result.content.length > MAX_CHARS) {
        result.content = result.content.substring(0, MAX_CHARS) + 
          `\n\n... [TRUNCATED — file is ${result.content.length} characters. Use read_file_lines to read specific sections of this file]`;
      }
      return result;
    }
    case "read_file_lines": {
      const result = await req("/api/fs/read-lines", args);
      const MAX_LINES = 1000;
      if (result && typeof result.content === "string" && (args.endLine - args.startLine) > MAX_LINES) {
        result.content = result.content.split("\n").slice(0, MAX_LINES).join("\n") +
          `\n\n... [TRUNCATED — requested line range exceeds ${MAX_LINES} lines]`;
      }
      return result;
    }
    case "write_file":
      return await req("/api/fs/write", args);
    case "replace_in_file":
      return await req("/api/fs/replace", args);
    case "search_content":
      return await req("/api/fs/search", args);
    case "web_search":
      return await req("/api/web/search", args);
    case "web_browse":
      return await req("/api/web/browse", args);
    case "list_directory_files":
      return await req("/api/fs/list", args);
    case "git_commit_push":
      return await req("/api/git/commit", args);
    case "clone_git_repository":
      return await req("/api/git/clone", args);
    case "browser_navigate":
      return await req("/api/browser/action", { type: "navigate", url: args.url });
    case "browser_click":
      return await req("/api/browser/action", { type: "click", selector: args.selector });
    case "browser_type":
      return await req("/api/browser/action", { type: "type", selector: args.selector, text: args.text });
    case "browser_get_state":
      return await req("/api/browser/action", { type: "get-html" });
    case "sequential_thinking":
      return { success: true, acknowledged_thought: args.thought };
    case "git_status":
      return await req("/api/git/status", {});
    case "git_diff":
      return await req("/api/git/diff", { filePath: args.filePath });
    case "git_pull":
      return await req("/api/git/pull", {});
    case "git_push":
      return await req("/api/git/push", {});
    case "git_init":
      return await req("/api/git/init", {});
    case "manage_packages": {
      if (args.action === "list") {
        return await req("/api/package/list", {});
      }
      let cmdStr = "";
      if (args.action === "install") {
        cmdStr = args.packageName ? `npm install ${args.packageName} ${args.isDev ? "-D" : ""}` : "npm install";
      } else if (args.action === "uninstall") {
        cmdStr = `npm uninstall ${args.packageName}`;
      } else if (args.action === "update") {
        cmdStr = `npm update ${args.packageName || ""}`;
      }
      
      const res = await fetch(proxyBase + "/api/cmd/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmdStr, workspaceId }),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) return { output: "No output" };
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        if (onChunk) onChunk(result);
      }
      return { output: result || "Package operation executed successfully." };
    }
    case "ask_human": {
      if ((window as any).askHuman) {
        const answer = await (window as any).askHuman(args.question);
        return { answer };
      }
      const answer = prompt(`Devy asks: ${args.question}`);
      return { answer: answer || "Cancelled or empty response." };
    }
    case "browser_screenshot": {
      try {
        const loadHtml2Canvas = (targetWindow: Window, targetDocument: Document) => {
          return new Promise<any>((resolve, reject) => {
            if ((targetWindow as any).html2canvas) {
              resolve((targetWindow as any).html2canvas);
              return;
            }
            const script = targetDocument.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
            script.onload = () => resolve((targetWindow as any).html2canvas);
            script.onerror = () => reject(new Error("Unable to load html2canvas screenshot library."));
            (targetDocument.head || targetDocument.documentElement).appendChild(script);
            setTimeout(() => {
              if (!(targetWindow as any).html2canvas) {
                reject(new Error("Timed out loading html2canvas screenshot library."));
              }
            }, 10000);
          });
        };
        const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
        if (!iframe) {
          return { error: "Sandbox Browser Preview viewport is closed. Open the 'Preview' tab in the IDE first." };
        }
        const iframeWindow = iframe.contentWindow;
        const iframeDoc = iframe.contentDocument || iframeWindow?.document;
        if (!iframeWindow || !iframeDoc || !iframeDoc.body) {
          return { error: "Unable to read Sandbox Browser iframe body document contents." };
        }

        const html2canvas = await loadHtml2Canvas(iframeWindow, iframeDoc);
        if (!html2canvas) {
          return { error: "Screenshot failed: html2canvas screenshot library is unavailable in the preview iframe." };
        }

        const waitForPreviewPaint = async () => {
          if (iframeDoc.readyState !== "complete") {
            await new Promise<void>((resolve) => {
              iframeWindow?.addEventListener("load", () => resolve(), { once: true });
              setTimeout(resolve, 3000);
            });
          }

          try {
            await Promise.race([
              iframeDoc.fonts?.ready,
              new Promise((resolve) => setTimeout(resolve, 1500)),
            ]);
          } catch (e) {}

          const images = Array.from(iframeDoc.images || []);
          await Promise.race([
            Promise.all(images.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              });
            })),
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);

          await new Promise<void>((resolve) => iframeWindow?.requestAnimationFrame(() => resolve()) || resolve());
          await new Promise<void>((resolve) => iframeWindow?.requestAnimationFrame(() => resolve()) || resolve());
        };

        await waitForPreviewPaint();

        const target = iframeDoc.body || iframeDoc.documentElement;
        const iframeRect = iframe.getBoundingClientRect();
        const body = iframeDoc.body;
        const viewportWidth = Math.max(
          Math.floor(iframeRect.width),
          iframe.clientWidth,
          iframeWindow?.innerWidth || 0,
          target.clientWidth || 0,
          body.clientWidth || 0,
          target.scrollWidth || 0,
          body.scrollWidth || 0,
          1280,
        );
        const viewportHeight = Math.max(
          Math.floor(iframeRect.height),
          iframe.clientHeight,
          iframeWindow?.innerHeight || 0,
          target.clientHeight || 0,
          body.clientHeight || 0,
          720,
        );
        const width = viewportWidth;
        const height = viewportHeight;

        const isGradientCaptureError = (err: any) => {
          const message = String(err?.message || err || "");
          return message.includes("addColorStop") ||
            message.includes("CanvasGradient") ||
            message.includes("non-finite");
        };

        const disableCssGradients = (clonedDoc: Document) => {
          const clonedWindow = clonedDoc.defaultView;
          const elements = Array.from(clonedDoc.querySelectorAll<HTMLElement>("*"));
          for (const element of elements) {
            const style = clonedWindow?.getComputedStyle(element);
            const backgroundImage = style?.backgroundImage || element.style.backgroundImage;
            const borderImageSource = style?.borderImageSource || element.style.borderImageSource;
            const listStyleImage = style?.listStyleImage || element.style.listStyleImage;
            const maskImage = style?.maskImage || element.style.maskImage;
            const webkitMaskImage = style?.getPropertyValue("-webkit-mask-image") || element.style.getPropertyValue("-webkit-mask-image");

            if (backgroundImage.includes("gradient(")) {
              element.style.backgroundImage = "none";
            }
            if (borderImageSource.includes("gradient(")) {
              element.style.borderImageSource = "none";
            }
            if (listStyleImage.includes("gradient(")) {
              element.style.listStyleImage = "none";
            }
            if (maskImage.includes("gradient(")) {
              element.style.maskImage = "none";
            }
            if (webkitMaskImage.includes("gradient(")) {
              element.style.setProperty("-webkit-mask-image", "none");
            }
          }
        };

        const screenshotOptions = {
          useCORS: true,
          allowTaint: true,
          logging: false,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
        };

        const isLowDetailCanvas = (candidate: HTMLCanvasElement) => {
          try {
            const context = candidate.getContext("2d");
            if (!context || !candidate.width || !candidate.height) return true;

            const sampleWidth = Math.min(candidate.width, 80);
            const sampleHeight = Math.min(candidate.height, 80);
            const sampleCanvas = iframeDoc.createElement("canvas");
            sampleCanvas.width = sampleWidth;
            sampleCanvas.height = sampleHeight;
            const sampleContext = sampleCanvas.getContext("2d");
            if (!sampleContext) return false;

            sampleContext.drawImage(candidate, 0, 0, sampleWidth, sampleHeight);
            const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
            const colors = new Set<string>();
            let totalDiff = 0;
            let lastR = pixels[0] || 0;
            let lastG = pixels[1] || 0;
            let lastB = pixels[2] || 0;

            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i] || 0;
              const g = pixels[i + 1] || 0;
              const b = pixels[i + 2] || 0;
              colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
              totalDiff += Math.abs(r - lastR) + Math.abs(g - lastG) + Math.abs(b - lastB);
              lastR = r;
              lastG = g;
              lastB = b;
              if (colors.size > 8 && totalDiff > 1200) {
                return false;
              }
            }

            return colors.size <= 4 || totalDiff <= 1200;
          } catch (e) {
            return false;
          }
        };

        let usedGradientFallback = false;
        let usedForeignObjectFallback = false;
        let usedLowDetailFallback = false;
        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(target, screenshotOptions);
        } catch (err: any) {
          if (!isGradientCaptureError(err)) {
            throw err;
          }

          try {
            usedForeignObjectFallback = true;
            canvas = await html2canvas(target, {
              ...screenshotOptions,
              foreignObjectRendering: true,
            });
          } catch (foreignObjectErr: any) {
            if (!isGradientCaptureError(foreignObjectErr)) {
              throw foreignObjectErr;
            }

            usedGradientFallback = true;
            canvas = await html2canvas(target, {
              ...screenshotOptions,
              onclone: disableCssGradients,
            });
          }
        }

        if (isLowDetailCanvas(canvas)) {
          usedLowDetailFallback = true;
          const alternateTarget = iframeDoc.documentElement || target;
          try {
            canvas = await html2canvas(alternateTarget, {
              ...screenshotOptions,
              foreignObjectRendering: true,
            });
            usedForeignObjectFallback = true;
          } catch (err: any) {
            if (!isGradientCaptureError(err)) {
              throw err;
            }

            usedGradientFallback = true;
            canvas = await html2canvas(alternateTarget, {
              ...screenshotOptions,
              onclone: disableCssGradients,
            });
          }
        }

        if (isLowDetailCanvas(canvas)) {
          return {
            error: "Screenshot failed: capture completed but appears blank or near-solid. Open the Preview tab and wait for the app content to render, then try again.",
          };
        }

        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        if (!dataUrl.startsWith("data:image/png;base64,") || !base64) {
          return {
            error: "Screenshot failed: Browser capture produced an empty PNG. Make sure the Preview tab is visible and the page has finished rendering.",
          };
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const screenshotPath = `.github-devy/screenshots/screenshot-${timestamp}.png`;

        const writeResult = await req("/api/fs/write", {
          path: screenshotPath,
          content: base64,
          encoding: "base64",
        });

        if (!writeResult?.success || !writeResult.bytesWritten) {
          return {
            error: `Screenshot failed: PNG write returned ${writeResult?.bytesWritten || 0} bytes.`,
          };
        }

        return {
          success: true,
          message: `Screenshot successfully captured and saved to '${screenshotPath}' in the workspace (${writeResult.bytesWritten} bytes).${usedLowDetailFallback ? " Retried capture after the first image looked blank." : ""}${usedForeignObjectFallback ? " Used browser foreignObject rendering after html2canvas could not render a CSS gradient." : ""}${usedGradientFallback ? " CSS gradients were disabled in the capture fallback because html2canvas could not render one of them." : ""}`,
          path: screenshotPath,
          bytesWritten: writeResult.bytesWritten,
          gradientFallback: usedGradientFallback,
          foreignObjectFallback: usedForeignObjectFallback,
          lowDetailFallback: usedLowDetailFallback,
          screenshot: dataUrl,
        };
      } catch (err: any) {
        return { error: `Screenshot failed: ${err.message}` };
      }
    }
    case "search_codebase_rag":
      return await req("/api/rag/search", { ...args, clientApiKey: settings?.geminiApiKey });
    case "index_codebase_rag":
      return await req("/api/rag/index", { clientApiKey: settings?.geminiApiKey });
    case "invoke_subagent": {
      if (!settings) {
        return { error: "Settings are required to invoke subagents." };
      }
      let orchestrator = (window as any).__agentOrchestrator;
      if (!orchestrator) {
        orchestrator = new AgentOrchestrator();
        (window as any).__agentOrchestrator = orchestrator;
      }
      
      const instancePromise = orchestrator.invokeSubAgent(
        args.agentType,
        args.task,
        settings,
        workspaceId,
        TOOLS_SCHEMA,
        executeToolCall,
        (agentId: string, status: string) => {
          if (onChunk) onChunk(JSON.stringify({ agentId, status }));
        },
        args.maxIterations,
        args.timeoutSeconds
      );
      
      if (args.background) {
        const allAgents = orchestrator.getAll();
        const latest = allAgents[allAgents.length - 1];
        return {
          agentId: latest ? latest.id : "unknown",
          agentType: args.agentType,
          status: "running",
          background: true,
          message: "Sub-agent started successfully in the background. Check status using get_subagent_status."
        };
      }
      
      const instance = await instancePromise;
      return {
        agentId: instance.id,
        agentType: args.agentType,
        status: instance.status,
        result: instance.result,
        iterationsUsed: instance.messages.filter(m => m.role === 'assistant').length,
      };
    }
    case "invoke_parallel_subagents": {
      if (!settings) {
        return { error: "Settings are required to invoke parallel subagents." };
      }
      let orchestrator = (window as any).__agentOrchestrator;
      if (!orchestrator) {
        orchestrator = new AgentOrchestrator();
        (window as any).__agentOrchestrator = orchestrator;
      }
      
      const tasks = args.agents.map((a: any) => ({
        typeName: a.agentType,
        task: a.task,
        maxIterations: a.maxIterations,
        timeoutSeconds: a.timeoutSeconds
      }));
      
      const instancesPromise = orchestrator.invokeParallel(
        tasks,
        settings,
        workspaceId,
        TOOLS_SCHEMA,
        executeToolCall,
        (agentId: string, status: string) => {
          if (onChunk) onChunk(JSON.stringify({ agentId, status }));
        }
      );
      
      if (args.background) {
        const allAgents = orchestrator.getAll();
        const count = args.agents.length;
        const latest = allAgents.slice(-count);
        return {
          agents: latest.map(inst => ({
            agentId: inst.id,
            agentType: inst.definition.name,
            status: "running",
          })),
          background: true,
          message: "Parallel sub-agents started successfully in the background."
        };
      }
      
      const instances = await instancesPromise;
      return {
        agents: instances.map(inst => ({
          agentId: inst.id,
          agentType: inst.definition.name,
          status: inst.status,
          result: inst.result,
        }))
      };
    }
    case "get_subagent_status": {
      const orchestrator = (window as any).__agentOrchestrator;
      if (!orchestrator) {
        return { error: "No active orchestrator found." };
      }
      const instance = orchestrator.getAgent(args.agentId);
      if (!instance) {
        return { error: `Sub-agent with ID ${args.agentId} not found.` };
      }
      return {
        agentId: instance.id,
        agentType: instance.definition.name,
        status: instance.status,
        result: instance.result,
        iterationsUsed: instance.messages.filter((m: any) => m.role === 'assistant').length,
      };
    }
    case "list_subagents": {
      const orchestrator = (window as any).__agentOrchestrator;
      if (!orchestrator) {
        return { error: "No active orchestrator found." };
      }
      const instances = orchestrator.getAll();
      return {
        agents: instances.map((inst: any) => ({
          agentId: inst.id,
          agentType: inst.definition.name,
          status: inst.status,
          startedAt: inst.startedAt,
        }))
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function initializeRepo(
  repoUrl: string,
  token: string,
  workspaceId: string,
) {
  const res = await fetch("/api/git/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl, token, workspaceId }),
  });
  return res.json();
}
