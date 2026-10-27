export type ClientFolder = {
  email: string
  parentName: string
  folderName: string
}

const CLIENT_FOLDERS: ClientFolder[] = [
  {
    email: 'tania@witflow.co',
    parentName: 'Content Hub',
    folderName: 'Tânia Witflow',
  },
]

export function clientFolderForEmail(email: string | null | undefined): ClientFolder | null {
  if (!email) return null
  const normal = email.toLowerCase()
  return CLIENT_FOLDERS.find((folder) => folder.email === normal) ?? null
}
