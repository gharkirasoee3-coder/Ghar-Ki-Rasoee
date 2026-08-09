/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#CB202D", // Zomato Red
          hover: "#A81A25",
        },
        secondary: "#0095f6", // bright blue
        background: "#FFFFFF",
        surface: "#F8F8F8",
        text: {
          primary: "#1C1C1C",
          secondary: "#696969",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        card: "16px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg) translateY(0)" },
          "50%": { transform: "rotate(3deg) translateY(-15px)" },
        },
        bounceX: {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(5px)" },
        }
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out forwards",
        blob: "blob 7s infinite",
        wiggle: "wiggle 3s ease-in-out infinite",
        "bounce-x": "bounceX 1s infinite",
      },
    },
  },
  plugins: [],
};
