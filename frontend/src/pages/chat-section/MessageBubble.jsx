import React, { useRef, useState } from "react";
import { format } from "date-fns";
import {
  FaCheck,
  FaCheckDouble,
  FaPlus,
  FaRegCopy,
  FaSmile,
  FaTrash,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import useOutsideclick from "../../hooks/useOutsideclick";
import EmojiPicker from "emoji-picker-react";
import { useChatStore } from "../../store/chatStore";

const MessageBubble = ({
  message,
  onReact,
  currentUser,
  deleteMessage,
  theme,
}) => {
  if (!message) return null;

  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const messageRef = useRef(null);
  const optionRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);

  const reactions = Array.isArray(message.reactions) ? message.reactions : [];

  const isUserMessage = message?.sender?._id === currentUser?._id;

  const bubbleClass = isUserMessage ? "chat-end" : "chat-start";

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[70%] min-w-[100px] rounded-bl-xl ${
        theme === "dark" ? "bg-[#144d38] text-white" : "bg-[#d9fdd3] text-black"
      }`
    : `chat-bubble md:max-w-[70%] min-w-[100px] rounded-br-xl ${
        theme === "dark" ? "bg-[#144d38] text-white" : "bg-white text-black"
      }`;

  const handleReact = (emoji) => {
    onReact?.(message._id, emoji);
    setShowEmojiPicker(false);
    setShowReactions(false);
  };

  useOutsideclick(emojiPickerRef, () => setShowEmojiPicker(false));
  useOutsideclick(reactionsMenuRef, () => setShowReactions(false));
  useOutsideclick(optionRef, () => setShowOptions(false));

  return (
    <div className={`chat ${bubbleClass}`}>
      <div
        ref={messageRef}
        className={`${bubbleContentClass} rounded-t-xl ${
          reactions.length > 0 ? "mb-4" : ""
        } relative group`}
      >
        <div className="flex flex-col">
          {message.contentType === "text" && (
            <p className="mr-2">{message?.content}</p>
          )}

          {message.contentType === "image" && (
            <div>
              <img
                src={message?.imageOrVideoUrl}
                alt="image-video"
                className="rounded-lg max-w-xs max-h-80"
              />
              <p className="mt-1">{message?.content}</p>
            </div>
          )}
          {message.contentType === "video" && (
            <div>
              <video
                src={message?.imageOrVideoUrl}
                alt="image-video"
                controls
                className="rounded-lg max-w-xs max-h-80"
              />
              <p className="mt-1">{message?.content}</p>
            </div>
          )}

          <div className="self-end flex items-center gap-2 text-xs opacity-60 mt-[2px]">
            <span>{format(new Date(message.createdAt), "HH:mm")}</span>

            {isUserMessage && (
              <>
                {message.messageStatus === " send" && <FaCheck size={12} />}
                {message.messageStatus === "delivered" && (
                  <FaCheckDouble size={12} />
                )}
                {message.messageStatus === "read" && (
                  <FaCheckDouble size={12} className="text-blue-900" />
                )}
              </>
            )}
          </div>

          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              className={theme === "dark" ? "text-white" : "text-gray-800"}
              onClick={() => setShowOptions((prev) => !prev)}
            >
              <HiDotsVertical size={18} />
            </button>
          </div>

          <div
            className={`absolute ${
              isUserMessage ? "-left-10" : "-right-10"
            } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <button
              className={`p-2 rounded-full shadow-lg ${
                theme === "dark" ? "bg-[#202c33]" : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => setShowReactions((p) => !p)}
            >
              <FaSmile
                className={theme === "dark" ? "text-gray-300" : "text-gray-600"}
              />
            </button>
          </div>
        </div>

        {showReactions && (
          <div
            ref={reactionsMenuRef}
            className={`absolute -top-8 ${
              isUserMessage ? "left-0" : "left-36"
            } flex items-center bg-[#202c33]/90 rounded-full px-2 py-1.5 gap-1 z-50`}
          >
            {quickReactions.map((emoji, i) => (
              <button
                key={i}
                className="hover:scale-125 transition-transform p-1"
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </button>
            ))}
            <button className="p-1" onClick={() => setShowEmojiPicker(true)}>
              <FaPlus className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute left-0 mb-6 z-50">
            <EmojiPicker
              onEmojiClick={(e) => handleReact(e.emoji)}
              theme={theme}
            />
            <RxCross2
              onClick={() => setShowEmojiPicker(false)}
              className="absolute top-2 right-2 cursor-pointer"
            />
          </div>
        )}

        {reactions.length > 0 && (
          <div
            className={`absolute -bottom-5 flex gap-1 text-sm rounded-full px-2 py-[2px] shadow-md ${
              isUserMessage ? "right-2" : "left-2"
            } ${
              theme === "dark"
                ? "bg-[#2a3942] text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            {reactions.map((r, i) => (
              <span key={i}>{r.emoji}</span>
            ))}
          </div>
        )}

        {showOptions && (
          <div
            ref={optionRef}
            className={`absolute top-8 right-1 z-50 w-36 rounded-xl shadow-lg py-2 text-sm ${
              theme === "dark"
                ? "bg-[#1d1f1f] text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            {message.contentType === "text" && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 gap-3"
              >
                <FaRegCopy size={14} />
                Copy
              </button>
            )}

            {isUserMessage && (
              <button
                onClick={() => {
                  deleteMessage?.(message._id);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 gap-3 text-red-600"
              >
                <FaTrash size={14} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
