import { CashflowClient } from "./cashflow-client"

export const metadata = {
  title: "Flux de trésorerie - Hssabaty",
  description: "Visualisation des flux de trésorerie",
}

export default function CashflowPage() {
  return <CashflowClient />
}
