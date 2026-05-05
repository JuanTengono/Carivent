import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { usePermission } from "../../hooks/usePermission";
import { usePageReveal } from "../../hooks/usePageReveal";
import { ApiRequestError } from "../../lib/api";
import { fetchEventsList } from "../../lib/dashboardApi";
import {
  createSurveyApi,
  createSurveyResponseApi,
  fetchSurveyResponses,
  fetchSurveys,
  type SurveyResponseRow,
  type SurveyRow,
} from "../../lib/surveysManagementApi";

type Tab = "surveys" | "responses" | "respond";

export function SurveysManagementPage() {
  return (
    <PermissionGuard permission="READ_SURVEYS">
      <SurveysContent />
    </PermissionGuard>
  );
}

function SurveysContent() {
  const { token } = useAuth();
  const { can } = usePermission();
  const { push } = useToast();
  const revealRef = usePageReveal([]);
  const [tab, setTab] = useState<Tab>("surveys");

  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [titleSurvey, setTitleSurvey] = useState("");
  const [eventId, setEventId] = useState("");
  const [saving, setSaving] = useState(false);

  const [respondSurveyId, setRespondSurveyId] = useState("");
  const [stars, setStars] = useState("5");
  const [comment, setComment] = useState("");

  const loadSurveys = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchSurveys(token, { all: true, limit: 100 });
      setSurveys(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar encuestas", "error");
    }
  }, [token, push]);

  const loadResponses = useCallback(async () => {
    if (!token || !can("READ_SURVEY_RESPONSES")) return;
    try {
      const res = await fetchSurveyResponses(token, { all: true, limit: 200 });
      setResponses(res.data);
    } catch (e) {
      push(e instanceof ApiRequestError ? e.message : "Error al cargar respuestas", "error");
    }
  }, [token, can, push]);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    try {
      const list = await fetchEventsList(token);
      setEvents(list);
    } catch {
      setEvents([]);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSurveys(), loadResponses(), loadEvents()]);
    setLoading(false);
  }, [loadSurveys, loadResponses, loadEvents]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !can("CREATE_SURVEY")) return;
    const eid = Number.parseInt(eventId, 10);
    if (!Number.isFinite(eid)) {
      push("Selecciona un evento", "error");
      return;
    }
    setSaving(true);
    try {
      await createSurveyApi(token, { titleSurvey: titleSurvey.trim(), eventId: eid });
      push("Encuesta creada", "success");
      setCreateOpen(false);
      setTitleSurvey("");
      setEventId("");
      void loadSurveys();
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Error al crear encuesta", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitRespond = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !can("CREATE_SURVEY_RESPONSE")) return;
    const sid = Number.parseInt(respondSurveyId, 10);
    const st = Number.parseInt(stars, 10);
    if (!Number.isFinite(sid)) {
      push("Selecciona encuesta", "error");
      return;
    }
    if (!Number.isFinite(st) || st < 1 || st > 5) {
      push("Calificación entre 1 y 5", "error");
      return;
    }
    setSaving(true);
    try {
      await createSurveyResponseApi(token, {
        surveyId: sid,
        stars: st,
        comment: comment.trim() || null,
      });
      push("Gracias por tu respuesta", "success");
      setComment("");
      void loadResponses();
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "No se pudo enviar la respuesta", "error");
    } finally {
      setSaving(false);
    }
  };

  const avgStars =
    responses.length > 0
      ? (responses.reduce((acc, r) => acc + (r.stars || 0), 0) / responses.length).toFixed(2)
      : "—";

  return (
    <div ref={revealRef} className="space-y-6">
      <div data-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Encuestas</h1>
          <p className="mt-1 text-sm text-zinc-400">Satisfacción post-evento y resultados agregados.</p>
        </div>
        {can("CREATE_SURVEY") ? (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nueva encuesta
          </Button>
        ) : null}
      </div>

      <div data-reveal className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {(
          [
            ["surveys", "Encuestas"],
            ["responses", "Resultados"],
            ["respond", "Responder"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id ? "bg-brand-muted text-brand" : "text-zinc-400 hover:bg-white/5"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/80" />
      ) : tab === "surveys" ? (
        <section data-reveal className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Respuestas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {surveys.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                    Sin encuestas aún.
                  </td>
                </tr>
              ) : (
                surveys.map((s) => (
                  <tr key={s.id} className="text-zinc-300">
                    <td className="px-4 py-3 font-medium text-white">{s.titleSurvey}</td>
                    <td className="px-4 py-3 text-xs">{s.event?.name ?? `#${s.eventId}`}</td>
                    <td className="px-4 py-3">{s._count?.responses ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : tab === "responses" ? (
        !can("READ_SURVEY_RESPONSES") ? (
          <p className="text-sm text-amber-200/90">No tienes permiso para ver respuestas (READ_SURVEY_RESPONSES).</p>
        ) : (
        <section data-reveal className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-surface/80 p-4">
              <p className="text-xs text-zinc-500">Respuestas totales</p>
              <p className="mt-1 text-2xl font-bold text-white">{responses.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-surface/80 p-4">
              <p className="text-xs text-zinc-500">Promedio estrellas</p>
              <p className="mt-1 text-2xl font-bold text-brand">{avgStars}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-elevated text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Encuesta</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">⭐</th>
                  <th className="px-4 py-3">Comentario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {responses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      Sin respuestas.
                    </td>
                  </tr>
                ) : (
                  responses.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-xs">{r.survey?.titleSurvey ?? `#${r.surveyId}`}</td>
                      <td className="px-4 py-3 text-xs">{r.user?.name ?? "—"}</td>
                      <td className="px-4 py-3">{r.stars}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-500">{r.comment ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        )
      ) : (
        <section data-reveal className="rounded-2xl border border-white/10 bg-surface/60 p-6">
          {!can("CREATE_SURVEY_RESPONSE") ? (
            <p className="text-sm text-zinc-500">No tienes permiso para enviar respuestas desde aquí.</p>
          ) : (
            <form className="mx-auto max-w-md space-y-4" onSubmit={(e) => void submitRespond(e)}>
              <p className="text-sm text-zinc-400">
                Solo asistentes con boleta validada pueden responder (validación en servidor).
              </p>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Encuesta</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
                  value={respondSurveyId}
                  onChange={(e) => setRespondSurveyId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titleSurvey}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Calificación (1–5)</label>
                <Input inputMode="numeric" value={stars} onChange={(e) => setStars(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Comentario (opcional)</label>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Enviando…" : "Enviar respuesta"}
              </Button>
            </form>
          )}
        </section>
      )}

      <Modal open={createOpen} title="Nueva encuesta" onClose={() => setCreateOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => void submitCreate(e)}>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Título</label>
            <Input value={titleSurvey} onChange={(e) => setTitleSurvey(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Evento</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface px-3 py-3 text-sm text-white"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
