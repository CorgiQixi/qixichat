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

function App() {
  const { room } = useParams();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 显示通知
  const showNotification = useCallback((message: string) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }, []);

  // 初始化用户信息
  const initializeUserInfo = useCallback(() => {
    const savedUserInfo = localStorage.getItem('qixiUserInfo');
    if (savedUserInfo) {
      const parsedInfo = JSON.parse(savedUserInfo);
      setUserInfo(parsedInfo);
      return parsedInfo;
    } else {
      // 创建新用户
      const newUserInfo: UserInfo = {
        userId: nanoid(8),
        userName: names[Math.floor(Math.random() * names.length)],
        userAvatar: "👤",
        avatarType: 'emoji'
      };
      setUserInfo(newUserInfo);
      localStorage.setItem('qixiUserInfo', JSON.stringify(newUserInfo));
      return newUserInfo;
    }
  }, []);

  // 从 localStorage 加载用户信息
  useEffect(() => {
    const userInfo = initializeUserInfo();
    
    // 更新界面显示
    setTimeout(() => {
      const userIdElement = document.getElementById('userId');
      const roomIdElement = document.getElementById('roomId');
      const userNameInput = document.getElementById('userName') as HTMLInputElement;
      const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;
      const avatarImage = document.getElementById('avatarImage') as HTMLImageElement;
      const avatarEmoji = document.getElementById('avatarEmoji') as HTMLSpanElement;

      if (userIdElement) userIdElement.textContent = userInfo.userId;
      if (roomIdElement) roomIdElement.textContent = room || '';
      if (userNameInput) userNameInput.value = userInfo.userName;

      // 更新头像显示
      if (userInfo.avatarType === 'image') {
        if (avatarImage) {
          avatarImage.src = userInfo.userAvatar;
          avatarImage.style.display = 'block';
          if (avatarEmoji) avatarEmoji.style.display = 'none';
        }
        if (avatarUrlInput) avatarUrlInput.value = userInfo.userAvatar;
      } else {
        if (avatarImage) avatarImage.style.display = 'none';
        if (avatarEmoji) {
          avatarEmoji.style.display = 'block';
          avatarEmoji.textContent = userInfo.userAvatar;
        }
        if (avatarUrlInput) avatarUrlInput.value = '';
      }
    }, 100);
  }, [room, initializeUserInfo]);

  // 实时保存用户信息
  const saveUserInfo = useCallback(debounce((info: UserInfo) => {
    localStorage.setItem('qixiUserInfo', JSON.stringify(info));
  }, 500), []);

  // 更新用户信息
  useEffect(() => {
    if (userInfo) {
      saveUserInfo(userInfo);
    }
  }, [userInfo, saveUserInfo]);

  // 设置用户界面交互
  useEffect(() => {
    if (!userInfo) return;

    const userNameInput = document.getElementById('userName') as HTMLInputElement;
    const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;
    const copyRoomIdBtn = document.getElementById('copyRoomId');
    const shareRoomBtn = document.getElementById('shareRoom');
    const navBtns = document.querySelectorAll('.nav-btn');
    const messageForm = document.getElementById('messageForm') as HTMLFormElement;
    const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
    const avatarOptions = document.querySelectorAll('.avatar-option');

    const handleNameChange = () => {
      setUserInfo(prev => prev ? {
        ...prev,
        userName: userNameInput.value.trim() || prev.userName
      } : null);
    };

    const handleAvatarUrlChange = () => {
      const url = avatarUrlInput.value.trim();
      if (url) {
        // 验证URL格式
        try {
          new URL(url);
          setUserInfo(prev => prev ? {
            ...prev,
            userAvatar: url,
            avatarType: 'image'
          } : null);
        } catch {
          // 无效URL，忽略
        }
      } else {
        // 清空URL时恢复默认头像
        setUserInfo(prev => prev ? {
          ...prev,
          userAvatar: '👤',
          avatarType: 'emoji'
        } : null);
      }
    };

    const handleAvatarOptionClick = (event: Event) => {
      const target = event.currentTarget as HTMLElement;
      const emoji = target.getAttribute('data-emoji');
      if (emoji) {
        setUserInfo(prev => prev ? {
          ...prev,
          userAvatar: emoji,
          avatarType: 'emoji'
        } : null);
        
        // 更新选项激活状态
        avatarOptions.forEach(option => option.classList.remove('active'));
        target.classList.add('active');
      }
    };

    const handleCopyRoomId = () => {
      if (room) {
        navigator.clipboard.writeText(room).then(() => {
          showNotification('聊天室ID已复制到剪贴板');
        }).catch(() => {
          // 降级方案
          const textArea = document.createElement('textarea');
          textArea.value = room;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showNotification('聊天室ID已复制到剪贴板');
        });
      }
    };

    const handleShareRoom = () => {
      if (room && navigator.share) {
        navigator.share({
          title: '加入我的聊天室',
          text: '快来加入我的七夕聊天室！',
          url: window.location.href
        });
      } else if (room) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showNotification('聊天室链接已复制到剪贴板');
        }).catch(() => {
          // 降级方案
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

    const handleNavClick = (event: Event) => {
      const target = event.currentTarget as HTMLElement;
      const panel = target.getAttribute('data-panel');
      
      navBtns.forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      
      const userPanel = document.querySelector('.user-panel');
      if (panel === 'user') {
        userPanel?.classList.add('active');
      } else {
        userPanel?.classList.remove('active');
      }
    };

    const handleMessageSubmit = (e: Event) => {
      e.preventDefault();
      if (!messageInput || !messageInput.value.trim() || !userInfo || !isConnected) {
        if (!isConnected) {
          showNotification('连接中，请稍后...');
        }
        return;
      }

      const chatMessage: ChatMessage & { timestamp: number } = {
        id: nanoid(8),
        content: messageInput.value.trim(),
        user: userInfo.userName,
        role: "user",
        timestamp: Date.now()
      };

      setMessages((messages) => [...messages, chatMessage]);
      socket.send(
        JSON.stringify({
          type: "add",
          ...chatMessage,
        } satisfies Message),
      );

      messageInput.value = "";
      adjustTextareaHeight(messageInput);
    };

    const handleMessageInput = (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      adjustTextareaHeight(target);
    };

    const handleMessageKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSubmit(e);
      }
    };

    // 添加事件监听器
    if (userNameInput) userNameInput.addEventListener('input', handleNameChange);
    if (avatarUrlInput) avatarUrlInput.addEventListener('input', handleAvatarUrlChange);
    if (copyRoomIdBtn) copyRoomIdBtn.addEventListener('click', handleCopyRoomId);
    if (shareRoomBtn) shareRoomBtn.addEventListener('click', handleShareRoom);
    if (messageForm) messageForm.addEventListener('submit', handleMessageSubmit);
    if (messageInput) {
      messageInput.addEventListener('input', handleMessageInput);
      messageInput.addEventListener('keypress', handleMessageKeyPress);
    }

    avatarOptions.forEach(option => {
      option.addEventListener('click', handleAvatarOptionClick);
      if (option.getAttribute('data-emoji') === userInfo.userAvatar) {
        option.classList.add('active');
      }
    });

    navBtns.forEach(btn => {
      btn.addEventListener('click', handleNavClick);
    });

    // 清理函数
    return () => {
      if (userNameInput) userNameInput.removeEventListener('input', handleNameChange);
      if (avatarUrlInput) avatarUrlInput.removeEventListener('input', handleAvatarUrlChange);
      if (copyRoomIdBtn) copyRoomIdBtn.removeEventListener('click', handleCopyRoomId);
      if (shareRoomBtn) shareRoomBtn.removeEventListener('click', handleShareRoom);
      if (messageForm) messageForm.removeEventListener('submit', handleMessageSubmit);
      if (messageInput) {
        messageInput.removeEventListener('input', handleMessageInput);
        messageInput.removeEventListener('keypress', handleMessageKeyPress);
      }

      avatarOptions.forEach(option => {
        option.removeEventListener('click', handleAvatarOptionClick);
      });

      navBtns.forEach(btn => {
        btn.removeEventListener('click', handleNavClick);
      });
    };
  }, [userInfo, room, showNotification, isConnected]);

  // 自动调整文本域高度
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const socket = usePartySocket({
    party: "chat",
    room: room || 'default',
    onOpen: () => {
      console.log('WebSocket连接已建立');
      setIsConnected(true);
    },
    onClose: () => {
      console.log('WebSocket连接已关闭');
      setIsConnected(false);
    },
    onError: (error) => {
      console.error('WebSocket错误:', error);
      setIsConnected(false);
    },
    onMessage: (evt) => {
      try {
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
                timestamp: Date.now()
              } as ChatMessage & { timestamp: number },
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
                  timestamp: Date.now()
                } as ChatMessage & { timestamp: number })
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
                    timestamp: Date.now()
                  } as ChatMessage & { timestamp: number }
                : m,
            ),
          );
        } else if (message.type === "all") {
          setMessages(message.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || Date.now()
          })));
        }
      } catch (error) {
        console.error('解析消息错误:', error);
      }
    },
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userInfo) {
    return (
      <div className="chat-container">
        <div className="messages-container" ref={messagesContainerRef} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="loading"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>欢迎来到七夕聊天室！</h3>
            <p>{isConnected ? '开始发送第一条消息吧～' : '连接中...'}</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user === userInfo.userName;
            const messageWithTime = message as ChatMessage & { timestamp: number };
            
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'own' : 'other'}`}
              >
                <div className="message-avatar">
                  {isOwnMessage ? (
                    userInfo.avatarType === 'image' ? (
                      <img src={userInfo.userAvatar} alt="头像" onError={(e) => {
                        // 图片加载失败时回退到表情符号
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const emojiSpan = parent.querySelector('#avatarEmoji') as HTMLSpanElement;
                          if (emojiSpan) {
                            emojiSpan.style.display = 'block';
                            emojiSpan.textContent = '👤';
                          }
                        }
                        // 更新用户信息
                        setUserInfo(prev => prev ? {
                          ...prev,
                          userAvatar: '👤',
                          avatarType: 'emoji'
                        } : null);
                      }} />
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
                  <div className="message-time">
                    {formatTime(messageWithTime.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
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
