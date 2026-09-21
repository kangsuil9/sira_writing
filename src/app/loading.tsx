export default function Loading() {
  return (
    <main className="route-loading" aria-busy="true" aria-label="화면 불러오는 중">
      <div className="route-loading-bar" />
      <section className="shell route-loading-content">
        <div className="loading-line loading-title" />
        <div className="loading-line loading-subtitle" />
        <div className="loading-card-grid">
          <div className="loading-card" />
          <div className="loading-card" />
        </div>
      </section>
    </main>
  );
}
