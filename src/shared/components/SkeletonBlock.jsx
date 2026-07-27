import '../css/SkeletonBlock.css'

// Shaped to match the exact dimensions of the content it replaces
// (Section 15) — never a generic gray box.
export default function SkeletonBlock({ width = '100%', height = 16, radius = 8, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonRows({ rows = 3, height = 14, gap = 8 }) {
  return (
    <div className="skeleton-rows" style={{ '--gap': `${gap}px` }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} height={height} width={i === rows - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
