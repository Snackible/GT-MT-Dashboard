// Small shared presentational pieces.
export const Field = ({ label, children }) => (
  <div className="field">
    <span className="flabel">{label}</span>
    {children}
  </div>
);

export const MonthOptions = ({ months, label }) =>
  months.map((m) => (
    <option key={m} value={m}>
      {label(m)}
    </option>
  ));

export const Kpi = ({ title, meta, value, sub, children }) => (
  <div className="card">
    <div className="card-head">
      <span className="card-title">{title}</span>
      <span className="card-meta">{meta}</span>
    </div>
    <div className="kpi-val num">{value}</div>
    {sub}
    {children}
  </div>
);

export const Spinner = ({ size = 14 }) => (
  <span className="spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />
);

export const LoadingBanner = ({ children }) => (
  <div className="loading-banner">
    <Spinner size={18} />
    <span>{children}</span>
  </div>
);
