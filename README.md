# TrendFuel Backend API

Backend API for TrendFuel marketplace platform.

## Features

- 🔐 JWT Authentication + Google OAuth
- 💳 Payments & Escrow Management
- 🏪 Seller Profiles & Services
- 📦 Order Management
- ⭐ Reviews & Ratings
- 🔄 Referral System
- 💬 Notifications
- 🧑‍⚖️ Dispute Resolution
- 📊 Admin Dashboard

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + Passport.js
- **File Storage**: Cloudinary
- **Email**: Resend
- **Logging**: Winston
- **Validation**: Zod
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## Project Structure

```
src/
├── config/          # Configuration files (env, db, passport, etc.)
├── modules/         # Domain-driven modules
│   ├── domain/      # Core domains (auth, user)
│   ├── sellers/     # Seller management
│   ├── services/    # Service listings
│   ├── orders/      # Order management
│   ├── payments/    # Payment processing
│   ├── escrow/      # Escrow system
│   ├── disputes/    # Dispute resolution
│   ├── reviews/     # Reviews & ratings
│   ├── notifications/ # Notifications
│   └── referrals/   # Referral system
├── admin/           # Admin routes & controllers
├── queues/          # Background job queues
├── middlewares/     # Express middlewares
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── tests/           # Test files
└── index.ts         # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### Installation

\`\`\`bash
npm install
\`\`\`

### Environment Setup

\`\`\`bash
cp .env.example .env

# Edit .env with your configuration

\`\`\`

### Running the Application

**Development:**
\`\`\`bash
npm run dev
\`\`\`

**Production:**
\`\`\`bash
npm run build
npm start
\`\`\`

## API Documentation

Swagger documentation available at `/api-docs` after starting the server.

## Testing

\`\`\`bash

# Run all tests

npm test

# Watch mode

npm run test:watch

# Unit tests only

npm run test:unit

# Debug mode

npm run test:debug
\`\`\`

## Linting & Formatting

\`\`\`bash

# Lint code

npm run lint

# Fix linting issues

npm run lint:fix

# Format code

npm run format
\`\`\`

## Deployment

Docker image can be built using the provided Dockerfile.

\`\`\`bash
docker build -t trendfuel-api .
docker run -p 5000:5000 trendfuel-api
\`\`\`

## License

ISC
