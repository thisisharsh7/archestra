"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableUserMessageProps {
  messageId: string;
  partIndex: number;
  partKey: string;
  text: string;
  isEditing: boolean;
  hasMessagesBelow: boolean;
  onStartEdit: (partKey: string, messageId: string) => void;
  onCancelEdit: () => void;
  onSave: (
    messageId: string,
    partIndex: number,
    newText: string,
  ) => Promise<void>;
}

export function EditableUserMessage({
  messageId,
  partIndex,
  partKey,
  text,
  isEditing,
  hasMessagesBelow,
  onStartEdit,
  onCancelEdit,
  onSave,
}: EditableUserMessageProps) {
  const [editedText, setEditedText] = useState(text);
  const [isSaving, setIsSaving] = useState(false);

  // Reset edited text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditedText(text);
    }
  }, [isEditing, text]);

  const handleStartEdit = () => {
    onStartEdit(partKey, messageId);
  };

  const handleCancelEdit = () => {
    setEditedText(text);
    onCancelEdit();
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await onSave(messageId, partIndex, editedText);
      onCancelEdit();
    } catch (error) {
      console.error("Failed to save message:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Message from="user">
        <MessageContent className="relative">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[100px] resize-y"
            disabled={isSaving}
            placeholder="Edit your message..."
          />
          {hasMessagesBelow && (
            <div className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
              <span>⚠️</span>
              <span>
                Editing will regenerate the response and delete all messages below
              </span>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSaving || editedText.trim() === ""}
            >
              <Check className="h-4 w-4 mr-1" />
              {hasMessagesBelow ? "Save & Regenerate" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from="user">
      <MessageContent className="group/message relative">
        <Response>{text}</Response>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "absolute top-2 right-2 h-6 w-6",
            "opacity-0 group-hover/message:opacity-100 transition-opacity",
          )}
          onClick={handleStartEdit}
        >
          <Pencil className="h-3 w-3" />
          <span className="sr-only">Edit message</span>
        </Button>
      </MessageContent>
    </Message>
  );
}
