import { ChatMessage, Settings, ToolInvocation } from "./types";

export const TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the entire contents of a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file_lines",
      description: "Read specific line ranges of a file. Use this for reading sections of large files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          startLine: { type: "number", description: "The 1-based start line number (inclusive)" },
          endLine: { type: "number", description: "The 1-based end line number (inclusive)" }
        },
        required: ["path", "startLine", "endLine"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write string content to a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description:
        "Replace a specific string in a file with new content. Useful for targeted edits.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          search: { type: "string" },
          replace: { type: "string" },
        },
        required: ["path", "search", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_content",
      description: "Search using grep for a specific pattern in the workspace",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          directory: { type: "string" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command in the workspace. Useful for ls, npm install, etc",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web using DuckDuckGo to find information",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_browse",
      description:
        "Browse, scrape, or read the textual content of any specific webpage or URL. Extremely useful for reading documentation links.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The absolute URL to browse or read (e.g. https://example.com/docs)",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory_files",
      description:
        "Recursively list all files and subdirectories starting from a target directory path to understand workspace structure.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'The target directory path. Defaults to "." for workspace root.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sequential_thinking",
      description:
        "Used for step-by-step thinking or planning before acting. Just pass your thought.",
      parameters: {
        type: "object",
        properties: { thought: { type: "string" } },
        required: ["thought"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_commit_push",
      description: "Commit all changes and push to GitHub",
      parameters: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clone_git_repository",
      description:
        "Clone a GitHub repository into the active workspace, with an optional GitHub access token.",
      parameters: {
        type: "object",
        properties: {
          repoUrl: {
            type: "string",
            description:
              "The HTTPS URL of the GitHub repository (e.g., https://github.com/user/repo).",
          },
          token: {
            type: "string",
            description:
              "Optional GitHub personal access token (e.g. ghp_...) for private repositories.",
          },
        },
        required: ["repoUrl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description:
        "Navigate the local Sandbox Browser Preview to a specific address or local port (e.g. \"http://localhost:5173\" or just \"http://localhost:3000\"). Use this whenever you start a web server/application to view it.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The local URL or port to load, e.g. \"http://localhost:5173/\" or \"3000\".",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description:
        "Simulate a real mouse click on a DOM element inside the active Sandbox Browser page using its CSS selector.",
      parameters: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description:
              "The CSS selector of the click target element, e.g. \"button#login-btn\".",
          },
        },
        required: ["selector"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description:
        "Simulate keyboard typing into a DOM input/textarea element inside the active Sandbox Browser page using its CSS selector.",
      parameters: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "The CSS selector of the input field, e.g. \"input[type=email]\".",
          },
          text: {
            type: "string",
            description: "The plain text to type into the input field.",
          },
        },
        required: ["selector", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_state",
      description:
        "Retrieve the current active URL and captured snapshot HTML of the local Sandbox Browser Preview. Use this to verify rendering output and diagnose UI pages.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Get status of the Git repository in the workspace (modified, untracked, added, deleted files)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Get diff of a specific file in the local Git repository",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "The relative path of the file to see git diff for" }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "git_pull",
      description: "Pull latest changes from remote Git repository",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "git_push",
      description: "Push committed local branch changes to remote Git repository",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "git_init",
      description: "Initialize a new local Git repository in workspace root",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_packages",
      description: "Install, uninstall, or update npm packages in the workspace project",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["install", "uninstall", "update", "list"],
            description: "The package action to perform"
          },
          packageName: {
            type: "string",
            description: "Optional package name. Leave empty for general install/update of all dependencies in package.json."
          },
          isDev: {
            type: "boolean",
            description: "Set true if it should be installed as devDependency"
          }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ask_human",
      description: "Request clarification, instructions, sensitive credentials (like passwords/API keys), or design feedback from the human user.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The specific question or instructions prompt to show to the human." }
        },
        required: ["question"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Capture a visual screenshot of the Sandbox Browser Preview viewport. The output is saved to a unique file under '.github-devy/screenshots/' in the workspace.",
      parameters: { type: "object", properties: {} }
    }
  }
];

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
    case "read_file":
      return await req("/api/fs/read", args);
    case "read_file_lines":
      return await req("/api/fs/read-lines", args);
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
