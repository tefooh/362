// Project 362 — your days on screen, reported like news
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: "#E7DFD0",
        surface: "#FFFFFF",
        "tan-soft": "#E9E1D2",
        tan: "#DDD3C0",
        charcoal: "#171512",
        ink: "#6F6A61",
        orange: "#E35E2B",
        yellow: "#EEEB86",
      },
      borderWidth: {
        hairline: "1.25px",
      },
      borderRadius: {
        frame: "38px",
        "frame-sm": "28px",
        card: "22px",
        inset: "16px",
      },
      maxWidth: {
        content: "1110px",
      },
      letterSpacing: {
        eyebrow: "0.14em",
        display: "-0.025em",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
