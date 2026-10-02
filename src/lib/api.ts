import { supabase } from "./supabase";
import type {
  Allegato, ChecklistModello, ChecklistVoce, Documento, Ente, Evento, Parametro, Profilo, Sinistro, Tipologia, Valutazione,
} from "./types";

function lancia<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

// ---- Sinistri -------------------------------------------------------------
export async function listaSinistri(): Promise<Sinistro[]> {
  return lancia(await supabase.from("sinistri").select("*").order("created_at", { ascending: false }));
}

export async function leggiSinistro(id: string): Promise<Sinistro> {
  return lancia(await supabase.from("sinistri").select("*").eq("id", id).single());
}

export async function creaSinistro(dati: Partial<Sinistro>, enteId: string, userId: string): Promise<Sinistro> {
  const sinistro = lancia<Sinistro>(
    await supabase.from("sinistri").insert({ ...dati, ente_id: enteId, created_by: userId }).select("*").single(),
  );
  // checklist dal modello dell'ente (voci generali + voci della tipologia)
  const modelli = lancia<ChecklistModello[]>(
    await supabase.from("checklist_modelli").select("*").eq("attivo", true).or(`tipologia.is.null,tipologia.eq.${sinistro.tipologia}`).order("ordine"),
  );
  if (modelli.length) {
    lancia(
      await supabase.from("checklist_voci").insert(
        modelli.map((m) => ({
          sinistro_id: sinistro.id,
          ente_id: enteId,
          titolo: m.titolo,
          descrizione: m.descrizione,
          obbligatoria: m.obbligatoria,
          ordine: m.ordine,
        })),
      ),
    );
  }
  await registraEvento(sinistro.id, enteId, "creazione", `Sinistro registrato con protocollo ${sinistro.numero_protocollo}`, userId);
  return sinistro;
}

export async function aggiornaSinistro(id: string, dati: Partial<Sinistro>): Promise<Sinistro> {
  return lancia(await supabase.from("sinistri").update(dati).eq("id", id).select("*").single());
}

export async function eliminaSinistro(id: string) {
  lancia(await supabase.from("sinistri").delete().eq("id", id));
}

// ---- Checklist ------------------------------------------------------------
export async function listaChecklist(sinistroId: string): Promise<ChecklistVoce[]> {
  return lancia(await supabase.from("checklist_voci").select("*").eq("sinistro_id", sinistroId).order("ordine").order("titolo"));
}

export async function aggiornaVoce(id: string, dati: Partial<ChecklistVoce>) {
  lancia(await supabase.from("checklist_voci").update(dati).eq("id", id));
}

export async function aggiungiVoce(sinistroId: string, enteId: string, titolo: string, obbligatoria: boolean, ordine: number) {
  lancia(await supabase.from("checklist_voci").insert({ sinistro_id: sinistroId, ente_id: enteId, titolo, obbligatoria, ordine }));
}

export async function eliminaVoce(id: string) {
  lancia(await supabase.from("checklist_voci").delete().eq("id", id));
}

export async function listaModelli(): Promise<ChecklistModello[]> {
  return lancia(await supabase.from("checklist_modelli").select("*").order("ordine").order("titolo"));
}

export async function salvaModello(m: Partial<ChecklistModello> & { ente_id: string }) {
  if (m.id) lancia(await supabase.from("checklist_modelli").update(m).eq("id", m.id));
  else lancia(await supabase.from("checklist_modelli").insert(m));
}

export async function eliminaModello(id: string) {
  lancia(await supabase.from("checklist_modelli").delete().eq("id", id));
}

// ---- Parametri e valutazioni ---------------------------------------------
export async function listaParametri(): Promise<Parametro[]> {
  return lancia(await supabase.from("parametri_valutazione").select("*").order("ordine").order("etichetta"));
}

export async function salvaParametro(p: Partial<Parametro> & { ente_id: string }) {
  if (p.id) lancia(await supabase.from("parametri_valutazione").update(p).eq("id", p.id));
  else lancia(await supabase.from("parametri_valutazione").insert(p));
}

export async function eliminaParametro(id: string) {
  lancia(await supabase.from("parametri_valutazione").delete().eq("id", id));
}

export async function ultimaValutazione(sinistroId: string): Promise<Valutazione | null> {
  return lancia(
    await supabase.from("valutazioni").select("*").eq("sinistro_id", sinistroId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  );
}

export async function salvaValutazione(v: Omit<Valutazione, "id" | "created_at">): Promise<Valutazione> {
  return lancia(await supabase.from("valutazioni").insert(v).select("*").single());
}

// ---- Documenti, allegati, eventi -----------------------------------------
export async function listaDocumenti(sinistroId: string): Promise<Documento[]> {
  return lancia(await supabase.from("documenti").select("*").eq("sinistro_id", sinistroId).order("created_at", { ascending: false }));
}

export async function leggiDocumento(id: string): Promise<Documento> {
  return lancia(await supabase.from("documenti").select("*").eq("id", id).single());
}

export async function salvaDocumento(d: Omit<Documento, "id" | "created_at">): Promise<Documento> {
  return lancia(await supabase.from("documenti").insert(d).select("*").single());
}

export async function eliminaDocumento(id: string) {
  lancia(await supabase.from("documenti").delete().eq("id", id));
}

export async function listaAllegati(sinistroId: string): Promise<Allegato[]> {
  return lancia(await supabase.from("allegati").select("*").eq("sinistro_id", sinistroId).order("created_at", { ascending: false }));
}

export async function caricaAllegato(file: File, sinistro: Sinistro, userId: string, voceId?: string | null): Promise<Allegato> {
  const sicuro = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${sinistro.ente_id}/${sinistro.id}/${Date.now()}_${sicuro}`;
  const up = await supabase.storage.from("gestionalesir").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(up.error.message);
  return lancia(
    await supabase
      .from("allegati")
      .insert({
        sinistro_id: sinistro.id,
        ente_id: sinistro.ente_id,
        checklist_voce_id: voceId ?? null,
        nome_file: file.name,
        storage_path: path,
        mime: file.type || null,
        dimensione: file.size,
        created_by: userId,
      })
      .select("*")
      .single(),
  );
}

export async function urlAllegato(a: Allegato): Promise<string> {
  const r = await supabase.storage.from("gestionalesir").createSignedUrl(a.storage_path, 300);
  if (r.error) throw new Error(r.error.message);
  return r.data.signedUrl;
}

export async function eliminaAllegato(a: Allegato) {
  await supabase.storage.from("gestionalesir").remove([a.storage_path]);
  lancia(await supabase.from("allegati").delete().eq("id", a.id));
}

export async function listaEventi(sinistroId: string): Promise<Evento[]> {
  return lancia(await supabase.from("eventi").select("*").eq("sinistro_id", sinistroId).order("created_at", { ascending: false }));
}

export async function registraEvento(sinistroId: string, enteId: string, tipo: string, descrizione: string, userId: string) {
  await supabase.from("eventi").insert({ sinistro_id: sinistroId, ente_id: enteId, tipo, descrizione, created_by: userId });
}

// ---- Ente, profili (admin) -----------------------------------------------
export async function aggiornaEnte(id: string, dati: Partial<Ente>): Promise<Ente> {
  return lancia(await supabase.from("enti").update(dati).eq("id", id).select("*").single());
}

export async function listaEnti(): Promise<Ente[]> {
  return lancia(await supabase.from("enti").select("*").order("nome"));
}

export async function creaEnte(dati: Partial<Ente>): Promise<Ente> {
  return lancia(await supabase.from("enti").insert(dati).select("*").single());
}

export async function listaProfili(): Promise<Profilo[]> {
  return lancia(await supabase.from("profili").select("*").order("created_at", { ascending: false }));
}

export async function chiamaAdmin(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("sir-admin", { body });
  if (error) {
    // l'errore HTTP porta il messaggio nel corpo della risposta
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        throw new Error(j.error ?? error.message);
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data ?? {};
}

export const TIPOLOGIE_ORDINATE: Tipologia[] = ["danni_cose", "lesioni_persone", "misto"];
