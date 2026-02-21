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
  IconSend,
  IconPlus,
  IconMicrophone,
  IconPhoto,
  IconFile,
  IconChartBar,
  IconCoin,
  IconFileText,
} from "@tabler/icons-react"
import { getStoredUser } from "@/lib/auth-mock"
import { api } from "@/lib/api"
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
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState("")
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = getStoredUser()
    setUserName(u?.name?.split(" ")[0] ?? "vous")
  }, [])

  useEffect(() => {
    api.get<{ messages: Array<{ role: string; contenu: string }> }>("/api/agent-ia/historique").then((res) => {
      if (res.succes && res.donnees?.messages?.length) {
        setMessages(
          res.donnees.messages.map((m) => ({
            role: m.role === "utilisateur" ? "user" : "assistant",
            content: m.contenu,
          }))
        )
      }
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setInput("")
    setAttachments([])
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setIsLoading(true)
    const res = await api.post<{ reponse: string; action?: unknown }>("/api/agent-ia/message", { message: trimmed })
    setIsLoading(false)
    if (res.succes && res.donnees) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.donnees.reponse }])
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
    setAttachments([])
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
    const next = Array.from(files).map((f) => ({ name: f.name, type: f.type }))
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
        <DropdownMenuContent align="start" side="top" className="min-w-[180px]">
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
      <div className="flex-1 relative flex flex-col min-h-[48px] rounded-r-xl border border-input bg-background dark:bg-input/20 dark:border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
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
            "w-full min-h-[40px] max-h-[200px] resize-none bg-transparent px-4 py-3 pr-24 text-sm",
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
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
          >
            <IconSend className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      {hasMessages && (
        <div className="flex shrink-0 items-center border-b px-4 py-2 lg:px-6">
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
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
  )
}
