import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, Download, Share2, Printer, X, CheckCircle2, AlertCircle, Layout as LayoutIcon, Sliders, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { Smile, Heart, Star, Zap, PartyPopper, Moon, Sun, Ghost, Trash2, Plus, Minus } from 'lucide-react';
import { AppState, BoothSettings, LayoutType, FilterType, PhotoFrame, StickerInstance } from './types';
import { cn } from '@/lib/utils';

// --- Constants ---
const IDLE_TIMEOUT = 60000; // 1 minute
const COUNTDOWN_START = 3;

const FRAME_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#1a1a1a' },
  { name: 'Pink', value: '#FF477E' },
  { name: 'Green', value: '#4ADE80' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Yellow', value: '#FBBF24' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Maroon', value: '#800000' },
  { name: 'Burgundy', value: '#800020' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Indigo', value: '#6366f1' },
];

const STICKER_OPTIONS = ['✨', '💖', '🔥', '📸', '⭐', '🎈', '🎉', '🌈', '🍦', '🍕', '🕶️', '👑', '🎸', '🍔', '🚀'];

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [settings, setSettings] = useState<BoothSettings>({
    layout: '1x4',
    filter: 'none',
    shotCount: 4,
    frameColor: '#FFFFFF',
  });
  const [frames, setFrames] = useState<PhotoFrame[]>([]);
  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [currentShot, setCurrentShot] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(() => {
    setState('idle');
    setFrames([]);
    setFinalImage(null);
    setCurrentShot(0);
    setCountdown(0);
    stopCamera();
    toast.info("Session reset due to inactivity");
  }, [stopCamera]);

  // --- App Lifecycle ---
  useEffect(() => {
    if (state === 'done') {
      const timer = setTimeout(() => {
        resetToIdle();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [state, resetToIdle]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (state !== 'idle' && state !== 'done') {
      idleTimerRef.current = setTimeout(resetToIdle, IDLE_TIMEOUT);
    }
  }, [state, resetToIdle]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handler = () => resetIdleTimer();
    events.forEach(event => document.addEventListener(event, handler));
    resetIdleTimer();
    return () => {
      events.forEach(event => document.removeEventListener(event, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // --- Visibility Change ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state === 'countdown') {
        // Pause or handle tab switch during countdown
        toast.info("Session paused - tab lost focus");
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state]);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      setError(null);
      setState('camera-init');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      streamRef.current = stream;
      
      // Wait for video ref to be available (react render)
      let attempts = 0;
      while (!videoRef.current && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be actually ready
        await new Promise((resolve) => {
          if (!videoRef.current) return resolve(null);
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(resolve).catch(resolve);
          };
          // Fallback
          setTimeout(resolve, 2000);
        });

        // Short delay to ensure exposure/focus settles
        await new Promise(r => setTimeout(r, 800));
        
        setCountdown(COUNTDOWN_START);
        setCurrentShot(0);
        setFrames([]);
        setState('waiting');
      } else {
        throw new Error("Video element not found");
      }
    } catch (err) {
      console.error(err);
      setError("Camera access denied or no device found. Please check permissions.");
      setState('error');
    }
  };

  const startCaptureLoop = () => {
    setCountdown(COUNTDOWN_START);
    setCurrentShot(0);
    setFrames([]);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (state === 'countdown' && countdown === 0) {
      captureFrame();
    }
    return () => clearTimeout(timer);
  }, [state, countdown]);

  const captureFrame = async () => {
    if (!videoRef.current || !streamRef.current) return;

    // Check for black frame/readiness
    if (videoRef.current.readyState !== 4 || videoRef.current.videoWidth === 0) {
      setTimeout(captureFrame, 100);
      return;
    }

    setState('capturing');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Apply mirror if enabled
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const newFrame = { id: Math.random().toString(36).substr(2, 9), dataUrl };
      
      setFrames(prev => [...prev, newFrame]);
      const nextShot = currentShot + 1;
      setCurrentShot(nextShot);

      if (nextShot < settings.shotCount) {
        setTimeout(() => {
          setState('countdown');
          setCountdown(3); 
        }, 1000);
      } else {
        setTimeout(() => {
          setState('processing');
          stopCamera();
          processImages([...frames, newFrame]);
        }, 1000);
      }
    }
  };

  // --- Image Processing ---
  const processImages = async (capturedFrames: PhotoFrame[]): Promise<string | undefined> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameWidth = 600;
    const frameHeight = 450;
    const padding = 40;
    const headerHeight = 100;
    const footerHeight = 150;

    let totalWidth = 0;
    let totalHeight = 0;

    if (settings.layout === '1x4') {
      totalWidth = frameWidth + padding * 2;
      totalHeight = (frameHeight * capturedFrames.length) + (padding * (capturedFrames.length + 1)) + footerHeight;
    } else if (settings.layout === '2x2') {
      totalWidth = (frameWidth * 2) + (padding * 3);
      totalHeight = (frameHeight * 2) + (padding * 3) + footerHeight;
    } else {
      totalWidth = frameWidth + padding * 2;
      totalHeight = frameHeight + padding * 2 + footerHeight;
    }

    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const canvasScale = 1; // Base internal resolution scale

    // Background
    ctx.fillStyle = settings.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Filter to context
    const applyFilter = (context: CanvasRenderingContext2D) => {
      switch (settings.filter) {
        case 'bw': context.filter = 'grayscale(100%) contrast(1.2)'; break;
        case 'vintage': context.filter = 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(0.8)'; break;
        case 'vivid': context.filter = 'saturate(1.5) contrast(1.1)'; break;
        default: context.filter = 'none';
      }
    };

    const drawFrame = (frame: PhotoFrame, x: number, y: number) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          applyFilter(ctx);
          ctx.drawImage(img, x, y, frameWidth, frameHeight);
          ctx.restore();
          resolve();
        };
        img.src = frame.dataUrl;
      });
    };

    if (settings.layout === '1x4') {
      for (let i = 0; i < capturedFrames.length; i++) {
        await drawFrame(capturedFrames[i], padding, padding + i * (frameHeight + padding));
      }
    } else if (settings.layout === '2x2') {
      for (let i = 0; i < capturedFrames.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        await drawFrame(capturedFrames[i], padding + col * (frameWidth + padding), padding + row * (frameHeight + padding));
      }
    } else {
      await drawFrame(capturedFrames[0], padding, padding);
    }

    // Draw Stickers onto Canvas
    for (const s of stickers) {
      ctx.save();
      ctx.translate(canvas.width * s.x, canvas.height * s.y);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.font = `${80 * s.scale}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, 0, 0);
      ctx.restore();
    }

    // Footer Branding
    ctx.fillStyle = settings.frameColor === '#1a1a1a' || settings.frameColor === '#800000' || settings.frameColor === '#800020' ? '#ffffff' : '#1a1a1a';
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLASHBOOTH', canvas.width / 2, canvas.height - 80);
    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, canvas.height - 40);

    const resultDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setFinalImage(resultDataUrl);
    setState('preview');

    return resultDataUrl;
  };

  // --- Share Options ---
  const handleShareLocal = async (overrideImg?: string) => {
    const targetImg = overrideImg || finalImage;
    if (!targetImg) return;
    
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        const response = await fetch(targetImg);
        const blob = await response.blob();
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        
        await navigator.share({
          files: [file],
          title: 'My Flashbooth Photo',
          text: 'Check out my photo from Flashbooth!',
        });
        toast.success("Shared successfully!");
      } catch (err) {
        console.error(err);
        if (err instanceof Error && err.name !== 'AbortError') {
          toast.error("Sharing failed");
        }
      }
    } else {
      // Fallback: Download
      handleDownload(targetImg);
    }
  };

  useEffect(() => {
    if (state === 'preview') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF477E', '#7209B7', '#4CC9F0']
      });
    }
  }, [state]);

  const handleDownload = (overrideImg?: string) => {
    const targetImg = overrideImg || finalImage;
    if (!targetImg) return;
    const link = document.createElement('a');
    link.download = `flashbooth-${Date.now()}.jpg`;
    link.href = targetImg;
    link.click();
    toast.success("Photo saved to device");
  };

  const handlePrint = (overrideImg?: string) => {
    const targetImg = overrideImg || finalImage;
    if (!targetImg) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<img src="${targetImg}" style="width:100%" onload="window.print();window.close()">`);
      win.document.close();
    }
  };

  const handleFinish = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#8b5cf6', '#3b82f6']
    });
    setState('done');
    setTimeout(() => {
      setState('idle');
      setFinalImage(null);
      setFrames([]);
    }, 5000);
  };

  // --- Render Helpers ---
  const renderScreen = () => {
    switch (state) {
      case 'idle':
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex flex-col h-full bg-slate-50 relative overflow-hidden"
          >
            {/* Attract Animation Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
               <motion.div 
                 animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                 className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 blur-3xl opacity-30"
               />
               <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-4 p-8 opacity-40">
                  {[...Array(36)].map((_, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                      className="bg-white rounded-2xl shadow-sm"
                    />
                  ))}
               </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-8 md:space-y-12"
              >
                <div className="space-y-4 md:space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
                      <Camera className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 italic">
                      SNAP_VIBE
                    </h1>
                  </div>
                  <p className="text-sm md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto uppercase tracking-widest opacity-60">
                    Professional Studio • Instant Capture • Fully Local
                  </p>
                </div>

                <div className="flex flex-col items-center gap-6 md:gap-8">
                  <Button 
                    onClick={() => setState('setup')}
                    className="h-20 px-8 text-2xl md:h-32 md:px-16 rounded-full md:rounded-[40px] bg-blue-600 hover:bg-blue-700 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105 transition-all md:text-4xl font-black italic uppercase group"
                  >
                    Start Session <ArrowRight className="ml-4 md:ml-6 w-8 h-8 md:w-12 md:h-12 group-hover:translate-x-2 transition-transform" />
                  </Button>
                  
                  <div className="flex items-center gap-4 text-slate-400">
                    {/* Placeholder for future guests/social proof */}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer Marquee */}
            <div className="h-16 bg-white border-t border-slate-100 flex items-center overflow-hidden whitespace-nowrap">
               <motion.div 
                 animate={{ x: [0, -1000] }}
                 transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                 className="flex gap-20 text-xs font-black uppercase tracking-[0.4em] text-slate-300"
               >
                 {[...Array(10)].map((_, i) => (
                   <span key={i}>SMILE • CAPTURE • REPEAT • NO CLOUD • PRIVATE • INSTANT PRINT • PROFESSIONAL OPTICS</span>
                 ))}
               </motion.div>
            </div>
          </motion.div>
        );

      case 'setup':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-10 gap-6 justify-center"
          >
            <div className="flex flex-col gap-2 text-center">
              <div className="bento-tag w-fit mx-auto">01. Setup</div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase italic">Select Layout</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(['1x4', '2x2', 'single'] as LayoutType[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setSettings({ ...settings, layout: l, shotCount: l === '1x4' ? 4 : l === '2x2' ? 4 : 1 })}
                  className={cn(
                    "relative p-4 md:p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all duration-300 flex flex-col items-center gap-2 md:gap-4 text-center",
                    settings.layout === l ? "border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-500/10" : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "grid gap-1 border-2 border-slate-900 p-1 bg-white shadow-lg shrink-0",
                    l === '1x4' ? "grid-cols-1 w-10 md:w-12" : l === '2x2' ? "grid-cols-2 w-12 md:w-14" : "grid-cols-1 w-14 md:w-16 aspect-video",
                  )}>
                    {Array.from({ length: l === '1x4' ? 4 : l === '2x2' ? 4 : 1 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-slate-100/50" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm md:text-xl font-black uppercase tracking-tight block italic">{l}</span>
                  </div>
                  {settings.layout === l && (
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-2">
              <Button 
                variant="ghost" 
                onClick={() => setState('idle')} 
                className="h-12 md:h-16 px-6 md:px-10 text-gray-400 font-bold text-sm md:text-lg uppercase tracking-widest"
              >
                BACK
              </Button>
              <Button 
                onClick={startCamera} 
                className="flex-1 h-12 md:h-16 bg-gray-900 text-white text-base md:text-xl font-black uppercase italic shadow-xl shadow-gray-900/10"
              >
                START SESSION <ArrowRight className="ml-2 md:ml-4 w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </motion.div>
        );

      case 'camera-init':
      case 'waiting':
      case 'countdown':
      case 'capturing':
        return (
          <div className={cn(
            "relative h-full flex flex-col items-center justify-center p-4 md:p-12 transition-transform duration-100",
            isShaking && "shake"
          )}>
            <div className="relative w-full max-w-6xl aspect-[4/3] md:aspect-video bg-black rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border-4 md:border-[12px] border-white group">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-500",
                  state === 'capturing' ? 'opacity-30' : 'opacity-100',
                  isMirrored && "scale-x-[-1]"
                )} 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {state === 'camera-init' && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-6 z-40">
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full"
                    />
                    <Camera className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-2xl font-black text-white italic uppercase tracking-tighter">Initialising Camera</p>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Checking optics...</p>
                  </div>
                </div>
              )}

              {/* Manual Shutter Overlay */}
              {state === 'waiting' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/20 backdrop-blur-[2px]"
                >
                  <Button
                    onClick={() => {
                      setCountdown(COUNTDOWN_START);
                      setState('countdown');
                    }}
                    className="w-40 h-40 rounded-full bg-white text-gray-900 shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-32 h-32 rounded-full border-4 border-gray-900/10 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-blue-600 group-hover:rotate-12 transition-transform" />
                    </div>
                  </Button>
                  <motion.p 
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white font-black italic uppercase tracking-[0.3em] mt-8 drop-shadow-lg"
                  >
                    Tap to Snaps
                  </motion.p>
                </motion.div>
              )}

              <div className="absolute top-4 left-4 md:top-10 md:left-10 flex gap-2 md:gap-3">
                {Array.from({ length: settings.shotCount }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-8 h-2 md:w-12 md:h-3 rounded-full transition-all duration-300 shadow-lg",
                      i < currentShot ? "bg-blue-500" : i === currentShot ? "bg-white animate-pulse" : "bg-white/20 backdrop-blur-md"
                    )} 
                  />
                ))}
              </div>

              <div className="absolute top-4 right-4 md:top-10 md:right-10 flex gap-4">
                <div className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white font-bold text-[10px] md:text-sm uppercase tracking-widest">
                  SHOT {currentShot + 1} of {settings.shotCount}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {state === 'countdown' && (
                  <motion.div
                    key={countdown}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span className="text-[14rem] font-black text-white leading-none drop-shadow-2xl">
                      {countdown > 0 ? countdown : "SMILE!"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {state === 'capturing' && (
                <div className="absolute inset-0 bg-white z-50 animate-flash" />
              )}

              <div className="absolute bottom-10 inset-x-0 flex justify-center gap-6">
                <Button 
                  variant="ghost"
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10"
                >
                  <RefreshCw className={cn("w-7 h-7 transition-transform", isMirrored && "rotate-180")} />
                </Button>
                {frames.length > 0 && (
                  <div className="flex -space-x-4">
                    {frames.map((f, i) => (
                      <motion.img 
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        key={i} 
                        src={f.dataUrl} 
                        className="w-32 h-20 object-cover rounded-xl border-4 border-white shadow-2xl" 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-12">
            <div className="bento-card p-12 w-full flex flex-col items-center gap-10 shadow-2xl">
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-40 h-40 border-[8px] border-blue-50 border-t-blue-500 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <div className="bento-tag w-fit mx-auto">IMAGE ENGINE</div>
                <h2 className="text-4xl font-black italic tracking-tight uppercase">Processing</h2>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Composing your masterpiece</p>
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="h-full p-4 md:p-10 max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-8 overflow-y-auto lg:overflow-hidden pb-32 lg:pb-10"
          >
            {/* Main Preview (Live Composite) */}
            <div className="lg:col-span-7 bento-card bg-slate-100 relative overflow-y-auto overflow-x-hidden group min-h-[450px] lg:min-h-[600px] shrink-0">
              <div className="min-h-full w-full flex flex-col items-center p-4 md:p-12">
                <div 
                  id="live-composite"
                  className="relative shadow-2xl transition-all duration-500 p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 bg-white shrink-0"
                  style={{ backgroundColor: settings.frameColor }}
                >
                  <div className={cn(
                    "grid gap-4",
                    settings.layout === '2x2' ? 'grid-cols-2 max-w-[440px]' : 'grid-cols-1 w-[260px]'
                  )}>
                    {frames.map((f) => (
                      <div key={f.id} className="relative overflow-hidden aspect-[4/3] shadow-inner bg-slate-50">
                        <img 
                          src={f.dataUrl} 
                          className={cn(
                            "w-full h-full object-cover",
                            settings.filter === 'bw' && "grayscale contrast-125",
                            settings.filter === 'vintage' && "sepia brightness-90 contrast-110",
                            settings.filter === 'vivid' && "saturate-200 contrast-110"
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="text-center space-y-1 py-4">
                     <div className={cn(
                       "text-2xl font-black italic tracking-tighter",
                       settings.frameColor === '#1a1a1a' || settings.frameColor === '#800000' || settings.frameColor === '#800020' ? 'text-white' : 'text-slate-900'
                     )}>SNAP_VIBE</div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString()}</div>
                  </div>

                  {/* Stickers Layer */}
                  <div id="preview-container" className="absolute inset-0 pointer-events-none">
                    {stickers.map((s) => (
                      <motion.div
                        key={s.id}
                        drag
                        dragMomentum={false}
                        className={cn(
                          "absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none group/sticker",
                          selectedStickerId === s.id && "ring-2 ring-blue-500 ring-offset-4 rounded-xl"
                        )}
                        onMouseDown={() => setSelectedStickerId(s.id)}
                        onDragEnd={(_, info) => {
                          const container = document.getElementById('preview-container');
                          if (!container) return;
                          const rect = container.getBoundingClientRect();
                          const newX = Math.max(0, Math.min(1, s.x + (info.delta.x / rect.width)));
                          const newY = Math.max(0, Math.min(1, s.y + (info.delta.y / rect.height)));
                          setStickers(prev => prev.map(sticker => sticker.id === s.id ? { ...sticker, x: newX, y: newY } : sticker));
                        }}
                        style={{ 
                          left: `${s.x * 100}%`, 
                          top: `${s.y * 100}%`, 
                          fontSize: `${60 * s.scale}px`,
                          transform: `translate(-50%, -50%) rotate(${s.rotation}deg)` 
                        }}
                      >
                        {s.emoji}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStickers(prev => prev.filter(p => p.id !== s.id)); setSelectedStickerId(null); }}
                          className="absolute -top-4 -right-4 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editing Panels */}
            <div className="lg:col-span-5 flex flex-col gap-6 lg:overflow-y-auto pr-2 pb-10 lg:pb-0 shrink-0">
              <div className="bento-card p-4 md:p-6 space-y-6 shrink-0">
                <div>
                   <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400 mb-4">01. STYLE</h3>
                   <div className="space-y-4">
                      <Select 
                        value={settings.filter} 
                        onValueChange={(v) => v && setSettings({ ...settings, filter: v as FilterType })}
                      >
                        <SelectTrigger className="w-full h-12 border-2 border-slate-100 rounded-xl font-bold">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">NATURAL</SelectItem>
                          <SelectItem value="bw">B&W</SelectItem>
                          <SelectItem value="vintage">VINTAGE</SelectItem>
                          <SelectItem value="vivid">VIVID</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex flex-wrap gap-3">
                        {FRAME_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setSettings({ ...settings, frameColor: c.value })}
                            className={cn(
                              "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all hover:scale-110",
                              settings.frameColor === c.value ? "border-blue-500 ring-2 ring-offset-2 ring-blue-500/30 scale-110" : "border-slate-200"
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                   </div>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={async () => {
                      const img = await processImages(frames);
                      handleDownload(img);
                    }} 
                    className="h-16 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20"
                  >
                    <Download className="mr-2 w-5 h-5" /> SAVE
                  </Button>
                  <Button 
                    onClick={async () => {
                      const img = await processImages(frames);
                      handlePrint(img);
                    }} 
                    className="h-16 bg-slate-900 text-white font-bold rounded-2xl"
                  >
                    <Printer className="mr-2 w-5 h-5" /> PRINT
                  </Button>
                </div>
                <Button 
                  onClick={async () => {
                    const img = await processImages(frames);
                    handleShareLocal(img);
                  }}
                  className="w-full h-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-xl italic uppercase rounded-[28px] shadow-xl"
                >
                  <Share2 className="mr-3 w-6 h-6" /> SHARE_NOW
                </Button>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => { setFrames([]); setStickers([]); setState('setup'); }} className="flex-1 h-12 font-bold text-slate-400">
                    START OVER
                  </Button>
                  <Button onClick={handleFinish} className="flex-1 h-12 bg-slate-100 text-slate-900 font-bold rounded-xl">
                    FINISH
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'done':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center p-12"
          >
            <div className="bento-card p-16 w-full space-y-12 shadow-2xl border-none">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-6xl font-black tracking-tight leading-none uppercase italic">Success!</h2>
                <p className="text-xl text-gray-500 font-medium">Session data finalized and exported.<br />Thank you for visiting Flashbooth.</p>
              </div>
              
              <div className="pt-8 space-y-2">
                <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">System Resetting</div>
                <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden relative">
                  <motion.div 
                     initial={{ width: "100%" }}
                     animate={{ width: "0%" }}
                     transition={{ duration: 5, ease: "linear" }}
                     className="absolute inset-0 bg-blue-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-8">
            <div className="bento-card p-12 max-w-lg border-accent-warn bg-accent-warn/5">
              <div className="flex justify-center mb-6">
                 <AlertCircle className="w-16 h-16 text-accent-warn" />
              </div>
              <span className="architect-label text-accent-warn">FATAL_EXCEPTION_0x1C</span>
              <h2 className="text-3xl font-black tracking-tight uppercase italic mb-4">Device_Refused_Access</h2>
              <p className="text-text-muted font-mono text-xs leading-relaxed mb-8">
                {error || "OP_ERR: CAMERA_MODULE_UNAVAILABLE. CHECK_PERMISSIONS_OR_RECONNECT_HARDWARE."}
              </p>
              
              <div className="p-4 bg-white border border-accent-warn/20 text-left space-y-2 mb-8">
                <p className="font-mono text-[10px] font-bold uppercase text-accent-warn">Troubleshoot_Routine:</p>
                <div className="font-mono text-[9px] text-zinc-500 space-y-1">
                  <div>01 &gt; VERIFY_PERMISSION_POPUP</div>
                  <div>02 &gt; CHECK_PHYSICAL_DISCONNECT</div>
                  <div>03 &gt; KILL_OTHER_CAM_PROCESSES</div>
                </div>
              </div>

              <Button onClick={() => setState('idle')} className="architect-btn w-full h-14 bg-zinc-900 text-white">RETRY_INITIALIZATION</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-white text-slate-900 overflow-hidden selection:bg-blue-100">
      <Toaster position="top-center" richColors />
      
      {/* Universal Header */}
      <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 bg-white/50 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={resetToIdle}>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Camera className="w-4 h-4 md:w-6 md:h-6" />
          </div>
          <span className="font-black text-lg md:text-2xl tracking-tighter italic">
            SNAP_VIBE
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleFullscreen}
            className="hidden lg:flex bg-slate-50 border border-slate-100 rounded-full px-4 hover:bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest"
          >
            {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          </Button>

          {state !== 'idle' && (
            <div className="flex items-center gap-2 md:gap-4">
               <div className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Active</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={resetToIdle} 
                className="h-8 w-8 md:h-10 md:w-10 p-0 rounded-full hover:bg-slate-100"
              >
                <Home className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>

      {/* Local Status Indicator */}
      <footer className="fixed bottom-4 left-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-100 shadow-sm text-[10px] font-mono uppercase tracking-widest text-slate-400">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Powered by Justine Cadilo
        </div>
      </footer>
    </div>
  );
}
