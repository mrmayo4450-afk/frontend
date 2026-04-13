import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resolveUrl, getStoredToken } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWS } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Shield, ImageIcon, Search, Pin, PinOff, Trash2 } from "lucide-react";
import type { ChatMessage, User } from "@shared/schema";

interface ChatWithUser extends ChatMessage {
  senderName?: string;
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function PinnedBanner({ pinnedMsg, isAdmin, onUnpin }: { pinnedMsg: ChatMessage; isAdmin: boolean; onUnpin?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = (pinnedMsg.content?.length ?? 0) > 60 || !!pinnedMsg.imageUrl;
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-xs" data-testid="banner-pinned-message">
      <div
        className={`flex items-start gap-2 px-3 py-2 ${hasMore ? "cursor-pointer" : ""}`}
        onClick={() => hasMore && setExpanded(e => !e)}
        title={hasMore ? (expanded ? "Click to collapse" : "Click to see full message") : undefined}
      >
        <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-amber-700 dark:text-amber-300">Pinned: </span>
          <span className="text-amber-800 dark:text-amber-200 break-words">
            {pinnedMsg.imageUrl && !pinnedMsg.content ? "📷 Image" : expanded ? pinnedMsg.content : (pinnedMsg.content?.length ?? 0) > 60 ? pinnedMsg.content!.slice(0, 60) + "…" : pinnedMsg.content}
          </span>
          {hasMore && <span className="ml-1 text-amber-500 font-medium">{expanded ? "▲" : "▼"}</span>}
        </div>
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); onUnpin?.(); }} className="text-amber-500 hover:text-amber-700 flex-shrink-0" data-testid="button-unpin-message">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && pinnedMsg.imageUrl && (
        <div className="px-8 pb-2">
          <img src={resolveUrl(pinnedMsg.imageUrl)} alt="Pinned image" className="max-w-[150px] rounded border cursor-pointer" onClick={() => window.open(resolveUrl(pinnedMsg.imageUrl!), '_blank')} />
        </div>
      )}
    </div>
  );
}

function AdminChat() {
  const { user } = useAuth();
  const { lastMessage } = useWS();
  const queryClient = useQueryClient();
  const { data: allUsers } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: allMessages } = useQuery<ChatMessage[]>({ queryKey: ["/api/chat/messages"], staleTime: 0, refetchInterval: 8000 });
  const { data: pinnedMsg } = useQuery<ChatMessage | null>({ queryKey: ["/api/chat/pinned"], staleTime: 0 });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatImage, setChatImage] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const clients = allUsers?.filter(u => u.role === "client") ?? [];
  const userMap = new Map(allUsers?.map(u => [u.id, u]));

  useEffect(() => {
    if (lastMessage?.type === "chat_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    }
  }, [lastMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, selectedUser]);

  const readMutation = useMutation({
    mutationFn: (senderId: string) => apiRequest("POST", "/api/chat/read", { senderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    },
  });

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId);
    const unread = unreadPerUser.get(userId) ?? 0;
    if (unread > 0) {
      readMutation.mutate(userId);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (chatImage) {
        const formData = new FormData();
        formData.append("image", chatImage);
        const nicToken = getStoredToken();
        const res = await fetch(resolveUrl("/api/upload/nic"), { method: "POST", body: formData, credentials: "include", headers: nicToken ? { Authorization: `Bearer ${nicToken}` } : {} });
        const data = await res.json();
        imageUrl = data.imageUrl;
      }
      return apiRequest("POST", "/api/chat/messages", { content: input || "", receiverId: selectedUser, imageUrl });
    },
    onSuccess: () => {
      setInput("");
      setChatImage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/chat/pin/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/chat/unpin", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/messages/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
    },
  });

  const conversation = selectedUser
    ? allMessages?.filter(m => m.senderId === selectedUser || m.receiverId === selectedUser)
    : [];

  const unreadPerUser = new Map<string, number>();
  allMessages?.forEach(m => {
    if (!m.isRead && m.senderId !== user?.id && (m.receiverId === user?.id || m.receiverId === null)) {
      unreadPerUser.set(m.senderId, (unreadPerUser.get(m.senderId) ?? 0) + 1);
    }
  });

  const lastMessagePerUser = new Map<string, ChatMessage>();
  allMessages?.forEach(m => {
    const clientId = m.senderId === user?.id ? m.receiverId : m.senderId;
    if (!clientId) return;
    const existing = lastMessagePerUser.get(clientId);
    if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) {
      lastMessagePerUser.set(clientId, m);
    }
  });

  const lowerSearch = searchQuery.toLowerCase();
  const filteredClients = searchQuery
    ? clients.filter(c => {
        if (c.username.toLowerCase().includes(lowerSearch)) return true;
        if (c.email.toLowerCase().includes(lowerSearch)) return true;
        const msgs = allMessages?.filter(m => m.senderId === c.id || m.receiverId === c.id);
        return msgs?.some(m => m.content?.toLowerCase().includes(lowerSearch));
      })
    : clients;

  const sortedClients = [...filteredClients].sort((a, b) => {
    const unreadA = unreadPerUser.get(a.id) ?? 0;
    const unreadB = unreadPerUser.get(b.id) ?? 0;
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadB > 0 && unreadA === 0) return 1;
    const lastA = lastMessagePerUser.get(a.id);
    const lastB = lastMessagePerUser.get(b.id);
    if (lastA && lastB) return new Date(lastB.createdAt).getTime() - new Date(lastA.createdAt).getTime();
    if (lastA) return -1;
    if (lastB) return 1;
    return 0;
  });

  return (
    <div className="flex h-full">
      <div className="w-48 border-r flex-shrink-0 flex flex-col">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
              data-testid="input-chat-search"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {sortedClients.map(c => {
            const unread = unreadPerUser.get(c.id) ?? 0;
            const lastMsg = lastMessagePerUser.get(c.id);
            const lastMsgPreview = lastMsg?.content
              ? (lastMsg.content.length > 20 ? lastMsg.content.slice(0, 20) + "…" : lastMsg.content)
              : lastMsg?.imageUrl ? "📷 Image" : "";
            return (
              <button
                key={c.id}
                onClick={() => handleSelectUser(c.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                  selectedUser === c.id
                    ? "bg-accent"
                    : unread > 0
                    ? "bg-primary/5 dark:bg-primary/10"
                    : "hover-elevate"
                }`}
                data-testid={`button-chat-user-${c.id}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className={`text-xs ${unread > 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      {c.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${unread > 0 ? "font-bold" : "font-medium"}`}>{c.username}</p>
                  {lastMsgPreview && (
                    <p className={`text-[10px] truncate ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {lastMsg?.senderId === user?.id ? "You: " : ""}{lastMsgPreview}
                    </p>
                  )}
                </div>
                {unread > 0 && (
                  <Badge className="text-[10px] h-4 min-w-[16px] px-1 flex items-center justify-center" data-testid={`badge-unread-${c.id}`}>
                    {unread}
                  </Badge>
                )}
              </button>
            );
          })}
          {sortedClients.length === 0 && (
            <p className="text-xs text-muted-foreground text-center p-4">
              {searchQuery ? "No matching clients" : "No clients yet"}
            </p>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            <div className="p-3 border-b flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {userMap.get(selectedUser)?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{userMap.get(selectedUser)?.username}</p>
                <p className="text-[10px] text-muted-foreground">{userMap.get(selectedUser)?.email}</p>
              </div>
            </div>
            {pinnedMsg && (
              <PinnedBanner pinnedMsg={pinnedMsg} isAdmin onUnpin={() => unpinMutation.mutate()} />
            )}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {conversation?.map(msg => {
                  const isAdmin = msg.senderId === user?.id;
                  const isHovered = hoveredMsgId === msg.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"} group`}
                      data-testid={`msg-${msg.id}`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      <div className="flex items-end gap-1.5 max-w-[92%]">
                        {isHovered && (
                          <div className="flex flex-col gap-1 mb-1 flex-shrink-0">
                            <button
                              onClick={() => msg.isPinned ? unpinMutation.mutate() : pinMutation.mutate(msg.id)}
                              className="text-muted-foreground hover:text-amber-500 transition-colors"
                              data-testid={`button-pin-msg-${msg.id}`}
                              title={msg.isPinned ? "Unpin message" : "Pin message"}
                            >
                              {msg.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(msg.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              data-testid={`button-delete-msg-${msg.id}`}
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className={`min-w-0 rounded-lg px-3 py-2 text-sm ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"} ${msg.isPinned ? "ring-1 ring-amber-400" : ""}`}>
                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                          {msg.imageUrl && (
                            <img src={resolveUrl(msg.imageUrl)} alt="Shared image" className="max-w-[240px] rounded-md border cursor-pointer mt-1" onClick={() => window.open(resolveUrl(msg.imageUrl!), '_blank')} data-testid="img-chat-message" />
                          )}
                          <p className={`text-xs mt-0.5 ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatTime(msg.createdAt)}{msg.isPinned && " 📌"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t">
              {chatImage && (
                <div className="mb-2 flex items-center gap-2">
                  <img src={URL.createObjectURL(chatImage)} alt="Preview" className="w-16 h-16 object-cover rounded-md border" />
                  <Button size="icon" variant="ghost" onClick={() => setChatImage(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() || chatImage) sendMutation.mutate();
                    }
                  }}
                  className="min-h-[36px] max-h-[160px] resize-none text-sm py-2"
                  rows={1}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 160) + "px";
                  }}
                  data-testid="input-admin-message"
                />
                <input type="file" accept="image/*" ref={imageInputRef} className="hidden" data-testid="input-chat-image" onChange={e => { if (e.target.files?.[0]) setChatImage(e.target.files[0]); }} />
                <Button size="icon" variant="ghost" onClick={() => imageInputRef.current?.click()} data-testid="button-attach-image" className="flex-shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button size="icon" onClick={() => sendMutation.mutate()} disabled={(!input.trim() && !chatImage) || sendMutation.isPending} data-testid="button-admin-send" className="flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a client to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientChat() {
  const { user } = useAuth();
  const { lastMessage } = useWS();
  const queryClient = useQueryClient();
  const { data: messages } = useQuery<ChatMessage[]>({ queryKey: ["/api/chat/messages"], staleTime: 0, refetchInterval: 8000 });
  const { data: pinnedMsg } = useQuery<ChatMessage | null>({ queryKey: ["/api/chat/pinned"], staleTime: 0 });
  const [input, setInput] = useState("");
  const [chatImage, setChatImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessage?.type === "chat_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
    }
  }, [lastMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (chatImage) {
        const formData = new FormData();
        formData.append("image", chatImage);
        const nicToken2 = getStoredToken();
        const res = await fetch(resolveUrl("/api/upload/nic"), { method: "POST", body: formData, credentials: "include", headers: nicToken2 ? { Authorization: `Bearer ${nicToken2}` } : {} });
        const data = await res.json();
        imageUrl = data.imageUrl;
      }
      return apiRequest("POST", "/api/chat/messages", { content: input || "", receiverId: null, imageUrl });
    },
    onSuccess: () => {
      setInput("");
      setChatImage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/messages/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
    },
  });

  return (
    <div className="flex flex-col h-full">
      {pinnedMsg && (
        <PinnedBanner pinnedMsg={pinnedMsg} isAdmin={false} />
      )}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages?.map(msg => {
            const isMe = msg.senderId === user?.id;
            const isHovered = hoveredMsgId === msg.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                data-testid={`msg-${msg.id}`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Shield className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"} ${msg.isPinned ? "ring-1 ring-amber-400" : ""}`}>
                    {!isMe && <p className="text-xs font-semibold mb-1 text-primary">Admin</p>}
                    {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                    {msg.imageUrl && (
                      <img src={resolveUrl(msg.imageUrl)} alt="Shared image" className="max-w-[200px] rounded-md border cursor-pointer mt-1" onClick={() => window.open(resolveUrl(msg.imageUrl!), '_blank')} data-testid="img-chat-message" />
                    )}
                    <p className={`text-xs mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatTime(msg.createdAt)}{msg.isPinned && " 📌"}
                    </p>
                  </div>
                  {isMe && isHovered && (
                    <button
                      onClick={() => deleteMutation.mutate(msg.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mb-1"
                      data-testid={`button-delete-msg-${msg.id}`}
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {(messages?.length ?? 0) === 0 && (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Start a conversation with our support team</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        {chatImage && (
          <div className="mb-2 flex items-center gap-2">
            <img src={URL.createObjectURL(chatImage)} alt="Preview" className="w-16 h-16 object-cover rounded-md border" />
            <Button size="icon" variant="ghost" onClick={() => setChatImage(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Ask us anything… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() || chatImage) sendMutation.mutate();
              }
            }}
            className="min-h-[36px] max-h-[160px] resize-none text-sm py-2"
            rows={1}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
            data-testid="input-chat-message"
          />
          <input type="file" accept="image/*" ref={imageInputRef} className="hidden" data-testid="input-chat-image" onChange={e => { if (e.target.files?.[0]) setChatImage(e.target.files[0]); }} />
          <Button size="icon" variant="ghost" onClick={() => imageInputRef.current?.click()} data-testid="button-attach-image" className="flex-shrink-0">
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button size="icon" onClick={() => sendMutation.mutate()} disabled={(!input.trim() && !chatImage) || sendMutation.isPending} data-testid="button-send-message" className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function useDraggable(initialX: number, initialY: number) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const hasMoved = useRef(false);

  const clamp = useCallback((pos: { x: number; y: number }) => {
    const btnSize = 56;
    const maxX = window.innerWidth - btnSize;
    const maxY = window.innerHeight - btnSize;
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    };
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }
      if (hasMoved.current) {
        const newPos = clamp({
          x: dragRef.current.startPosX + dx,
          y: dragRef.current.startPosY + dy,
        });
        setPosition(newPos);
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [clamp]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };
    hasMoved.current = false;
    setIsDragging(true);
    e.preventDefault();
  }, [position]);

  return { position, isDragging, hasMoved, handlePointerDown };
}

export function ChatWidget() {
  const { user } = useAuth();
  const { lastMessage } = useWS();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useQuery<{ count: number }>({ queryKey: ["/api/chat/unread"], refetchInterval: 15000 });

  const { position, isDragging, hasMoved, handlePointerDown } = useDraggable(
    typeof window !== "undefined" ? window.innerWidth - 80 : 300,
    typeof window !== "undefined" ? window.innerHeight - 80 : 500,
  );

  useEffect(() => {
    if (lastMessage?.type === "chat_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread"] });
    }
  }, [lastMessage]);

  if (!user) return null;
  if (user.role !== "superadmin" && user.role !== "client") return null;
  const isAdmin = user.role === "superadmin";

  const chatHeight = isAdmin ? 680 : 440;
  const chatWidth = isAdmin
    ? (typeof window !== "undefined" && window.innerWidth < 768 ? Math.min(window.innerWidth - 16, 780) : 780)
    : (typeof window !== "undefined" && window.innerWidth < 768 ? Math.min(window.innerWidth - 16, 384) : 384);

  const panelStyle: React.CSSProperties = {};
  const btnCenterX = position.x + 28;
  const btnCenterY = position.y + 28;
  const spaceRight = window.innerWidth - btnCenterX;
  const spaceBottom = window.innerHeight - position.y;
  const spaceTop = position.y;

  if (spaceRight >= chatWidth / 2 + 28) {
    panelStyle.left = Math.max(8, position.x + 56 + 8);
  } else {
    panelStyle.left = Math.max(8, position.x - chatWidth - 8);
  }

  if (spaceBottom >= chatHeight + 28) {
    panelStyle.top = position.y;
  } else if (spaceTop >= chatHeight) {
    panelStyle.top = position.y + 56 - chatHeight;
  } else {
    panelStyle.top = Math.max(8, window.innerHeight - chatHeight - 8);
  }

  panelStyle.left = Math.max(8, Math.min(panelStyle.left as number, window.innerWidth - chatWidth - 8));
  panelStyle.top = Math.max(8, Math.min(panelStyle.top as number, window.innerHeight - chatHeight - 8));

  return (
    <>
      {open && (
        <Card
          className="fixed z-50 shadow-xl"
          style={{
            ...panelStyle,
            width: chatWidth,
            height: chatHeight,
          }}
          data-testid="chat-panel"
        >
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">{isAdmin ? "Customer Support" : "Chat Support"}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} data-testid="button-close-chat">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-[calc(100%-53px)]">
            {isAdmin ? <AdminChat /> : <ClientChat />}
          </div>
        </Card>
      )}

      <div
        className="fixed z-50"
        style={{
          left: position.x,
          top: position.y,
          touchAction: "none",
          userSelect: "none",
        }}
        onPointerDown={handlePointerDown}
      >
        <Button
          size="icon"
          className={`w-14 h-14 rounded-full shadow-lg relative transition-shadow ${isDragging ? "shadow-2xl scale-110" : ""}`}
          onClick={() => {
            if (!hasMoved.current) setOpen(!open);
          }}
          data-testid="button-chat-toggle"
        >
          <MessageCircle className="w-6 h-6" />
          {!open && (unreadData?.count ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
              {unreadData?.count}
            </span>
          )}
        </Button>
      </div>
    </>
  );
}
