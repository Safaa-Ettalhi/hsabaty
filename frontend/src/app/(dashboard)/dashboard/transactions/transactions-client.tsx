"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Transaction = {
  _id: string
  date: string
  description: string
  categorie: string
  montant: number
  type: string
  tags?: string[]
}

type Res = {
  transactions: Transaction[]
  pagination: { page: number; limite: number; total: number; pages: number }
}

export function TransactionsClient() {
  const [data, setData] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    api
      .get<Res>(`/api/transactions?page=${page}&limite=20`)
      .then((res) => {
        if (res.succes && res.donnees) setData(res.donnees)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Liste des transactions avec pagination</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : data?.transactions?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(t.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{t.categorie}</TableCell>
                      <TableCell className={`text-right tabular-nums ${t.type === "depense" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                        {t.type === "depense" ? "-" : "+"}
                        {t.montant.toFixed(2)} MAD
                      </TableCell>
                      <TableCell>{t.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {data.pagination.page} / {data.pagination.pages} ({data.pagination.total} au total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucune transaction
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
