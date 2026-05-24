<img src="https://github.com/user-attachments/assets/e1e0fe16-21f4-44c8-a22d-39b4494433a1" alt="Link Management Logo" width="50" height="50">

# 🔗 Linkify - The Link Management Platform for Businesses(Landing Page)

<!-- <img src="https://github.com/user-attachments/assets/deab03fd-4234-44c3-a6ad-484c4a1a02a1" alt="Linkify Thubmnail"> -->
<img src="https://github.com/user-attachments/assets/ee867e8e-7871-4289-bd56-3eef40adb9b2" alt="Linkify Thumbnail" style="border-radius: 50px;" width="1280">


## 🌟 Introduction
Linkify is an innovative link management software designed to help you shorten, track, and optimize your links effortlessly. Built with React, Node.js, and MongoDB, Linkify provides powerful analytics and user-friendly features to enhance your link-sharing experience.

## 🚀 Features

- **Link Shortening:** Easily create short links for better sharing.
- **Analytics Dashboard:** Track clicks, user engagement, and performance metrics.
- **Customizable Links:** Create branded links that reflect your identity.
- **AI-Powered Suggestions:** Get smart recommendations for link optimization.

## 🔗 Live Preview

Check out the live demo of Linkify here: [Live Preview](http://Linkify-demo.vercel.app)

## 🎥 Watch Demo on YouTube

Check out the tutorial to see how this link management system was built: [Watch the Tutorial](https://youtu.be/3_sZPAfVR_U) 💻 

## 💻 Tech Stack

* Next.js
* Tailwind CSS
* Shadcn UI
* Magic UI
* Aceternity UI
* Prisma
* Supabase (PostgreSQL + Auth)
* React Hook Form

## 🛠️ Installation
To run Linkify locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/Shreyas-29/linkify.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a [Supabase](https://supabase.com) project and copy `.env.example` to `.env.local`. Fill in:
    - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings → API**
    - `DATABASE_URL` from **Project Settings → Database** (PostgreSQL connection string)

4. Push the Prisma schema to your database:
    ```bash
    npx prisma migrate dev --name init
    ```

5. In Supabase **Authentication → URL Configuration**, add redirect URLs:
    - `http://localhost:3000/auth/confirm`
    - `http://localhost:3000/auth/auth-callback`

6. Run the development server:
    ```bash
    npm run dev
    ```

## ☕ Buy Me a Coffee
If you enjoy using Linkify, consider supporting my work!  
[Buy Me a Coffee ☕](https://buymeacoffee.com/shreyas29)

## 📜 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 💬 Contact
If you have any questions or feedback, feel free to reach out via [GitHub Issues](https://github.com/Shreyas-29/linkify/issues).

---

Built with ❤️ by [Shreyas](https://shreyas-sihasane.vercel.app/)
