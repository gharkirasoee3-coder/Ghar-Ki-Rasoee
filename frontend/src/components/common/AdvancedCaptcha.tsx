import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface AdvancedCaptchaProps {
  onVerify: (isValid: boolean) => void;
}

const AdvancedCaptcha: React.FC<AdvancedCaptchaProps> = ({ onVerify }) => {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showError, setShowError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate random 6-character alphanumeric code
  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Only uppercase alphanumeric characters to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Draw captcha on HTML5 Canvas
  const drawCaptcha = (code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#f3f4f6');
    grad.addColorStop(1, '#e5e7eb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background noise dots
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.25)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw background noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200}, 0.45)`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw distorted text characters
    ctx.textBaseline = 'middle';
    const fonts = ['Georgia', 'Arial', 'Courier New', 'Verdana', 'Times New Roman'];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const fontSize = Math.floor(Math.random() * 10) + 26; // Font size between 26 and 36
      ctx.font = `bold ${fontSize}px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
      ctx.fillStyle = `rgb(${Math.random() * 120}, ${Math.random() * 120}, ${Math.random() * 120})`;

      const x = 20 + i * 26;
      const y = canvas.height / 2 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 40 - 20) * Math.PI / 180; // Angle between -20 and +20 degrees

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  const handleRefresh = () => {
    const newCode = generateCode();
    setCaptchaCode(newCode);
    setUserInput('');
    setIsVerified(false);
    setShowError(false);
    onVerify(false);
    drawCaptcha(newCode);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    setShowError(false);

    // Case-insensitive verification
    if (value.toLowerCase() === captchaCode.toLowerCase()) {
      setIsVerified(true);
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  const handleBlur = () => {
    if (userInput && userInput.toLowerCase() !== captchaCode.toLowerCase()) {
      setShowError(true);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="border border-gray-200 rounded-md p-3.5 bg-white shadow-sm space-y-3 w-full max-w-[340px] mx-auto transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="relative border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={180}
            height={50}
            className="block"
            title="CAPTCHA Image"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 hover:text-primary transition-all duration-200 text-gray-600 focus:outline-none"
            title="Get new code"
          >
            <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Enter CAPTCHA Code"
          value={userInput}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={isVerified}
          maxLength={6}
          className={`w-full p-2 border rounded-md text-sm font-medium tracking-wide transition-all duration-300 focus:outline-none ${
            isVerified
              ? 'border-emerald-500 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-500 pr-10'
              : showError
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500 pr-10'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
        />
        {isVerified && (
          <span className="absolute right-3 top-2.5 text-emerald-600 animate-fadeIn">
            ✓ Verified
          </span>
        )}
        {!isVerified && showError && (
          <span className="absolute right-3 top-2.5 text-red-500 text-xs font-semibold animate-shake">
            Incorrect Code
          </span>
        )}
      </div>
      <p className="text-[10px] text-gray-400 text-center font-normal">
        Enter the distorted characters shown above to verify you are a human.
      </p>
    </div>
  );
};

export default AdvancedCaptcha;
