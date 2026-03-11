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
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  IconSend,
  IconPlus,
  IconMicrophone,
  IconPhoto,
  IconFile,
  IconChartBar,
  IconCoin,
  IconFileText,
  IconMessages,
} from "@tabler/icons-react"
import { getStoredUser, getStoredToken, USER_UPDATED_EVENT, type MockUser } from "@/lib/auth-mock"
import { api, getApiUrl } from "@/lib/api"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
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
    setIsMobileSidebarOpen(false)
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
    setIsMobileSidebarOpen(false)
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          {attachments.map((a, i) => (
            <span
              key={i}
              className="rounded-lg bg-muted border px-2.5 py-1 text-xs font-medium text-foreground shadow-sm flex items-center gap-1.5"
            >
              <IconFile className="size-3.5 opacity-70" />
              {a.name}
            </span>
          ))}
        </div>
      )}
      <div className="relative flex items-end gap-2 rounded-2xl border border-input bg-background/60 shadow-md backdrop-blur-md p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 dark:bg-muted/10">
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
              className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              <IconPlus className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="min-w-45 rounded-xl">
            <DropdownMenuItem onClick={() => handleAttach("file")} className="rounded-lg cursor-pointer">
              <IconFile className="size-4 mr-2" />
              Fichiers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttach("image")} className="rounded-lg cursor-pointer">
              <IconPhoto className="size-4 mr-2" />
              Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttach("audio")} className="rounded-lg cursor-pointer">
              <IconMicrophone className="size-4 mr-2" />
              Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            e.target.style.height = "auto"
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Message pour Hssabaty IA..."
          rows={1}
          className={cn(
            "flex-1 min-h-11 max-h-50 resize-none bg-transparent px-2 py-3 text-sm",
            "placeholder:text-muted-foreground/60 focus:outline-none scrollbar-thin scrollbar-thumb-muted"
          )}
          disabled={isLoading}
        />

        <div className="flex shrink-0 items-center gap-1 pr-1 pb-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
            title="Saisie vocale"
          >
            <IconMicrophone className="size-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm transition-transform active:scale-95"
            disabled={(!input.trim() && !attachments.some((a) => a.type.startsWith("audio/"))) || isLoading}
          >
            <IconSend className="size-4 -ml-0.5" />
          </Button>
        </div>
      </div>
    </form>
  )

  const sidebarContent = (
    <>
      <div className="p-4 border-b shrink-0 bg-background/50 backdrop-blur-sm z-10 relative">
        <Button className="w-full flex gap-2 justify-start font-medium shadow-sm" variant="default" onClick={handleNewChat}>
          <IconPlus className="size-4" />
          Nouvelle session
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 relative scrollbar-thin scrollbar-thumb-accent">
        <div className="text-[11px] font-bold text-muted-foreground/70 mb-3 px-2 uppercase tracking-wider">Vos échanges passés</div>
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground opacity-60">
            <IconChartBar className="size-8 mb-2 stroke-1" />
            <p className="text-xs">Aucun historique disponible</p>
          </div>
        )}
        {conversations.map(c => (
          <div key={c._id} className={cn("group flex items-center justify-between rounded-lg transition-all duration-200 border", currentConversationId === c._id ? "bg-background border-border shadow-sm" : "border-transparent hover:bg-background/60 hover:border-border/50")}>
            <Button variant="ghost" onClick={() => loadConversation(c._id)} className="flex-1 justify-start text-left truncate font-normal px-3 h-10 hover:bg-transparent">
              <div className={cn("truncate text-sm transition-colors duration-200", currentConversationId === c._id ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                {c.titre || "Session IA"}
              </div>
            </Button>
            <Button onClick={(e) => promptDelete(c._id, e)} variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity mr-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0">
              <IconPlus className="size-3.5 rotate-45" />
            </Button>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background">
      {/* Sidebar Historique Desktop */}
      <div className={cn(
        "hidden md:flex flex-col border-r bg-muted/10 transition-all duration-300 ease-in-out overflow-hidden shrink-0",
        isSidebarOpen ? "w-64" : "w-0 border-r-0"
      )}>
        <div className={cn("flex flex-col flex-1 min-h-0 transition-opacity duration-200", isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
          {sidebarContent}
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0 relative bg-background">
        {/* Desktop top bar with toggle */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b px-4 py-2 bg-background/60 backdrop-blur-md z-10">
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-foreground transition-colors", isSidebarOpen && "text-primary hover:text-primary")}
            onClick={() => setIsSidebarOpen(v => !v)}
            title={isSidebarOpen ? "Fermer l'historique" : "Ouvrir l'historique"}
          >
            <IconMessages className="size-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Hssabaty IA</span>
        </div>

        {/* Header Mobile / Navigation */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2 lg:px-6 md:hidden bg-background/80 backdrop-blur-md z-10">
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("text-muted-foreground", isMobileSidebarOpen && "text-primary")}>
                <IconMessages className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-70 p-0 flex flex-col bg-background border-r" showCloseButton={false}>
              <SheetTitle className="sr-only">Historique des sessions</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium tracking-tight absolute left-1/2 -translate-x-1/2 text-foreground">Hssabaty IA</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground md:hidden"
            onClick={handleNewChat}
          >
            <IconPlus className="size-5" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6 lg:px-6 relative">
          {/* Subtle background glow for empty state */}
          {!hasMessages && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          )}
          <div className="mx-auto max-w-3xl relative">
            {!hasMessages ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] gap-8 md:gap-12">
                <div className="flex flex-col items-center gap-3 md:gap-4 text-center mt-2 md:mt-8 px-2">
                  <div className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 text-primary shadow-sm border border-primary/10">
                    <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-20" style={{ animationDuration: "3s" }} />
                    <span className="text-xl md:text-2xl font-bold tracking-tight">H</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
                    {greeting}, {userName}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground max-w-md">
                    Je suis M. Hssabaty, votre assistant financier intelligent. Je peux enregistrer vos dépenses, créer des budgets et analyser vos habitudes.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 md:gap-3 px-2">
                  {SUGGESTIONS.map(({ label, icon: Icon }) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      className="rounded-xl px-3 py-4 md:px-4 md:py-5 h-auto flex flex-col items-start gap-2 md:gap-3 border shadow-sm bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left w-[calc(50%-4px)] md:w-auto md:max-w-50"
                      onClick={() => handleSuggestion(label)}
                    >
                      <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                        <Icon className="size-4 md:size-5" />
                      </div>
                      <span className="text-xs md:text-sm font-medium leading-tight whitespace-normal">{label}</span>
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
                        "max-w-[85%] px-5 py-3.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-sm"
                          : "bg-card border shadow-sm text-foreground rounded-2xl rounded-tl-sm"
                      )}
                    >
                      {m.role === "user" ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert wrap-break-word max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
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

 
        <div className="shrink-0 bg-background/90 backdrop-blur-md border-t px-4 py-4 lg:px-6 z-10">
          <div className="mx-auto max-w-3xl">{inputBar}</div>
        </div>
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
