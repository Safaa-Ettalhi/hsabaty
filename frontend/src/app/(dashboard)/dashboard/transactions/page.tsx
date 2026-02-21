import { TransactionsClient } from "./transactions-client"

export const metadata = {
  title: "Transactions - Hssabaty",
  description: "Liste des transactions",
}

export default function TransactionsPage() {
  return <TransactionsClient />
}
