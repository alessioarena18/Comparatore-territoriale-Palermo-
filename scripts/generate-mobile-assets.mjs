import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('assets', { recursive: true });
const mark = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n<rect width=\"1024\" height=\"1024\" rx=\"220\" fill=\"#123d49\"/>\n<path d=\"M512 116 830 300v368L512 852 194 668V300Z\" fill=\"none\" stroke=\"#d6b477\" stroke-width=\"18\" opacity=\".95\"/>\n<path d=\"M512 116v736M194 300l636 368M830 300 194 668\" fill=\"none\" stroke=\"#d6b477\" stroke-width=\"9\" opacity=\".38\"/>\n<path d=\"M350 688V336h173c111 0 178 59 178 159s-67 160-178 160H350Zm105-91h66c49 0 76-34 76-102s-27-101-76-101h-66v203Z\" fill=\"#f3f0e7\"/>\n<circle cx=\"512\" cy=\"512\" r=\"25\" fill=\"#c28e4c\"/>\n</svg>");
const background = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\"><rect width=\"1024\" height=\"1024\" fill=\"#123d49\"/></svg>");
const splash = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"2732\" height=\"2732\" viewBox=\"0 0 2732 2732\">\n<rect width=\"2732\" height=\"2732\" fill=\"#123d49\"/>\n<g transform=\"translate(854 670) scale(1)\">\n<path d=\"M512 116 830 300v368L512 852 194 668V300Z\" fill=\"none\" stroke=\"#d6b477\" stroke-width=\"18\"/>\n<path d=\"M512 116v736M194 300l636 368M830 300 194 668\" fill=\"none\" stroke=\"#d6b477\" stroke-width=\"9\" opacity=\".38\"/>\n<path d=\"M350 688V336h173c111 0 178 59 178 159s-67 160-178 160H350Zm105-91h66c49 0 76-34 76-102s-27-101-76-101h-66v203Z\" fill=\"#f3f0e7\"/>\n<circle cx=\"512\" cy=\"512\" r=\"25\" fill=\"#c28e4c\"/>\n</g>\n<text x=\"1366\" y=\"1800\" fill=\"#f3f0e7\" font-family=\"Arial,sans-serif\" font-size=\"108\" font-weight=\"700\" text-anchor=\"middle\" letter-spacing=\"5\">PALERMO TERRITORIAL LAB</text>\n<text x=\"1366\" y=\"1905\" fill=\"#d6b477\" font-family=\"Arial,sans-serif\" font-size=\"44\" text-anchor=\"middle\" letter-spacing=\"7\">TERRITORIAL RESEARCH &amp; URBAN INTELLIGENCE</text>\n<path d=\"M700 2020H2032\" stroke=\"#d6b477\" stroke-width=\"4\" opacity=\".65\"/>\n<text x=\"1366\" y=\"2115\" fill=\"#f3f0e7\" opacity=\".72\" font-family=\"Arial,sans-serif\" font-size=\"34\" text-anchor=\"middle\" letter-spacing=\"9\">PALERMO · SICILIA</text>\n</svg>");

await Promise.all([
  sharp(mark).png().toFile('assets/icon-only.png'),
  sharp(mark).png().toFile('assets/icon-foreground.png'),
  sharp(background).png().toFile('assets/icon-background.png'),
  sharp(splash).png().toFile('assets/splash.png'),
  sharp(splash).png().toFile('assets/splash-dark.png')
]);
console.log('Native icon and splash source assets generated.');
