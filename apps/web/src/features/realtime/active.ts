// Which conversation is currently on screen. Read by the event handler so messages that arrive
// in the open chat are marked read instead of counted as unread.
let activeConversationId: string | null = null;

export const setActiveConversation = (id: string | null) => {
  activeConversationId = id;
};
export const getActiveConversation = () => activeConversationId;
