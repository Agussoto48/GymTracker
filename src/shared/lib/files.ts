export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

/** On iPhone opens the share sheet (Save to Files, iCloud…); elsewhere downloads the file. */
export async function saveTextFile(fileName: string, text: string, mimeType = 'application/json'): Promise<SaveResult> {
  const file = new File([text], fileName, { type: mimeType })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Share failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
