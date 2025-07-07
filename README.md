# GRE Vocabulary Builder

A beautiful, modern vocabulary learning app built with Next.js 14, Firebase, and Tailwind CSS.

## 🚀 Features

- **Firebase Authentication**: Secure email/password login and registration
- **Real-time Database**: Words sync instantly across devices using Firestore
- **Search & Filter**: Find words quickly with live search
- **CRUD Operations**: Add, view, and delete vocabulary words
- **Responsive Design**: Works perfectly on all devices
- **Beautiful UI**: Modern design with gradients and smooth animations

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Firebase Firestore + Firebase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## 🔧 Firebase Setup

This app is connected to Firebase project: `gre-vocab-app-3a201`

### Firestore Database Structure:
```
gre_words (collection)
├── {documentId}
    ├── word: string
    ├── definition: string
    ├── userId: string
    ├── createdAt: timestamp
```

### Security Rules:
Make sure your Firestore security rules allow users to read/write their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gre_words/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 🚀 Getting Started

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Run the development server:**
```bash
npm run dev
```

3. **Open [http://localhost:3000](http://localhost:3000)**

4. **Create an account or sign in**

## 📱 How to Use

1. **Register/Login**: Create a new account or sign in with existing credentials
2. **View Words**: See your vocabulary list on the home page with real-time updates
3. **Search**: Use the search bar to find specific words or definitions
4. **Add Words**: Click "Add Word" to add new vocabulary entries
5. **Delete Words**: Click the trash icon to remove words
6. **Real-time Sync**: Changes appear instantly across all your devices

## 🔐 Firebase Authentication

- Email/password authentication enabled
- Secure user sessions
- Protected routes (only authenticated users can access vocabulary features)

## 📊 Features

- **Real-time Updates**: Changes sync instantly using Firestore listeners
- **User Isolation**: Each user only sees their own words
- **Search Functionality**: Search through words and definitions
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful error handling for network issues

## 🚀 Deployment

The app is configured for deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically
4. Your Firebase config is already included

## 📁 Project Structure

```
├── app/
│   ├── login/          # Authentication page
│   ├── add/            # Add new word page
│   └── page.tsx        # Home page (word list)
├── components/
│   ├── ui/             # shadcn/ui components
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx # Firebase Auth context
├── lib/
│   ├── firebase.ts     # Firebase configuration
│   └── utils.ts        # Utility functions
```

## 🔒 Security

- Firestore security rules ensure users can only access their own data
- Authentication required for all vocabulary operations
- Secure Firebase configuration

## 📝 License

MIT License