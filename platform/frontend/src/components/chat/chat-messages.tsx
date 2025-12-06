import type { UIMessage } from "@ai-sdk/react";
import type { ChatStatus, DynamicToolUIPart, ToolUIPart } from "ai";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ToolActivity } from "@/components/ai-elements/tool-activity";

interface ChatMessagesProps {
  messages: UIMessage[];
  hideToolCalls?: boolean;
  status: ChatStatus;
}

// Type guards for tool parts
// biome-ignore lint/suspicious/noExplicitAny: AI SDK message parts have dynamic structure
function isToolPart(part: any): part is {
  type: string;
  state?: string;
  toolCallId?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Tool inputs are dynamic based on tool schema
  input?: any;
  // biome-ignore lint/suspicious/noExplicitAny: Tool outputs are dynamic based on tool execution
  output?: any;
  errorText?: string;
} {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part.type?.startsWith("tool-") || part.type === "dynamic-tool")
  );
}

export function ChatMessages({
  messages,
  hideToolCalls = false,
  status,
}: ChatMessagesProps) {
  const isStreamingStalled = useStreamingStallDetection(messages, status);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex h-full items-center justify-center text-center text-muted-foreground">
        <p className="text-sm">Start a conversation by sending a message</p>
      </div>
    );
  }

  return (
    <Conversation className="h-full">
      <ConversationContent>
        <div className="max-w-4xl mx-auto">
          {messages.map((message, idx) => {
            // When hideToolCalls is true, hide intermediate assistant messages
            // Only show the last assistant message in a sequence
            if (hideToolCalls && message.role === "assistant") {
              // Check if there's a next message
              const nextMessage = messages[idx + 1];
              // If next message is also from assistant, hide current message
              if (nextMessage && nextMessage.role === "assistant") {
                return null;
              }
            }

            // Collect tool parts for this message and all previous assistant messages in sequence
            // This aggregates all tool calls from consecutive assistant messages into one array
            // so they can be displayed together in the ToolActivity component
            const toolParts = hideToolCalls
              ? (() => {
                  const tools: Array<{
                    name: string;
                    state:
                      | ToolUIPart["state"]
                      | "output-available"
                      | "output-error";
                  }> = [];

                  // If this is an assistant message, collect tools from previous assistant messages too
                  // This handles cases where the LLM makes multiple tool calls across streaming chunks
                  if (message.role === "assistant") {
                    // Go backwards to find all consecutive assistant messages
                    // Stop when we hit a non-assistant message (user/system)
                    for (let i = idx; i >= 0; i--) {
                      const msg = messages[i];
                      if (msg.role !== "assistant") break;

                      // Collect tools from this message
                      const msgTools = msg.parts
                        .map((part, partIdx) => {
                          if (
                            isToolPart(part) &&
                            (part.type?.startsWith("tool-") ||
                              part.type === "dynamic-tool")
                          ) {
                            // Skip output parts that immediately follow input parts with same toolCallId
                            if (
                              part.state === "output-available" &&
                              partIdx > 0
                            ) {
                              const prevPart = msg.parts[partIdx - 1];
                              if (
                                isToolPart(prevPart) &&
                                prevPart.state === "input-available" &&
                                prevPart.toolCallId === part.toolCallId
                              ) {
                                return null;
                              }
                            }

                            // Look ahead for result part to determine final state
                            let finalState = part.state || "input-available";
                            const nextPart = msg.parts[partIdx + 1];
                            if (
                              nextPart &&
                              isToolPart(nextPart) &&
                              nextPart.state === "output-available" &&
                              nextPart.toolCallId === part.toolCallId
                            ) {
                              // Check for errors
                              const outputError = tryToExtractErrorFromOutput(
                                nextPart.output,
                              );
                              const errorText =
                                nextPart.errorText ?? outputError;
                              finalState = errorText
                                ? "output-error"
                                : "output-available";
                            } else if (part.output) {
                              const outputError = tryToExtractErrorFromOutput(
                                part.output,
                              );
                              const errorText = part.errorText ?? outputError;
                              finalState = errorText
                                ? "output-error"
                                : "output-available";
                            }

                            const toolName =
                              part.type === "dynamic-tool"
                                ? part.toolName
                                : part.type.replace("tool-", "");

                            return {
                              name: toolName || "Unknown",
                              state: finalState,
                            };
                          }
                          return null;
                        })
                        .filter((tool) => tool !== null);

                      tools.push(...msgTools);
                    }
                  }

                  return tools;
                })()
              : [];

            // Find all text part indices
            const textPartIndices = message.parts
              .map((part, i) => (part.type === "text" ? i : -1))
              .filter((i) => i !== -1);
            const lastTextPartIndex =
              textPartIndices.length > 0
                ? textPartIndices[textPartIndices.length - 1]
                : -1;

            // When hideToolCalls is true, determine which text parts to hide
            const shouldHideTextPart = (partIndex: number) => {
              if (!hideToolCalls) return false;
              // Only show the last text part when hideToolCalls is true
              return (
                textPartIndices.includes(partIndex) &&
                partIndex !== lastTextPartIndex
              );
            };

            return (
              <div key={message.id || idx}>
                {message.parts.map((part, i) => {
                  // Skip tool result parts that immediately follow a tool invocation with same toolCallId
                  if (
                    isToolPart(part) &&
                    part.state === "output-available" &&
                    i > 0
                  ) {
                    const prevPart = message.parts[i - 1];
                    if (
                      isToolPart(prevPart) &&
                      prevPart.state === "input-available" &&
                      prevPart.toolCallId === part.toolCallId
                    ) {
                      return null;
                    }
                  }

                  // Hide tool calls if hideToolCalls is true
                  if (
                    hideToolCalls &&
                    isToolPart(part) &&
                    (part.type?.startsWith("tool-") ||
                      part.type === "dynamic-tool")
                  ) {
                    return null;
                  }

                  const isLastTextPart = i === lastTextPartIndex;

                  switch (part.type) {
                    case "text":
                      // Hide intermediate text parts when hideToolCalls is true
                      if (shouldHideTextPart(i)) {
                        return null;
                      }

                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              {message.role === "system" && (
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  System Prompt
                                </div>
                              )}
                              <Response>{part.text}</Response>
                              {isLastTextPart &&
                                hideToolCalls &&
                                toolParts.length > 0 && (
                                  <ToolActivity tools={toolParts} />
                                )}
                            </MessageContent>
                          </Message>
                        </Fragment>
                      );

                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );

                    case "dynamic-tool": {
                      if (!isToolPart(part)) return null;
                      const toolName = part.toolName;

                      // Look ahead for tool result (same tool call ID)
                      let toolResultPart = null;
                      const nextPart = message.parts[i + 1];
                      if (
                        nextPart &&
                        isToolPart(nextPart) &&
                        nextPart.type === "dynamic-tool" &&
                        nextPart.state === "output-available" &&
                        nextPart.toolCallId === part.toolCallId
                      ) {
                        toolResultPart = nextPart;
                      }

                      return (
                        <MessageTool
                          part={part}
                          key={`${message.id}-${i}`}
                          toolResultPart={toolResultPart}
                          toolName={toolName}
                        />
                      );
                    }

                    default: {
                      // Handle tool invocations (type is "tool-{toolName}")
                      if (isToolPart(part) && part.type?.startsWith("tool-")) {
                        const toolName = part.type.replace("tool-", "");

                        // Look ahead for tool result (same tool call ID)
                        // biome-ignore lint/suspicious/noExplicitAny: Tool result structure varies by tool type
                        let toolResultPart: any = null;
                        const nextPart = message.parts[i + 1];
                        if (
                          nextPart &&
                          isToolPart(nextPart) &&
                          nextPart.type?.startsWith("tool-") &&
                          nextPart.state === "output-available" &&
                          nextPart.toolCallId === part.toolCallId
                        ) {
                          toolResultPart = nextPart;
                        }

                        return (
                          <MessageTool
                            part={part}
                            key={`${message.id}-${i}`}
                            toolResultPart={toolResultPart}
                            toolName={toolName}
                          />
                        );
                      }

                      // Skip step-start and other non-renderable parts
                      return null;
                    }
                  }
                })}
              </div>
            );
          })}
          {(status === "submitted" ||
            (status === "streaming" && isStreamingStalled)) && (
            <Message from="assistant">
              <Image
                src={"/logo.png"}
                alt="Loading logo"
                width={40}
                height={40}
                className="object-contain h-8 w-auto animate-[bounce_700ms_ease_200ms_infinite]"
              />
            </Message>
          )}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

// Custom hook to detect when streaming has stalled (>500ms without updates)
function useStreamingStallDetection(
  messages: UIMessage[],
  status: ChatStatus,
): boolean {
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const [isStreamingStalled, setIsStreamingStalled] = useState(false);

  // Update last update time when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to react to messages change here
  useEffect(() => {
    if (status === "streaming") {
      lastUpdateTimeRef.current = Date.now();
      setIsStreamingStalled(false);
    }
  }, [messages, status]);

  // Check periodically if streaming has stalled
  useEffect(() => {
    if (status !== "streaming") {
      setIsStreamingStalled(false);
      return;
    }

    const interval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate > 1_000) {
        setIsStreamingStalled(true);
      } else {
        setIsStreamingStalled(false);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [status]);

  return isStreamingStalled;
}

function MessageTool({
  part,
  toolResultPart,
  toolName,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  toolResultPart: ToolUIPart | DynamicToolUIPart | null;
  toolName: string;
}) {
  const outputError = toolResultPart
    ? tryToExtractErrorFromOutput(toolResultPart.output)
    : tryToExtractErrorFromOutput(part.output);
  const errorText = toolResultPart
    ? (toolResultPart.errorText ?? outputError)
    : (part.errorText ?? outputError);

  const hasInput = part.input && Object.keys(part.input).length > 0;
  const hasContent = Boolean(
    hasInput ||
      (toolResultPart && Boolean(toolResultPart.output)) ||
      (!toolResultPart && Boolean(part.output)),
  );

  return (
    <Tool className={hasContent ? "cursor-pointer" : ""}>
      <ToolHeader
        type={`tool-${toolName}`}
        state={getHeaderState({
          state: part.state || "input-available",
          toolResultPart,
          errorText,
        })}
        errorText={errorText}
        isCollapsible={hasContent}
      />
      <ToolContent>
        {hasInput ? <ToolInput input={part.input} /> : null}
        {toolResultPart && (
          <ToolOutput
            label={errorText ? "Error" : "Result"}
            output={toolResultPart.output}
            errorText={errorText}
          />
        )}
        {!toolResultPart && Boolean(part.output) && (
          <ToolOutput
            label={errorText ? "Error" : "Result"}
            output={part.output}
            errorText={errorText}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

const tryToExtractErrorFromOutput = (output: unknown) => {
  try {
    if (typeof output !== "string") return undefined;
    const json = JSON.parse(output);
    return typeof json.error === "string" ? json.error : undefined;
  } catch (_error) {
    return undefined;
  }
};
const getHeaderState = ({
  state,
  toolResultPart,
  errorText,
}: {
  state: ToolUIPart["state"] | DynamicToolUIPart["state"];
  toolResultPart: ToolUIPart | DynamicToolUIPart | null;
  errorText: string | undefined;
}) => {
  if (errorText) return "output-error";
  if (toolResultPart) return "output-available";
  return state;
};
