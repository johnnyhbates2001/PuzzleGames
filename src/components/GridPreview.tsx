interface GridPreviewProps {
  colors: string[]
  size?: number
}

export function GridPreview({ colors, size = 3 }: GridPreviewProps) {
  return (
    <div className="grid size-full gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {colors.map((c, i) => (
        <div key={i} className="aspect-square rounded-[3px]" style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}
