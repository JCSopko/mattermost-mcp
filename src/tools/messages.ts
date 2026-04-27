import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MattermostClient } from "../client.js";
import {
  PostMessageArgs,
  ReplyToThreadArgs,
  AddReactionArgs,
  GetThreadRepliesArgs,
  EditMessageArgs,
  DeleteMessageArgs
} from "../types.js";

// Tool definition for posting a message
export const postMessageTool: Tool = {
  name: "mattermost_post_message",
  description: "Post a new message to a Mattermost channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel to post to",
      },
      message: {
        type: "string",
        description: "The message text to post",
      },
    },
    required: ["channel_id", "message"],
  },
};

// Tool definition for replying to a thread
export const replyToThreadTool: Tool = {
  name: "mattermost_reply_to_thread",
  description: "Reply to a specific message thread in Mattermost",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      post_id: {
        type: "string",
        description: "The ID of the parent message to reply to",
      },
      message: {
        type: "string",
        description: "The reply text",
      },
    },
    required: ["channel_id", "post_id", "message"],
  },
};

// Tool definition for adding a reaction
export const addReactionTool: Tool = {
  name: "mattermost_add_reaction",
  description: "Add a reaction emoji to a message",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the message",
      },
      post_id: {
        type: "string",
        description: "The ID of the message to react to",
      },
      emoji_name: {
        type: "string",
        description: "The name of the emoji reaction (without colons)",
      },
    },
    required: ["channel_id", "post_id", "emoji_name"],
  },
};

// Tool definition for getting thread replies
export const getThreadRepliesTool: Tool = {
  name: "mattermost_get_thread_replies",
  description: "Get all replies in a message thread. Includes emoji reactions per post by default.",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      post_id: {
        type: "string",
        description: "The ID of the parent message",
      },
      include_reactions: {
        type: "boolean",
        description: "Include emoji reactions on each post (default true). Set false to skip the per-post reaction fetch.",
        default: true,
      },
    },
    required: ["channel_id", "post_id"],
  },
};

// Tool definition for getting reactions on a single post
export const getReactionsTool: Tool = {
  name: "mattermost_get_reactions",
  description: "Get all emoji reactions on a specific Mattermost message. Returns the raw reaction list plus an aggregated-by-emoji map (emoji_name -> [user_ids]).",
  inputSchema: {
    type: "object",
    properties: {
      post_id: {
        type: "string",
        description: "The ID of the message to get reactions for",
      },
    },
    required: ["post_id"],
  },
};

// Tool handler for posting a message
export async function handlePostMessage(
  client: MattermostClient,
  args: PostMessageArgs
) {
  const { channel_id, message } = args;
  
  try {
    const response = await client.createPost(channel_id, message);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            channel_id: response.channel_id,
            message: response.message,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error posting message:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for replying to a thread
export async function handleReplyToThread(
  client: MattermostClient,
  args: ReplyToThreadArgs
) {
  const { channel_id, post_id, message } = args;
  
  try {
    const response = await client.createPost(channel_id, message, post_id);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            channel_id: response.channel_id,
            root_id: response.root_id,
            message: response.message,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error replying to thread:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for adding a reaction
export async function handleAddReaction(
  client: MattermostClient,
  args: AddReactionArgs
) {
  const { post_id, emoji_name } = args;
  
  try {
    const response = await client.addReaction(post_id, emoji_name);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            post_id: response.post_id,
            user_id: response.user_id,
            emoji_name: response.emoji_name,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error adding reaction:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool definition for editing a message
export const editMessageTool: Tool = {
  name: "mattermost_edit_message",
  description: "Edit an existing Mattermost message. Use this to fix errors instead of posting corrections.",
  inputSchema: {
    type: "object",
    properties: {
      post_id: {
        type: "string",
        description: "The ID of the message to edit",
      },
      message: {
        type: "string",
        description: "The new message text (replaces the entire message)",
      },
    },
    required: ["post_id", "message"],
  },
};

// Tool definition for deleting a message
export const deleteMessageTool: Tool = {
  name: "mattermost_delete_message",
  description: "Delete a Mattermost message. Use this to remove erroneous posts instead of posting 'ignore the above'.",
  inputSchema: {
    type: "object",
    properties: {
      post_id: {
        type: "string",
        description: "The ID of the message to delete",
      },
    },
    required: ["post_id"],
  },
};

// Tool handler for editing a message
export async function handleEditMessage(
  client: MattermostClient,
  args: EditMessageArgs
) {
  const { post_id, message } = args;

  try {
    const response = await client.updatePost(post_id, message);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            channel_id: response.channel_id,
            message: response.message,
            edit_at: new Date(response.edit_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error editing message:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for deleting a message
export async function handleDeleteMessage(
  client: MattermostClient,
  args: DeleteMessageArgs
) {
  const { post_id } = args;

  try {
    await client.deletePost(post_id);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            deleted: true,
            post_id,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error deleting message:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Helper to fetch reactions for a list of post IDs in parallel.
// Returns a map of post_id -> { reactions, aggregated_by_emoji }.
// Errors per post are swallowed and produce empty entries so a single failure doesn't break the batch.
export async function fetchReactionsForPosts(
  client: MattermostClient,
  postIds: string[]
): Promise<Record<string, { reactions: any[]; aggregated_by_emoji: Record<string, string[]>; error?: string }>> {
  const results = await Promise.all(postIds.map(async (id) => {
    try {
      const reactions = await client.getReactions(id);
      const aggregated: Record<string, string[]> = {};
      (reactions || []).forEach((r: any) => {
        if (!aggregated[r.emoji_name]) aggregated[r.emoji_name] = [];
        aggregated[r.emoji_name].push(r.user_id);
      });
      return [id, { reactions: reactions || [], aggregated_by_emoji: aggregated }] as const;
    } catch (err) {
      return [id, {
        reactions: [],
        aggregated_by_emoji: {},
        error: err instanceof Error ? err.message : String(err)
      }] as const;
    }
  }));
  return Object.fromEntries(results);
}

// Tool handler for getting reactions on a post
export async function handleGetReactions(
  client: MattermostClient,
  args: { post_id: string }
) {
  const { post_id } = args;

  try {
    const reactions = await client.getReactions(post_id);
    const aggregated: Record<string, string[]> = {};
    (reactions || []).forEach((r: any) => {
      if (!aggregated[r.emoji_name]) aggregated[r.emoji_name] = [];
      aggregated[r.emoji_name].push(r.user_id);
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            post_id,
            reactions: reactions || [],
            aggregated_by_emoji: aggregated,
            total: (reactions || []).length,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting reactions:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for getting thread replies
export async function handleGetThreadReplies(
  client: MattermostClient,
  args: GetThreadRepliesArgs & { include_reactions?: boolean }
) {
  const { post_id, include_reactions = true } = args;

  try {
    const response = await client.getPostThread(post_id);
    const orderedIds: string[] = response.order;

    const reactionsByPost = include_reactions
      ? await fetchReactionsForPosts(client, orderedIds)
      : {};

    const formattedPosts = orderedIds.map(postId => {
      const post = response.posts[postId];
      const formatted: any = {
        id: post.id,
        user_id: post.user_id,
        message: post.message,
        create_at: new Date(post.create_at).toISOString(),
        root_id: post.root_id || null,
      };
      if (include_reactions) {
        const r = reactionsByPost[postId] || { reactions: [], aggregated_by_emoji: {} };
        formatted.reactions = r.reactions;
        formatted.aggregated_by_emoji = r.aggregated_by_emoji;
      }
      return formatted;
    });

    const rootPost = response.posts[post_id] ? (() => {
      const rp: any = {
        id: response.posts[post_id].id,
        user_id: response.posts[post_id].user_id,
        message: response.posts[post_id].message,
        create_at: new Date(response.posts[post_id].create_at).toISOString(),
      };
      if (include_reactions) {
        const r = reactionsByPost[post_id] || { reactions: [], aggregated_by_emoji: {} };
        rp.reactions = r.reactions;
        rp.aggregated_by_emoji = r.aggregated_by_emoji;
      }
      return rp;
    })() : null;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            posts: formattedPosts,
            root_post: rootPost,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting thread replies:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}
