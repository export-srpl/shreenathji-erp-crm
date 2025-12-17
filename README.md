# Shreenathji ERP+CRM System

This is a comprehensive ERP and CRM application for Shreenathji Rasayan Pvt. Ltd., built with Next.js, Firebase, and Google's Genkit. It provides a suite of tools for managing sales, customers, inventory, quality control, and more.

## Features

- **Sales Pipeline:** Manage leads and deals through a visual Kanban board.
- **Customer & Product Management:** Maintain a centralized database of customers and products.
- **Sales Document Flow:** Create and manage Quotes, Proforma Invoices, Sales Orders, and Invoices.
- **AI-Powered COA Generator:** Automatically generate Certificates of Analysis using Genkit.
- **Role-Based Access Control:** Manage user roles and permissions for different modules.
- **Real-time Data:** Built on Firestore for live data synchronization.
- **Responsive Design:** A modern UI built with ShadCN and Tailwind CSS that works on desktop and mobile.

---

## Project Setup

Follow these steps to set up and run the project locally.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- `npm` (comes with Node.js)
- A Google account to create a Firebase project.

### 2. Firebase Project Setup

This application is tightly integrated with Firebase for its backend services.

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click **"Add project"** and follow the on-screen instructions to create a new project.

2.  **Enable Firestore and Authentication:**
    *   In your new project's dashboard, go to the **Build** section in the sidebar.
    *   Click on **Firestore Database** and then **"Create database"**. Start in **test mode** for easy setup (you can secure it later with the provided `firestore.rules`).
    *   Go back to the **Build** section and click on **Authentication**. Click **"Get started"** and enable the **Email/Password** sign-in provider.

3.  **Get Firebase Config:**
    *   In the Firebase Console, go to **Project settings** (click the gear icon ⚙️ next to "Project Overview").
    *   Under the "Your apps" section, click the web icon (`</>`) to create a new web app.
    *   Give your app a nickname and click **"Register app"**.
    *   You will be presented with a `firebaseConfig` object. Copy this object.

4.  **Add Config to Your Code:**
    *   Open the file `src/firebase/config.ts`.
    *   Replace the existing placeholder `firebaseConfig` object with the one you copied from the Firebase console.

### 3. Local Development Setup

1.  **Install Dependencies:**
    Open your terminal, navigate to the project directory, and run:
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    *   You will need a Google AI (Gemini) API key for the AI features to work. Get one from [Google AI Studio](https://makersuite.google.com/app/apikey).
    *   Create a new file named `.env` in the root of the project.
    *   Add your API key to the file like this:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY
        ```

### 4. Running the Application

This project has two main parts: the Next.js frontend and the Genkit AI backend. You'll need to run both for all features to work.

1.  **Start the Next.js Development Server:**
    ```bash
    npm run dev
    ```
    Your application will be available at [http://localhost:3000](http://localhost:3000).

2.  **Start the Genkit Development Server:**
    In a **separate terminal window**, run:
    ```bash
    npm run genkit:dev
    ```
    This starts the Genkit server, which powers the AI flows (like the COA Generator).

You are now all set up! You can visit `http://localhost:3000` in your browser and start exploring the application.

---

## Available Scripts

-   `npm run dev`: Starts the Next.js frontend application in development mode.
-   `npm run genkit:dev`: Starts the Genkit server in development mode.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a production server.
-   `npm run lint`: Lints the codebase for errors.
