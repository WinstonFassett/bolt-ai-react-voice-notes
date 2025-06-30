#!/bin/bash

# Update dependencies for modern UI components and design system
npm install @headlessui/react@latest
npm install @heroicons/react@latest
npm install framer-motion@latest
npm install react-hot-toast@latest
npm install @radix-ui/react-dialog@latest
npm install @radix-ui/react-dropdown-menu@latest
npm install @radix-ui/react-switch@latest
npm install @radix-ui/react-slider@latest
npm install clsx@latest
npm install tailwind-merge@latest

# Update existing dependencies
npm update react react-dom
npm update @vitejs/plugin-react
npm update tailwindcss autoprefixer postcss
npm update typescript

echo "Dependencies updated successfully!"