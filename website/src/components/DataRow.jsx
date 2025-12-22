export const DataRow = ({ label, value, type, mono = true, small = false }) => (
  <div className={`data-row ${small ? "py-1" : ""}`}>
    <span className="data-label">{label}</span>
    <span className={`data-value ${type || ""} ${mono ? "mono" : ""}`}>{value}</span>
  </div>
);

