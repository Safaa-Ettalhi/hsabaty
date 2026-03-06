import { FacturationClient } from "./facturation-client"

export const metadata = {
  title: "Facturation - Hssabaty",
  description: "Moyens de paiement et historique de facturation",
}

export default function FacturationPage() {
  return <FacturationClient />
}
