// src/app/[bank]/[format]/page.tsx
export default function TestPage({ params }: { params: { bank: string; format: string } }) {
  return (
    <div>
      <h1>Bank: {params.bank}</h1>
      <h2>Format: {params.format}</h2>
      <p>If you see this, the route is working!</p>
    </div>
  );
}