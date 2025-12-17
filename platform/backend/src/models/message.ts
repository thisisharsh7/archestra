import { and, eq, gt } from "drizzle-orm";
import db, { schema } from "@/database";
import type { InsertMessage, Message } from "@/types";

class MessageModel {
  static async create(data: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(schema.messagesTable)
      .values(data)
      .returning();

    return message;
  }

  static async bulkCreate(messages: InsertMessage[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    await db.insert(schema.messagesTable).values(messages);
  }

  static async findByConversation(conversationId: string): Promise<Message[]> {
    const messages = await db
      .select()
      .from(schema.messagesTable)
      .where(eq(schema.messagesTable.conversationId, conversationId))
      .orderBy(schema.messagesTable.createdAt);

    return messages;
  }

  static async delete(id: string): Promise<void> {
    await db
      .delete(schema.messagesTable)
      .where(eq(schema.messagesTable.id, id));
  }

  static async deleteByConversation(conversationId: string): Promise<void> {
    await db
      .delete(schema.messagesTable)
      .where(eq(schema.messagesTable.conversationId, conversationId));
  }

  static async findById(messageId: string): Promise<Message | null> {
    const [message] = await db
      .select()
      .from(schema.messagesTable)
      .where(eq(schema.messagesTable.id, messageId));

    return message || null;
  }

  static async updateTextPart(
    messageId: string,
    partIndex: number,
    newText: string,
  ): Promise<Message> {
    // Fetch the current message
    const message = await this.findById(messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // biome-ignore lint/suspicious/noExplicitAny: UIMessage content is dynamic
    const content = message.content as any;

    // Update the specific part's text
    if (content.parts?.[partIndex]) {
      content.parts[partIndex].text = newText;
    } else {
      throw new Error("Invalid part index");
    }

    // Update the message in the database
    const [updatedMessage] = await db
      .update(schema.messagesTable)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(schema.messagesTable.id, messageId))
      .returning();

    return updatedMessage;
  }

  static async deleteAfterMessage(
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    // Get the message to find its createdAt timestamp
    const message = await this.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Delete all messages in this conversation created after this message
    await db
      .delete(schema.messagesTable)
      .where(
        and(
          eq(schema.messagesTable.conversationId, conversationId),
          gt(schema.messagesTable.createdAt, message.createdAt),
        ),
      );
  }
}

export default MessageModel;
