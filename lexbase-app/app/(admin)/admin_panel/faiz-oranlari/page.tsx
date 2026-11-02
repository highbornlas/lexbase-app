'use client';

import { FaizOranlariTab } from '@/components/modules/ayarlar/FaizOranlariTab';

export default function FaizOranlariPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-zinc-200">Faiz Oranları</h1>
      <FaizOranlariTab />
    </div>
  );
}
