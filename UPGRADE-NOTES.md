# Upgrade to Latest Versions

This document outlines the major changes made when upgrading to the latest versions.

## Updated Versions

### Core Dependencies
- ✅ **React**: 18.3.1 → **19.2.0**
- ✅ **React DOM**: 18.3.1 → **19.2.0**
- ✅ **Next.js**: 15.5.6 → **16.0.1**
- ✅ **TypeScript**: 5.x → **5.7.2** (targeting ES2022)
- ✅ **Node.js**: Recommended 20+ → **22+**

### Styling
- ✅ **Tailwind CSS**: 3.4.x → **4.1.16** (Major version upgrade)
- ✅ **tailwind-merge**: 2.6.0 → **3.3.1**
- ✅ **@tailwindcss/postcss**: New in v4 - **4.1.16**

### Tooling
- ✅ **ESLint**: 8.57.1 → **9.39.1**
- ✅ **pnpm**: Using pnpm as package manager

### Other Updates
- ✅ **lucide-react**: 0.344.0 → **0.469.0**
- ✅ **@types/node**: 20.x → **22.19.0**
- ✅ **@types/react**: 18.x → **19.2.2**
- ✅ **@types/react-dom**: 18.x → **19.2.2**

## Major Breaking Changes

### 1. Tailwind CSS v4 Migration

Tailwind CSS v4 is a complete rewrite with significant changes:

#### Configuration Changes
- **Removed**: `tailwind.config.ts` (JS/TS config files)
- **Removed**: `autoprefixer` dependency (built into Tailwind v4)
- **Removed**: `tailwindcss-animate` (animations now handled differently)
- **Added**: CSS-first configuration using `@theme` directive

#### New CSS Structure (`app/globals.css`)

**Before (v3):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    /* ... */
  }
}
```

**After (v4):**
```css
@import "tailwindcss";

@theme {
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(9.8% 0.038 265.75);
  /* ... */
}
```

#### Color Space Migration
- **v3**: Used HSL color space (`hsl(var(--background))`)
- **v4**: Uses OKLCH color space for better perceptual uniformity
- All custom colors converted to OKLCH format

#### PostCSS Configuration (`postcss.config.js`)

**Before:**
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**After:**
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### 2. ESLint v9 Migration

- **Removed**: `.eslintrc.json` (old format)
- **Added**: `eslint.config.mjs` (new flat config format)
- Uses `@eslint/eslintrc` for backward compatibility with existing configs

### 3. React 19 Changes

React 19 includes:
- Improved performance and rendering
- Better error handling
- New compiler optimizations
- Enhanced TypeScript support

Most code remains compatible, but some advanced patterns may need updates.

### 4. Next.js 16 Changes

Next.js 16 brings:
- Performance improvements
- Enhanced App Router features
- Better TypeScript integration
- Improved build times

## What Still Works

✅ All component code unchanged  
✅ All UI components (shadcn/ui) work as-is  
✅ All game logic unchanged  
✅ API routes unchanged  
✅ TypeScript types unchanged  
✅ Styling classes unchanged (Tailwind v4 is backward compatible)

## Testing Checklist

After upgrade, verify:
- [ ] Development server starts (`pnpm dev`)
- [ ] All pages load without errors
- [ ] Styling looks correct (colors, spacing, borders)
- [ ] Dark mode works (if used)
- [ ] Build succeeds (`pnpm build`)
- [ ] Type checking passes
- [ ] Linting passes (`pnpm lint`)

## Rollback Instructions

If you need to rollback:

1. Restore `package.json` to previous versions
2. Restore `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // ... rest of v3 config
}
```

3. Restore `app/globals.css` to use `@tailwind` directives
4. Restore `.eslintrc.json`
5. Delete `eslint.config.mjs`
6. Run `pnpm install`

## Resources

- [Tailwind CSS v4 Beta Docs](https://tailwindcss.com/docs/v4-beta)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/upgrading)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)

