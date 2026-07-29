export default function AppBar({ eyebrow, title, action, onAction }) {
  return (
    <header className="appbar">
      <div>
        {eyebrow && <span className="appbar__eyebrow">{eyebrow}</span>}
        <h1 className="appbar__title">{title}</h1>
      </div>
      {action && (
        <button className="appbar__action" onClick={onAction}>
          {action}
        </button>
      )}
    </header>
  )
}
