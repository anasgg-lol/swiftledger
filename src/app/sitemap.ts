// src/app/sitemap.ts
import { banks, formats } from './lib/seo-data';

export default function sitemap() {
  const baseUrl = 'https://swiftledger-seven.vercel.app';
  const urls = [];

  for (const bank of banks) {
    for (const format of formats) {
      urls.push({
        url: `${baseUrl}/${bank.slug}/${format.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  urls.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  return urls;
}