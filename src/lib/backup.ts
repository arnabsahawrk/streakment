/** Puts the full backup on the clipboard. On iPhone the clipboard may only
 *  be written during a tap, so the file is handed over as a promise rather
 *  than fetched first - that keeps the tap valid while the download runs. */
export async function copyBackup(): Promise<boolean> {
  const text = async () => {
    const res = await fetch("/api/export");
    if (!res.ok) throw new Error("export failed");
    return res.text();
  };
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": text().then((t) => new Blob([t], { type: "text/plain" })) }),
      ]);
    } else {
      await navigator.clipboard.writeText(await text());
    }
    return true;
  } catch {
    return false;
  }
}
