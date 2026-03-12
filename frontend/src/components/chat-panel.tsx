/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
  IconChartBar,
  IconCoin,
  IconFileText,
  IconMessages,
} from "@tabler/icons-react"
import { getStoredUser, USER_UPDATED_EVENT, type MockUser } from "@/lib/auth-mock"
import { api } from "@/lib/api"
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
    if (!trimmed || isLoading) return

    setInput("")
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
    sendMessage(input)
  }

  function handleSuggestion(label: string) {
    sendMessage(label)
  }

  function handleNewChat() {
    setMessages([])
    setInput("")
    setCurrentConversationId(null)
    setIsMobileSidebarOpen(false)
  }

  const hasMessages = messages.length > 0
  const greeting = getGreeting()

  const inputBar = (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="relative flex items-end gap-2 rounded-2xl border border-input bg-background/60 shadow-md backdrop-blur-md p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 dark:bg-muted/10">
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
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-lg bg-violet-600 text-white shadow-sm transition-transform hover:bg-violet-700 active:scale-95"
            disabled={!input.trim() || isLoading}
          >
            <IconSend className="size-4 -ml-0.5" />
          </Button>
        </div>
      </div>
    </form>
  )

  const sidebarContent = (
    <>
      <div className="relative z-10 shrink-0 border-b border-zinc-200/80 bg-zinc-50/80 p-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <Button className="w-full justify-start gap-2 rounded-full bg-violet-600 font-medium text-white shadow-md hover:bg-violet-700" onClick={handleNewChat}>
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
    <div className="relative flex h-full flex-1 overflow-hidden bg-zinc-50/80 dark:bg-zinc-950/50">
      {/* Fond style Flux de trésorerie */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
        <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[75%] -translate-x-1/2 rounded-full bg-rose-500/5 blur-3xl" />
      </div>
      {/* Sidebar Historique Desktop */}
      <div className={cn(
        "hidden md:flex flex-col border-r border-zinc-200/80 bg-white/90 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden shrink-0 dark:border-zinc-800 dark:bg-zinc-900/90",
        isSidebarOpen ? "w-64" : "w-0 border-r-0"
      )}>
        <div className={cn("flex flex-col flex-1 min-h-0 transition-opacity duration-200", isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
          {sidebarContent}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col bg-transparent">
        {/* Desktop top bar with toggle */}
        <div className="z-10 hidden shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white/80 px-4 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 md:flex">
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
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 py-2 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 md:hidden lg:px-6">
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
          {!hasMessages && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-3xl" />
          )}
          <div className="mx-auto max-w-3xl relative">
            {!hasMessages ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] gap-8 md:gap-12">
                <div className="flex flex-col items-center gap-3 md:gap-4 text-center mt-2 md:mt-8 px-2">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-linear-to-br from-violet-500/20 to-violet-500/5 text-violet-700 shadow-sm dark:text-violet-400 md:h-16 md:w-16">
                    <div className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/10 opacity-20" style={{ animationDuration: "3s" }} />
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
                      className="flex h-auto w-[calc(50%-4px)] flex-col items-start gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 py-4 shadow-sm backdrop-blur transition-all hover:border-violet-500/30 hover:bg-violet-50/50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:bg-violet-950/20 md:max-w-50 md:w-auto md:gap-3 md:px-4 md:py-5"
                      onClick={() => handleSuggestion(label)}
                    >
                      <div className="shrink-0 rounded-lg bg-violet-500/10 p-1.5 text-violet-600 dark:text-violet-400 md:p-2">
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-400">
                        <span className="text-xs font-medium">H</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] px-5 py-3.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-2xl rounded-tr-sm bg-violet-600 text-white shadow-sm dark:bg-violet-600"
                          : "rounded-2xl rounded-tl-sm border border-zinc-200/80 bg-white text-foreground shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90"
                      )}
                    >
                      {m.role === "user" ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        <div
                          className={cn(
                            "wrap-break-word max-w-none text-sm leading-relaxed",
                            "prose prose-sm dark:prose-invert",
                            "prose-headings:font-semibold prose-headings:tracking-tight",
                            "prose-h2:mb-2 prose-h2:mt-0 prose-h2:text-base prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-1 dark:prose-h2:border-zinc-700",
                            "prose-h3:mb-1.5 prose-h3:mt-3 prose-h3:text-sm prose-h3:text-violet-700 dark:prose-h3:text-violet-400",
                            "prose-p:my-1 prose-li:my-0.5",
                            "prose-hr:my-3 prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700",
                            "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100",
                            "prose-table:text-xs prose-th:border prose-th:border-zinc-200 prose-th:bg-zinc-50 prose-th:px-2 prose-th:py-1.5 prose-td:border prose-td:border-zinc-200 prose-td:px-2 prose-td:py-1.5 dark:prose-th:border-zinc-700 dark:prose-th:bg-zinc-800/80 dark:prose-td:border-zinc-700",
                            "overflow-x-auto prose-table:block prose-table:whitespace-nowrap",
                            "prose-pre:bg-muted/50 prose-pre:border prose-pre:text-xs",
                            "prose-blockquote:border-l-violet-500 prose-blockquote:bg-violet-500/5 prose-blockquote:py-2 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-300",
                            "prose-ul:my-2 prose-ol:my-2"
                          )}
                        >
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-400">
                      <span className="text-xs font-medium">H</span>
                    </div>
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                      <span className="animate-pulse">Réflexion...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

 
        <div className="z-10 shrink-0 border-t border-zinc-200/80 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90 lg:px-6">
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
