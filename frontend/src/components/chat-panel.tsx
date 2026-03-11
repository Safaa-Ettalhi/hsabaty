/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  IconSend,
  IconPlus,
  IconMicrophone,
  IconPhoto,
  IconFile,
  IconChartBar,
  IconCoin,
  IconFileText,
} from "@tabler/icons-react"
import { getStoredUser, getStoredToken, USER_UPDATED_EVENT, type MockUser } from "@/lib/auth-mock"
import { api, getApiUrl } from "@/lib/api"
import { toast } from "sonner"

type Message = { role: "user" | "assistant"; content: string }

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Bonjour"
  if (h < 18) return "Bon après-midi"
  return "Bonsoir"
}

const SUGGESTIONS = [
  { label: "Analyser mes dépenses du mois", icon: IconChartBar },
  { label: "Créer un budget pour les courses", icon: IconCoin },
  { label: "Résumé de ma trésorerie", icon: IconFileText },
]

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState("")
  const [attachments, setAttachments] = useState<{ name: string; type: string; file?: File }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const applyUser = (u: MockUser | null) => {
      setUserName(u?.name?.split(" ")[0] ?? "vous")
    }
    applyUser(getStoredUser())
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<MockUser>).detail
      if (!detail) return
      applyUser(detail)
    }
    window.addEventListener(USER_UPDATED_EVENT, handler)
    return () => window.removeEventListener(USER_UPDATED_EVENT, handler)
  }, [])

  const loadConversations = () => {
    api.get<{ conversations: any[]; messages: Array<{ role: string; contenu: string }> }>("/api/agent-ia/historique").then((res) => {
      if (res.succes && res.donnees) {
        setConversations(res.donnees.conversations || [])
        if (!currentConversationId && res.donnees.conversations?.length > 0 && res.donnees.messages?.length > 0) {
          setCurrentConversationId(res.donnees.conversations[0]._id)
          setMessages(
            res.donnees.messages.map((m) => ({
              role: m.role === "utilisateur" ? "user" : "assistant",
              content: m.contenu,
            }))
          )
        }
      }
    })
  }

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversation = async (id: string) => {
    const res = await api.get<{ conversation: any }>(`/api/agent-ia/conversation/${id}`)
    if (res.succes && res.donnees?.conversation) {
      setCurrentConversationId(id)
      setMessages(
        res.donnees.conversation.messages.map((m: any) => ({
          role: m.role === "utilisateur" ? "user" : "assistant",
          content: m.contenu,
        }))
      )
    } else {
      toast.error("Impossible de charger la conversation")
    }
  }

  const promptDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConversationToDelete(id)
  }

  const confirmDelete = async () => {
    if (!conversationToDelete) return
    const id = conversationToDelete
    const res = await api.delete(`/api/agent-ia/conversation/${id}`)
    if (res.succes) {
      toast.success("Conversation supprimée")
      setConversations((prev) => prev.filter((c) => c._id !== id))
      if (currentConversationId === id) {
        handleNewChat()
      }
    }
    setConversationToDelete(null)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    const audioFile = attachments.find((a) => a.type.startsWith("audio/"))?.file
    const hasAudioOnly = attachments.length === 1 && audioFile && !trimmed
    if ((!trimmed && !hasAudioOnly) || isLoading) return

    if (hasAudioOnly && audioFile) {
      setAttachments([])
      setMessages((prev) => [...prev, { role: "user", content: "Message vocal" }])
      setIsLoading(true)
      const formData = new FormData()
      formData.append("audio", audioFile)
      const token = getStoredToken()
      try {
        const res = await fetch(`${getApiUrl()}/api/agent-ia/voice`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          body: formData,
        })
        const data = await res.json()
        setIsLoading(false)
        if (data.succes && data.donnees?.reponse) {
          if (data.donnees.conversationId) setCurrentConversationId(data.donnees.conversationId)
          setMessages((prev) => [...prev, { role: "assistant", content: data.donnees.reponse }])
          loadConversations()
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message || "Erreur message vocal." }])
          toast.error(data.message)
        }
      } catch {
        setIsLoading(false)
        setMessages((prev) => [...prev, { role: "assistant", content: "Erreur de connexion." }])
        toast.error("Erreur de connexion")
      }
      return
    }

    setInput("")
    setAttachments([])
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setIsLoading(true)
    const res = await api.post<{ reponse: string; action?: unknown; conversationId?: string }>("/api/agent-ia/message", { message: trimmed, conversationId: currentConversationId })
    setIsLoading(false)
    if (res.succes && res.donnees) {
      if (res.donnees.conversationId) setCurrentConversationId(res.donnees.conversationId)
      setMessages((prev) => [...prev, { role: "assistant", content: res.donnees.reponse }])
      loadConversations()
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.message || "Une erreur s’est produite. Réessayez." },
      ])
      toast.error(res.message)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) sendMessage(input)
    else if (attachments.length === 1 && attachments[0].type.startsWith("audio/")) sendMessage("")
  }

  function handleSuggestion(label: string) {
    sendMessage(label)
  }

  function handleNewChat() {
    setMessages([])
    setInput("")
    setAttachments([])
    setCurrentConversationId(null)
  }

  function handleAttach(type: "file" | "image" | "audio") {
    if (!fileInputRef.current) return
    const accept =
      type === "image"
        ? "image/*"
        : type === "audio"
          ? "audio/*"
          : "*"
    fileInputRef.current.accept = accept
    fileInputRef.current.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    const next = Array.from(files).map((f) => ({ name: f.name, type: f.type, file: f }))
    setAttachments((prev) => [...prev, ...next])
    toast.success(`${next.length} fichier(s) ajouté(s)`)
    e.target.value = ""
  }

  const hasMessages = messages.length > 0
  const greeting = getGreeting()

  const inputBar = (
    <form onSubmit={handleSubmit} className="flex w-full items-end gap-0">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={onFileChange}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-l-xl rounded-r-none border border-input border-r-0 bg-background text-muted-foreground hover:text-foreground hover:bg-accent/50 dark:bg-input/20 dark:border-input"
          >
            <IconPlus className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="min-w-45">
          <DropdownMenuItem onClick={() => handleAttach("file")}>
            <IconFile className="size-4 mr-2" />
            Fichiers
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAttach("image")}>
            <IconPhoto className="size-4 mr-2" />
            Images
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAttach("audio")}>
            <IconMicrophone className="size-4 mr-2" />
            Audio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1 relative flex flex-col min-h-12 rounded-r-xl border border-input bg-background dark:bg-input/20 dark:border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {attachments.map((a, i) => (
              <span
                key={i}
                className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {a.name}
              </span>
            ))}
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Comment puis-je vous aider aujourd'hui ?"
          rows={1}
          className={cn(
            "w-full min-h-10 max-h-50 resize-none bg-transparent px-4 py-3 pr-24 text-sm",
            "placeholder:text-muted-foreground outline-none"
          )}
          disabled={isLoading}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Saisie vocale"
          >
            <IconMicrophone className="size-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={(!input.trim() && !attachments.some((a) => a.type.startsWith("audio/"))) || isLoading}
          >
            <IconSend className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background">
      {/* Sidebar Historique */}
      <div className="w-64 border-r hidden md:flex flex-col bg-muted/20">
        <div className="p-4 border-b shrink-0">
           <Button className="w-full flex gap-2 justify-start font-medium" variant="default" onClick={handleNewChat}>
             <IconPlus className="size-4" />
             Nouvelle conversation
           </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
           <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase py-1">Historique</div>
           {conversations.length === 0 && (
             <p className="text-xs text-muted-foreground px-2">Aucune conversation passée</p>
           )}
           {conversations.map(c => (
             <div key={c._id} className={cn("group flex items-center justify-between rounded-md transition-colors", currentConversationId === c._id ? "bg-accent" : "hover:bg-accent/50")}>
               <Button variant="ghost" onClick={() => loadConversation(c._id)} className="flex-1 justify-start text-left truncate font-normal px-3 h-9 data-[state=open]:bg-accent">
                 <div className="truncate text-sm opacity-90">{c.titre || "Session IA"}</div>
               </Button>
               <Button onClick={(e) => promptDelete(c._id, e)} variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity mr-1 text-muted-foreground hover:text-destructive shrink-0">
                 <IconPlus className="size-3.5 rotate-45" />
               </Button>
             </div>
           ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0 relative bg-background">
      {hasMessages && (
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2 lg:px-6 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleNewChat}
          >
            Nouvelle conversation
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="mx-auto max-w-3xl">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <IconChartBar className="size-3.5" />
                </span>
                <h2 className="text-xl font-medium text-foreground">
                  {greeting}, {userName}
                </h2>
              </div>

              <div className="w-full max-w-2xl">{inputBar}</div>

              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(({ label, icon: Icon }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/20 dark:border-input"
                    onClick={() => handleSuggestion(label)}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-xs font-medium">H</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground whitespace-pre-wrap"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="text-xs font-medium">H</span>
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <span className="animate-pulse">Réflexion...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasMessages && (
        <div className="shrink-0 border-t bg-background px-4 py-4 lg:px-6">
          <div className="mx-auto max-w-3xl">{inputBar}</div>
        </div>
      )}
      </div>
      
      <Dialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette conversation ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L&apos;historique de cette conversation sera définitivement supprimé pour votre compte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConversationToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
