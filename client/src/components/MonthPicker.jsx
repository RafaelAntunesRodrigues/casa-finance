export default function MonthPicker({ value, onChange }) {
  return (
    <label className="month-picker">
      Mês
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
