import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  avatarType: 'emoji' | 'image';
}

// 防抖函数
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 获取或创建用户信息
function getUserInfo(): UserInfo {
  const savedUserInfo = localStorage.getItem('qixiUserInfo');
  if (savedUserInfo) {
    return JSON.parse(savedUserInfo);
  }
  
  // 创建新用户
  const newUserInfo: UserInfo = {
    userId: nanoid(8),
    userName: names[Math.floor(Math.random() * names.length)],
    userAvatar: "👤",
    avatarType: 'emoji'
  };
  localStorage.setItem('qixiUserInfo', JSON.stringify(newUserInfo));
  return newUserInfo;
}

// 通知组件
function Notification({ message }: { message: string }) {
  return (
    <div className="notification">
      {message}
    </div>
  );
}

// 头像组件
function Avatar({ userInfo, onUpdate }: { 
  userInfo: UserInfo; 
  onUpdate: (info: Partial<UserInfo>) => void;
}) {
  const avatarEmojis = ["👤", "😊", "😎", "🤩", "🥰", "😇"];
  const [imageError, setImageError] = useState(false);

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    if (url) {
      try {
        new URL(url);
        setImageError(false);
        onUpdate({ userAvatar: url, avatarType: 'image' });
      } catch {
        // 无效URL
      }
    } else {
      onUpdate({ userAvatar: '👤', avatarType: 'emoji' });
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onUpdate({ userAvatar: emoji, avatarType: 'emoji' });
  };

  const handleImageError = () => {
    setImageError(true);
    onUpdate({ userAvatar: '👤', avatarType: 'emoji' });
  };

  return (
    <div className="avatar-section">
      <div className="avatar-preview">
        {userInfo.avatarType === 'image' && !imageError ? (
          <img 
            src={userInfo.userAvatar} 
            alt="头像"
            onError={handleImageError}
            style={{ display: 'block' }}
          />
        ) : (
          <span style={{ display: 'block' }}>{userInfo.userAvatar}</span>
        )}
      </div>
      <div className="input-group">
        <label htmlFor="avatarUrl">头像图片 URL</label>
        <input 
          type="text" 
          id="avatarUrl" 
          placeholder="输入图片URL地址" 
          className="u-full-width"
          value={userInfo.avatarType === 'image' ? userInfo.userAvatar : ''}
          onChange={handleAvatarUrlChange}
        />
      </div>
      <div className="avatar-options">
        {avatarEmojis.map(emoji => (
          <span 
            key={emoji}
            className={`avatar-option ${userInfo.avatarType === 'emoji' && userInfo.userAvatar === emoji ? 'active' : ''}`}
            onClick={() => handleEmojiClick(emoji)}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

// 用户面板组件
function UserPanel({ 
  userInfo, 
  roomId, 
  onUpdateUserInfo 
}: { 
  userInfo: UserInfo; 
  roomId: string;
  onUpdateUserInfo: (info: Partial<UserInfo>) => void;
}) {
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      showNotification('聊天室ID已复制到剪贴板');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('聊天室ID已复制到剪贴板');
    });
  };

  const handleShareRoom = () => {
    if (navigator.share) {
      navigator.share({
        title: '加入我的聊天室',
        text: '快来加入我的七夕聊天室！',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showNotification('聊天室链接已复制到剪贴板');
      }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('聊天室链接已复制到剪贴板');
      });
    }
  };

  return (
    <div className="user-panel" id="userPanel">
      {notification && <Notification message={notification} />}
      
      <div className="user-info">
        <h4 className="app-title">七夕聊天</h4>
        
        <Avatar userInfo={userInfo} onUpdate={onUpdateUserInfo} />

        <div className="input-group">
          <label htmlFor="userName">昵称</label>
          <input 
            type="text" 
            id="userName" 
            placeholder="请输入昵称" 
            className="u-full-width"
            value={userInfo.userName}
            onChange={(e) => onUpdateUserInfo({ userName: e.target.value.trim() || userInfo.userName })}
          />
        </div>

        <div className="info-group">
          <label>用户 ID</label>
          <div className="info-value">{userInfo.userId}</div>
        </div>

        <div className="info-group">
          <label>聊天室 ID</label>
          <div className="info-value-with-copy">
            <span>{roomId}</span>
            <button className="copy-btn" onClick={handleCopyRoomId} title="复制聊天室ID">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="share-section">
          <button className="share-btn" onClick={handleShareRoom}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M15 5L9 12M9 12L15 19" stroke="currentColor" strokeWidth="2"/>
            </svg>
            分享聊天室
          </button>
        </div>
      </div>
    </div>
  );
}

// 消息组件
function MessageItem({ 
  message, 
  isOwn, 
  userInfo 
}: { 
  message: ChatMessage & { timestamp: number }; 
  isOwn: boolean;
  userInfo: UserInfo;
}) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-avatar">
        {isOwn ? (
          userInfo.avatarType === 'image' ? (
            <img 
              src={userInfo.userAvatar} 
              alt="头像"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const span = document.createElement('span');
                span.textContent = '👤';
                target.parentElement?.appendChild(span);
              }}
            />
          ) : (
            <span>{userInfo.userAvatar}</span>
          )
        ) : (
          <span>👤</span>
        )}
      </div>
      <div className="message-content">
        <div className="message-user">{message.user}</div>
        <div className="message-text">{message.content}</div>
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
}

// 聊天面板组件
function ChatPanel({ 
  userInfo, 
  messages, 
  isConnected, 
  onSendMessage 
}: { 
  userInfo: UserInfo;
  messages: (ChatMessage & { timestamp: number })[];
  isConnected: boolean;
  onSendMessage: (content: string) => void;
}) {
  const [messageInput, setMessageInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && isConnected) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    adjustTextareaHeight();
  };

  return (
    <div className="chat-panel">
      <div className="chat-container">
        <div className="messages-container" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <h3>欢迎来到七夕聊天室！</h3>
              <p>{isConnected ? '开始发送第一条消息吧～' : '连接中...'}</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.user === userInfo.userName}
                userInfo={userInfo}
              />
            ))
          )}
        </div>
        
        <div className="message-input-fixed">
          <form className="message-input-container" onSubmit={handleSubmit}>
            <textarea 
              ref={textareaRef}
              value={messageInput}
              onChange={handleInput}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (按Enter发送，Shift+Enter换行)" 
              className="message-input"
              rows={1}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!isConnected || !messageInput.trim()}
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// 移动端导航组件
function MobileNav() {
  const [activePanel, setActivePanel] = useState<'chat' | 'user'>('chat');

  const handleNavClick = (panel: 'chat' | 'user') => {
    setActivePanel(panel);
    const userPanel = document.getElementById('userPanel');
    if (userPanel) {
      if (panel === 'user') {
        userPanel.classList.add('active');
      } else {
        userPanel.classList.remove('active');
      }
    }
  };

  return (
    <div className="mobile-nav">
      <button 
        className={`nav-btn ${activePanel === 'chat' ? 'active' : ''}`}
        onClick={() => handleNavClick('chat')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
        </svg>
        聊天
      </button>
      <button 
        className={`nav-btn ${activePanel === 'user' ? 'active' : ''}`}
        onClick={() => handleNavClick('user')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
        </svg>
        我的
      </button>
    </div>
  );
}

function App() {
  const { room } = useParams();
  const [userInfo, setUserInfo] = useState<UserInfo>(getUserInfo());
  const [messages, setMessages] = useState<(ChatMessage & { timestamp: number })[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 实时保存用户信息
  const saveUserInfo = useCallback(
    debounce((info: UserInfo) => {
      localStorage.setItem('qixiUserInfo', JSON.stringify(info));
    }, 500),
    []
  );

  useEffect(() => {
    saveUserInfo(userInfo);
  }, [userInfo, saveUserInfo]);

  const updateUserInfo = (updates: Partial<UserInfo>) => {
    setUserInfo(prev => ({ ...prev, ...updates }));
  };

  const socket = usePartySocket({
    party: "chat",
    room: room || 'default',
    onOpen: () => {
      setIsConnected(true);
    },
    onClose: () => {
      setIsConnected(false);
    },
    onError: () => {
      setIsConnected(false);
    },
    onMessage: (evt) => {
      try {
        const message = JSON.parse(evt.data as string) as Message;
        if (message.type === "add") {
          setMessages((prevMessages) => {
            const foundIndex = prevMessages.findIndex((m) => m.id === message.id);
            const newMessage: ChatMessage & { timestamp: number } = {
              id: message.id,
              content: message.content,
              user: message.user,
              role: message.role,
              timestamp: message.timestamp || Date.now()
            };
            
            if (foundIndex === -1) {
              return [...prevMessages, newMessage];
            } else {
              return [
                ...prevMessages.slice(0, foundIndex),
                newMessage,
                ...prevMessages.slice(foundIndex + 1)
              ];
            }
          });
        } else if (message.type === "update") {
          setMessages((prevMessages) =>
            prevMessages.map((m) =>
              m.id === message.id
                ? {
                    id: message.id,
                    content: message.content,
                    user: message.user,
                    role: message.role,
                    timestamp: message.timestamp || Date.now()
                  }
                : m
            )
          );
        } else if (message.type === "all") {
          setMessages(
            message.messages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp || Date.now()
            }))
          );
        }
      } catch (error) {
        console.error('解析消息错误:', error);
      }
    },
  });

  const handleSendMessage = (content: string) => {
    const chatMessage: ChatMessage & { timestamp: number } = {
      id: nanoid(8),
      content,
      user: userInfo.userName,
      role: "user",
      timestamp: Date.now()
    };

    setMessages((prevMessages) => [...prevMessages, chatMessage]);
    socket.send(
      JSON.stringify({
        type: "add",
        ...chatMessage,
      } satisfies Message)
    );
  };

  return (
    <div className="app-container">
      <UserPanel 
        userInfo={userInfo}
        roomId={room || 'default'}
        onUpdateUserInfo={updateUserInfo}
      />
      <ChatPanel
        userInfo={userInfo}
        messages={messages}
        isConnected={isConnected}
        onSendMessage={handleSendMessage}
      />
      <MobileNav />
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
  </BrowserRouter>
);
