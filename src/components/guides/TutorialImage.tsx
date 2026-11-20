export function TutorialImage({ id, alt }: { id: string; alt: string }) {
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`/assets/tutorials/${id}.png?v=2`} />
      <img loading="lazy" src={`/assets/tutorials/${id}.gif?v=2`} alt={alt} />
    </picture>
  )
}
