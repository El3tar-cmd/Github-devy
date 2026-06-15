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
      description: "Capture a visual screenshot of the Sandbox Browser Preview viewport. The output is saved to '.github-devy/screenshot.png' in the workspace.",
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
        const loadHtml2Canvas = () => {
          return new Promise<any>((resolve) => {
            if ((window as any).html2canvas) {
              resolve((window as any).html2canvas);
              return;
            }
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
            script.onload = () => resolve((window as any).html2canvas);
            document.head.appendChild(script);
          });
        };

        const html2canvas = await loadHtml2Canvas();
        const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
        if (!iframe) {
          return { error: "Sandbox Browser Preview viewport is closed. Open the 'Preview' tab in the IDE first." };
        }
        const iframeWindow = iframe.contentWindow;
        const iframeDoc = iframe.contentDocument || iframeWindow?.document;
        if (!iframeDoc || !iframeDoc.body) {
          return { error: "Unable to read Sandbox Browser iframe body document contents." };
        }

        const canvas = await html2canvas(iframeDoc.body, {
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        await req("/api/fs/write", {
          path: ".github-devy/screenshot.png",
          content: base64,
          encoding: "base64",
        });

        return {
          success: true,
          message: "Screenshot successfully captured and saved to '.github-devy/screenshot.png' in the workspace. You can read/verify changes.",
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
