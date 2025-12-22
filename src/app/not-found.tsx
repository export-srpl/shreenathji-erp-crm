'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Hide body overflow to prevent scrolling
    if (document?.body) {
      document.body.style.overflow = 'hidden';
    }
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (document?.body) {
            document.body.style.overflow = '';
          }
          router.push('/sales/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (document?.body) {
        document.body.style.overflow = '';
      }
    };
  }, [router]);

  const handleGoHome = () => {
    router.push('/sales/dashboard');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden flex items-center justify-center z-[9999]">
      {/* Stars background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              opacity: Math.random() * 0.8 + 0.2,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Earth horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#1e3a8a] via-[#3b82f6] to-[#60a5fa] opacity-30">
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#0f172a] to-transparent"></div>
        {/* Clouds */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 rounded-full bg-white/20 blur-xl"
            style={{
              left: `${20 + i * 15}%`,
              width: `${Math.random() * 200 + 150}px`,
              height: `${Math.random() * 100 + 50}px`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Astronaut */}
      <div className="absolute top-[15%] left-[10%] z-10">
        <div className="relative">
          {/* Astronaut body */}
          <div className="relative w-16 h-20">
            {/* Helmet */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white/90 border-2 border-white/50 shadow-lg">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0a0e27]"></div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-4 rounded-full bg-white/20"></div>
            </div>
            {/* Body */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-10 h-12 bg-white/90 rounded-lg shadow-lg">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-8 bg-[#0a0e27] rounded"></div>
            </div>
            {/* Arms */}
            <div className="absolute top-12 left-0 w-3 h-8 bg-white/90 rounded-full shadow-lg transform rotate-12"></div>
            <div className="absolute top-12 right-0 w-3 h-8 bg-white/90 rounded-full shadow-lg transform -rotate-12"></div>
            {/* Legs */}
            <div className="absolute bottom-0 left-2 w-3 h-6 bg-white/90 rounded-full shadow-lg transform rotate-6"></div>
            <div className="absolute bottom-0 right-2 w-3 h-6 bg-white/90 rounded-full shadow-lg transform -rotate-6"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 animate-fade-in">
            Oops!
          </h1>
          <div className="text-8xl md:text-9xl font-bold text-white mb-6 tracking-tight">
            404
          </div>
        </div>

        <p className="text-white/90 text-lg md:text-xl mb-8 leading-relaxed">
          Your page is currently under maintenance and will guide you back to the homepage after{' '}
          <span className="font-bold text-white">{countdown}</span> seconds.
        </p>

        <Button
          onClick={handleGoHome}
          className="bg-white text-[#0a0e27] hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-lg border-2 border-white transition-all hover:scale-105 shadow-xl"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to home
        </Button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}

