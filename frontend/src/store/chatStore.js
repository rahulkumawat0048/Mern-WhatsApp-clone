import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

export const useChatStore = create((set, get) => ({
    conversations: [], //list of all conversations
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
    onlineUsers: new Map(),
    typingUsers: new Map(),


    //socket event listners setup
    initsocketListners: () => {
        const socket = getSocket()
        if (!socket) return;

        //remove existing listeners to prevent duplicate handler
        socket.off('receive_message')
        socket.off('user_typing')
        socket.off('user_status')
        socket.off('message_send')
        socket.off('message_error')
        socket.off('message_deleted')
        socket.off('conversation_read')

        // listen for incomming message 
        socket.on('receive_message', (message) => {
            get().receiveMessage(message);
        });

        socket.on("conversation_read", ({ conversationId }) => {
            set((state) => {
                if (!state.conversations?.data) return state;
                const updatedConversations = state.conversations.data.map(conv => {
                    if (conv._id === conversationId) {
                        return { ...conv, unreadCount: 0 };
                    }
                    return conv;
                });
                return { conversations: { ...state.conversations, data: updatedConversations } };
            });
        });

        //confirm message delivery 
        socket.on('message_send', (message) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === message._id ? { ...msg } : msg)
            }))
        })

        //update message status
        socket.on('message_status_update', ({ messageId, messageStatus }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === messageId ? { ...msg, messageStatus } : msg
                )
            })
            )
        });

        //handle reacion on message
        socket.on('reaction_update', ({ messageId, reactions }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === messageId ? { ...msg, reactions } : msg
                )
            })
            )
        });

        //handle remove message fromm local state 
        socket.on('message_deleted', ({ deletedMessageId }) => {
            set((state) => ({
                messages: state.messages.filter((msg) => msg._id !== deletedMessageId)
            })
            )
        });

        //handle any message sending error
        socket.on('error', (error) => {
            console.log('message error', error)
        });

        //listner for typing users
        socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
            set((state) => {
                const newTypingUsers = new Map(state.typingUsers)
                if (!newTypingUsers.has(conversationId)) {
                    newTypingUsers.set(conversationId, new Set())
                }

                const typingSet = newTypingUsers.get(conversationId)
                if (isTyping) {
                    typingSet.add(userId)
                } else {
                    typingSet.delete(userId)
                }

                return { typingUsers: newTypingUsers }

            })
        })

        //track user's online/offline status
        socket.on('user_status', ({ userId, isOnline, lastSeen }) => {
            set((state) => {
                const newOnlineUsers = new Map(state.onlineUsers)
                newOnlineUsers.set(userId, { isOnline, lastSeen })
                return { onlineUsers: newOnlineUsers }
            })
        });

        //emit status check for alll users in conversation list 
        const { conversations } = get();
        if (conversations?.data?.length > 0) {
            conversations.data?.forEach((conv) => {
                const otherUser = conv.participants.find(
                    (p) => p._id !== get.currentUser._id
                )

                if (otherUser._id) {
                    socket.emit('get_user_status', otherUser._id, (status) => {
                        set((state => {
                            const newOnlineUsers = new Map(state.onlineUsers)
                            newOnlineUsers.set(status.userId, {
                                isOnline: status.isOnline,
                                lastSeen: status.lastSeen
                            })

                            return { onlineUsers: newOnlineUsers }
                        }))
                    })
                }

            });
        }


    },

    setCurrentUser: (user) => set({ currentUser: user }),

    fetchConversations: async () => {
        set({ loading: true, error: null });
        try {
            const { data } = await axiosInstance.get("/chats/conversations");
            set({ conversations: data, loading: false })

            get().initsocketListners();
            return data;
        } catch (error) {
            set({
                error: error?.response?.data?.message || error?.message,
                loading: false
            })
            return null;
        }
    },

    //fetch message for a conversation
    fetchMessages: async (conversationId) => {
        if (!conversationId) return;
        set({ loading: true, error: null });
        try {
            const { data } = await axiosInstance.get(`/chats/conversations/${conversationId}/messages`);
            const messageArray = data?.data || data || []
            set({ messages: messageArray, loading: false, currentConversation: conversationId })

            //mark unread message as read

            const { markMessagesAsRead } = get()
            markMessagesAsRead()



            return messageArray;
        } catch (error) {
            set({
                error: error?.response?.data?.message || error?.message,
                loading: false
            })
            return [];
        }
    },

    //send message in realtime
    sendMessage: async (formData) => {
        const socket = getSocket();

        const senderId = formData.get("senderId");
        const receiverId = formData.get("receiverId");
        const media = formData.get("media");
        const content = formData.get("content");
        const messageStatus = "sending";

        const { conversations, currentUser } = get();

        // 🔹 find conversationId
        let conversationId = null;
        if (conversations?.data?.length) {
            const conversation = conversations.data.find(
                (conv) =>
                    conv.participants.some((p) => p._id === senderId) &&
                    conv.participants.some((p) => p._id === receiverId)
            );
            conversationId = conversation?._id || null;
        }

        // 🔹 OPTIMISTIC MESSAGE
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            sender: { _id: senderId },
            receiver: { _id: receiverId },
            conversation: conversationId,
            content,
            contentType: media
                ? media.type.startsWith("image")
                    ? "image"
                    : "video"
                : "text",
            imageOrVideoUrl:
                media && typeof media !== "string"
                    ? URL.createObjectURL(media)
                    : null,
            createdAt: new Date().toISOString(),
            messageStatus,
            reactions: [],
        };

        // 🔹 SHOW MESSAGE IN UI IMMEDIATELY
        set((state) => ({
            messages: [...state.messages, optimisticMessage],
        }));

        try {
            // 🔹 SAVE MESSAGE TO DB
            const { data } = await axiosInstance.post(
                "/chats/send-message",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const realMessage = data?.data || data;

            // 🔹 REPLACE TEMP MESSAGE WITH REAL ONE
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === tempId ? realMessage : msg
                ),
            }));

            // 🔥 CHAT LIST REALTIME UPDATE FOR SENDER
            // 🔥 CHAT LIST REALTIME UPDATE FOR SENDER
            set((state) => {
                if (!state.conversations?.data) return state;

                const updatedConversations = state.conversations.data.map((conv) => {
                    if (conv._id === realMessage.conversation) {
                        return {
                            ...conv,
                            lastMessage: realMessage,
                            // unreadCount: 0,  <-- REMOVE THIS
                        };
                    }
                    return conv;
                });

                return {
                    conversations: {
                        ...state.conversations,
                        data: updatedConversations,
                    },
                };
            });

            // 🔹 REALTIME EMIT TO RECEIVER
            if (socket) {
                socket.emit("send_message", {
                    message: realMessage,
                    receiverId, // receiver ko bhej rahe hai
                });
            }

            return realMessage;
        } catch (error) {
            console.error("❌ Send message failed", error);

            // 🔹 MARK MESSAGE AS FAILED
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === tempId
                        ? { ...msg, messageStatus: "failed" }
                        : msg
                ),
            }));

            throw error;
        }
    },




    //receive message 
    receiveMessage: async (message) => {
        if (!message) return;

        const { currentConversation, currentUser, messages } = get()

        const messageExists = messages.some((msg) => msg._id === message._id)
        if (messageExists) return;

        if (message?.conversation === currentConversation) {
            set((state) => ({
                messages: [...state.messages, message]
            }));


            //automaticalyt mark as read
            if (message.receiver?._id === currentUser?._id && message.conversation === currentConversation) {
                get().markMessagesAsRead()
            }


        }


        set((state) => {
            if (!state.conversations?.data) return state;

            const updated = state.conversations.data.map((conv) => {
                if (conv._id !== message.conversation) return conv;

                // receiver ke liye unread count +1
                const increment = message.receiver?._id === currentUser?._id ? 1 : 0;

                return {
                    ...conv,
                    lastMessage: message,
                    unreadCount: (conv.unreadCount || 0) + increment,
                };
            });

            return {
                conversations: {
                    ...state.conversations,
                    data: updated,
                },
            };
        });




    },

    // mark as read
    markMessagesAsRead: async () => {
        const { messages, currentUser } = get();

        if (!messages.length || !currentUser) return;
        const unreadIds = messages.filter((msg) => msg.messageStatus !== "read" && msg.receiver?._id === currentUser?._id).map((msg) => msg._id).filter(Boolean)

        if (unreadIds.length === 0) return;
        try {
            const { data } = await axiosInstance.put("/chats/messages/read", {
                messageIds: unreadIds
            })

            console.log('message mark as read', data)
            set((state) => ({
                messages: state.messages.map((msg) =>
                    unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg)
            }));

            const socket = getSocket()
            if (socket) {
                socket.emit('message_read', {
                    messageIds: unreadIds,
                    senderId: messages[0]?.sender?._id,
                    conversationId: messages[0]?.conversation
                })
            }

        } catch (error) {
            console.log('failed to mark message as read', error)
        }

    },


    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/chats/messages/${messageId}`)
            set((state) => ({
                messages: state.messages?.filter((msg) => msg?._id !== messageId)
            }))
        } catch (error) {
            console.log('error deleting message', error)
            set({ error: error.response?.data?.message || error.message })
            return false;
        }
    },

    // add/change reactions
    addReactions: async (messageId, emoji) => {
        const socket = getSocket()
        const { currentUser } = get()
        if (socket && currentUser) {
            socket.emit("add_reaction", {
                messageId,
                emoji,
                userId: currentUser?._id,

            })
        }

    },

    startTyping: (receiverId) => {
        const { currentConversation } = get()
        const socket = getSocket()
        if (socket && currentConversation && receiverId) {
            socket.emit("typing_start", {
                conversationId: currentConversation,
                receiverId
            })
        }
    },
    stopTyping: (receiverId) => {
        const { currentConversation } = get()
        const socket = getSocket()
        if (socket && currentConversation && receiverId) {
            socket.emit("typing_stop", {
                conversationId: currentConversation,
                receiverId
            })
        }
    },

    isUserTyping: (userId) => {
        const { typingUsers, currentConversation } = get();

        if (!currentConversation || !userId) return false;

        const typingSet = typingUsers.get(currentConversation);

        if (!(typingSet instanceof Set)) return false;

        return typingSet.has(userId);
    },

    isUserOnline: (userId) => {
        if (!userId) return null;
        const { onlineUsers } = get()
        return onlineUsers.get(userId)?.isOnline || false
    },

    getUserLastSeen: (userId) => {
        if (!userId) return null;
        const { onlineUsers } = get()
        return onlineUsers.get(userId)?.lastSeen || null
    },

    cleanup: () => {
        set({
            conversations: [],
            currentConversation: null,
            messages: [],
            onlineUsers: new Map(),
            typingUsers: new Map(),
        })
    }

}))