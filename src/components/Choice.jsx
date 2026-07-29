export default function Choice({ title, sub, selected, onClick, ...rest }) {
  return (
    <button className="choice" aria-pressed={selected} onClick={onClick} {...rest}>
      <span className="choice__t">{title}</span>
      {sub && <span className="choice__s">{sub}</span>}
    </button>
  )
}
