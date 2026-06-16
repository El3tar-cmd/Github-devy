import { SubAgentInstance } from "../types/AgentTypes";
import { AGENT_REGISTRY } from "./AgentRegistry";
import { runSubAgent } from "./SubAgentRunner";
import { MessageBus } from "./MessageBus";
import { Settings } from "../../types";

export class AgentOrchestrator {
  private activeAgents: Map<string, SubAgentInstance> = new Map();
  private messageBus: MessageBus = new MessageBus();
  private abortControllers: Map<string, AbortController> = new Map();

  async invokeSubAgent(
    typeName: string,
    task: string,
    settings: Settings,
    workspaceId: string,
    toolsSchema: any[],
    executeToolCallFn: any,
    onProgress?: (agentId: string, status: string) => void,
    maxIterations?: number,
    timeoutSeconds?: number
  ): Promise<SubAgentInstance> {
    const definition = AGENT_REGISTRY[typeName];
    if (!definition) throw new Error(`Unknown agent type: ${typeName}`);

    const instance: SubAgentInstance = {
      id: Math.random().toString(36).substring(7),
      definition,
      status: "running",
      messages: [],
      startedAt: Date.now()
    };

    this.activeAgents.set(instance.id, instance);
    const ac = new AbortController();
    this.abortControllers.set(instance.id, ac);

    let timeoutId: any;
    if (timeoutSeconds) {
      timeoutId = setTimeout(() => {
        ac.abort();
        instance.status = "error";
        instance.result = `Timeout: Sub-agent execution exceeded the limit of ${timeoutSeconds} seconds.`;
        onProgress?.(instance.id, "timeout");
      }, timeoutSeconds * 1000);
    }

    try {
      const { result, messages } = await runSubAgent(
        definition,
        task,
        settings,
        workspaceId,
        toolsSchema,
        executeToolCallFn,
        (status, msgs) => {
          instance.messages = msgs;
          onProgress?.(instance.id, status);
        },
        ac.signal,
        maxIterations
      );

      if (instance.status === "running") {
        instance.status = "completed";
        instance.result = result;
        instance.messages = messages;
      }
    } catch (err: any) {
      if (instance.status === "running") {
        instance.status = "error";
        instance.result = `Error: ${err.message}`;
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    return instance;
  }

  async invokeParallel(
    tasks: Array<{ typeName: string; task: string; maxIterations?: number; timeoutSeconds?: number }>,
    settings: Settings,
    workspaceId: string,
    toolsSchema: any[],
    executeToolCallFn: any,
    onProgress?: (agentId: string, status: string) => void
  ): Promise<SubAgentInstance[]> {
    const promises = tasks.map((t) =>
      this.invokeSubAgent(t.typeName, t.task, settings, workspaceId, toolsSchema, executeToolCallFn, onProgress, t.maxIterations, t.timeoutSeconds)
    );
    return Promise.all(promises);
  }

  killAgent(agentId: string) {
    const ac = this.abortControllers.get(agentId);
    ac?.abort();
    this.abortControllers.delete(agentId);
    const instance = this.activeAgents.get(agentId);
    if (instance) instance.status = "error";
  }

  killAll() {
    for (const [id] of this.activeAgents) {
      this.killAgent(id);
    }
  }

  getActive(): SubAgentInstance[] {
    return Array.from(this.activeAgents.values()).filter((a) => a.status === "running");
  }

  getAll(): SubAgentInstance[] {
    return Array.from(this.activeAgents.values());
  }

  getAgent(agentId: string): SubAgentInstance | undefined {
    return this.activeAgents.get(agentId);
  }
}
