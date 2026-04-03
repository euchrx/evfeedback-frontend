import { useEffect, useState } from "react";
import { createTag, deleteTag, getTags, type Tag } from "../../../services/tags";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getTags();
    setTags(Array.isArray(data) ? data : []);
  }

  async function handleCreate() {
    if (!name.trim()) return;

    await createTag({ name: name.trim() });
    setName("");
    await load();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja excluir esta tag?");
    if (!confirmed) return;

    await deleteTag(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
        <p className="text-slate-600 mt-1">
          Gerencie os motivos exibidos no kiosk.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Nova tag</h2>

          <div className="mt-5 space-y-4">
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Atendimento"
            />

            <button
              onClick={handleCreate}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-3 font-semibold text-slate-950 transition"
            >
              Criar tag
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Tags cadastradas</h2>
            <span className="text-sm text-slate-500">{tags.length} item(ns)</span>
          </div>

          <div className="mt-5 space-y-4">
            {tags.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Nenhuma tag cadastrada.
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{tag.name}</p>
                    <p className="text-xs text-slate-400 mt-1 break-all">{tag.id}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="rounded-xl bg-rose-50 hover:bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 transition"
                  >
                    Excluir
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}