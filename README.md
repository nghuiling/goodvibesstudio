# Website Gallery

A web application that allows users to create and share a collection of websites. Users can submit website URLs, categorize them with tags, and browse through the gallery of submitted websites.

## Features

- Public gallery of website thumbnails
- Tag-based filtering
- Google authentication for uploading
- Responsive design
- Beautiful UI with animations
- Delete functionality for own submissions

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore)
- URLBox API (for website thumbnails)
- Framer Motion (for animations)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication with Google provider
   - Create a Firestore database
   - Get your Firebase configuration

4. Sign up for URLBox:
   - Go to [URLBox](https://urlbox.io)
   - Create an account
   - Get your API key and secret

5. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

   NEXT_PUBLIC_URLBOX_API_KEY=your_urlbox_api_key
   NEXT_PUBLIC_URLBOX_SECRET=your_urlbox_secret
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main page component
│   ├── layout.tsx         # Root layout
│   └── api/              # API routes
├── components/
│   ├── WebsiteGallery.tsx # Gallery component
│   └── UploadWebsite.tsx  # Upload form component
└── lib/
    ├── firebase/         # Firebase configuration and utilities
    ├── hooks/            # Custom hooks
    ├── contexts/         # React contexts
    └── types.ts          # TypeScript types
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.