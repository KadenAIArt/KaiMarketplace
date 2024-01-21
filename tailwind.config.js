
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    darkMode: 'class', // or 'media' or 'class'
    daisyui: {
        themes: [
            {
                light: {

                    "primary": "#4800F9",

                    "secondary": "#DE00EC",

                    "accent": "#DE00EC",

                    "neutral": "#696974",

                    "base-100": "#ffffff",

                    "info": "#3abff8",

                    "success": "#36d399",

                    "warning": "#fbbd23",

                    "error": "#f87272",

                    "lighter": '#E2DDDC',
                    "dark": '#202020',
                    "foreground": '#F4F4F4',
                    "light_foreground": '#F4F4F4',
                },
                dark: {

                    "primary": "#4800F9",

                    "secondary": "#DE00EC",

                    "accent": "#DE00EC",

                    "neutral": "#696974",

                    "base-100": "#13131A",

                    "info": "#3abff8",

                    "success": "#36d399",

                    "warning": "#fbbd23",

                    "error": "#f87272",

                    "lighter": '#FAFAFB',
                    "dark": '#13131A',
                    "foreground": '#1C1C24',
                    "light_foreground": '#F4F4F4',
                },
            },
        ],
    },
    theme: {
        extend: {

            colors: {
                transparent: 'transparent',
                current: 'currentColor',
                primary: '#4800F9',
                secondary: '#DE00EC',
                accent: '#9500F3',
                neutral: '#696974',
                base: {
                    base: "#FFFFFF",
                    50: "#F4F4F6",
                    100: "#E7E8EC",
                    200: "#C4C5CF",
                    300: "#A1A2B3",
                    400: "#7D7F96",
                    500: "#5A5D79",
                    600: "#363A5D",
                    700: "#1d1340",
                    800: "#101436",
                    900: "#0D102D",
                },
                info: '#3abff8',
                success: '#36d399',
                warning: '#fbbd23',
                error: '#f87272',
                light: '#F4F4F4',
                dark: '#13131A',
                foreground: '#1C1C24',
                light_foreground: '#F4F4F4',
                light_grey: '#B5B5BE',

            },
            textColor: {
                test: '#ef4444',
            },
            transitionDuration: {
                240: '240ms',
            },
            animation: {
                'infinite-scroll': 'infinite-scroll 6s linear infinite',
                'text-slide': 'text-slide 12.5s cubic-bezier(0.83, 0, 0.17, 1) infinite',
                'marquee': "marquee var(--duration, 30s) linear infinite",
            },
            keyframes: {
                'marquee': {
                    to: { transform: "translateX(-50%)" },
                },
                'infinite-scroll': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-100%)' },
                },
                'text-slide': {
                    '0%, 16%': {
                        transform: 'translateY(-1%)',
                    },
                    '20%, 36%': {
                        transform: 'translateY(-21%)',
                    },
                    '40%, 56%': {
                        transform: 'translateY(-41%)',
                    },
                    '60%, 76%': {
                        transform: 'translateY(-61%)',
                    },
                    '80%, 96%': {
                        transform: 'translateY(-81%)',
                    },
                    '100%': {
                        transform: 'translateY(-101%)',
                    },
                },
            }
        },
    },
    plugins: [require("daisyui")],
}
