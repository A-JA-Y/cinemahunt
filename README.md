# CinemaHunt 🎬

**Discover your next favorite movie with AI-powered recommendations and personalized mood-based suggestions.**

CinemaHunt is a modern, full-stack web application that revolutionizes movie discovery through intelligent recommendations, comprehensive search capabilities, and personalized user experiences. Built with cutting-edge technologies, it combines the power of AI with real-time movie data to help users find the perfect film for any mood or occasion.

## ✨ Features

### 🔍 **Smart Movie Search**
- **Comprehensive Search**: Search through an extensive movie database powered by OMDB API
- **Rich Movie Details**: View detailed information including posters, ratings, cast, plot summaries, and more
- **Real-time Results**: Instant search results with responsive, mobile-optimized interface
- **Visual Discovery**: Beautiful movie poster grid with hover effects and intuitive navigation

### 🤖 **AI-Powered Mood Recommendations**
- **Mood-Based Suggestions**: Get personalized movie recommendations based on your current mood
- **Google AI Integration**: Leverages Google's Generative AI for intelligent content curation
- **Dynamic Mood Selection**: Choose from various moods - Happy, Sad, Adventurous, Romantic, Scared
- **Instant AI Analysis**: Real-time processing and curated recommendations

### 👤 **User Authentication & Personalization**
- **Secure Authentication**: Firebase Auth integration with email/password signup and login
- **Personal Movie Library**: Save and manage your favorite movies
- **Like System**: Heart movies you love and build your personal collection
- **User Dashboard**: Access your liked movies and personalized recommendations

### 📱 **Modern User Experience**
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile devices
- **Dark Theme**: Elegant dark interface optimized for movie browsing
- **Smooth Animations**: Polished interactions with hover effects and transitions
- **Accessibility**: Built with web accessibility standards in mind

## 🛠️ Tech Stack

### **Frontend**
- **[Next.js 15.5.2](https://nextjs.org/)** - React framework with App Router
- **[React 19.1.0](https://reactjs.org/)** - UI library with latest features
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[PostCSS](https://postcss.org/)** - CSS processing and optimization

### **Backend & APIs**
- **[Firebase Auth](https://firebase.google.com/products/auth)** - User authentication and management
- **[Firebase Firestore](https://firebase.google.com/products/firestore)** - NoSQL document database
- **[OMDB API](https://www.omdbapi.com/)** - Comprehensive movie database
- **[Google Generative AI](https://ai.google.dev/)** - AI-powered content recommendations

### **Development & Build Tools**
- **[Turbopack](https://turbo.build/pack)** - Fast bundler for development and production
- **[ESLint](https://eslint.org/)** - Code linting and quality assurance
- **[Geist Font](https://vercel.com/font)** - Modern typography optimized for screens

## 📋 Prerequisites

Before setting up CinemaHunt, ensure you have the following:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Firebase account** for authentication and database
- **OMDB API key** for movie data
- **Google AI API key** for mood-based recommendations

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/A-JA-Y/cinemahunt.git
cd cinemahunt
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# OMDB API Configuration
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_api_key_here

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Firebase Configuration (if using environment variables)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** with Email/Password provider
3. Create a **Firestore Database**
4. Update the Firebase configuration in `app/FireBase.js` with your project credentials

### 5. API Keys Setup

#### OMDB API Key:
1. Visit [OMDB API](https://www.omdbapi.com/apikey.aspx)
2. Sign up for a free API key
3. Add the key to your `.env.local` file

#### Google AI API Key:
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Create a new API key
3. Add the key to your `.env.local` file

## 💻 Development

### Start the Development Server
```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## 📖 Usage

### 🎯 **Getting Started**
1. **Visit the Homepage**: Access CinemaHunt and choose to browse movies or get mood-based recommendations
2. **Mood Selection**: Select your current mood for AI-powered movie suggestions
3. **Create Account**: Sign up to save favorite movies and get personalized recommendations

### 🔍 **Search Movies**
1. Use the search bar to find movies by title
2. Browse through visual results with movie posters
3. Click on any movie to view detailed information
4. Like movies to save them to your personal collection (requires login)

### ❤️ **Personal Collections**
1. Log in to your account
2. Like movies to add them to your collection
3. Visit "My Liked Movies" to view your saved films
4. Get personalized recommendations based on your preferences

### 🎭 **Mood-Based Recommendations**
1. Select your current mood from the dropdown
2. Click "Get Suggestion" for AI-powered recommendations
3. Discover movies perfectly matched to your current state of mind

## 📁 Project Structure

```
cinemahunt/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes
│   │   ├── mood/                 # Mood-based recommendation API
│   │   └── vibe/                 # Additional recommendation API
│   ├── components/               # Reusable React components
│   │   ├── Auth.js               # Authentication component
│   │   └── MovieSearch.js        # Movie search and display component
│   ├── movie/[id]/              # Dynamic movie detail pages
│   ├── recomendations/          # User's liked movies page
│   ├── FireBase.js              # Firebase configuration
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout component
│   └── page.js                  # Homepage component
├── public/                      # Static assets
├── .env.local                   # Environment variables (not in repo)
├── eslint.config.mjs           # ESLint configuration
├── jsconfig.json               # JavaScript configuration
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies and scripts
├── postcss.config.mjs          # PostCSS configuration
└── README.md                   # Project documentation
```

## 🔧 API Integration

### Firebase Services
- **Authentication**: User signup, login, and session management
- **Firestore**: Storing user preferences and liked movies
- **Security Rules**: Configured for user data protection

### External APIs
- **OMDB API**: Movie search, details, and metadata
- **Google Generative AI**: Mood analysis and movie recommendations

## 🎨 Design Philosophy

CinemaHunt follows modern web design principles:

- **Dark Theme**: Optimized for extended browsing sessions
- **Mobile-First**: Responsive design for all devices
- **Accessibility**: WCAG guidelines compliance
- **Performance**: Optimized loading and smooth interactions
- **User-Centric**: Intuitive navigation and clear call-to-actions

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically with each push

### Other Platforms
- **Netlify**: Full Next.js support with serverless functions
- **Railway**: Easy deployment with database integration
- **DigitalOcean App Platform**: Scalable hosting solution

## 🤝 Contributing

We welcome contributions to make CinemaHunt even better!

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request with detailed description

### Contribution Guidelines
- Follow the existing code style and conventions
- Add appropriate tests for new features
- Update documentation as needed
- Ensure all tests pass and linting is clean

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[OMDB API](https://www.omdbapi.com/)** for comprehensive movie data
- **[Firebase](https://firebase.google.com/)** for backend services
- **[Google AI](https://ai.google.dev/)** for intelligent recommendations
- **[Next.js Team](https://nextjs.org/)** for the amazing framework
- **[Tailwind CSS](https://tailwindcss.com/)** for utility-first styling

## 📞 Support

If you encounter any issues or have questions:

1. Check the existing [Issues](https://github.com/A-JA-Y/cinemahunt/issues)
2. Create a new issue with detailed information
3. Join our community discussions

---

**Built with ❤️ by [A-JA-Y](https://github.com/A-JA-Y)**

*CinemaHunt - Where every mood finds its perfect movie* 🎬✨
