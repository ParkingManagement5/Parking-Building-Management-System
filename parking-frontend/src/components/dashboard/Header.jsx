export default function Header() {
  return (
    <header className="header">
      <div>
        <h3>Dashboard</h3>
        <p>Overview of parking building system</p>
      </div>

      <div className="user-info">
        <div className="user-text">
          <strong>Admin</strong>
          <span>Administrator</span>
        </div>
        <div className="avatar">A</div>
      </div>
    </header>
  );
}