# SpecToCode

SpecToCode is a powerful developer tool that instantly generates frontend and backend code examples directly from API specifications. It simplifies the transition from API design to implementation by providing ready-to-use fetch clients, controller methods, and data transfer objects (DTOs) for a wide variety of modern frameworks and languages.

## 🚀 Features

- **Intuitive UI:** A familiar interface for designing API requests (Method, URL, Params, Headers, Body, Response).
- **Frontend Code Generation:** Automatically generates typed API clients, interfaces, and fetch functions.
- **Backend Code Generation:** Automatically generates controller methods, routing code, and request/response DTOs.
- **Multi-Language Support:**
  - **Frontend:** React, Next.js, Vue 3, Nuxt.js, Angular, Svelte, Solid.js, Preact, Vanilla JS/TS
  - **Backend:** Java Spring Boot, Node.js (TypeScript), Python FastAPI, Go (Gin), C# .NET, PHP Laravel, Ruby on Rails, Kotlin Ktor, Rust Actix, Elixir Phoenix
- **Instant Preview:** View generated code side-by-side with your specification.
- **Modern Tech Stack:** Built with React, TypeScript, Vite, and Tailwind CSS.

## 📦 Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/LeeJungJea/SpecToCode.git
   cd SpecToCode
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the provided local URL (typically `http://localhost:5173`).

## 🛠️ Usage

1. Open the **request.builder** panel on the left.
2. Select your HTTP Method and input the API URL (e.g., `/api/users/{id}`).
3. Define your URL Params, Headers, Body (JSON, Form-Data, etc.), and expected Response fields.
4. Choose your target **Frontend** and **Backend** framework from the generators section.
5. Click **Generate** to instantly view your tailored, ready-to-copy code in the right panel!

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a pull request if you'd like to add support for a new language, framework, or just improve the existing generators.

## 📄 License

Copyright (c) 2026 Lee Jung Jea

This project is open-source and available under the MIT License.
