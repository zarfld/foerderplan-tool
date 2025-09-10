# Förderplan Tool

A Progressive Web App (PWA) for teachers to digitally record and compare student progress. Built with SvelteKit, JSONForms, and PouchDB for offline-first functionality.

## 🚀 Features

- **📱 Progressive Web App**: Installable and works offline
- **📝 Dynamic Forms**: JSON Schema-driven forms using JSONForms
- **💾 Offline-First**: Local storage with PouchDB, syncs with CouchDB
- **📄 Export Options**: Save as JSON or export to PDF
- **🎯 Demo Mode**: Example data showcase at `/demo`
- **🔄 Data Sync**: Synchronize with CouchDB server (Synology compatible)
- **📱 Responsive**: Works on desktop, tablet, and mobile devices

## 🛠️ Technology Stack

- **Frontend**: SvelteKit + TypeScript
- **Forms**: JSONForms with Vanilla Renderers
- **Database**: PouchDB (local) + CouchDB (remote sync)
- **PDF Export**: jsPDF
- **PWA**: @vite-pwa/sveltekit
- **Build Tool**: Vite
- **CI/CD**: GitHub Actions

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd foerderplan-tool

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser at http://localhost:5173
```

## 🎯 Available Scripts

| Command                    | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run dev`              | Start development server                           |
| `npm run dev:network`      | Start dev server accessible from network (Android) |
| `npm run build`            | Build for production                               |
| `npm run build:pwa`        | Build PWA with validation (Windows)                |
| `npm run preview`          | Preview production build                           |
| `npm run preview:network`  | Preview build accessible from network              |
| `npm run test`             | Run all tests                                      |
| `npm run test:unit`        | Run unit tests                                     |
| `npm run test:integration` | Run Playwright integration tests                   |
| `npm run test:pwa`         | Run PWA-specific tests                             |
| `npm run test:android`     | Run mobile/Android tests                           |
| `npm run check`            | Type checking                                      |
| `npm run lint`             | Run linter                                         |
| `npm run format`           | Format code                                        |

## 📱 PWA Deployment

### Windows 10 as Web Server for Android Devices

This setup allows your Windows 10 machine to serve the PWA to Android devices on the same network:

1. **Development Mode** (with hot reload):

   ```bash
   npm run dev:network
   ```

   Access from Android: `http://[YOUR-PC-IP]:5173`

2. **Production Preview**:

   ```bash
   npm run build
   npm run preview:network
   ```

   Access from Android: `http://[YOUR-PC-IP]:4173`

3. **Build PWA with Validation**:
   ```bash
   npm run build:pwa
   ```
   This validates PWA requirements and shows network access info.

### GitHub Pages Deployment (CI/CD)

The app automatically deploys to GitHub Pages when pushing to main branch:

1. **Push to main branch**:

   ```bash
   git push origin main
   ```

2. **GitHub Actions** will:
   - Run tests (unit + integration)
   - Build PWA
   - Validate PWA manifest and icons
   - Deploy to GitHub Pages
   - Run Android PWA tests

3. **Access deployed app**:
   - URL: `https://[username].github.io/foerderplan-tool`
   - Installable as PWA on Android devices

### Android Installation

1. **Open in Chrome** on Android device
2. **Tap "Add to Home screen"** when prompted
3. **App will install** like a native app
4. **Works offline** after first load

### PWA Features Tested

- ✅ Offline functionality
- ✅ App installation
- ✅ Service worker registration
- ✅ Responsive design
- ✅ Push notifications (future)
- ✅ Background sync (future)
  | `npm run build` | Build for production |
  | `npm run preview` | Preview production build |
  | `npm run lint` | Run ESLint |
  | `npm run format` | Format code with Prettier |
  | `npm run check` | Run Svelte type checking |
  | `npm run test:unit` | Run unit tests |
  | `npm run test:integration` | Run integration tests |

## 📁 Project Structure

```
/foerderplan-tool
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main form view
│   │   └── demo/
│   │       └── +page.svelte      # Demo page with example data
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── foerderplan.schema.json    # JSON Schema
│   │   │   ├── foerderplan.uischema.json  # UI Schema
│   │   │   └── foerderplan.example.json   # Example data
│   │   └── utils/
│   │       ├── database.ts        # PouchDB operations
│   │       └── dataExport.ts      # Export functionality
│   ├── app.html                   # HTML template
│   └── app.d.ts                   # Type definitions
├── static/                        # Static assets
├── .github/
│   ├── workflows/ci.yml           # GitHub Actions
│   └── copilot-instructions.md    # Copilot guidelines
├── package.json
├── svelte.config.js
├── vite.config.js
└── README.md
```

## 🎨 Usage

### Main Application

1. Navigate to the root URL
2. Fill out the student information form
3. Add subject assessments, behavioral notes, and goals
4. Data is automatically saved locally
5. Export as JSON or PDF when complete

### Demo Mode

1. Visit `/demo` to see the form with example data
2. Explore all form sections and functionality
3. Test export features with sample data

### Data Storage

- **Local**: Data is stored locally using PouchDB (IndexedDB)
- **Sync**: Configure CouchDB URL for remote synchronization
- **Offline**: Full functionality available without internet connection

## 🔧 Configuration

### PWA Settings

PWA manifest and service worker are configured in `vite.config.js`. The app can be installed on mobile devices and desktop browsers.

### Database Sync

To enable CouchDB synchronization:

1. Set up a CouchDB server (e.g., on Synology NAS)
2. Configure the sync URL in the database utility functions
3. Ensure CORS is properly configured on the CouchDB server

### JSON Schema Customization

Edit the schema files in `/src/lib/schema/` to customize:

- **foerderplan.schema.json**: Data structure and validation
- **foerderplan.uischema.json**: Form layout and UI elements
- **foerderplan.example.json**: Demo data

## 🚀 Deployment

### GitHub Pages (Automated)

The project includes GitHub Actions workflow for automatic deployment:

1. Push to `main` branch
2. GitHub Actions builds and deploys to GitHub Pages
3. Access your app at `https://yourusername.github.io/foerderplan-tool`

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy the 'build' folder to your web server
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## 📱 PWA Installation

Users can install the app:

1. **Desktop**: Click the install icon in the browser address bar
2. **Mobile**: Use "Add to Home Screen" from the browser menu
3. **Features**: Works offline, appears in app drawer, full-screen mode

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**Build Errors**

- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm install`
- Check TypeScript configuration

**PWA Not Installing**

- Verify HTTPS deployment (required for PWA)
- Check manifest.json is accessible
- Ensure service worker is properly registered

**Database Sync Issues**

- Verify CouchDB server is accessible
- Check CORS configuration
- Ensure proper authentication if required

## 📞 Support

For issues and questions:

1. Check existing GitHub Issues
2. Create a new issue with detailed description
3. Include browser/device information for bugs

---

Made with ❤️ for educators using SvelteKit and modern web technologies.
