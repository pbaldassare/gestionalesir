import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { chiamaAdmin, listaEnti, listaProfili } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { dataIt } from "@/lib/format";
import type { Profilo, Ruolo } from "@/lib/types";
import { Intestazione } from "@/components/layout/Intestazione";
import { Caricamento } from "@/components/layout/Caricamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function generaPassword() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alfabeto[n % alfabeto.length]).join("");
}

export default function Utenti() {
  const qc = useQueryClient();
  const { profilo: me } = useAuth();
  const profili = useQuery({ queryKey: ["profili"], queryFn: listaProfili });
  const enti = useQuery({ queryKey: ["enti"], queryFn: listaEnti });
  const [nuovo, setNuovo] = useState(false);
  const [form, setForm] = useState({ nome_completo: "", email: "", password: generaPassword(), ruolo: "utente" as Ruolo, ente_id: "" });
  const [reset, setReset] = useState<Profilo | null>(null);
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [daEliminare, setDaEliminare] = useState<Profilo | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["profili"] });
  const crea = useMutation({
    mutationFn: () => chiamaAdmin({ azione: "crea_utente", ...form }),
    onSuccess: () => { inv(); setNuovo(false); toast.success("Utente creato", { description: "Comunica le credenziali all'utente in modo sicuro." }); setForm({ nome_completo: "", email: "", password: generaPassword(), ruolo: "utente", ente_id: "" }); },
    onError: (e: Error) => toast.error("Utente non creato", { description: e.message }),
  });
  const reimposta = useMutation({
    mutationFn: () => chiamaAdmin({ azione: "reimposta_password", id: reset!.id, password: nuovaPassword }),
    onSuccess: () => { setReset(null); toast.success("Password aggiornata"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const attivo = useMutation({
    mutationFn: (p: Profilo) => chiamaAdmin({ azione: "imposta_attivo", id: p.id, attivo: !p.attivo }),
    onSuccess: inv,
    onError: (e: Error) => toast.error(e.message),
  });
  const elimina = useMutation({
    mutationFn: (p: Profilo) => chiamaAdmin({ azione: "elimina_utente", id: p.id }),
    onSuccess: () => { inv(); setDaEliminare(null); toast.success("Utente eliminato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const nomeEnte = (id: string | null) => enti.data?.find((e) => e.id === id)?.nome ?? "—";

  return (
    <>
      <Intestazione
        eyebrow="Amministrazione"
        titolo="Utenti"
        descrizione="Crea gli accessi per gli enti. Ogni utente vede solo i sinistri del proprio ente."
        azioni={<Button onClick={() => { setForm((f) => ({ ...f, password: generaPassword() })); setNuovo(true); }}><Plus className="mr-2 h-4 w-4" /> Nuovo utente</Button>}
      />

      {profili.isLoading ? (
        <Caricamento />
      ) : profili.error ? (
        <div className="text-destructive">{(profili.error as Error).message}</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Utente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Ente</TableHead>
                <TableHead className="hidden md:table-cell">Ultimo accesso</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profili.data ?? []).map((p) => (
                <TableRow key={p.id} className={cn(!p.attivo && "opacity-60")}>
                  <TableCell>
                    <div className="font-medium">{p.nome_completo}{p.id === me?.id && <span className="ml-2 eyebrow">tu</span>}</div>
                    <div className="text-[12.5px] text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] uppercase tracking-wider">{p.ruolo}</TableCell>
                  <TableCell className="text-[13px]">{p.ruolo === "admin" ? <span className="text-muted-foreground">—</span> : nomeEnte(p.ente_id)}</TableCell>
                  <TableCell className="hidden font-mono text-[12px] text-muted-foreground md:table-cell">{p.ultimo_accesso ? dataIt(p.ultimo_accesso, true) : "mai"}</TableCell>
                  <TableCell>
                    <span className={cn("font-mono text-[11px] uppercase tracking-wider", p.attivo ? "text-success" : "text-destructive")}>{p.attivo ? "attivo" : "disattivato"}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Azioni</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setNuovaPassword(generaPassword()); setReset(p); }}><KeyRound className="mr-2 h-4 w-4" /> Reimposta password</DropdownMenuItem>
                        <DropdownMenuItem disabled={p.id === me?.id} onClick={() => attivo.mutate(p)}>
                          {p.attivo ? <><UserX className="mr-2 h-4 w-4" /> Disattiva</> : <><UserCheck className="mr-2 h-4 w-4" /> Riattiva</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={p.id === me?.id} className="text-destructive focus:text-destructive" onClick={() => setDaEliminare(p)}><Trash2 className="mr-2 h-4 w-4" /> Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={nuovo} onOpenChange={setNuovo}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); crea.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="font-serif">Nuovo utente</DialogTitle>
              <DialogDescription>L'accesso è immediato con la password indicata. L'utente potrà chiederne la modifica.</DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="n">Nome e cognome</Label><Input id="n" required value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="r">Ruolo</Label>
                <Select value={form.ruolo} onValueChange={(v) => setForm({ ...form, ruolo: v as Ruolo })}>
                  <SelectTrigger id="r"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="utente">Utente di un ente</SelectItem><SelectItem value="admin">Amministratore</SelectItem></SelectContent>
                </Select>
              </div>
              {form.ruolo === "utente" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ente">Ente</Label>
                  <Select value={form.ente_id} onValueChange={(v) => setForm({ ...form, ente_id: v })}>
                    <SelectTrigger id="ente"><SelectValue placeholder="Seleziona l'ente" /></SelectTrigger>
                    <SelectContent>{(enti.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="p">Password iniziale</Label>
                <div className="flex gap-2">
                  <Input id="p" className="font-mono" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: generaPassword() })}>Genera</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuovo(false)}>Annulla</Button>
              <Button type="submit" disabled={crea.isPending || (form.ruolo === "utente" && !form.ente_id)}>{crea.isPending ? "Creazione" : "Crea utente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Reimposta la password</DialogTitle>
            <DialogDescription>{reset?.nome_completo} · {reset?.email}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input className="font-mono" minLength={8} value={nuovaPassword} onChange={(e) => setNuovaPassword(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setNuovaPassword(generaPassword())}>Genera</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReset(null)}>Annulla</Button>
            <Button disabled={nuovaPassword.length < 8 || reimposta.isPending} onClick={() => reimposta.mutate()}>Aggiorna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!daEliminare} onOpenChange={(o) => !o && setDaEliminare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {daEliminare?.nome_completo}?</AlertDialogTitle>
            <AlertDialogDescription>L'accesso viene revocato subito. I sinistri dell'ente restano.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => daEliminare && elimina.mutate(daEliminare)}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
