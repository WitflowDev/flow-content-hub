export function TutorialImage({ id, alt }: { id: string; alt: string }) {
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`/assets/tutorials/${id}.png`} />
      <img loading="lazy" src={`/assets/tutorials/${id}.gif`} alt={alt} />
    </picture>
  )
}
