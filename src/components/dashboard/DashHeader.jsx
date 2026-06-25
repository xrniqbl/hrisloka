export default function DashHeader({ userName, date, children }) {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 15 ? 'Good afternoon' : hour < 18 ? 'Good evening' : 'Good night';

  return (
    <div className="dash-header">
      <div className="dash-header-left">
        <h1>{greeting}, {userName} 👋</h1>
        <div className="dash-date">{date}</div>
      </div>
      <div className="dash-header-right">
        {children}
      </div>
    </div>
  );
}
