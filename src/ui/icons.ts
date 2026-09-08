const paths = {
  book: ['M12 7c-2-2-6-2.5-9-1v14c3-1.5 7-1 9 1 2-2 6-2.5 9-1V6c-3-1.5-7-1-9 1Z', 'M12 7v14'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  arrow: ['M7 17 17 7', 'M7 7h10v10'],
  search: ['M21 21l-5-5', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  sound: ['M11 5 6 9H3v6h3l5 4V5Z', 'M15 8a6 6 0 0 1 0 8', 'M18 5a10 10 0 0 1 0 14'],
  retry: ['M3 10a9 9 0 1 1 2 8', 'M3 4v6h6'],
  leaf: ['M20 4C9 2 2 9 6 16s16 2 14-12Z', 'M4 21 15 10'],
} as const;

export function icon(name: keyof typeof paths): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', width: '18', height: '18' })) svg.setAttribute(key, value);
  for (const d of paths[name]) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
