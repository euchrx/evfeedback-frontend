import { useEffect, useState } from "react";
import { getKiosks, createKiosk, deleteKiosk } from "../../../services/kiosks";
import { getBranches } from "../../../services/branches";

type Branch = {
  id: string;
  name: string;
};

type Kiosk = {
  id: string;
  name: string;
  token: string;
  branchId: string;
  branch?: Branch;
};

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [kData, bData] = await Promise.all([
      getKiosks(),
      getBranches(),
    ]);

    setKiosks(Array.isArray(kData) ? kData : []);
    setBranches(Array.isArray(bData) ? bData : []);
  }

  async function handleCreate() {
    if (!name || !branchId) return;

    await createKiosk({ name, branchId });
    setName("");
    load();
  }

  async function handleDelete(id: string) {
    await deleteKiosk(id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kiosks</h1>

      <div className="flex gap-2">
        <input
          className="border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do kiosk"
        />

        <select
          className="border p-2"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">Selecione a filial</option>

          {(Array.isArray(branches) ? branches : []).map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <button onClick={handleCreate} className="bg-blue-500 px-4 py-2">
          Criar
        </button>
      </div>

      {(Array.isArray(kiosks) ? kiosks : []).map((kiosk) => (
        <div
          key={kiosk.id}
          className="flex justify-between bg-slate-800 p-2 rounded"
        >
          <div>
            <p>{kiosk.name}</p>
            <p className="text-sm text-gray-400">
              {kiosk.branch?.name || "Sem filial"}
            </p>
            <p className="text-xs text-gray-500">{kiosk.token}</p>
          </div>

          <button
            onClick={() => handleDelete(kiosk.id)}
            className="text-red-500"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>
  );
}