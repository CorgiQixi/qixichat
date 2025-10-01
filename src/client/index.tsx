import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message } from "../shared";

// 用户信息接口
interface UserInfo {
  userId: string;
  userName: string;
  userAvatar: string;
}

function App() {
  const { room } = useParams();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载用户信息
  useEffect(() => {
    const savedUserInfo = localStorage.getItem('qixiUserInfo');
    if (savedUserInfo) {
      setUserInfo(JSON.parse(savedUserInfo));
    } else {
      // 创建新用户
      const newUserInfo: UserInfo = {
        userId: nanoid(8),
        userName: names[Math.floor(Math.random() * names.length)],
        userAvatar: "👤"
      };
      setUserInfo(newUserInfo);
      localStorage.setItem('qixiUserInfo', JSON.stringify(newUserInfo));
    }
  }, []);

  // 更新页面上的用户信息显示
  useEffect(() => {
    if (userInfo) {
      const userIdElement = document.getElementById('userId');
      const roomIdElement = document.getElementById('roomId');
      const userNameInput = document.getElementById('userName') as HTMLInputElement;
      const avatarSelect = document.getElementById('avatarSelect') as HTMLSelectElement;
      const avatarPreview = document.getElementById('avatarPreview');

      if (userIdElement) userIdElement.textContent = userInfo.userId;
      if (roomIdElement) roomIdElement.textContent = room || '';
      if (userNameInput) userNameInput.value = userInfo.userName;
      if (avatarSelect) avatarSelect.value = userInfo.userAvatar;
      if (avatarPreview) avatarPreview.textContent = userInfo.userAvatar;
    }
  }, [userInfo, room]);

  // 设置用户信息保存功能
  useEffect(() => {
    const saveButton = document.getElementById('saveUserInfo');
    const userNameInput = document.getElementById('userName') as HTMLInputElement;
    const avatarSelect = document.getElementById('avatarSelect') as HTMLSelectElement;
    const avatarPreview = document.getElementById('avatarPreview');

    const handleSave = () => {
      if (userInfo && userNameInput && avatarSelect) {
        const updatedUserInfo: UserInfo = {
          ...userInfo,
          userName: userNameInput.value || userInfo.userName,
          userAvatar: avatarSelect.value
        };
        setUserInfo(updatedUserInfo);
        localStorage.setItem('qixiUserInfo', JSON.stringify(updatedUserInfo));
        
        if (avatarPreview) {
          avatarPreview.textContent = avatarSelect.value;
        }
        
        alert('用户信息已保存！');
      }
    };

    const handleAvatarChange = () => {
      if (avatarPreview && avatarSelect) {
        avatarPreview.textContent = avatarSelect.value;
      }
    };

    if (saveButton) saveButton.addEventListener('click', handleSave);
    if (avatarSelect) avatarSelect.addEventListener('change', handleAvatarChange);

    return () => {
      if (saveButton) saveButton.removeEventListener('click', handleSave);
      if (avatarSelect) avatarSelect.removeEventListener('change', handleAvatarChange);
    };
  }, [userInfo]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const socket = usePartySocket({
    party: "chat",
    room,
    onMessage: (evt) => {
      const message = JSON.parse(evt.data as string) as Message;
      if (message.type === "add") {
        const foundIndex = messages.findIndex((m) => m.id === message.id);
        if (foundIndex === -1) {
          setMessages((messages) => [
            ...messages,
            {
              id: message.id,
              content: message.content,
              user: message.user,
              role: message.role,
            },
          ]);
        } else {
          setMessages((messages) => {
            return messages
              .slice(0, foundIndex)
              .concat({
                id: message.id,
                content: message.content,
                user: message.user,
                role: message.role,
              })
              .concat(messages.slice(foundIndex + 1));
          });
        }
      } else if (message.type === "update") {
        setMessages((messages) =>
          messages.map((m) =>
            m.id === message.id
              ? {
                  id: message.id,
                  content: message.content,
                  user: message.user,
                  role: message.role,
                }
              : m,
          ),
        );
      } else {
        setMessages(message.messages);
      }
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !userInfo) return;

    const chatMessage: ChatMessage = {
      id: nanoid(8),
      content: inputMessage.trim(),
      user: userInfo.userName,
      role: "user",
    };

    setMessages((messages) => [...messages, chatMessage]);
    socket.send(
      JSON.stringify({
        type: "add",
        ...chatMessage,
      } satisfies Message),
    );

    setInputMessage("");
  };

  if (!userInfo) {
    return <div>加载中...</div>;
  }

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message) => {
          const isOwnMessage = message.user === userInfo.userName;
          return (
            <div
              key={message.id}
              className={`message ${isOwnMessage ? 'own' : 'other'}`}
            >
              <div className="message-avatar">
                {isOwnMessage ? userInfo.userAvatar : '👤'}
              </div>
              <div className="message-content">
                <div className="message-user">{message.user}</div>
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="输入消息..."
          className="message-input"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="send-button"
        >
          发送
        </button>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
      <Route path="/:room" element={<App />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>,
);

