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
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Capture a visual screenshot of the Sandbox Browser Preview viewport. The output is saved to a unique file under '.github-devy/screenshots/' in the workspace.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "invoke_subagent",
      description: "Spawn a specialized sub-agent to handle a specific task. Can be run in the background (asynchronously) or foreground (synchronously, blocks until done).",
      parameters: {
        type: "object",
        properties: {
          agentType: {
            type: "string",
            enum: ["researcher", "coder", "reviewer", "debugger", "planner"],
            description: "The type of sub-agent to spawn",
          },
          task: {
            type: "string",
            description: "A clear, detailed task description for the sub-agent",
          },
          maxIterations: {
            type: "number",
            description: "Optional. Maximum ReAct iterations for the sub-agent (default is 10, range: 1-30).",
          },
          timeoutSeconds: {
            type: "number",
            description: "Optional. Maximum runtime in seconds before the sub-agent execution is aborted (e.g. 120).",
          },
          background: {
            type: "boolean",
            description: "Optional. Set true to run this sub-agent asynchronously in the background and return immediately. Defaults to false.",
          }
        },
        required: ["agentType", "task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invoke_parallel_subagents",
      description: "Spawn multiple sub-agents in parallel to work on different aspects of a complex task simultaneously.",
      parameters: {
        type: "object",
        properties: {
          agents: {
            type: "array",
            description: "Array of sub-agents to launch in parallel",
            items: {
              type: "object",
              properties: {
                agentType: {
                  type: "string",
                  enum: ["researcher", "coder", "reviewer", "debugger", "planner"],
                  description: "The type of sub-agent to spawn",
                },
                task: { type: "string", description: "The task description for this sub-agent" },
                maxIterations: { type: "number", description: "Optional. Maximum ReAct iterations for this sub-agent." },
                timeoutSeconds: { type: "number", description: "Optional. Maximum runtime in seconds for this sub-agent." }
              },
              required: ["agentType", "task"],
            },
          },
          background: {
            type: "boolean",
            description: "Optional. Set true to run all these parallel sub-agents in the background concurrently. Defaults to false.",
          }
        },
        required: ["agents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_codebase_rag",
      description: "Search the codebase using a hybrid TF-IDF symbol and semantic embedding retriever to find relevant code snippets, functions, classes, and types.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The semantic or keyword query describing the feature, function name, or symbol to search for"
          },
          limit: {
            type: "number",
            description: "The maximum number of matches to return (default is 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "index_codebase_rag",
      description: "Rebuild the codebase RAG index manually. Call this after making large code updates to keep the search index accurate.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_subagent_status",
      description: "Check the current execution status and get final results of a background sub-agent.",
      parameters: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "The unique ID of the sub-agent to check"
          }
        },
        required: ["agentId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_subagents",
      description: "List all active and completed sub-agents spawned in this session.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
];
