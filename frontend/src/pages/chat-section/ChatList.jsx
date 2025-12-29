import React, { useState } from "react";
import useLayoutStore from "../../store/layoutStore";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import formatTimestamp from "../../utils/formatTime";
import { useChatStore } from "../../store/chatStore";

const ChatList = () => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { conversations } = useChatStore();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = (conversations?.data || []).filter((conv) => {
  const contact = conv.participants.find(
    (p) => p._id !== user?._id
  );

  if (!contact) return false;

  const term = searchTerm.toLowerCase();

  return (
    contact.username.toLowerCase().includes(term) ||
    conv.lastMessage?.content?.toLowerCase().includes(term)
  );
});


  const sortedContacts = [...filteredContacts].sort(
    (a, b) =>
      new Date(b?.lastMessage?.createdAt || 0) -
      new Date(a?.lastMessage?.createdAt || 0)
  );

  console.log(sortedContacts)

  return (
    <div
      className={`w-full border-r h-screen ${
        theme === "dark"
          ? "bg-[rgb(17,27,33)] border-gray-600"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 flex justify-between items-center ${
          theme === "dark" ? "text-white" : "text-gray-800"
        }`}
      >
        <h2 className="text-2xl font-semibold">Chats</h2>
        <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600">
          <FaPlus />
        </button>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-800"
            }`}
          />
          <input
            type="text"
            placeholder="Search or start new chat"
            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none ${
              theme === "dark"
                ? "bg-gray-800 text-white border border-gray-700 placeholder-gray-500"
                : "bg-gray-100 text-black border border-gray-200 placeholder-gray-400"
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="overflow-y-auto h-[calc(100vh-120px)] ">
        {sortedContacts.map((conv) => {
          const contact = conv.participants.find((p) => p._id !== user?._id);
          if (!contact) return null;

          return (
            <motion.div
              key={conv._id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 flex items-center cursor-pointer overflow-hidden ${
                theme === "dark"
                  ? selectedContact?._id === contact._id
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                  : selectedContact?._id === contact._id
                  ? "bg-gray-200"
                  : "hover:bg-gray-100"
              }`}
            >
              {/* Profile Image */}
              <img
                src={contact.profilePicture}
                alt={contact.username}
                className="w-12 h-12 rounded-full flex-shrink-0"
              />

              {/* Name + Last Message */}
              <div className="ml-3 flex-1 min-w-0">
                {/* Name + Timestamp */}
                <div className="flex justify-between items-center">
                  <h2
                    className={`font-semibold truncate ${
                      theme === "dark" ? "text-white" : "text-black"
                    }`}
                  >
                    {contact.username}
                  </h2>
                  {conv.lastMessage && (
                    <span
                      className={`text-xs flex-shrink-0 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {formatTimestamp(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                {/* Last message + unread badge */}
                <div className="flex justify-between items-center mt-1">
                  <p
                    className={`text-sm truncate max-w-52 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>

                  {conv.unreadCount > 0 &&
                    (
                      <span className="ml-2 w-5 h-5 text-xs bg-yellow-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
