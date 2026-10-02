import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { creaSinistro } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Intestazione } from "@/components/layout/Intestazione";
import { SinistroForm, type DatiSinistro } from "@/components/SinistroForm";

export default function NuovoSinistro() {
  const { ente, session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: (d: DatiSinistro) => creaSinistro(d, ente!.id, session!.user.id),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sinistri"] });
      toast.success(`Fascicolo ${s.numero_protocollo} aperto`, { description: "Checklist documentale creata dal modello dell'Ente." });
      navigate(`/app/sinistri/${s.id}`);
    },
    onError: (e: Error) => toast.error("Sinistro non registrato", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Intestazione
        eyebrow="Nuovo fascicolo"
        titolo="Registra un sinistro"
        descrizione="Il numero di protocollo viene assegnato al salvataggio. La checklist documentale sarà generata in base alla tipologia."
      />
      <SinistroForm onSalva={(d) => m.mutate(d)} onAnnulla={() => navigate(-1)} etichettaSalva="Apri il fascicolo" salvataggio={m.isPending} />
    </div>
  );
}
