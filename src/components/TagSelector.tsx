type Tag = {
  id: string;
  name: string;
};

type Props = {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
  primaryColor?: string;
  buttonTextColor?: string;
  disabled?: boolean;
};

export default function TagSelector({
  tags,
  selected,
  onChange,
  primaryColor = "#0ea5e9",
  buttonTextColor = "#0f172a",
  disabled = false,
}: Props) {
  function toggle(id: string) {
    if (disabled) return;

    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }

    onChange([...selected, id]);
  }

  return (
    <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
      {tags.map((tag) => {
        const active = selected.includes(tag.id);

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            disabled={disabled}
            className="rounded-2xl border px-4 py-5 text-center text-base font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:px-6 md:py-6 md:text-lg"
            style={
              active
                ? {
                    borderColor: primaryColor,
                    backgroundColor: primaryColor,
                    color: buttonTextColor,
                  }
                : {
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "#cbd5e1",
                  }
            }
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}