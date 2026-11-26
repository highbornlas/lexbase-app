/** Automatic weather lookups must never open a browser permission dialog. */
export async function getPreviouslyGrantedLocation(
  browser: Pick<Navigator, 'geolocation' | 'permissions'>,
  timeoutMs = 5000,
): Promise<{ lat: number; lon: number } | null> {
  try {
    if (!browser.geolocation || !browser.permissions?.query) return null;
    const permission = await browser.permissions.query({ name: 'geolocation' });
    if (permission.state !== 'granted') return null;
    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeoutMs);
      browser.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timer);
          resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        () => { clearTimeout(timer); resolve(null); },
        { timeout: timeoutMs, maximumAge: 600000 },
      );
    });
  } catch {
    return null;
  }
}
