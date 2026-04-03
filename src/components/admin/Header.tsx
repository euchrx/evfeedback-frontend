export function Header() {
  return (
    <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Admin</h2>
        <p className="text-sm text-slate-500">Gerencie kiosks, feedbacks e filiais</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
          A
        </div>
      </div>
    </header>
  );
}