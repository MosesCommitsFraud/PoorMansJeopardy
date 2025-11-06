# Poor Man's Jeopardy

[![Deployment](https://img.shields.io/badge/deployed-vercel-black?style=for-the-badge&logo=vercel)](https://poor-mans-jeopardy.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Issues](https://img.shields.io/github/issues/MosesCommitsFraud/PoorMansJeopardy?style=for-the-badge)](https://github.com/MosesCommitsFraud/PoorMansJeopardy/issues)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?style=for-the-badge)](https://github.com/MosesCommitsFraud/PoorMansJeopardy/pulls)

A web-based multiplayer Jeopardy game with host and player views, real-time gameplay, and access to 200,000+ real Jeopardy questions.

**Play Now:** [poor-mans-jeopardy.vercel.app](https://poor-mans-jeopardy.vercel.app)

---

## Features

### Core Gameplay
- **Lobby System**: 4-character room codes with optional password protection
- **Host Controls**: Full game management including question selection, buzzer control, and score adjustments
- **Player View**: Clean interface with buzzer button and live game board updates
- **Real-time Updates**: Efficient polling system for synchronized game state
- **Score Tracking**: Automatic score calculation with manual adjustment options
- **Timer System**: Configurable countdown timer with visual indicators
- **Win Tracking**: Persistent win counts across multiple games in the same lobby

### Content Management
- **Custom Questions**: Create and edit your own trivia questions
- **Template System**: Save and reuse game configurations
- **Dataset Integration**: Access to 200,000+ real Jeopardy questions from the included CSV dataset
- **Category Browser**: Search and filter through thousands of available categories
- **Media Support**: Add images and GIFs to questions and answers via URL or Tenor integration

### Quality of Life
- **Sound Effects**: Buzzer audio feedback (toggleable)
- **Background Animation**: Customizable dither effect (toggleable)
- **Responsive Design**: Works on desktop and mobile devices
- **Frosted Glass UI**: Modern, translucent interface design
- **Local Storage**: Templates and settings persist across sessions

---

## Technology Stack

![Tech Stack](https://skillicons.dev/icons?i=nextjs,react,typescript,tailwind,vercel)

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS v4
- **Database**: Vercel KV (with in-memory fallback for local development)
- **APIs**: Tenor GIF API (optional)
- **Graphics**: Three.js for background effects

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/MosesCommitsFraud/PoorMansJeopardy.git
cd PoorMansJeopardy

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```env
# Optional: Tenor API key for GIF search
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_api_key_here

# Optional: Vercel KV (auto-configured on Vercel)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

**Tenor API Key** (optional): Enables GIF search functionality
1. Create a free account at [Tenor Developer Portal](https://developers.google.com/tenor/guides/quickstart)
2. Obtain an API key
3. Add to `.env.local`

Without the Tenor API key, you can still paste image URLs directly.

---

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MosesCommitsFraud/PoorMansJeopardy)

1. Click the button above or fork the repository
2. Import into [Vercel](https://vercel.com)
3. Add `NEXT_PUBLIC_TENOR_API_KEY` environment variable (optional)
4. Deploy - Vercel KV will be automatically provisioned

---

## Project Structure

```
├── app/
│   ├── api/                 # API routes (lobbies, questions)
│   ├── host/               # Host view pages
│   ├── lobby/              # Lobby management
│   └── player/             # Player view
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── category-browser.tsx
│   ├── gif-picker.tsx
│   └── EndGameScreen.tsx
├── contexts/               # React contexts (settings)
├── lib/
│   ├── kv-store.ts         # Storage abstraction
│   ├── questions-loader.ts # Dataset integration
│   ├── tenor-api.ts        # Tenor API wrapper
│   └── template-storage.ts # Template management
├── types/                  # TypeScript definitions
└── assets/
    └── files/              # 200k+ Jeopardy questions CSV
```

---

## Contributing

Contributions are welcome! Please check out the [contribution guidelines](https://github.com/MosesCommitsFraud/PoorMansJeopardy/blob/main/CONTRIBUTING.md).

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Test changes locally before submitting
- Update documentation as needed
- Keep commits focused and descriptive

---

## Issues & Support

Found a bug or have a feature request?

- Check existing issues: [GitHub Issues](https://github.com/MosesCommitsFraud/PoorMansJeopardy/issues)
- Open a new issue with detailed information
- Include steps to reproduce for bugs
- Provide context for feature requests

---

## License

This project is provided as-is for educational and personal use. The included Jeopardy questions dataset is sourced from publicly available data.

---

## Acknowledgments

- Question dataset sourced from historical Jeopardy game data
- GIF integration powered by [Tenor API](https://tenor.com/gifapi)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Background effects using [Three.js](https://threejs.org/)

---

<div align="center">

**[Report Bug](https://github.com/MosesCommitsFraud/PoorMansJeopardy/issues)** · **[Request Feature](https://github.com/MosesCommitsFraud/PoorMansJeopardy/issues)** · **[Documentation](https://github.com/MosesCommitsFraud/PoorMansJeopardy/wiki)**

Made with ❤️ by [MosesCommitsFraud](https://github.com/MosesCommitsFraud)

</div>
