(() => {
  const extractEmbeddedImage = async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Brand asset unavailable: ${url}`);
    const svg = await response.text();
    const match = svg.match(/data:image\/(?:webp|jpeg|jpg|png);base64,[A-Za-z0-9+/=]+/i);
    if (!match) throw new Error(`No embedded raster found in ${url}`);
    return match[0];
  };

  const apply = async () => {
    try {
      const [portrait, crest] = await Promise.all([
        extractEmbeddedImage('assets/the-chancellor-approved.svg?v=20260811-6'),
        extractEmbeddedImage('assets/the-chancellor-crest.svg?v=20260811-6')
      ]);

      document.querySelectorAll('.chancellor-portrait, .avatar-img, .rescue-portrait').forEach((img) => {
        img.src = portrait;
        img.removeAttribute('srcset');
      });
      document.querySelectorAll('.crest-logo').forEach((img) => {
        img.src = crest;
        img.removeAttribute('srcset');
      });

      document.documentElement.classList.add('brand-assets-ready');
    } catch (error) {
      console.error('Chancellor brand assets could not be loaded:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
