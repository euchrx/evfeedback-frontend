type Props = {
  onSelect: (rating: number) => void;
  primaryColor?: string;
  buttonTextColor?: string;
  disabled?: boolean;
};

const options = [
  { value: 1, emoji: "😡", label: "Péssimo" },
  { value: 2, emoji: "😐", label: "Ruim" },
  { value: 3, emoji: "🙂", label: "Ok" },
  { value: 4, emoji: "😃", label: "Bom" },
  { value: 5, emoji: "🤩", label: "Excelente" },
];

export default function RatingSelector({
  onSelect,
  primaryColor = "#0ea5e9",
  buttonTextColor = "#0f172a",
  disabled = false,
}: Props) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className="flex min-h-[150px] flex-col items-center justify-center rounded-3xl p-6 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[190px] md:p-8"
          style={{
            border: `1px solid ${primaryColor}55`,
            backgroundColor: `${primaryColor}14`,
            boxShadow: `inset 0 0 0 1px ${primaryColor}10`,
          }}
        >
          <span className="text-5xl md:text-6xl">{option.emoji}</span>
          <span
            className="mt-4 text-base font-semibold md:text-lg"
            style={{ color: buttonTextColor }}
          >
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}