/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'whatsapp': {
                    'primary': '#25d366',
                    'secondary': '#128c7e',
                    'dark': '#075e54',
                }
            }
        },
    },
    plugins: [],
}
