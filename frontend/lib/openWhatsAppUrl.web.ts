/** Run synchronously in the button's gesture so browsers can allow the new tab. */
export async function openWhatsAppUrl(url: string): Promise<void> {
  // Opening about:blank first lets us detect blockers. Passing `noopener` to
  // window.open returns null even for successful opens in some browsers.
  const tab = window.open("about:blank", "_blank");
  if (!tab) throw new Error("WhatsApp window blocked");
  try {
    tab.opener = null;
    tab.location.replace(url);
  } catch (error) {
    tab.close();
    throw error;
  }
}
