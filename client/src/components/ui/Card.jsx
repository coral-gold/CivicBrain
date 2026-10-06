export default function Card({ className = '', children }) {
  return <div className={`rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}
