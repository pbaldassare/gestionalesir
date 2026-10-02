import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { leggiDocumento } from "@/lib/api";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";

export default function Stampa() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["documento", id], queryFn: () => leggiDocumento(id) });

  useEffect(() => {
    if (q.data) document.title = q.data.titolo;
  }, [q.data]);

  if (q.isLoading) return <Caricamento pieno />;
  if (q.error || !q.data) return <div className="p-8 text-destructive">{(q.error as Error)?.message ?? "Documento non trovato"}</div>;

  return (
    <div className="min-h-screen bg-muted/60 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between px-2">
        <div className="eyebrow">{q.data.titolo}</div>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Stampa o salva PDF</Button>
      </div>
      <article className="foglio mx-auto max-w-full" dangerouslySetInnerHTML={{ __html: q.data.contenuto_html }} />
    </div>
  );
}
