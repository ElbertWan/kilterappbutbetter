#!/bin/bash
# Quick Start Script for Kilter Board Web App

set -e

echo "🧗 Kilter Board Web App - Quick Start"
echo "=================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo ""
echo "🔑 Setting up environment..."
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo "✅ Created .env.local (remember to add your credentials!)"
else
    echo "✅ .env.local already exists"
fi

# Build
echo ""
echo "🏗️  Building..."
npm run build

echo ""
echo "=================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your Kilter credentials:"
echo "   KILTER_USERNAME=your_username"
echo "   KILTER_PASSWORD=your_password"
echo ""
echo "2. Run dev server:"
echo "   npm run dev"
echo ""
echo "3. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "4. To deploy to Netlify:"
echo "   - Push to GitHub"
echo "   - Connect repo to Netlify"
echo "   - Add env vars in Netlify dashboard"
echo "   - Done! 🚀"
