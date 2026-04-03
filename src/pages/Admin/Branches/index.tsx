import { useEffect, useState } from "react";
import {
  getBranches,
  createBranch,
  deleteBranch,
} from "../../../services/branches";

type Branch = {
  id: string;
  name: string;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getBranches();
    setBranches(Array.isArray(data) ? data : []);
  }

  async function handleCreate() {
    if (!name) return;

    await createBranch({ name });
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    await deleteBranch(id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Filiais</h1>

      <div className="flex gap-2">
        <input
          className="border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da filial"
        />
        <button onClick={handleCreate} className="bg-blue-500 px-4 py-2">
          Criar
        </button>
      </div>

      {(Array.isArray(branches) ? branches : []).map((b) => (
        <div
          key={b.id}
          className="flex justify-between bg-slate-800 p-2 rounded"
        >
          <span>{b.name}</span>
          <button
            onClick={() => handleDelete(b.id)}
            className="text-red-500"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}