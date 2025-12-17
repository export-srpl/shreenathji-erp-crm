'use client';

import Image from 'next/image';

export function DocumentHeader() {
  return (
    <div className="flex items-start justify-between p-8 bg-black text-white rounded-t-lg">
      <div className="flex items-center gap-6">
        <Image src="/logo.png" alt="Shreenathji Rasayan Logo" width={100} height={100} data-ai-hint="logo" />
        <div>
          <h1 className="text-3xl font-bold text-red-700 tracking-wider">SHREENATHJI</h1>
          <h2 className="text-3xl font-light text-yellow-500 tracking-wider">RASAYAN PRIVATE LIMITED</h2>
        </div>
      </div>
      <div className="text-right text-xs text-red-200 mt-2">
        <p>Cor. Off.: 202, Neptune Harmony, Next to Ashok Vatika BRTS Stop, Iscon - Ambali Road,</p>
        <p>Ahmedabad - 380058. Mobile: +91 9925221422, 8735888479</p>
        <p>CIN No.: U24110GJ2006PTC049339</p>
        <p>E-mail: info@shreenathjirasayan.com • Website: www.shreenathjirasayan.com</p>
      </div>
    </div>
  );
}
