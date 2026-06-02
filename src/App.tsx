/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

const FRAME_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Beige Studio', value: '#F3EFE9' },
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

interface LayoutConfig {
  id: LayoutType;
  name: string;
  sub: string;
  shotCount: number;
  canvasWidth: number;
  canvasHeight: number;
  previewClassScale: string;
}

const LAYOUT_CONFIGS: LayoutConfig[] = [
  {
    id: '2x6_3',
    name: '2X6″ Photostrip',
    sub: '3 Portrait Snaps',
    shotCount: 3,
    canvasWidth: 580,
    canvasHeight: 1435,
    previewClassScale: 'grid-cols-1 w-[220px]'
  },
  {
    id: '2x6_4',
    name: '2X6″ Classic Strip',
    sub: '4 Standard Snaps',
    shotCount: 4,
    canvasWidth: 580,
    canvasHeight: 1850,
    previewClassScale: 'grid-cols-1 w-[220px]'
  },
  {
    id: '4x6_6',
    name: '4X6″ Party Grid',
    sub: '6 Album Snaps',
    shotCount: 6,
    canvasWidth: 1120,
    canvasHeight: 1435,
    previewClassScale: 'grid-cols-2 w-[400px]'
  },
  {
    id: '4x6_single_p',
    name: '4X6″ Portrait Polaroid',
    sub: '1 High-Quality Snap',
    shotCount: 1,
    canvasWidth: 800,
    canvasHeight: 1200,
    previewClassScale: 'grid-cols-1 w-[280px]'
  },
  {
    id: '4x6_single_l',
    name: '4X6″ Landscape Poster',
    sub: '1 Wide Snap',
    shotCount: 1,
    canvasWidth: 1200,
    canvasHeight: 800,
    previewClassScale: 'grid-cols-1 w-[400px]'
  },
  {
    id: '4x6_triple',
    name: '4X6″ Triple Panel',
    sub: '3 Elegant Columns',
    shotCount: 3,
    canvasWidth: 1200,
    canvasHeight: 800,
    previewClassScale: 'grid-cols-3 w-[440px]'
  },
  {
    id: 'single',
    name: 'Classic Single',
    sub: '1 Standard Square Photo',
    shotCount: 1,
    canvasWidth: 1000,
    canvasHeight: 1220,
    previewClassScale: 'grid-cols-1 w-[380px]'
  }
];

const getLayoutGridStyles = (layout: LayoutType) => {
  switch (layout) {
    case '2x6_3':
      return {
        className: "grid grid-cols-1 gap-3 w-[200px] md:w-[220px]",
        itemAspect: "aspect-[4/3]",
      };
    case '2x6_4':
    case '1x4':
      return {
        className: "grid grid-cols-1 gap-2 md:gap-3 w-[200px] md:w-[220px]",
        itemAspect: "aspect-[4/3]",
      };
    case '4x6_6':
    case '2x2':
      return {
        className: "grid grid-cols-2 gap-2 md:gap-3 w-[360px] md:w-[400px]",
        itemAspect: "aspect-[4/3]",
      };
    case '4x6_single_p':
      return {
        className: "grid grid-cols-1 gap-0 w-[260px] md:w-[300px]",
        itemAspect: "aspect-[3/4]",
      };
    case '4x6_single_l':
      return {
        className: "grid grid-cols-1 gap-0 w-[360px] md:w-[400px]",
        itemAspect: "aspect-[4/3]",
      };
    case 'single':
      return {
        className: "grid grid-cols-1 gap-0 w-[300px] md:w-[340px]",
        itemAspect: "aspect-square",
      };
    case '4x6_triple':
      return {
        className: "grid grid-cols-3 gap-2 w-[400px] md:w-[460px]",
        itemAspect: "aspect-[3/5]",
      };
    default:
      return {
        className: "grid grid-cols-1 gap-3 w-[220px]",
        itemAspect: "aspect-[4/3]",
      };
  }
};

const getCameraAspectClass = (layout: LayoutType) => {
  // Always spacious standard landscape feed to ensure maximum comfort and high quality preview feedback
  return 'aspect-[4/3] w-full max-w-lg md:max-w-4xl h-auto';
};

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [settings, setSettings] = useState<BoothSettings>({
    layout: '2x6_4',
    filter: 'none',
    shotCount: 4,
    frameColor: '#F3EFE9',
    timerDuration: 3,
    brandingText: 'MEMORIES',
    brandingPosition: 'top',
    roundedPhotos: true,
    photoCornerRadius: 24,
    customBgImage: null,
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
  const [containerWidth, setContainerWidth] = useState(420);
  const [isDemoCamera, setIsDemoCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simulatedIntervalRef = useRef<any>(null);
  const currentShotRef = useRef(0);

  // Sync currentShot status in a ref to avoid stale closures in virtual camera rendering intervals
  useEffect(() => {
    currentShotRef.current = currentShot;
  }, [currentShot]);

  // Keep template preview layout width dynamically synchronized
  useEffect(() => {
    const el = document.getElementById('live-composite');
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [state, finalImage]);

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
    if (simulatedIntervalRef.current) {
      clearInterval(simulatedIntervalRef.current);
      simulatedIntervalRef.current = null;
    }
    setIsDemoCamera(false);
  }, []);

  const createSimulatedCameraStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    
    let frame = 0;
    
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine what to draw based on currentShotRef.current
      const activePose = (currentShotRef.current % 4) + 1;
      
      if (activePose === 1) {
        // --- POSE 1: Retro Sunset ---
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#100C18');
        grad.addColorStop(0.5, '#4E2445');
        grad.addColorStop(1, '#813C58');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw sun
        ctx.fillStyle = '#E8842E';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.6, 180 + Math.sin(frame * 0.05) * 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Sun lines
        ctx.fillStyle = '#4E2445';
        for (let y = canvas.height * 0.45; y < canvas.height * 0.85; y += 18) {
          const h = 4 + (y - canvas.height * 0.45) * 0.15;
          ctx.fillRect(0, y, canvas.width, h);
        }
        
        // Palm silhouette
        ctx.fillStyle = '#100C18';
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.2, canvas.height * 0.8, 150, 40, 0.1, 0, Math.PI * 2);
        ctx.ellipse(canvas.width * 0.8, canvas.height * 0.8, 200, 50, -0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("POSE 1: TROPICAL SUNSET", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = '#E8842E';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText("[ SMILE AND POSE FOR THE SHOT 📸 ]", canvas.width / 2, canvas.height * 0.22);
        
      } else if (activePose === 2) {
        // --- POSE 2: Synthwave Grid ---
        ctx.fillStyle = '#0B0014';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Neon horizon grid lines radiating
        ctx.strokeStyle = '#D92688';
        ctx.lineWidth = 2;
        const horizonPointerY = canvas.height * 0.55;
        
        // Draw grid vertical lines
        for (let x = -400; x <= canvas.width + 400; x += 100) {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, horizonPointerY);
          ctx.lineTo(x + Math.sin(frame * 0.01) * 20, canvas.height);
          ctx.stroke();
        }
        
        // Draw grid horizontal lines
        for (let i = 0; i < 15; i++) {
          const y = horizonPointerY + Math.pow(i / 15, 2) * (canvas.height - horizonPointerY);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        
        // Glowing Neon Mountains
        ctx.fillStyle = '#11052C';
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, horizonPointerY);
        ctx.lineTo(250, horizonPointerY - 120);
        ctx.lineTo(500, horizonPointerY);
        ctx.lineTo(750, horizonPointerY - 180);
        ctx.lineTo(1000, horizonPointerY);
        ctx.lineTo(1280, horizonPointerY - 80);
        ctx.lineTo(1280, horizonPointerY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Custom branding
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("POSE 2: NEON SPECTRUN", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = '#00F0FF';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText("[ STRIKE A COOL RETRO POSE 😎 ]", canvas.width / 2, canvas.height * 0.22);
        
      } else if (activePose === 3) {
        // --- POSE 3: Memphis Pastel Abstract ---
        ctx.fillStyle = '#F4EEFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Colorful floating geometric bodies
        const angle = frame * 0.02;
        
        ctx.save();
        ctx.translate(canvas.width * 0.3, canvas.height * 0.5);
        ctx.rotate(angle);
        ctx.fillStyle = '#FF4A4A';
        ctx.fillRect(-80, -80, 160, 160);
        ctx.restore();
        
        ctx.save();
        ctx.translate(canvas.width * 0.7, canvas.height * 0.45);
        ctx.rotate(-angle * 1.5);
        ctx.fillStyle = '#30E3DF';
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.lineTo(77, 45);
        ctx.lineTo(-77, 45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = '#FCE38A';
        ctx.beginPath();
        ctx.arc(canvas.width * 0.5, canvas.height * 0.65 + Math.sin(frame * 0.05) * 30, 70, 0, Math.PI * 2);
        ctx.fill();
        
        // Black grid points overlay
        ctx.fillStyle = '#364F6B';
        for (let x = 30; x < canvas.width; x += 80) {
          for (let y = 30; y < canvas.height; y += 80) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.fillStyle = '#364F6B';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("POSE 3: MEMPHIS GEOMETRICS", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = '#FF4A4A';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText("[ SHOW SOME LOVE ❤️ ]", canvas.width / 2, canvas.height * 0.22);
        
      } else {
        // --- POSE 4: Cyber Matrix Terminal ---
        ctx.fillStyle = '#020A05';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Matrix grid
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        
        // Draw matrix glyphs
        ctx.fillStyle = '#00FF41';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        for (let x = 20; x < canvas.width; x += 60) {
          const streamY = (frame * 5 + (x * 123)) % (canvas.height + 100);
          const chars = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1023456789";
          const char = chars[Math.floor(Math.sin(x + frame * 0.05) * 10 + 20) % chars.length];
          ctx.fillText(char, x, streamY);
          ctx.fillText(chars[(char.charCodeAt(0) + 1) % chars.length], x, (streamY - 20 + canvas.height) % canvas.height);
          ctx.fillText(chars[(char.charCodeAt(0) + 2) % chars.length], x, (streamY - 40 + canvas.height) % canvas.height);
        }
        
        // Cyber eye grid
        ctx.strokeStyle = '#00FF41';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width * 0.35, canvas.height * 0.3, canvas.width * 0.3, canvas.height * 0.4);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("POSE 4: CYBER LENS INTEGRATOR", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = '#00FF41';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText("[ SYSTEM INTEGRATION STABLE 🤖 ]", canvas.width / 2, canvas.height * 0.22);
      }
      
      // Draw standard viewfinder overlay on top of all simulated frames to make it look active
      ctx.strokeStyle = '#00FFA3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
      ctx.stroke();
      
      const borderPad = 40;
      const markerSize = 30;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(borderPad, borderPad + markerSize);
      ctx.lineTo(borderPad, borderPad);
      ctx.lineTo(borderPad + markerSize, borderPad);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(canvas.width - borderPad, borderPad + markerSize);
      ctx.lineTo(canvas.width - borderPad, borderPad);
      ctx.lineTo(canvas.width - borderPad - markerSize, borderPad);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(borderPad, canvas.height - borderPad - markerSize);
      ctx.lineTo(borderPad, canvas.height - borderPad);
      ctx.lineTo(borderPad + markerSize, canvas.height - borderPad);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(canvas.width - borderPad, canvas.height - borderPad - markerSize);
      ctx.lineTo(canvas.width - borderPad, canvas.height - borderPad);
      ctx.lineTo(canvas.width - borderPad - markerSize, canvas.height - borderPad);
      ctx.stroke();
      
      if (Math.floor(frame / 15) % 2 === 0) {
        ctx.fillStyle = '#FF0055';
        ctx.beginPath();
        ctx.arc(borderPad + 20, borderPad + 20, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText("REC [SIMULATED FEED]", borderPad + 40, borderPad + 24);
      
      ctx.textAlign = 'right';
      ctx.fillText("FPS: 30.0", canvas.width - borderPad - 10, borderPad + 24);
      ctx.fillText("VIRTUAL LENS v1.0", canvas.width - borderPad - 10, borderPad + 44);
    };
    
    if (simulatedIntervalRef.current) clearInterval(simulatedIntervalRef.current);
    simulatedIntervalRef.current = setInterval(draw, 1000 / 30);
    draw();
    
    try {
      return (canvas as any).captureStream(30);
    } catch (e) {
      // Final resilient fallback for environments without captureStream support
      return new MediaStream();
    }
  };

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
      setIsDemoCamera(false);
      
      let stream: MediaStream;

      // We race the real webcam request against a 2.5 second timeout to prevent blocking/hanging
      const cameraPromise = navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Hardware access timed out after 2500ms")), 2500)
      );

      try {
        stream = await Promise.race([cameraPromise, timeoutPromise]);
        streamRef.current = stream;
        setIsDemoCamera(false);
      } catch (e) {
        console.warn("Real webcam initialized failed or timed out. Falling back to Simulated Virtual Camera Stream:", e);
        stream = createSimulatedCameraStream();
        streamRef.current = stream;
        setIsDemoCamera(true);
        toast.info("Using Virtual Lens (Simulated Mode) since device camera is unavailable.");
      }
      
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
          setTimeout(resolve, 1500);
        });

        // Short delay to ensure exposure/focus settles
        await new Promise(r => setTimeout(r, 800));
        
        setCountdown(settings.timerDuration);
        setCurrentShot(0);
        setFrames([]);
        setState('waiting');
      } else {
        throw new Error("Video element not found");
      }
    } catch (err) {
      console.error("Critical error starting camera:", err);
      // Absolute fallback to simulated stream to prevent any hang or freeze under all conditions!
      try {
        const fallbackStream = createSimulatedCameraStream();
        streamRef.current = fallbackStream;
        setIsDemoCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
        setCountdown(settings.timerDuration);
        setCurrentShot(0);
        setFrames([]);
        setState('waiting');
      } catch (innerErr) {
        setError("Unable to start real or simulated video source.");
        setState('error');
      }
    }
  };

  const startCaptureLoop = () => {
    setCountdown(settings.timerDuration);
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
          setCountdown(settings.timerDuration); 
        }, 1000);
      } else {
        setTimeout(() => {
          setState('processing');
          stopCamera();
          processImages([...frames, newFrame], false);
        }, 1000);
      }
    }
  };

  // --- Image Processing ---
  const processImages = async (capturedFrames: PhotoFrame[], includeStickers = true): Promise<string | undefined> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentLayout = settings.layout;
    if (currentLayout === '1x4') currentLayout = '2x6_4';
    else if (currentLayout === '2x2') currentLayout = '4x6_6';

    const activeLayout = LAYOUT_CONFIGS.find(c => c.id === currentLayout) || LAYOUT_CONFIGS[1];
    
    const totalWidth = activeLayout.canvasWidth;
    const totalHeight = activeLayout.canvasHeight;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    const preset = settings.selectedPresetTemplate ?? 'none';
    const isPresetActive = preset !== 'none';

    // Background
    if (settings.customBgImage && settings.customBgMode !== 'overlay') {
      await new Promise<void>((resolve) => {
        const bgImg = new Image();
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        bgImg.onerror = () => {
          ctx.fillStyle = settings.frameColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          resolve();
        };
        bgImg.src = settings.customBgImage!;
      });
    } else {
      if (preset === 'retro-ticket') {
        ctx.fillStyle = '#F3EFE9'; // Retro warm ivory ticket
      } else if (preset === 'exclusive') {
        ctx.fillStyle = '#FFFFFF'; // Editorial crisp white
      } else if (preset === 'saycheese-receipt') {
        ctx.fillStyle = '#F5F5F0'; // Receipt thermal paper off-white
      } else if (preset === 'spotify') {
        ctx.fillStyle = '#121212'; // Music player sleek dark black
      } else if (preset === 'wedding-blue') {
        ctx.fillStyle = '#162E4E'; // Elegant royal navy blue
      } else {
        ctx.fillStyle = settings.frameColor;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply Filter to context
    const applyFilter = (context: CanvasRenderingContext2D) => {
      switch (settings.filter) {
        case 'bw': context.filter = 'grayscale(100%) contrast(1.2)'; break;
        case 'vintage': context.filter = 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(0.8)'; break;
        case 'vivid': context.filter = 'saturate(1.5) contrast(1.1)'; break;
        default: context.filter = 'none';
      }
    };

    const drawFrame = (frame: PhotoFrame, x: number, y: number, w: number, h: number) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          applyFilter(ctx);
          
          // Implement object-fit: cover logic
          const scale = Math.max(w / img.width, h / img.height);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const drawX = x + (w - drawWidth) / 2;
          const drawY = y + (h - drawHeight) / 2;

          ctx.beginPath();
          if (settings.roundedPhotos) {
            const r = settings.photoCornerRadius ?? 24;
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(x, y, w, h, r);
            } else {
              ctx.moveTo(x + r, y);
              ctx.arcTo(x + w, y, x + w, y + h, r);
              ctx.arcTo(x + w, y + h, x, y + h, r);
              ctx.arcTo(x, y + h, x, y, r);
              ctx.arcTo(x, y, x + w, y, r);
            }
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.clip();

          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
          resolve();
        };
        img.src = frame.dataUrl;
      });
    };

    const brandingPos = settings.brandingPosition ?? 'bottom';
    const hasTopText = brandingPos === 'top' || brandingPos === 'both';
    const hasBottomText = brandingPos === 'bottom' || brandingPos === 'both';

    // Track frame rendering boxes for layout-aware elements
    const drawnPhotosBounds: { x: number; y: number; w: number; h: number }[] = [];

    // Draw each frame with its specific x, y, width, height coordinate
    if (activeLayout.id === '2x6_3') {
      let w = 500;
      let h = 375;
      let pad = 40;
      let startY = hasTopText ? 150 : 40;
      let drawX = 40;

      if (isPresetActive) {
        w = 460;
        h = 345;
        pad = 22;
        startY = 200;
        drawX = 60;
      }

      for (let i = 0; i < Math.min(capturedFrames.length, 3); i++) {
        const px = drawX;
        const py = startY + i * (h + pad);
        drawnPhotosBounds.push({ x: px, y: py, w, h });
        await drawFrame(capturedFrames[i], px, py, w, h);
      }
    } else if (activeLayout.id === '2x6_4') {
      let w = 500;
      let h = 375;
      let pad = 40;
      let startY = hasTopText ? 150 : 40;
      let drawX = 40;

      if (isPresetActive) {
        w = 460;
        h = 345;
        pad = 22;
        startY = 205;
        drawX = 60;
      }

      for (let i = 0; i < Math.min(capturedFrames.length, 4); i++) {
        const px = drawX;
        const py = startY + i * (h + pad);
        drawnPhotosBounds.push({ x: px, y: py, w, h });
        await drawFrame(capturedFrames[i], px, py, w, h);
      }
    } else if (activeLayout.id === '4x6_6') {
      let w = 500;
      let h = 375;
      let pad = 40;
      let startY = hasTopText ? 130 : 40;

      if (isPresetActive) {
        w = 480;
        h = 360;
        pad = 32;
        startY = 180;
      }

      for (let i = 0; i < Math.min(capturedFrames.length, 6); i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const colX = isPresetActive ? (65 + col * (w + pad)) : (pad + col * (w + pad));
        const py = startY + row * (h + pad);
        drawnPhotosBounds.push({ x: colX, y: py, w, h });
        await drawFrame(capturedFrames[i], colX, py, w, h);
      }
    } else if (activeLayout.id === '4x6_single_p') {
      let w = 680;
      let h = 820;
      let startY = hasTopText ? 160 : 60;
      let drawX = 60;

      if (isPresetActive) {
        w = 660;
        h = 790;
        startY = 200;
        drawX = 70;
      }

      if (capturedFrames[0]) {
        drawnPhotosBounds.push({ x: drawX, y: startY, w, h });
        await drawFrame(capturedFrames[0], drawX, startY, w, h);
      }
    } else if (activeLayout.id === '4x6_single_l') {
      let w = 1040;
      let h = 550;
      let startY = hasTopText ? 130 : 80;
      let drawX = 80;

      if (isPresetActive) {
        w = 1000;
        h = 520;
        startY = 180;
        drawX = 100;
      }

      if (capturedFrames[0]) {
        drawnPhotosBounds.push({ x: drawX, y: startY, w, h });
        await drawFrame(capturedFrames[0], drawX, startY, w, h);
      }
    } else if (activeLayout.id === 'single') {
      let w = 840;
      let h = 840;
      let startY = hasTopText ? 160 : 80;
      let drawX = 80;

      if (isPresetActive) {
        w = 800;
        h = 800;
        startY = 200;
        drawX = 100;
      }

      if (capturedFrames[0]) {
        drawnPhotosBounds.push({ x: drawX, y: startY, w, h });
        await drawFrame(capturedFrames[0], drawX, startY, w, h);
      }
    } else if (activeLayout.id === '4x6_triple') {
      let w = 340;
      let h = 560;
      let startX = 55;
      let gap = 35;
      let startY = hasTopText ? 110 : 50;

      if (isPresetActive) {
        w = 320;
        h = 520;
        startX = 75;
        gap = 30;
        startY = 160;
      }

      for (let i = 0; i < Math.min(capturedFrames.length, 3); i++) {
        const px = startX + i * (w + gap);
        drawnPhotosBounds.push({ x: px, y: startY, w, h });
        await drawFrame(capturedFrames[i], px, startY, w, h);
      }
    } else {
      // General fallback
      let w = 500;
      let h = 375;
      let pad = 40;
      let startY = hasTopText ? 150 : 40;
      let drawX = pad;

      if (isPresetActive) {
        w = 460;
        h = 345;
        startY = 200;
        drawX = 60;
        pad = 22;
      }

      for (let i = 0; i < capturedFrames.length; i++) {
        const py = startY + i * (h + pad);
        drawnPhotosBounds.push({ x: drawX, y: py, w, h });
        await drawFrame(capturedFrames[i], drawX, py, w, h);
      }
    }

    // Draw Stickers onto Canvas
    if (includeStickers) {
      const baseFontSize = activeLayout.id.startsWith('2x6') ? 36 : 64;
      const designWidth = activeLayout.id.startsWith('2x6') ? 240 : 420;

      for (const s of stickers) {
        ctx.save();
        ctx.translate(canvas.width * s.x, canvas.height * s.y);
        ctx.rotate((s.rotation * Math.PI) / 180);
        
        const canvasFontSize = baseFontSize * s.scale * (canvas.width / designWidth);
        ctx.font = `bold ${canvasFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, 0, 0);
        ctx.restore();
      }
    }

    // Real boundary heights for perfect scaling
    const photoMinY = drawnPhotosBounds.length > 0 ? Math.min(...drawnPhotosBounds.map(b => b.y)) : 200;
    const photoMaxY = drawnPhotosBounds.length > 0 ? Math.max(...drawnPhotosBounds.map(b => b.y + b.h)) : canvas.height - 200;
    const headerHeight = photoMinY;
    const footerHeight = canvas.height - photoMaxY;

    // Custom Branding Design Drawing
    const drawBrandingText = (yPos: number, isTop: boolean) => {
      ctx.save();
      const isDarkBg = ['#1a1a1a', '#800000', '#800020', '#64748b'].includes(settings.frameColor.toLowerCase());
      ctx.fillStyle = isDarkBg ? '#FFFFFF' : '#1A1A1A';
      
      const textVal = (settings.brandingText || 'MEMORIES').toUpperCase();
      
      if ('letterSpacing' in ctx) {
        // @ts-ignore
        ctx.letterSpacing = '10px';
      }
      
      ctx.font = '500 36px "Inter", "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textVal, canvas.width / 2, yPos);
      
      ctx.font = '20px "JetBrains Mono", monospace';
      ctx.fillStyle = isDarkBg ? '#a1a1aa' : '#64748b';
      if ('letterSpacing' in ctx) {
        // @ts-ignore
        ctx.letterSpacing = '3px';
      }
      const dateText = new Date().toLocaleDateString();
      ctx.fillText(dateText, canvas.width / 2, isTop ? yPos + 45 : yPos + 40);
      ctx.restore();
    };

    // Draw Premium Theme Presets if selected (Adapted to scale dynamically)
    const drawPremiumPreset = () => {
      if (preset === 'none') return;
      
      ctx.save();
      
      const isTicket = preset === 'retro-ticket';
      const isReceipt = preset === 'saycheese-receipt';
      const isExclusive = preset === 'exclusive';
      const isWedding = preset === 'wedding-blue';
      const isSpotify = preset === 'spotify';

      const textVal = (settings.brandingText || 'MEMORIES').toUpperCase();

      if (isTicket) {
        // Reddish vintage ticket stub markings 
        // Dash margin is proportional to canvas width
        const dashedMargin = Math.max(20, canvas.width * 0.06);

        ctx.strokeStyle = '#8B2635';
        ctx.lineWidth = Math.max(2, canvas.width * 0.005);
        ctx.setLineDash([8, 6]);
        
        ctx.beginPath();
        ctx.moveTo(dashedMargin, 0);
        ctx.lineTo(dashedMargin, canvas.height);
        ctx.moveTo(canvas.width - dashedMargin, 0);
        ctx.lineTo(canvas.width - dashedMargin, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Ticket side circles (Notch cutouts) using genuine canvas transparency so they look brilliant on any backgrounds!
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000000'; // any color works under destination-out to write transparency
        
        const cutoutRadius = Math.max(15, canvas.width * 0.043);
        const uniqueYLevels = Array.from(new Set(drawnPhotosBounds.map(b => b.y))).sort((a,b) => a - b);
        const notchesY: number[] = [];
        
        // 1. Header cutout centered in headerSpace
        if (headerHeight > cutoutRadius * 2) {
          notchesY.push(headerHeight / 2);
        }
        
        // 2. Inter-photo row cutouts centered inside layout gaps (guarantees zero image clashing!)
        for (let j = 0; j < uniqueYLevels.length - 1; j++) {
          const currentY = uniqueYLevels[j];
          const sameRowY = drawnPhotosBounds.filter(b => b.y === currentY);
          const currentBottom = Math.max(...sameRowY.map(b => b.y + b.h));
          const nextTop = uniqueYLevels[j + 1];
          const gapCenter = (currentBottom + nextTop) / 2;
          notchesY.push(gapCenter);
        }
        
        // 3. Footer cutout centered in footerSpace
        if (footerHeight > cutoutRadius * 2.5) {
          notchesY.push(photoMaxY + footerHeight * 0.5);
        }

        // Draw side notched arches
        for (const yVal of notchesY) {
          ctx.beginPath();
          ctx.arc(0, yVal, cutoutRadius, 0, Math.PI * 2);
          ctx.arc(canvas.width, yVal, cutoutRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Stars at header & footer
        ctx.fillStyle = '#8B2635';
        const starsScale = Math.min(1.0, canvas.width / 580);
        ctx.font = `${Math.max(12, Math.floor(24 * starsScale))}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        
        // Draw Stars centered in header space above photos, and centered in footer space below photos
        if (headerHeight > 50) {
          ctx.fillText('★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★', canvas.width / 2, headerHeight * 0.38);
        }
        
        // Draw stars and title dynamically
        if (headerHeight > 100) {
          // Header Title
          ctx.fillStyle = '#2C1B18';
          ctx.font = `bold ${Math.max(18, Math.floor(36 * starsScale))}px "Georgia", serif`;
          ctx.fillText('L E N S B O X', canvas.width / 2, headerHeight * 0.62);
          ctx.font = `${Math.max(8, Math.floor(13 * starsScale))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#8B2635';
          ctx.fillText('p h o t o b o o t h', canvas.width / 2, headerHeight * 0.78);
        } else if (headerHeight > 40) {
          ctx.fillStyle = '#2C1B18';
          ctx.font = `bold ${Math.max(14, Math.floor(24 * starsScale))}px "Georgia", serif`;
          ctx.fillText('L E N S B O X', canvas.width / 2, headerHeight * 0.7);
        }

        const scaleFooter = Math.min(1.0, footerHeight / 190);
        if (footerHeight > 40) {
          ctx.fillStyle = '#8B2635';
          ctx.font = `${Math.max(12, Math.floor(24 * scaleFooter * starsScale))}px "Inter", sans-serif`;
          ctx.fillText('★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★', canvas.width / 2, photoMaxY + footerHeight * 0.18);
        }

        // Barcode at standard ticket stubs
        if (footerHeight > 110) {
          const barcodeH = Math.max(30, Math.floor(60 * scaleFooter));
          const barcodeY = photoMaxY + footerHeight * 0.38;
          const barcodeW = Math.min(canvas.width - 100, Math.floor(340 * scaleFooter));
          const barcodeX = (canvas.width - barcodeW) / 2;
          ctx.fillStyle = '#2C1B18';
          
          let currX = barcodeX;
          const pattern = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 4, 1, 2];
          while (currX < barcodeX + barcodeW) {
            for (const bar of pattern) {
              if (currX + bar > barcodeX + barcodeW) break;
              ctx.fillRect(currX, barcodeY, bar * 1.5 * scaleFooter, barcodeH);
              currX += (bar * 1.5 * scaleFooter) + 3 * scaleFooter;
            }
          }
          ctx.font = `${Math.max(10, Math.floor(15 * scaleFooter))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#2C1B18';
          ctx.fillText('3 5  4 6 8 9  5 0 1 8  7 8 4', canvas.width / 2, barcodeY + barcodeH + Math.max(15, 20 * scaleFooter));
        }
      }

      if (isExclusive) {
        ctx.fillStyle = '#1A1A1A';
        ctx.textAlign = 'center';
        
        const scaleExclusive = Math.min(1.0, headerHeight / 200);

        if (headerHeight > 60) {
          // Stretched editorial heading EXCLUSIVE
          ctx.font = `900 ${Math.max(36, Math.floor(75 * scaleExclusive))}px "Georgia", serif`;
          ctx.save();
          ctx.translate(canvas.width / 2, headerHeight * 0.5);
          ctx.scale(0.85, 1.3);
          ctx.fillText('EXCLUSIVE', 0, 0);
          ctx.restore();
        }

        // Subheader separators
        if (headerHeight > 140) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#1A1A1A';
          ctx.fillStyle = '#1A1A1A';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          
          const centerLineY = headerHeight * 0.85;
          ctx.beginPath();
          ctx.moveTo(40, centerLineY);
          ctx.lineTo(110, centerLineY);
          ctx.moveTo(canvas.width - 110, centerLineY);
          ctx.lineTo(canvas.width - 40, centerLineY);
          ctx.stroke();

          ctx.fillText('08/08   •   POSE, CLICK, REPEAT   •   2026', canvas.width / 2, centerLineY + 4);
        }

        // Dynamic footer lines
        if (footerHeight > 40) {
          ctx.font = 'bold 15px "JetBrains Mono", monospace';
          ctx.fillStyle = '#1A1A1A';
          ctx.fillText(textVal + '     ✦     ' + textVal + '     ✦     ' + textVal, canvas.width / 2, photoMaxY + footerHeight / 2);
        }
      }

      if (isReceipt) {
        // High fidelity receipt format
        ctx.fillStyle = '#1E1E1E';
        ctx.textAlign = 'center';

        const scaleReceiptHeader = Math.min(1.0, headerHeight / 180);
        
        if (headerHeight > 80) {
          ctx.font = `900 ${Math.max(18, Math.floor(36 * scaleReceiptHeader))}px "JetBrains Mono", monospace`;
          if ('letterSpacing' in ctx) { (ctx as any).letterSpacing = '1px'; }
          ctx.fillText(textVal || 'SAYCHEESE MART', canvas.width / 2, headerHeight * 0.35);
          
          ctx.font = `${Math.max(9, Math.floor(14 * scaleReceiptHeader))}px "JetBrains Mono", monospace`;
          if ('letterSpacing' in ctx) { (ctx as any).letterSpacing = '0px'; }
          ctx.fillText('Mataram, Nusa Tenggara Barat', canvas.width / 2, headerHeight * 0.55);
          ctx.fillText('Tel. (0370) 111234', canvas.width / 2, headerHeight * 0.68);
        } else if (headerHeight > 40) {
          ctx.font = `900 ${Math.max(14, Math.floor(24 * scaleReceiptHeader))}px "JetBrains Mono", monospace`;
          ctx.fillText(textVal || 'SAYCHEESE MART', canvas.width / 2, headerHeight * 0.6);
        }

        // Receipt dashes line
        const drawReceiptDash = (y: number) => {
          ctx.save();
          ctx.strokeStyle = '#3A3A3A';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(35, y);
          ctx.lineTo(canvas.width - 35, y);
          ctx.stroke();
          ctx.restore();
        };

        if (headerHeight > 130) {
          drawReceiptDash(headerHeight * 0.78);
        }
        
        if (headerHeight > 165) {
          ctx.textAlign = 'left';
          ctx.font = '12px "JetBrains Mono", monospace';
          ctx.fillText('DATE: ' + new Date().toLocaleDateString(), 40, headerHeight * 0.88);
          ctx.textAlign = 'right';
          ctx.fillText('INVOICE NO: #' + Math.floor(100000 + Math.random() * 900000), canvas.width - 40, headerHeight * 0.88);
          
          drawReceiptDash(headerHeight * 0.96);
        }

        // Bottom receipt lines
        const scaleReceipt = Math.min(1.0, footerHeight / 240);
        
        if (footerHeight > 40) {
          const fDash1 = photoMaxY + footerHeight * 0.05;
          drawReceiptDash(fDash1);
          
          ctx.font = `bold ${Math.max(9, Math.floor(14 * scaleReceipt))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#1E1E1E';
          
          if (footerHeight > 100) {
            ctx.textAlign = 'left';
            ctx.fillText('1 X PHOTOSTRIP SUPERIOR', 45, photoMaxY + footerHeight * 0.18);
            ctx.textAlign = 'right';
            ctx.fillText('RP. 25.000', canvas.width - 45, photoMaxY + footerHeight * 0.18);

            ctx.textAlign = 'left';
            ctx.font = `${Math.max(8, Math.floor(13 * scaleReceipt))}px "JetBrains Mono", monospace`;
            ctx.fillText('  (+) XTRA GLAM FLUSH', 45, photoMaxY + footerHeight * 0.28);
            ctx.textAlign = 'right';
            ctx.fillText('RP.      0', canvas.width - 45, photoMaxY + footerHeight * 0.28);

            ctx.fillText('  (+) XTRA SMILE', 45, photoMaxY + footerHeight * 0.38);
            ctx.textAlign = 'right';
            ctx.fillText('RP.      0', canvas.width - 45, photoMaxY + footerHeight * 0.38);
          }

          const fDash2 = photoMaxY + footerHeight * 0.48;
          drawReceiptDash(fDash2);

          if (footerHeight > 140) {
            ctx.font = `bold ${Math.max(10, Math.floor(16 * scaleReceipt))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('TOTAL AMOUNT PAID', 45, photoMaxY + footerHeight * 0.58);
            ctx.textAlign = 'right';
            ctx.fillText('RP. 25.000', canvas.width - 45, photoMaxY + footerHeight * 0.58);
          }

          if (footerHeight > 170) {
            ctx.textAlign = 'center';
            ctx.font = `bold ${Math.max(8, Math.floor(13 * scaleReceipt))}px "JetBrains Mono", monospace`;
            ctx.fillText('* THANK YOU & COME BACK SOON *', canvas.width / 2, photoMaxY + footerHeight * 0.72);
          }

          // Barcode
          if (footerHeight > 90) {
            const barH = Math.max(15, 25 * scaleReceipt);
            const barY = photoMaxY + footerHeight * 0.82;
            const barW = Math.min(canvas.width - 100, Math.floor(380 * scaleReceipt));
            const barX = (canvas.width - barW) / 2;
            ctx.fillStyle = '#000000';
            let currX = barX;
            const pattern = [1, 2, 1, 3, 1, 1, 2, 4, 1, 1, 3, 2, 1, 3, 2, 1];
            while (currX < barX + barW) {
              for (const width of pattern) {
                if (currX + width > barX + barW) break;
                ctx.fillRect(currX, barY, width * scaleReceipt, barH);
                currX += (width * scaleReceipt) + 2 * scaleReceipt;
              }
            }
            if (footerHeight > 210) {
              ctx.font = '10px "JetBrains Mono", monospace';
              ctx.fillText('@saycheese.booth', canvas.width / 2, barY + barH + 15);
            }
          }
        }
      }

      if (isSpotify) {
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';

        const scaleSpotifyHeader = Math.min(1.0, headerHeight / 150);
        if (headerHeight > 40) {
          ctx.font = `bold ${Math.max(10, Math.floor(15 * scaleSpotifyHeader))}px "JetBrains Mono", monospace`;
          ctx.fillText('Spotify PHOTOSTRIP #2', canvas.width / 2, headerHeight * 0.5);
        }

        const scaleSpotify = Math.min(1.0, footerHeight / 210);

        if (footerHeight > 40) {
          const spotifyY = photoMaxY;

          // Track Details & Icon badge
          if (footerHeight > 100) {
            ctx.save();
            ctx.fillStyle = '#1DB954';
            ctx.beginPath();
            const iconX = 55;
            const iconY = spotifyY + footerHeight * 0.22;
            ctx.arc(iconX, iconY, Math.max(10, 20 * scaleSpotify), 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = Math.max(1.5, 3 * scaleSpotify);
            ctx.lineCap = 'round';
            ctx.beginPath(); 
            ctx.arc(iconX - 2 * scaleSpotify, iconY + 2 * scaleSpotify, 11 * scaleSpotify, -Math.PI * 0.45, -Math.PI * 0.05);
            ctx.stroke();
            ctx.beginPath(); 
            ctx.arc(iconX - 2 * scaleSpotify, iconY + 2 * scaleSpotify, 7 * scaleSpotify, -Math.PI * 0.45, -Math.PI * 0.05);
            ctx.stroke();
            ctx.restore();

            // Track Details
            ctx.textAlign = 'left';
            ctx.font = `bold ${Math.max(12, Math.floor(24 * scaleSpotify))}px "Inter", sans-serif`;
            ctx.fillText(textVal, 95, spotifyY + footerHeight * 0.2);
            ctx.font = `500 ${Math.max(8, Math.floor(16 * scaleSpotify))}px "Inter", sans-serif`;
            ctx.fillStyle = '#B3B3B3';
            ctx.fillText('My Favorites — Digital Souvenir', 95, spotifyY + footerHeight * 0.32);
          }

          // Bar Seeker
          if (footerHeight > 130) {
            const barStartX = 55;
            const barWidth = canvas.width - 110;
            const barY = spotifyY + footerHeight * 0.52;
            
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(barStartX, barY, barWidth, 6);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(barStartX, barY, barWidth * 0.45, 6);
            
            ctx.beginPath();
            ctx.arc(barStartX + barWidth * 0.45, barY + 3, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = `${Math.max(8, Math.floor(12 * scaleSpotify))}px "JetBrains Mono", monospace`;
            ctx.fillStyle = '#B3B3B3';
            ctx.textAlign = 'left';
            ctx.fillText('0:45', barStartX, barY + Math.max(12, 18 * scaleSpotify));
            ctx.textAlign = 'right';
            ctx.fillText('3:18', barStartX + barWidth, barY + Math.max(12, 18 * scaleSpotify));
          }

          // Media Buttons
          if (footerHeight > 175) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${Math.max(18, Math.floor(36 * scaleSpotify))}px "Inter", sans-serif`;
            ctx.fillText('⏮   ⏸   ⏭', canvas.width / 2, spotifyY + footerHeight * 0.82);
          }
        }
      }

      if (isWedding) {
        ctx.strokeStyle = '#dfba6b';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.strokeStyle = '#c5a059';
        ctx.lineWidth = 1;
        ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

        const scaleWedding = Math.min(1.0, footerHeight / 190);
        ctx.textAlign = 'center';

        if (footerHeight > 55) {
          ctx.fillStyle = '#dfba6b';
          ctx.font = `italic bold ${Math.max(18, Math.floor(44 * scaleWedding))}px "Georgia", serif`;
          ctx.fillText(settings.brandingText || 'Darrell & Taforey', canvas.width / 2, photoMaxY + footerHeight * 0.25);
        }

        // Heart traces
        if (footerHeight > 115) {
          ctx.save();
          ctx.strokeStyle = '#dfba6b';
          ctx.fillStyle = '#dfba6b';
          ctx.lineWidth = 2.5;

          const drawCanvasHeart = (x: number, y: number, size: number) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x - size/2, y - size/2, x - size, y + size/3, x, y + size);
            ctx.bezierCurveTo(x + size, y + size/3, x + size/2, y - size/2, x, y);
            ctx.stroke();
          };

          const heartSize = Math.max(10, 20 * scaleWedding);
          const heartY = photoMaxY + footerHeight * 0.52;
          drawCanvasHeart(canvas.width / 2 - heartSize, heartY, heartSize);
          drawCanvasHeart(canvas.width / 2 + heartSize, heartY, heartSize);
          ctx.restore();
        }

        if (footerHeight > 155) {
          ctx.font = `${Math.max(10, Math.floor(15 * scaleWedding))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#A89269';
          ctx.fillText(new Date().toLocaleDateString() + ' • ' + '#WeddingDay', canvas.width / 2, photoMaxY + footerHeight * 0.8);
        }
      }

      ctx.restore();
    };

    drawPremiumPreset();

    // Draw Branding at Top if configured and NOT using preset
    if (!isPresetActive) {
      if (hasTopText) {
        drawBrandingText(65, true);
      }
      if (hasBottomText) {
        drawBrandingText(canvas.height - 80, false);
      }
    }

    // Overlay full transparent custom frames standard overlays if using 'overlay' mode
    if (settings.customBgImage && settings.customBgMode === 'overlay') {
      await new Promise<void>((resolve) => {
        const bgImg = new Image();
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        bgImg.onerror = () => {
          resolve();
        };
        bgImg.src = settings.customBgImage!;
      });
    }

    const resultDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setFinalImage(resultDataUrl);
    if (state !== 'preview' && state !== 'done') {
      setState('preview');
    }

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

  // Dynamically update the compiled finalImage baseline when color, text, corners or custom background change in preview
  useEffect(() => {
    if (state === 'preview' && frames.length > 0) {
      processImages(frames, false);
    }
  }, [
    settings.filter,
    settings.frameColor,
    settings.brandingText,
    settings.brandingPosition,
    settings.roundedPhotos,
    settings.photoCornerRadius,
    settings.customBgImage,
    state
  ]);

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
            className="h-full w-full overflow-y-auto scrollbar-thin bg-slate-50/20"
          >
            <div className="flex flex-col max-w-2xl mx-auto p-4 md:p-10 pb-28 gap-6 min-h-full justify-start md:justify-center">
              <div className="flex flex-col gap-2 text-center">
                <div className="bento-tag w-fit mx-auto">01. Setup</div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase italic">Select Layout</h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {LAYOUT_CONFIGS.map((cfg) => {
                  const isSelected = settings.layout === cfg.id;
                  return (
                    <button
                      key={cfg.id}
                      onClick={() => setSettings({ 
                        ...settings, 
                        layout: cfg.id, 
                        shotCount: cfg.shotCount 
                      })}
                      className={cn(
                        "relative p-3 md:p-5 rounded-[24px] border-2 transition-all duration-300 flex flex-col items-center gap-2 text-center",
                        isSelected ? "border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-500/10" : "border-slate-100 hover:border-slate-200 bg-white"
                      )}
                    >
                      {/* Miniature visual mockup based on layout */}
                      <div className={cn(
                        "border border-slate-900 bg-white p-1 shadow-sm shrink-0 flex flex-col justify-between overflow-hidden rounded",
                        cfg.id.startsWith('2x6') ? "w-[44px] h-[92px]" : "w-[76px] h-[58px]"
                      )}>
                        {cfg.id === '2x6_3' && (
                          <div className="flex flex-col gap-1 h-full">
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="h-1 w-6 bg-slate-300 rounded-sm mx-auto shrink-0 mt-auto" />
                          </div>
                        )}
                        {cfg.id === '2x6_4' && (
                          <div className="flex flex-col gap-0.5 h-full">
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                            <div className="h-0.5 w-6 bg-slate-300 rounded-sm mx-auto shrink-0 mt-auto" />
                          </div>
                        )}
                        {cfg.id === '4x6_6' && (
                          <div className="grid grid-cols-2 grid-rows-3 gap-0.5 h-full w-full">
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                          </div>
                        )}
                        {cfg.id === '4x6_single_p' && (
                          <div className="flex flex-col gap-1 h-full w-full">
                            <div className="flex-[3] bg-slate-200 rounded-sm" />
                            <div className="flex-1 flex items-center justify-center">
                              <div className="h-1 w-6 bg-slate-300 rounded-sm" />
                            </div>
                          </div>
                        )}
                        {cfg.id === '4x6_single_l' && (
                          <div className="flex flex-col h-full w-full">
                            <div className="flex-1 bg-slate-200 rounded-sm" />
                          </div>
                        )}
                        {cfg.id === 'single' && (
                          <div className="flex flex-col h-full w-full justify-between items-center py-0.5">
                            <div className="w-9 h-9 bg-slate-200 rounded-sm shrink-0" />
                            <div className="h-0.5 w-[18px] bg-slate-300 rounded-sm shrink-0 mt-auto" />
                          </div>
                        )}
                        {cfg.id === '4x6_triple' && (
                          <div className="grid grid-cols-3 gap-0.5 h-full w-full">
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                            <div className="bg-slate-200 rounded-sm" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 mt-1">
                        <span className="text-[11px] md:text-sm font-black uppercase tracking-tight block italic leading-tight">{cfg.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{cfg.sub}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Timer Selector Duration */}
              <div className="flex flex-col gap-2 text-center mt-2 p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                <span className="text-xs font-black uppercase italic tracking-widest text-slate-400">02. Timer Speed</span>
                <div className="flex justify-center gap-3 mt-1">
                  {[3, 5, 10].map((sec) => (
                    <Button
                      key={sec}
                      variant={settings.timerDuration === sec ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, timerDuration: sec })}
                      className={cn(
                        "rounded-full px-5 py-2 font-black italic text-xs h-9",
                        settings.timerDuration === sec ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-200 text-slate-600 bg-white"
                      )}
                    >
                      {sec}S Timer
                    </Button>
                  ))}
                </div>
              </div>

              {/* Design Sizes details */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col gap-1.5 text-xs text-slate-500 font-medium leading-relaxed">
                <span className="font-black uppercase text-slate-700 block italic leading-none mb-1">📐 Layout Template Dimensions for Design</span>
                <p>For custom cover templates, please design using these dimensions (at 300 DPI):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] font-mono">
                  <div>• 2x6" Strip (3/4 Photos): <span className="text-blue-600 font-bold">1200 x 3600 px</span></div>
                  <div>• 4x6" Grid (6 Photos): <span className="text-blue-600 font-bold">1800 x 1200 px</span></div>
                  <div>• 4x6" Polaroid (Single P): <span className="text-blue-600 font-bold">1200 x 1800 px</span></div>
                  <div>• 4x6" Landscape (Single L): <span className="text-blue-600 font-bold">1800 x 1200 px</span></div>
                  <div>• 4x6" Columns (3 Photos): <span className="text-blue-600 font-bold">1800 x 1200 px</span></div>
                </div>
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
            </div>
          </motion.div>
        );

      case 'camera-init':
      case 'waiting':
      case 'countdown':
      case 'capturing':
        return (
          <div className={cn(
            "relative min-h-[calc(100vh-6rem)] w-full flex flex-col items-center justify-start p-4 md:p-8 xl:p-12 transition-all duration-300 overflow-y-auto bg-slate-50/20 pb-20",
            isShaking && "shake"
          )}>
            {/* Beautiful Outside Countdown Panel */}
            <AnimatePresence mode="wait">
              {state === 'countdown' && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="mb-4 text-center z-20 shrink-0"
                >
                  <div className="bg-red-500 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow-xl shadow-red-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
                    CAMERAS READY
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <span className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-slate-800">CAPTURE IN</span>
                    <motion.span 
                      key={countdown}
                      initial={{ scale: 1.4, rotate: -3 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-4xl md:text-5xl font-black text-blue-600 font-mono bg-white border border-blue-100 shadow-md px-4 md:px-5 py-1 rounded-xl block"
                    >
                      {countdown > 0 ? `${countdown}s` : "SMILE! 📸"}
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "relative bg-black rounded-3xl md:rounded-[40px] overflow-hidden shadow-2xl border-4 md:border-[12px] border-white group transition-all duration-300",
              getCameraAspectClass(settings.layout)
            )}>
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
              
              {/* No dark shadow overlay anymore! Keeping the camera feed perfectly bright & beautiful */}

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
                  className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/10 backdrop-blur-[1px]"
                >
                  <Button
                    onClick={() => {
                      setCountdown(settings.timerDuration);
                      setState('countdown');
                    }}
                    className="w-40 h-40 rounded-full bg-white text-gray-900 shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-32 h-32 rounded-full border-4 border-gray-900/10 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-blue-600 group-hover:rotate-12 transition-transform" />
                    </div>
                  </Button>
                  <motion.p 
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white font-black italic uppercase tracking-[0.3em] mt-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
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

              <div className="absolute top-4 right-4 md:top-10 md:right-10 flex flex-col items-end gap-2 md:gap-3">
                <div className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white font-bold text-[10px] md:text-sm uppercase tracking-widest">
                  SHOT {currentShot + 1} of {settings.shotCount}
                </div>
                {isDemoCamera && (
                  <div className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-emerald-500/25 backdrop-blur-xl border border-emerald-400/30 text-emerald-300 font-extrabold text-[9px] md:text-[11px] uppercase tracking-widest animate-pulse flex items-center gap-1.5 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block shrink-0 animate-ping" />
                    <span>SIMULATED FEED</span>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {state === 'countdown' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 right-4 md:bottom-10 md:right-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-red-500/30 text-white font-bold text-[10px] md:text-xs tracking-wider uppercase"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                    <span>REC ● {countdown}s</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {state === 'capturing' && (
                <div className="absolute inset-0 bg-white z-50 animate-flash" />
              )}
            </div>

            {/* Collected Snapshots Previews & Controls Spacious Area Outside! */}
            <div className="mt-6 flex flex-col items-center gap-5 w-full max-w-xl shrink-0">
              {frames.length > 0 && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black italic text-slate-400">Captured Snaps ({frames.length} / {settings.shotCount})</span>
                  <div className="flex gap-2.5 p-3 bg-white border border-slate-100 rounded-[24px] shadow-lg justify-center flex-wrap max-w-md">
                    {frames.map((f, i) => (
                      <motion.div
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        key={i}
                        className="relative"
                      >
                        <img 
                          src={f.dataUrl} 
                          className="w-20 h-15 md:w-24 md:h-18 object-cover rounded-xl border-2 border-slate-50 shadow-md hover:scale-105 transition-transform" 
                        />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg border border-white">
                          {i + 1}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outside Action Controls */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold px-5 py-2.5 h-11 shadow-sm flex items-center gap-2 text-xs md:text-sm transition-all"
                >
                  <RefreshCw className={cn("w-4 h-4 text-blue-500 transition-transform duration-300", isMirrored && "rotate-180")} />
                  Mirror Cam
                </Button>

                <Button 
                  variant="ghost"
                  onClick={() => {
                    // Turn off camera tracks
                    if (videoRef.current && videoRef.current.srcObject) {
                      const stream = videoRef.current.srcObject as MediaStream;
                      stream.getTracks().forEach(track => track.stop());
                    }
                    setState('setup');
                  }}
                  className="rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent font-bold px-5 py-2.5 h-11 text-xs md:text-sm transition-all"
                >
                  Exit Session
                </Button>
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

      case 'preview': {
        let currentLayout = settings.layout;
        if (currentLayout === '1x4') currentLayout = '2x6_4';
        else if (currentLayout === '2x2') currentLayout = '4x6_6';
        const activeLayout = LAYOUT_CONFIGS.find(c => c.id === currentLayout) || LAYOUT_CONFIGS[1];

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
                  className="relative shadow-2xl transition-all duration-500 overflow-hidden shrink-0 border border-slate-200"
                  style={{ 
                    backgroundColor: settings.frameColor,
                    width: activeLayout.id.startsWith('2x6') ? '240px' : '420px',
                    aspectRatio: `${activeLayout.canvasWidth}/${activeLayout.canvasHeight}`
                  }}
                >
                  {finalImage ? (
                    <img 
                      src={finalImage} 
                      className="w-full h-full object-contain select-none pointer-events-none" 
                      alt="Compiled photostrip composite"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-xs animate-pulse">
                      Generating high-res print...
                    </div>
                  )}

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
                          fontSize: `${(activeLayout.id.startsWith('2x6') ? 36 : 64) * s.scale * (containerWidth / (activeLayout.id.startsWith('2x6') ? 240 : 420))}px`,
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

            {/* Editing Panel */}
            <div className="lg:col-span-5 flex flex-col gap-6 lg:overflow-y-auto pr-2 pb-10 lg:pb-0 shrink-0">
              {/* 01. STYLE */}
              <div className="bento-card p-4 md:p-6 space-y-4 shrink-0">
                <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400">01. STYLE</h3>
                <div className="space-y-4">
                  <Select 
                    value={settings.filter} 
                    onValueChange={(v: FilterType) => setSettings({ ...settings, filter: v })}
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
                        onClick={() => setSettings({ ...settings, frameColor: c.value, customBgImage: null })}
                        className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all hover:scale-110",
                          settings.frameColor === c.value && !settings.customBgImage ? "border-blue-500 ring-2 ring-offset-2 ring-blue-500/30 scale-110" : "border-slate-200"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 02. BRANDING */}
              <div className="bento-card p-4 md:p-6 space-y-4 shrink-0">
                <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400">02. BRANDING</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Branding Text</label>
                    <input
                      type="text"
                      value={settings.brandingText || ''}
                      onChange={(e) => setSettings({ ...settings, brandingText: e.target.value })}
                      placeholder="e.g. MEMORIES"
                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 hover:border-slate-200 focus:border-blue-500 focus:outline-none font-medium text-slate-800 tracking-wide transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Text Alignment Location</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['top', 'bottom', 'both', 'none'] as const).map((pos) => (
                        <Button
                          key={pos}
                          variant={settings.brandingPosition === pos ? "default" : "outline"}
                          onClick={() => setSettings({ ...settings, brandingPosition: pos })}
                          className={cn(
                            "h-10 text-[10px] font-black uppercase italic rounded-lg px-0",
                            settings.brandingPosition === pos ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-200 text-slate-600 bg-white"
                          )}
                        >
                          {pos}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 03. PHOTO EDGES */}
              <div className="bento-card p-4 md:p-6 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400">03. PHOTO EDGES</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!settings.roundedPhotos} 
                      onChange={(e) => setSettings({ ...settings, roundedPhotos: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {settings.roundedPhotos && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>CORNER ROUNDING RADIUS</span>
                      <span className="font-mono">{settings.photoCornerRadius ?? 24}PX</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="48"
                      value={settings.photoCornerRadius ?? 24}
                      onChange={(e) => setSettings({ ...settings, photoCornerRadius: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* 04. PREMIUM DESIGNS & OVERLAYS */}
              <div className="bento-card p-4 md:p-6 space-y-5 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-400">04. PRESET THEMES & OVERLAYS</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Choose a signature design style or upload your own PNG frame template.</p>
                </div>

                {/* Preset Themes List */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">AESTHETIC PRESET</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={(!settings.selectedPresetTemplate || settings.selectedPresetTemplate === 'none') ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'none' })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        (!settings.selectedPresetTemplate || settings.selectedPresetTemplate === 'none') ? "bg-slate-900 border-transparent text-white" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      🎨 SOLID CANVAS
                    </Button>
                    <Button
                      variant={settings.selectedPresetTemplate === 'retro-ticket' ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'retro-ticket', roundedPhotos: true })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        settings.selectedPresetTemplate === 'retro-ticket' ? "bg-red-950 border-transparent text-red-100 ring-2 ring-red-800" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      🎟️ RETRO TICKET
                    </Button>
                    <Button
                      variant={settings.selectedPresetTemplate === 'saycheese-receipt' ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'saycheese-receipt', roundedPhotos: false })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        settings.selectedPresetTemplate === 'saycheese-receipt' ? "bg-slate-700 border-transparent text-white ring-2 ring-slate-800" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      🧾 RECIBO/RECEIPT
                    </Button>
                    <Button
                      variant={settings.selectedPresetTemplate === 'spotify' ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'spotify', roundedPhotos: true, photoCornerRadius: 24 })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        settings.selectedPresetTemplate === 'spotify' ? "bg-green-950 border-transparent text-green-300 ring-2 ring-green-600" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      🎵 SPOTIFY SONG
                    </Button>
                    <Button
                      variant={settings.selectedPresetTemplate === 'wedding-blue' ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'wedding-blue', roundedPhotos: false, brandingText: 'Darrell & Taforey' })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        settings.selectedPresetTemplate === 'wedding-blue' ? "bg-blue-950 border-transparent text-amber-200 ring-2 ring-amber-500" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      💙 ROYAL GOLD
                    </Button>
                    <Button
                      variant={settings.selectedPresetTemplate === 'exclusive' ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, selectedPresetTemplate: 'exclusive', roundedPhotos: true, photoCornerRadius: 12 })}
                      className={cn(
                        "h-11 justify-start px-3 text-xs font-bold rounded-xl",
                        settings.selectedPresetTemplate === 'exclusive' ? "bg-stone-900 border-transparent text-white ring-2 ring-stone-800" : "border-slate-100 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      💎 EXCLUSIVE TALL
                    </Button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">UPLOAD USER DESIGN</label>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">PNG / JPG</span>
                  </div>

                  {settings.customBgImage ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                        <img 
                          src={settings.customBgImage} 
                          className="max-w-full max-h-full object-contain" 
                          alt="Custom template design override"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-all gap-1.5 p-2">
                          <p className="text-[10px] text-white font-black uppercase tracking-wider">Loaded Custom Design</p>
                          <Button 
                            onClick={() => setSettings({ ...settings, customBgImage: null })}
                            variant="destructive"
                            size="sm"
                            className="rounded-xl h-8 px-3 text-[10px] font-black uppercase"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> REMOVE
                          </Button>
                        </div>
                      </div>

                      {/* Photo Overlay vs Background Switch */}
                      <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">TEMPLATE LEVEL</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={settings.customBgMode !== 'overlay' ? "default" : "outline"}
                            onClick={() => setSettings({ ...settings, customBgMode: 'background' })}
                            className={cn(
                              "h-8 text-[10px] font-bold uppercase rounded-lg",
                              settings.customBgMode !== 'overlay' ? "bg-blue-600 text-white" : "border-slate-200 text-slate-500 bg-white"
                            )}
                          >
                            BACKGROUND LAYER
                          </Button>
                          <Button
                            variant={settings.customBgMode === 'overlay' ? "default" : "outline"}
                            onClick={() => setSettings({ ...settings, customBgMode: 'overlay' })}
                            className={cn(
                              "h-8 text-[10px] font-bold uppercase rounded-lg",
                              settings.customBgMode === 'overlay' ? "bg-blue-600 text-white" : "border-slate-200 text-slate-500 bg-white"
                            )}
                            title="Draws custom image on top of the photos - useful if your PNG has transparent window cutouts!"
                          >
                            OVERLAY WINDOWS
                          </Button>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-tight">Use <b>Overlay Windows</b> if your uploaded PNG has cutout transparent rectangles to frame the camera photos inside!</p>
                      </div>

                      <Button 
                        onClick={() => setSettings({ ...settings, customBgImage: null })}
                        variant="outline" 
                        className="w-full text-slate-500 border-slate-200 flex items-center justify-center h-10 text-xs font-bold rounded-xl"
                      >
                        Reset to Preset Colors
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-1">
                          <Plus className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-600">Click or Drag custom template image here</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-mono">Accepts transparent .PNG frame overlays</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                              // Automatically switch customBgMode to 'overlay' if png to assist users
                              const isPng = file.type === 'image/png';
                              setSettings({ 
                                ...settings, 
                                customBgImage: re.target?.result as string,
                                customBgMode: isPng ? 'overlay' : 'background',
                                selectedPresetTemplate: 'none' // Clear prebuilt preset to prefer uploaded custom layout
                              });
                              toast.success("Uploaded custom layout design frame successfully!");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
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
      }

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
