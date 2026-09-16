export default function TrainingModuleCard({ tone, code, title, description, points }) {
  return (
    <div className={`module-box module-box--${tone}`}>
      <div className="module-box__code">{code} MODULE</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <ul>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
