import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bold, Code2, Eye, Heading2, Italic, List, PencilLine, Pilcrow, Redo2, RotateCcw, Save, Search, Underline, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { listaModelliDocumento, ripristinaModelloDocumento, salvaModelloDocumento } from "@/lib/api";
import { CAMPI, MODELLI, MODELLI_PREDEFINITI, campiSconosciuti, componi, contestoEsempio, costruisciVariabili, sanifica, type ChiaveModello } from "@/lib/modelli";
import { useAuth } from "@/hooks/useAuth";
import { dataIt } from "@/lib/format";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { AnteprimaFoglio, FoglioScalato } from "@/components/Foglio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Modo = "modifica" | "anteprima" | "html";

const etichettaCampo = (nome: string) => CAMPI.find((c) => c.nome === nome)?.etichetta ?? nome;
const eBlocco = (nome: string) => !!CAMPI.find((c) => c.nome === nome)?.blocco;

/** Nel foglio modificabile i campi {{...}} diventano etichette non modificabili. */
function versoEditor(html: string): string {
  return sanifica(html).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, nome) => {
    const blocco = eBlocco(nome);
    return `<span class="campo${blocco ? " campo-blocco" : ""}" contenteditable="false" data-campo="${nome}">${etichettaCampo(nome)}</span>`;
  });
}

function daEditor(radice: HTMLElement): string {
  const copia = radice.cloneNode(true) as HTMLElement;
  copia.querySelectorAll<HTMLElement>("span[data-campo]").forEach((el) => el.replaceWith(document.createTextNode(`{{${el.dataset.campo}}}`)));
  return copia.innerHTML;
}

function EditorVisuale({ iniziale, onChange, registra }: { iniziale: string; onChange: (html: string) => void; registra: (inserisci: (nome: string) => void) => void }) {
  const ref = useRef<HTMLElement>(null);
  const ultimaSelezione = useRef<Range | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = versoEditor(iniziale);
    // il contenuto iniziale si imposta una volta: poi il foglio è la fonte dei dati
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function salvaSelezione() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) ultimaSelezione.current = sel.getRangeAt(0).cloneRange();
  }

  useEffect(() => {
    registra((nome: string) => {
      const radice = ref.current;
      if (!radice) return;
      const chip = document.createElement("span");
      chip.className = `campo${eBlocco(nome) ? " campo-blocco" : ""}`;
      chip.contentEditable = "false";
      chip.dataset.campo = nome;
      chip.textContent = etichettaCampo(nome);
      let range = ultimaSelezione.current;
      if (!range || !radice.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(radice);
        range.collapse(false);
      }
      range.deleteContents();
      if (eBlocco(nome)) {
        const p = document.createElement("p");
        p.appendChild(chip);
        range.insertNode(p);
        range.setStartAfter(p);
      } else {
        const spazio = document.createTextNode(" ");
        range.insertNode(spazio);
        range.insertNode(chip);
        range.setStartAfter(spazio);
      }
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      ultimaSelezione.current = range.cloneRange();
      radice.focus();
      onChange(daEditor(radice));
    });
  }, [registra, onChange]);

  return (
    <FoglioScalato className="max-h-[70vh]">
      {(scala) => (
        <article
          ref={ref}
          className="foglio foglio-modificabile origin-top-left outline-none"
          style={{ transform: `scale(${scala})` }}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          lang="it"
          onInput={() => ref.current && onChange(daEditor(ref.current))}
          onKeyUp={salvaSelezione}
          onMouseUp={salvaSelezione}
          onBlur={salvaSelezione}
        />
      )}
    </FoglioScalato>
  );
}

function Strumento({ icona: Icona, titolo, comando, valore }: { icona: typeof Bold; titolo: string; comando: string; valore?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={titolo}
      aria-label={titolo}
      onMouseDown={(e) => {
        e.preventDefault();
        document.execCommand(comando, false, valore);
      }}
    >
      <Icona className="h-4 w-4" />
    </Button>
  );
}

export default function Modelli() {
  const qc = useQueryClient();
  const { ente, session } = useAuth();
  const salvati = useQuery({ queryKey: ["modelli-documento"], queryFn: listaModelliDocumento });
  const [chiave, setChiave] = useState<ChiaveModello>("scheda_danno");
  const [html, setHtml] = useState("");
  const [sporco, setSporco] = useState(false);
  const [modo, setModo] = useState<Modo>("modifica");
  const [versione, setVersione] = useState(0);
  const [filtro, setFiltro] = useState("");
  const [confermaRipristino, setConfermaRipristino] = useState(false);
  const inserisciRef = useRef<(nome: string) => void>(() => {});
  const areaHtml = useRef<HTMLTextAreaElement>(null);

  const personalizzato = salvati.data?.find((m) => m.chiave === chiave);

  // carica il modello scelto (salvato dall'ente oppure predefinito)
  useEffect(() => {
    if (salvati.isLoading) return;
    setHtml(personalizzato?.contenuto_html ?? MODELLI_PREDEFINITI[chiave]);
    setSporco(false);
    setVersione((v) => v + 1);
    // si ricarica solo cambiando modello o dopo un salvataggio/ripristino
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave, salvati.isLoading, personalizzato?.updated_at]);

  const anteprima = useMemo(() => (ente ? componi(html, costruisciVariabili(contestoEsempio(ente))) : ""), [html, ente]);
  const sconosciuti = useMemo(() => campiSconosciuti(html), [html]);
  const campiFiltrati = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return CAMPI.filter((c) => !q || c.etichetta.toLowerCase().includes(q) || c.nome.includes(q));
  }, [filtro]);
  const gruppi = [...new Set(campiFiltrati.map((c) => c.gruppo))];

  const salva = useMutation({
    mutationFn: () => salvaModelloDocumento(ente!.id, chiave, sanifica(html), session!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelli-documento"] });
      setSporco(false);
      toast.success("Modello salvato", { description: "Verrà usato per i prossimi documenti generati." });
    },
    onError: (e: Error) => toast.error("Modello non salvato", { description: e.message }),
  });

  const ripristina = useMutation({
    mutationFn: () => ripristinaModelloDocumento(chiave),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelli-documento"] });
      setHtml(MODELLI_PREDEFINITI[chiave]);
      setSporco(false);
      setVersione((v) => v + 1);
      setConfermaRipristino(false);
      toast.success("Modello predefinito ripristinato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function scegli(nuova: ChiaveModello) {
    if (nuova === chiave) return;
    if (sporco && !window.confirm("Ci sono modifiche non salvate a questo modello. Vuoi abbandonarle?")) return;
    setChiave(nuova);
    setModo("modifica");
  }

  function cambiaModo(m: Modo) {
    setModo(m);
    if (m === "modifica") setVersione((v) => v + 1);
  }

  function inserisci(nome: string) {
    if (modo === "html") {
      const ta = areaHtml.current;
      const testo = `{{${nome}}}`;
      if (!ta) return;
      const [a, b] = [ta.selectionStart, ta.selectionEnd];
      setHtml(html.slice(0, a) + testo + html.slice(b));
      setSporco(true);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(a + testo.length, a + testo.length);
      });
      return;
    }
    if (modo === "anteprima") cambiaModo("modifica");
    inserisciRef.current(nome);
  }

  if (salvati.isLoading) return <Caricamento />;
  const info = MODELLI.find((m) => m.chiave === chiave)!;

  return (
    <>
      <Intestazione
        eyebrow={ente?.nome}
        titolo="Modelli dei documenti"
        descrizione="I testi con cui il gestionale compila schede, lettere e quietanze. Le etichette colorate sono campi che vengono riempiti con i dati del fascicolo."
      />

      <div className="grid gap-5 md:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_260px]">
        {/* elenco dei modelli */}
        <nav aria-label="Modelli" className="space-y-4">
          {(["Istruttoria", "Accoglimento", "Rigetto"] as const).map((g) => (
            <div key={g}>
              <div className="eyebrow mb-1.5">{g}</div>
              <ul className="overflow-hidden rounded-lg border bg-card">
                {MODELLI.filter((m) => m.gruppo === g).map((m) => {
                  const pers = salvati.data?.some((x) => x.chiave === m.chiave);
                  return (
                    <li key={m.chiave} className="border-b last:border-0">
                      <button
                        onClick={() => scegli(m.chiave)}
                        className={cn("block w-full px-3 py-2.5 text-left transition-colors hover:bg-accent/60", m.chiave === chiave && "bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]")}
                        aria-current={m.chiave === chiave}
                      >
                        <div className="text-[13.5px] font-medium leading-snug">{m.titolo}</div>
                        <div className={cn("mt-0.5 font-mono text-[10.5px] uppercase tracking-wider", pers ? "text-primary" : "text-muted-foreground")}>{pers ? "personalizzato" : "predefinito"}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* editor */}
        <section className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 2xl:row-span-1">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold">{info.titolo}</h2>
              <p className="text-[12.5px] text-muted-foreground">
                {info.descrizione}{" "}
                {personalizzato ? <>Modificato il <span className="font-mono">{dataIt(personalizzato.updated_at, true)}</span>.</> : "Stai usando il modello predefinito."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!personalizzato && !sporco} onClick={() => setConfermaRipristino(true)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Ripristina
              </Button>
              <Button size="sm" disabled={!sporco || salva.isPending} onClick={() => salva.mutate()}>
                <Save className="mr-1.5 h-4 w-4" /> {salva.isPending ? "Salvataggio" : "Salva modello"}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-2 py-1.5">
              <div className="flex items-center gap-0.5">
                {modo === "modifica" ? (
                  <>
                    <Strumento icona={Bold} titolo="Grassetto" comando="bold" />
                    <Strumento icona={Italic} titolo="Corsivo" comando="italic" />
                    <Strumento icona={Underline} titolo="Sottolineato" comando="underline" />
                    <span className="mx-1 h-5 w-px bg-border" />
                    <Strumento icona={Heading2} titolo="Titolo di sezione" comando="formatBlock" valore="h2" />
                    <Strumento icona={Pilcrow} titolo="Paragrafo" comando="formatBlock" valore="p" />
                    <Strumento icona={List} titolo="Elenco puntato" comando="insertUnorderedList" />
                    <span className="mx-1 h-5 w-px bg-border" />
                    <Strumento icona={Undo2} titolo="Annulla" comando="undo" />
                    <Strumento icona={Redo2} titolo="Ripeti" comando="redo" />
                  </>
                ) : (
                  <span className="px-2 text-[12px] text-muted-foreground">{modo === "anteprima" ? "Anteprima con un fascicolo di esempio" : "Codice HTML del modello, per ritocchi avanzati"}</span>
                )}
              </div>
              <div className="flex rounded-md border p-0.5" role="tablist" aria-label="Vista">
                {([["modifica", "Modifica", PencilLine], ["anteprima", "Anteprima", Eye], ["html", "HTML", Code2]] as const).map(([m, label, Icona]) => (
                  <button key={m} role="tab" aria-selected={modo === m} onClick={() => cambiaModo(m)} className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-[12.5px]", modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Icona className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {modo === "modifica" && (
              <EditorVisuale
                key={`${chiave}-${versione}`}
                iniziale={html}
                onChange={(h) => { setHtml(h); setSporco(true); }}
                registra={(fn) => { inserisciRef.current = fn; }}
              />
            )}
            {modo === "anteprima" && <AnteprimaFoglio html={anteprima} className="max-h-[70vh]" />}
            {modo === "html" && (
              <Textarea
                ref={areaHtml}
                value={html}
                spellCheck={false}
                onChange={(e) => { setHtml(e.target.value); setSporco(true); }}
                className="h-[70vh] resize-none rounded-none border-0 font-mono text-[12.5px] leading-relaxed focus-visible:ring-0"
              />
            )}
          </div>

          {sconosciuti.length > 0 && (
            <p className="mt-2 text-[12.5px] text-warning">
              Campi non riconosciuti, resteranno scritti così nel documento: <span className="font-mono">{sconosciuti.map((s) => `{{${s}}}`).join(", ")}</span>
            </p>
          )}
          {sporco && <p className="mt-2 text-[12.5px] text-muted-foreground">Modifiche non salvate.</p>}
        </section>

        {/* campi */}
        <aside className="md:col-start-1 md:row-start-2 2xl:col-start-3 2xl:row-start-1">
          <div className="eyebrow mb-1.5">Campi del fascicolo</div>
          <div className="rounded-lg border bg-card">
            <div className="relative border-b p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 pl-8 text-[12.5px]" placeholder="Cerca un campo" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>
            <div className="max-h-[46vh] overflow-auto p-2 2xl:max-h-[62vh]">
              {gruppi.map((g) => (
                <div key={g} className="mb-3 last:mb-0">
                  <div className="mb-1 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{g}</div>
                  <div className="flex flex-wrap gap-1">
                    {campiFiltrati.filter((c) => c.gruppo === g).map((c) => (
                      <button
                        key={c.nome}
                        type="button"
                        title={`{{${c.nome}}}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => inserisci(c.nome)}
                        className={cn("rounded border px-2 py-1 text-left text-[12px] leading-tight transition-colors hover:border-primary hover:bg-primary/5", c.blocco && "w-full border-dashed")}
                      >
                        {c.etichetta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {gruppi.length === 0 && <p className="px-1 py-3 text-[12.5px] text-muted-foreground">Nessun campo con questo nome.</p>}
            </div>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">Posiziona il cursore nel testo e clicca un campo per inserirlo.</p>
        </aside>
      </div>

      <AlertDialog open={confermaRipristino} onOpenChange={setConfermaRipristino}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare il modello predefinito?</AlertDialogTitle>
            <AlertDialogDescription>Il testo personalizzato di "{info.titolo}" verrà sostituito con quello originale. I documenti già generati non cambiano.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => (personalizzato ? ripristina.mutate() : (setHtml(MODELLI_PREDEFINITI[chiave]), setSporco(false), setVersione((v) => v + 1), setConfermaRipristino(false)))}>Ripristina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
