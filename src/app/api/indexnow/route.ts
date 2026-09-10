import { NextResponse } from 'next/server';

export async function GET() {
  const key = '644036cd0f7a4b41b34c3a0244101314';
  const host = 'swiftledger-seven.vercel.app';
  
  // Fetch your sitemap
  const sitemapRes = await fetch(`https://${host}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  
  // Extract URLs
  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(m => m[1])
    .filter(url => url !== `https://${host}`);
  
  // Submit to IndexNow
  const payload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };
  
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  return NextResponse.json({
    status: response.status,
    submitted: urls.length,
    message: response.status === 200 || response.status === 202 ? 'Success' : 'Failed',
  });
}