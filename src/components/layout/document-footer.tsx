'use client';

import Image from 'next/image';

export function DocumentFooter() {
  return (
    <div className="bg-black text-white p-8 rounded-b-lg mt-auto">
      <div className="border-t-2 border-red-700 mb-4"></div>
      <div className="flex justify-between items-center">
        <div className="text-red-200 text-xs">
          <p>
            <span className="font-bold">Factory Address:</span> Survey No. 1418, Village Rajpur, Ta. Kadi,
          </p>
          <p>Dist. Mehsana, Gujarat-382715. Mobile No.: +91 9925235841, 9925221639</p>
        </div>
        <div className="flex items-center gap-4">
          <Image
            src="https://placehold.co/80x80/ffffff/000000?text=URS"
            alt="URS Certification Logo"
            width={60}
            height={60}
            data-ai-hint="certification logo"
          />
           <Image
            src="https://placehold.co/60x60/ffffff/000000?text=UKAS"
            alt="UKAS Logo"
            width={40}
            height={40}
             data-ai-hint="certification logo"
          />
           <Image
            src="https://placehold.co/80x80/ffffff/000000?text=URS"
            alt="URS Certification Seal"
            width={50}
            height={50}
             data-ai-hint="certification seal"
          />
        </div>
      </div>
    </div>
  );
}
