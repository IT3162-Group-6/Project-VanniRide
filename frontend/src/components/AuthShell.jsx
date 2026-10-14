export default function AuthShell({ children }) {
  return (
    <div className="auth-layout">
      <aside className="auth-visual" aria-hidden="true">
        <img src="/auth-rider.webp" alt="" />
        <div className="auth-visual-copy">
          <span>Built for our campus community</span>
          <h2>Local rides and deliveries, right when you need them.</h2>
        </div>
      </aside>
      <div className="auth-wrap">{children}</div>
    </div>
  );
}
