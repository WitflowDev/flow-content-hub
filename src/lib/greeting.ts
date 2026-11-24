export function greetingName(companyName: string, name: string): string {
  const company = companyName.trim()
  if (company) return company
  const person = name.trim()
  return person || 'there'
}
