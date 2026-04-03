import { useEffect, useState } from "react";
import { getDashboardSummary } from "../../../services/dashboard";

type Summary = {
  total: number;
  averageRating: number;
  ratings: { rating: number; count: number }[];
  topTags: { name: string; count: number }[];
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    averageRating: 0,
    ratings: [],
    topTags: [],
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded">
          <p>Total Feedbacks</p>
          <h2 className="text-xl font-bold">{summary.total}</h2>
        </div>

        <div className="bg-slate-800 p-4 rounded">
          <p>Média</p>
          <h2 className="text-xl font-bold">
            {summary.averageRating.toFixed(1)}
          </h2>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Avaliações</h2>

        {(Array.isArray(summary.ratings) ? summary.ratings : []).map((item) => (
          <div key={item.rating} className="flex justify-between">
            <span>{item.rating} estrelas</span>
            <span>{item.count}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Top Tags</h2>

        {(Array.isArray(summary.topTags) ? summary.topTags : []).map(
          (tag, index) => (
            <div key={index} className="flex justify-between">
              <span>{tag.name}</span>
              <span>{tag.count}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}