"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, RotateCw, Send, SlidersHorizontal } from "lucide-react";
import { Button, ErrorState, IconButton, Spinner } from "@/components/ui";
import { getChats, getChat, sendChat, type Chat, type ChatMessage, type KnowledgeSource } from "@/lib/client";

const starter: ChatMessage[] = [{ id: "intro", role: "assistant", content: "你好，我是道森资料助手。可以从产品、品牌、工厂、零售、政策、活动或材料资料中帮你查找依据。每个回答都会附上可追溯来源。\n\n你可以试试：\n“再生 ABS 在小型音响外壳上有哪些工艺约束？”", sources: [] }];

export default function AiChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>(starter);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { getChats().then((data) => { setChats(data.chats ?? []); if (data.chats?.[0]) selectChat(data.chats[0].id); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  async function selectChat(id: string) { setActiveId(id); try { const data = await getChat(id); setMessages(data.chat.messages?.length ? data.chat.messages : starter); setSources(data.chat.messages?.flatMap((message) => message.sources ?? []).slice(-5) ?? []); } catch (reason) { setError(reason instanceof Error ? reason.message : "历史会话暂时无法读取"); } }
  function newChat() { setActiveId(undefined); setMessages(starter); setSources([]); setSelectedSource(undefined); setInput(""); setError(""); }
  async function handleSubmit(event: React.FormEvent) { event.preventDefault(); const message = input.trim(); if (!message || sending) return; setInput(""); setError(""); const local: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: message, sources: [] }; setMessages((current) => [...current, local]); setSending(true); try { const data = await sendChat(message, activeId); setActiveId(data.chatId); const incoming: ChatMessage = { id: `answer-${Date.now()}`, role: "assistant", content: data.answer, sources: data.sources }; setMessages((current) => [...current, incoming]); setSources(data.sources ?? []); setChats((current) => current.some((chat) => chat.id === data.chatId) ? current : [{ id: data.chatId, title: message.slice(0, 23), messages: [] }, ...current]); } catch (reason) { setError(reason instanceof Error ? reason.message : "回答暂时不可用，请重试"); } finally { setSending(false); } }
  const hasConversation = useMemo(() => messages.some((message) => message.role === "user" || message.role === "USER"), [messages]);
  return <div><div className="page-header"><div><p className="eyebrow">KNOWLEDGE / TRACEABLE ANSWERS</p><h1>查资料</h1><p className="page-description">把问题交给授权资料，答案和依据一起回来。</p></div><div className="page-actions"><Button variant="secondary" size="sm"><SlidersHorizontal size={14} />筛选来源</Button><Button size="sm" onClick={newChat}><Plus size={14} />新建会话</Button></div></div>
    {error ? <div style={{ marginBottom: 14 }}><ErrorState message={error} onRetry={() => setError("")} /></div> : null}
    <div className="chat-layout"><aside className="chat-history"><div className="chat-history-head"><strong>会话历史</strong><IconButton label="新建会话" onClick={newChat}><Plus size={15} /></IconButton></div>{loading ? <div style={{ padding: 18 }}><Spinner label="读取中" /></div> : chats.length ? chats.map((chat) => <button type="button" key={chat.id} className={`chat-history-item ${activeId === chat.id ? "active" : ""}`} onClick={() => selectChat(chat.id)}>{chat.title || "未命名会话"}</button>) : <div className="source-empty">还没有历史会话<br />从一个问题开始</div>}</aside>
      <section className="chat-main"><div className="chat-title"><div><strong>{activeId ? chats.find((chat) => chat.id === activeId)?.title || "资料会话" : "新会话"}</strong><small> · 知识库模式</small></div><span className="status-pill status-blue">回答带来源</span></div><div className="message-list" aria-live="polite">{messages.map((message) => <Message key={message.id} message={message} onSource={(source) => setSelectedSource(source)} />)}{sending ? <div className="message-row"><div className="message-avatar">AI</div><div className="message-bubble"><Spinner label="正在检索授权资料" /></div></div> : null}{!hasConversation && !sending ? <div className="suggestions"><span>可以这样问</span><button onClick={() => setInput("再生 ABS 在小型音响外壳上有哪些工艺约束？")}>再生 ABS 的工艺约束？</button><button onClick={() => setInput("有没有适合小型零售空间的低碳表面材料？")}>适合零售空间的低碳材料？</button></div> : null}</div><form className="chat-composer" onSubmit={handleSubmit}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSubmit(event); } }} placeholder="输入一个产品、材料或工艺问题…" aria-label="输入问题" /><Button type="submit" disabled={sending || !input.trim()}>{sending ? <Spinner label="" /> : <><Send size={15} />发送</>}</Button></form></section>
      <aside className="chat-sources"><div className="chat-source-head"><strong>来源详情</strong><span className="status-pill">{sources.length} 条</span></div>{selectedSource ? <div className="source-detail"><button className="btn btn-ghost btn-sm" onClick={() => setSelectedSource(undefined)}>← 返回来源列表</button><h3>{selectedSource.title}</h3><small>{selectedSource.category} · {selectedSource.updatedAt ?? "已归档"}</small><p>{selectedSource.content ?? selectedSource.summary ?? "该来源暂无公开摘要。"}</p></div> : sources.length ? sources.map((source) => <button type="button" className="source-card" key={source.id} onClick={() => setSelectedSource(source)}><FileText size={14} color="#1c5a82" /><strong>{source.title}</strong><small>{source.category}</small></button>) : <div className="source-empty">选中回答里的来源<br />查看完整资料摘要</div>}</aside>
    </div></div>;
}

function Message({ message, onSource }: { message: ChatMessage; onSource: (source: KnowledgeSource) => void }) { const isUser = message.role === "user" || message.role === "USER"; return <div className={`message-row ${isUser ? "user" : ""}`}><div className="message-avatar">{isUser ? "你" : "AI"}</div><div><div className="message-bubble">{message.content}</div>{!isUser && message.sources?.length ? <div className="message-source-inline">{message.sources.map((source) => <button type="button" className="source-chip" key={source.id} onClick={() => onSource(source)}>{source.category} · {source.title}</button>)}</div> : null}</div></div>; }

