# EthicalDriveAI

This is a Next.js prototype of an AI system that performs ethical reasoning for autonomous driving decisions, developed in Firebase Studio.

## Getting Started

To get started with the project, take a look at the main dashboard component in `src/app/page.tsx` and the core application logic in `src/components/dashboard.tsx`.

## Running Locally in VS Code

To run this project on your local machine using an editor like Visual Studio Code, follow these steps.

### 1. Install Dependencies

First, open a terminal in the root directory of the project and install the necessary npm packages:

```bash
npm install
```

### 2. Set Up Environment Variables

You'll need to provide your Google AI Gemini API key to run the AI features.

1.  Create a new file named `.env` in the root of your project.
2.  Add your API key to the `.env` file like this:

    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```

    Replace `"YOUR_API_KEY_HERE"` with your actual Gemini API key.

### 3. Run the Development Servers

This project requires two separate processes to run concurrently: the Next.js frontend server and the Genkit AI server. You will need to open two terminals in VS Code.

**In your first terminal, start the Next.js development server:**

```bash
npm run dev
```

This will typically start the web application on `http://localhost:3000`.

**In your second terminal, start the Genkit development server:**

```bash
npm run genkit:dev
```

This command starts the server for your AI flows, which the Next.js application will call. It also provides a local development UI for testing your flows, usually available at `http://localhost:4000`.

Once both servers are running, you can open your browser to `http://localhost:3000` to see the application.