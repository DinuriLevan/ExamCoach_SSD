/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    900: '#09637E', // Darkest
                    700: '#088395', // Primary
                    300: '#7AB2B2', // Light/Accent
                    50: '#EBF4F6',  // Background
                },
                primary: '#4a90e2',
                secondary: '#f5f6fa',
                textDark: '#2c3e50',
                error: '#e74c3c',
                success: '#2ecc71',
            },
        },
    },
    plugins: [],
}
